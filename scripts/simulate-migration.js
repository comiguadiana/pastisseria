/**
 * simulate-migration.js
 * Simulació de migració de puntuacions amb normalització proporcional.
 *
 * Ús:
 *   node simulate-migration.js            → simulació (DRY RUN)
 *   node simulate-migration.js --apply    → aplica els canvis a Firestore
 *
 * Requisits:
 *   npm install firebase-admin
 *   Fitxer de credencials: ./serviceAccountKey.json
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DRY_RUN = !process.argv.includes('--apply');

// ─── Màxims teòrics del sistema ACTUAL ─────────────────────────────────────
const GAME_MAX_SCORES = {
  'llanca-ensaimada':   3_000,
  'pastis-caigut':      8_000,
  'pastis-perfecte':    2_000,
  'caca-sasha':         5_000,
  'memoria-pastissera': 5_600,
  'pasteblock':        50_000,
  'pastis-blast':      20_000,
  'bingo-musical':      4_250,
  'mots-pastissers':    5_000,
  'kart-pastisser':     3_000,
  'sasha-comecocos':   15_000,
  'sasha-go':          10_000,
  'fusio-pastissera':   8_000,
  'raco-edurne':       10_000,
};

const GAME_NAMES = {
  'llanca-ensaimada':   "Llança l'Ensaïmada",
  'pastis-caigut':      'Pastís Caigut',
  'pastis-perfecte':    'Pastís Perfecte',
  'caca-sasha':         'Caça la Sasha!',
  'memoria-pastissera': 'Memòria Pastissera',
  'pasteblock':         'PasteBlock',
  'pastis-blast':       'Pastis Blast',
  'bingo-musical':      'Bingo Musical',
  'mots-pastissers':    'Mots Pastissers',
  'kart-pastisser':     'Kart Pastisser',
  'sasha-comecocos':    'Sasha Menjamaracujàs',
  'sasha-go':           'Sasha GO',
  'fusio-pastissera':   'Fusió Pastissera',
  'raco-edurne':        "El Racó de l'Edurne",
};

// ─── Utilitats ────────────────────────────────────────────────────────────────
function fmt(n) { return n.toLocaleString('ca-ES'); }

function pct(before, after) {
  if (before === 0) return '0%';
  const delta = ((after - before) / before * 100).toFixed(1);
  return `${delta > 0 ? '+' : ''}${delta}%`;
}

// Data del commit "ranking normalitzat." (87fac3f · 2026-08-05 20:22:11 +0200)
// Puntuacions ANTERIORS → sistema vell (sense cap) → es normalitzen
// Puntuacions POSTERIORS → sistema nou → es respecten
const NORMALIZATION_DATE = new Date('2026-08-05T20:22:11+02:00');

function epochLabel(updatedAt) {
  if (!updatedAt) return '❓ sense data';
  const d = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
  const str = d.toLocaleString('ca-ES', { dateStyle: 'short', timeStyle: 'short' });
  return d < NORMALIZATION_DATE
    ? `⚠️  ABANS dels canvis (${str})`
    : `✅ DESPRÉS dels canvis (${str})`;
}

// ─── Lògica principal ─────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  SIMULACIÓ DE MIGRACIÓ DE PUNTUACIONS                        ║`);
  console.log(`║  Mode: ${DRY_RUN ? "🔍 DRY RUN (no s'aplica res)               " : '⚡ APLICANT CANVIS A FIRESTORE          '}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  📅 Data de referència dels canvis de puntuació:`);
  console.log(`     ${NORMALIZATION_DATE.toLocaleString('ca-ES')}  (commit 87fac3f "ranking normalitzat.")`);
  console.log('');

  const gameIds = Object.keys(GAME_MAX_SCORES);

  let totalAffectedPlayers = 0;
  let totalPointsCut = 0;
  const affectedUsers = new Map(); // uid → { name, games[] }

  // ── Per joc ─────────────────────────────────────────────────────────────────
  for (const gameId of gameIds) {
    const cap      = GAME_MAX_SCORES[gameId];
    const gameName = GAME_NAMES[gameId] || gameId;

    let snap;
    try {
      snap = await db.collection('scores').doc(gameId).collection('players').get();
    } catch (e) {
      console.warn(`  [AVÍS] No s'ha pogut llegir ${gameId}: ${e.message}`);
      continue;
    }
    if (snap.empty) continue;

    const allPlayers = snap.docs.map(d => ({
      uid:       d.id,
      name:      d.data().displayName || 'Desconegut',
      score:     d.data().score || 0,
      updatedAt: d.data().updatedAt || null,
    }));
    const maxReal = Math.max(...allPlayers.map(p => p.score));

    if (maxReal <= cap) {
      console.log(`✅  ${gameName.padEnd(28)} cap màx: ${fmt(cap).padStart(7)} → cap jugador afectat`);
      continue;
    }

    // Normalització proporcional: top scorer rep exactament el cap
    const scaleFactor = cap / maxReal;

    const toUpdate   = []; // sistema vell (ABANS) → es normalitzen
    const protected_ = []; // sistema nou (DESPRÉS) → es respecten

    for (const p of allPlayers) {
      if (p.score === 0) continue;
      const newScore = Math.round(p.score * scaleFactor);
      if (newScore === p.score) continue;

      const scoredAt   = p.updatedAt?.toDate ? p.updatedAt.toDate() : (p.updatedAt ? new Date(p.updatedAt) : null);
      const isOldSystem = !scoredAt || scoredAt < NORMALIZATION_DATE;

      const entry = { uid: p.uid, name: p.name, before: p.score, after: newScore, cut: p.score - newScore, updatedAt: p.updatedAt };

      if (isOldSystem) {
        toUpdate.push(entry);
        if (!affectedUsers.has(p.uid)) affectedUsers.set(p.uid, { name: p.name, games: [] });
        affectedUsers.get(p.uid).games.push({ gameId, gameName, before: p.score, after: newScore });
      } else {
        protected_.push(entry);
      }
    }

    if (toUpdate.length === 0 && protected_.length === 0) {
      console.log(`✅  ${gameName.padEnd(28)} cap màx: ${fmt(cap).padStart(7)} → cap jugador afectat`);
      continue;
    }

    console.log(`\n⚠️  ${gameName} (cap: ${fmt(cap)} pts, màx real: ${fmt(maxReal)} pts, factor: ${scaleFactor.toFixed(4)})`);
    console.log(`    ${'Jugador'.padEnd(24)} ${'Actual'.padStart(8)} → ${'Nou'.padStart(10)}   ${'Reducció'.padEnd(20)} Quan es va puntuar`);
    console.log(`    ${'─'.repeat(92)}`);

    const allAffected = [...toUpdate, ...protected_].sort((a, b) => b.before - a.before);
    for (const p of allAffected) {
      const scoredAt    = p.updatedAt?.toDate ? p.updatedAt.toDate() : (p.updatedAt ? new Date(p.updatedAt) : null);
      const isProtected = scoredAt && scoredAt >= NORMALIZATION_DATE;
      const nouStr  = isProtected ? '(mantenim)' : fmt(p.after);
      const cutStr  = isProtected ? '(protegit)          ' : `-${fmt(p.cut)} (${pct(p.before, p.after)})`.padEnd(20);
      console.log(`    ${p.name.substring(0, 24).padEnd(24)} ${fmt(p.before).padStart(8)} → ${nouStr.padStart(10)}   ${cutStr} ${epochLabel(p.updatedAt)}`);
    }

    if (toUpdate.length > 0) {
      totalAffectedPlayers += toUpdate.length;
      const cutTotal = toUpdate.reduce((s, x) => s + x.cut, 0);
      totalPointsCut += cutTotal;
      console.log(`    → ${toUpdate.length} s'actualitzen (sistema vell), ${protected_.length} es respecten (sistema nou), -${fmt(cutTotal)} pts`);
    } else {
      console.log(`    → 0 s'actualitzen (tots del sistema nou) ✅`);
    }

    // Aplicar a Firestore si --apply
    if (!DRY_RUN && toUpdate.length > 0) {
      const batch = db.batch();
      for (const p of toUpdate) {
        const ref = db.collection('scores').doc(gameId).collection('players').doc(p.uid);
        batch.update(ref, { score: p.after, scoreBefore: p.before, migratedAt: FieldValue.serverTimestamp() });
      }
      await batch.commit();
      console.log(`    ✅ Canvis aplicats a Firestore.`);
    }
  }

  // ── Rànquing general: abans i després ────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  RÀNQUING GENERAL — Simulació de l\'impacte');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  Jugadors afectats: ${totalAffectedPlayers}  |  Punts retallats totals: -${fmt(totalPointsCut)}`);
  console.log('');

  let usersSnap;
  try {
    usersSnap = await db.collection('users').get();
  } catch (e) {
    console.warn("  No s'ha pogut llegir la col·lecció users:", e.message);
    return;
  }

  // Construïm llista de tots els usuaris amb totalScore actual i nou
  const allUsers = [];
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (!data.displayName && !data.name) continue; // saltem documents sense nom
    const uid  = userDoc.id;
    const name = data.displayName || data.name || '?';
    const currentTotal = data.totalScore || 0;
    let totalCut = 0;
    if (affectedUsers.has(uid)) {
      totalCut = affectedUsers.get(uid).games.reduce((s, g) => s + (g.before - g.after), 0);
    }
    allUsers.push({ uid, name, before: currentTotal, after: Math.max(0, currentTotal - totalCut), cut: totalCut });
  }

  // Calcular posicions ACTUALS i NOVES
  const rankBefore = [...allUsers].sort((a, b) => b.before - a.before);
  const rankAfter  = [...allUsers].sort((a, b) => b.after  - a.after);
  const posBefore  = new Map(rankBefore.map((u, i) => [u.uid, i + 1]));
  const posAfter   = new Map(rankAfter.map( (u, i) => [u.uid, i + 1]));

  console.log(`  ${'Pos'.padEnd(6)} ${'Jugador'.padEnd(24)} ${'Actual'.padStart(9)} → ${'Nou'.padStart(9)}   ${'Reducció'.padStart(9)}   Moviment`);
  console.log(`  ${'─'.repeat(82)}`);

  for (const u of rankAfter) {
    const oldPos  = posBefore.get(u.uid) || '?';
    const newPos  = posAfter.get(u.uid)  || '?';
    const delta   = (oldPos !== '?' && newPos !== '?') ? oldPos - newPos : 0;
    const posDiff = delta > 0 ? `↑ +${delta}` : delta < 0 ? `↓ ${delta}` : `= (igual)`;
    const diffStr = u.cut > 0 ? `-${fmt(u.cut)}` : '—';
    const marker  = u.cut > 0 ? '⚠️ ' : '   ';
    console.log(
      `  ${marker}#${String(newPos).padEnd(4)} ${u.name.substring(0, 24).padEnd(24)} ` +
      `${fmt(u.before).padStart(9)} → ${fmt(u.after).padStart(9)}   ${diffStr.padStart(9)}   ${posDiff}`
    );
  }

  // Actualitzar totalScore a Firestore si --apply
  if (!DRY_RUN) {
    console.log('');
    console.log('  Actualitzant totalScore a Firestore...');
    for (const u of allUsers) {
      if (u.cut === 0) continue;
      try {
        await db.collection('users').doc(u.uid).update({
          totalScore: u.after,
          scoreMigratedAt: FieldValue.serverTimestamp(),
        });
        console.log(`  ✅ ${u.name}: ${fmt(u.before)} → ${fmt(u.after)}`);
      } catch (e) {
        console.warn(`  ⚠️  Error actualitzant ${u.name}: ${e.message}`);
      }
    }
  }

  console.log('');
  if (DRY_RUN) {
    console.log('🔍 DRY RUN completat. Cap canvi aplicat.');
    console.log('   Per aplicar els canvis: node simulate-migration.js --apply');
  } else {
    console.log('⚡ Migració completada. Canvis aplicats a Firestore.');
  }
  console.log('');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
