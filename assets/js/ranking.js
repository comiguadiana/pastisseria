/**
 * ranking.js — Gestió de rankings individuals i general
 * Compartit entre tots els jocs
 */

import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, getDocs, collection,
  query, orderBy, limit, serverTimestamp, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDiceBearUrl } from './auth.js';

/* ─── IDs dels jocs ─── */
export const GAMES = {
  PASTEBLOCK:        'pasteblock',
  PASTIS_CAIGUT:     'pastis-caigut',
  LLANCA_ENSAIMADA:  'llanca-ensaimada',
  MEMORIA_PASTISSERA:'memoria-pastissera',
  PASTIS_PERFECTE:   'pastis-perfecte',
  CACA_SASHA:        'caca-sasha',
  FUSIO_PASTISSERA:  'fusio-pastissera',
  PASTIS_BLAST:      'pastis-blast',
  KART_PASTISSER:    'kart-pastisser',
  RACO_EDURNE:       'raco-edurne',
};

/* ─── Desar score (solo guarda el màxim per usuari per joc) ─── */
export async function saveScore(gameId, uid, score, profile) {
  const ref  = doc(db, 'scores', gameId, 'players', uid);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().score >= score) {
    return false; // No millora el rècord
  }

  await setDoc(ref, {
    uid,
    score,
    displayName:  profile.displayName,
    avatarStyle:  profile.avatarStyle,
    avatarSeed:   profile.avatarSeed,
    updatedAt:    serverTimestamp()
  });

  // Actualitzar puntuació total a l'usuari
  await recalcTotalScore(uid);

  return true; // Nou rècord!
}

/* ─── Recalcular puntuació total ─── */
async function recalcTotalScore(uid) {
  let total = 0;
  for (const gameId of Object.values(GAMES)) {
    const ref  = doc(db, 'scores', gameId, 'players', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      total += snap.data().score || 0;
    }
  }
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { totalScore: total });
}

/* ─── Obtenir ranking d'un joc (top N) ─── */
export async function getGameRanking(gameId, topN = 10) {
  const q = query(
    collection(db, 'scores', gameId, 'players'),
    orderBy('score', 'desc'),
    limit(topN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }));
}

/* ─── Obtenir ranking general (top N per totalScore) ─── */
export async function getGeneralRanking(topN = 20) {
  const q = query(
    collection(db, 'users'),
    orderBy('totalScore', 'desc'),
    limit(topN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }));
}

/* ─── Obtenir posició de l'usuari en un joc ─── */
export async function getUserRank(gameId, uid) {
  const ranking = await getGameRanking(gameId, 100);
  const pos = ranking.findIndex(r => r.uid === uid);
  return pos >= 0 ? pos + 1 : null;
}

/* ─── Renderitzar taula de ranking ─── */
export function renderRankingTable(entries, containerId, highlight = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = `
      <div class="text-center" style="padding:2rem;color:var(--gray-400);">
        <div style="font-size:3rem">🎂</div>
        <p>Encara no hi ha puntuacions. Sigues el primer!</p>
      </div>`;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  container.innerHTML = `
    <table class="ranking-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Avatar</th>
          <th>Nom</th>
          <th style="text-align:right">Punts</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(e => `
          <tr class="rank-${e.rank} ${e.uid === highlight ? 'highlight' : ''}">
            <td class="rank-number">${medals[e.rank - 1] || e.rank}</td>
            <td>
              <img class="rank-avatar"
                src="${getDiceBearUrl(e.avatarStyle || 'adventurer', e.avatarSeed || e.uid, 36)}"
                alt="${e.displayName}" />
            </td>
            <td class="rank-name">${escapeHtml(e.displayName || 'Jugador')}</td>
            <td class="rank-score">${(e.score || e.totalScore || 0).toLocaleString()}</td>
          </tr>`
        ).join('')}
      </tbody>
    </table>`;
}

/* ─── Confeti de victòria ─── */
export function launchConfetti(count = 80) {
  const colors = ['#FF8FAB','#D4A017','#FFD6E5','#B8F0D8','#CE93D8','#5DBB63','#F0C040'];
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.cssText = `
        left: ${Math.random() * 100}vw;
        top: -20px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        width: ${6 + Math.random() * 10}px;
        height: ${6 + Math.random() * 10}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration: ${1.5 + Math.random() * 2.5}s;
        animation-delay: ${Math.random() * 0.5}s;
        transform: rotate(${Math.random() * 360}deg);
      `;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }, i * 20);
  }
}

/* ─── Modal "Nou Rècord!" ─── */
export function showNewRecordModal(score, rank) {
  launchConfetti();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal animate-bounce-in" style="text-align:center;max-width:400px">
      <div style="padding:2.5rem">
        <div style="font-size:4rem;margin-bottom:1rem">🏆</div>
        <h2 style="font-family:var(--font-display);color:var(--caramel);margin-bottom:0.5rem">
          Nou Rècord!
        </h2>
        <p style="font-size:2rem;font-family:var(--font-display);color:var(--rose);margin-bottom:0.5rem">
          ${score.toLocaleString()} punts
        </p>
        ${rank ? `<p style="color:var(--choco-light)">Posició #${rank} al rànquing!</p>` : ''}
        <button class="btn btn-primary btn-lg" style="margin-top:1.5rem" onclick="this.closest('.modal-overlay').remove()">
          Continuar 🎂
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

/* ─── Progressió de jocs a Firestore ─── */
export async function unlockNextGame(currentGameId, uid) {
  const order = Object.values(GAMES);
  const idx   = order.indexOf(currentGameId);
  if (idx < 0 || idx >= order.length - 1) return;

  const next    = order[idx + 1];
  const userRef = doc(db, 'users', uid);
  const snap    = await getDoc(userRef);
  
  if (snap.exists()) {
    const unlocked = snap.data().unlockedGames || ['pasteblock'];
    if (!unlocked.includes(next)) {
      unlocked.push(next);
      await updateDoc(userRef, { unlockedGames: unlocked });
    }
  }
  return next;
}

/* ─── Utilitats ─── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
