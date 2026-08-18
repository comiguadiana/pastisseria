/**
 * simulate-migration.js
 * Simulació de migració de puntuacions (opció 4).
 *
 * Llegeix les puntuacions actuals de Firestore i calcula quines s'haurien
 * de reduir per no superar el màxim teòric de cada joc amb el sistema actual.
 *
 * MODE SIMULACIÓ: No escriu res a Firestore. Mostra un informe comparatiu.
 *
 * Ús:
 *   node simulate-migration.js            → simulació (DRY RUN)
 *   node simulate-migration.js --apply    → aplica els canvis a Firestore
 *
 * Requisits:
 *   npm install firebase-admin
 *   Fitxer de credencials: ./serviceAccountKey.json
 *   (Firebase Console → Configuració del projecte → Comptes de servei → Generar clau)
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const DRY_RUN = !process.argv.includes('--apply');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ─── Màxims teòrics del sistema ACTUAL ─────────────────────────────────────
//
// Cada joc té un màxim calculat a partir de la seva lògica actual.
// Jocs amb màxim il·limitat (kart, pasteblock, sasha-comecocos...) usen
// un cap pràctic basat en sessions de joc reals/raonables.
//
const GAME_MAX_SCORES = {
  // 10 llançaments × 300 pts màx (forat central) = 3.000
  'llanca-ensaimada': 3_000,

  // Teòricament il·limitat (game-over amb 3 vides). Cap pràctic de ~20 min joc
  // Level creix fins ~10, spawn cada 380ms → ~3.000 objectes; mitjana ~3 pts
  // = ~9.000. Cap conservador per evitar farming.
  'pastis-caigut': 8_000,

  // Joc de puzle per nivells, sense bucle. Nombre de nivells × 10 pts/carta
  // Cap estimat a partir de fonts del codi.
  'pastis-perfecte': 2_000,

  // 60 seg × 1 encert/s × 10 pts (combo×1) + combo màx teòric
  // Combo creix però la Sasha s'accelera. Cap raonable ~5 min partida
  'caca-sasha': 5_000,

  // 8 parelles × (100 pts + temps_restant × 10 pts bonus)
  // Màxim teòric: 8 × (100 + 60×10) = 8 × 700 = 5.600. Però ERROR_PENALTY=15
  // reduce el temps disponible. Cap pràctic:
  'memoria-pastissera': 5_600,

  // Tetris-like sense límit de temps. Cap pràctic per ~15 min joc intensiu
  'pasteblock': 50_000,

  // Puzzle de blocs. Cap pràctic.
  'pastis-blast': 20_000,

  // 10 rondes × màx per ronda:
  //   BASE=100 + speedBonus màx=100 + streakBonus(streak 10→25×9=225) = 425 pts/ronda
  //   Total màxim teòric: 10 × 425 = 4.250
  'bingo-musical': 4_250,

  // Wordle: màx 1.000 pts (1 intent) + streak. Streak acumulada en dies
  // No hi ha cap estricte sobre dies, però cap pràctic per la durada de la festa
  'mots-pastissers': 5_000,

  // Kart: score = velocitat × dt × 0.03 + powerups. Cap pràctic ~10 min
  'kart-pastisser': 3_000,

  // Pacman-like, multi-nivell. Cap pràctic.
  'sasha-comecocos': 15_000,

  // Sasha GO: geolocalització, 1 aventura per jugador. Puntuació arbitrària.
  'sasha-go': 10_000,

  // Suika/fusió: il·limitat en teoria, però la pantalla s'omple.
  // Fusió fins al 🐍 (256 pts), múltiples fusionable. Cap pràctic.
  'fusio-pastissera': 8_000,

  // Racó d'Edurne: sense informació de lògica específica → cap conservador
  'raco-edurne': 10_000,
};

// ─── Nom llegible ────────────────────────────────────────────────────────────
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
function fmt(n) {
  return n.toLocaleString('ca-ES');
}

function pct(before, after) {
  if (before === 0) return '0%';
  const delta = ((after - before) / before * 100).toFixed(1);
  return `${delta > 0 ? '+' : ''}${delta}%`;
}

// ─── Lògica principal ─────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  SIMULACIÓ DE MIGRACIÓ DE PUNTUACIONS                        ║`);
  console.log(`║  Mode: ${DRY_RUN ? '🔍 DRY RUN (no s\'aplica res)               ' : '⚡ APLICANT CANVIS A FIRESTORE          '}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const gameIds = Object.keys(GAME_MAX_SCORES);

  // Resum global
  let totalAffectedPlayers = 0;
  let totalPointsCut = 0;
  const affectedUsers = new Map(); // uid → { name, games[] }

  // Per joc
  for (const gameId of gameIds) {
    const cap = GAME_MAX_SCORES[gameId];
    const gameName = GAME_NAMES[gameId] || gameId;

    let snap;
    try {
      snap = await db.collection('scores').doc(gameId).collection('players').get();
    } catch (e) {
      console.warn(`  [AVÍS] No s'ha pogut llegir ${gameId}: ${e.message}`);
      continue;
    }

    if (snap.empty) continue;

    const affected = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const currentScore = data.score || 0;
      if (currentScore > cap) {
        affected.push({
          uid: docSnap.id,
          name: data.displayName || 'Desconegut',
          before: currentScore,
          after: cap,
          cut: currentScore - cap,
        });

        if (!affectedUsers.has(docSnap.id)) {
          affectedUsers.set(docSnap.id, { name: data.displayName || '?', games: [] });
        }
        affectedUsers.get(docSnap.id).games.push({ gameId, gameName, before: currentScore, after: cap });
      }
    }

    if (affected.length === 0) {
      console.log(`✅  ${gameName.padEnd(28)} cap màx: ${fmt(cap).padStart(7)} → cap jugador afectat`);
      continue;
    }

    totalAffectedPlayers += affected.length;
    const cutTotal = affected.reduce((s, x) => s + x.cut, 0);
    totalPointsCut += cutTotal;

    console.log(`\n⚠️  ${gameName} (cap: ${fmt(cap)} pts)`);
    console.log(`    ${'Jugador'.padEnd(24)} ${'Actual'.padStart(8)} → ${'Nou'.padStart(8)}   Reducció`);
    console.log(`    ${'─'.repeat(60)}`);
    for (const p of affected.sort((a, b) => b.before - a.before)) {
      const arrow = `${fmt(p.before).padStart(8)} → ${fmt(p.after).padStart(8)}`;
      const cut   = `-${fmt(p.cut)} (${pct(p.before, p.after)})`;
      console.log(`    ${p.name.substring(0, 24).padEnd(24)} ${arrow}   ${cut}`);
    }
    console.log(`    → ${affected.length} jugador${affected.length > 1 ? 's' : ''} afectat${affected.length > 1 ? 's' : ''}, -${fmt(cutTotal)} pts en total`);

    // ── Aplicar si --apply ────────────────────────────────────────────────
    if (!DRY_RUN) {
      const batch = db.batch();
      for (const p of affected) {
        const ref = db.collection('scores').doc(gameId).collection('players').doc(p.uid);
        batch.update(ref, {
          score: p.after,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      console.log(`    ✅ Canvis aplicats a Firestore.`);
    }
  }

  // ── Resum d'usuaris afectats i recalcular totalScore ──────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RESUM GLOBAL');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Jugadors afectats: ${totalAffectedPlayers}`);
  console.log(`  Punts totals retallats: -${fmt(totalPointsCut)}`);
  console.log('');

  if (affectedUsers.size > 0) {
    console.log('  Impacte per usuari (rànquing general):');
    console.log(`  ${'Jugador'.padEnd(24)} ${'TotalScore Actual'.padStart(17)}  ${'Reducció total'.padStart(14)}`);
    console.log(`  ${'─'.repeat(60)}`);

    const sorted = [...affectedUsers.entries()].sort((a, b) => {
      const acut = a[1].games.reduce((s, g) => s + (g.before - g.after), 0);
      const bcut = b[1].games.reduce((s, g) => s + (g.before - g.after), 0);
      return bcut - acut;
    });

    for (const [uid, info] of sorted) {
      const totalCut = info.games.reduce((s, g) => s + (g.before - g.after), 0);
      const gameList = info.games.map(g => `${g.gameName} (${fmt(g.before)}→${fmt(g.after)})`).join(', ');

      let userTotalScore = 0;
      try {
        const userSnap = await db.collection('users').doc(uid).get();
        if (userSnap.exists) {
          userTotalScore = userSnap.data().totalScore || 0;
        }
      } catch (e) {}

      const newTotalScore = userTotalScore - totalCut;
      console.log(`  ${info.name.substring(0, 24).padEnd(24)} ${fmt(userTotalScore).padStart(17)}  ${('-' + fmt(totalCut)).padStart(14)}`);
      console.log(`    Jocs: ${gameList}`);
      console.log(`    totalScore: ${fmt(userTotalScore)} → ${fmt(newTotalScore)}`);

      // ── Recalcular totalScore si --apply ──────────────────────────────
      if (!DRY_RUN) {
        try {
          await db.collection('users').doc(uid).update({
            totalScore: newTotalScore,
            scoreMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`    ✅ totalScore actualitzat a Firestore.`);
        } catch (e) {
          console.warn(`    ⚠️  Error actualitzant totalScore: ${e.message}`);
        }
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
