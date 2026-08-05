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
  SASHA_COMECOCOS:   'sasha-comecocos',
  MOTS_PASTISSERS:   'mots-pastissers',
  SASHA_GO:          'sasha-go',
  RACO_EDURNE:       'raco-edurne',
};

// Evita inflar partides de Sasha GO en una mateixa sessió
const sashaGoRecordedSessions = new Set();

/* ─── Registrar partida jugada (globals i d'usuari) ─── */
export async function recordGamePlay(gameId, uid) {
  if (gameId === GAMES.SASHA_GO && uid) {
    if (sashaGoRecordedSessions.has(uid)) return;
    sashaGoRecordedSessions.add(uid);
  }

  // 1. Guardar a localStorage per a persistència local
  try {
    localStorage.setItem('obrador_last_played_game', gameId);
    const localTotal = (parseInt(localStorage.getItem('obrador_local_plays_total') || '0', 10) + 1);
    localStorage.setItem('obrador_local_plays_total', String(localTotal));
    const localGame = (parseInt(localStorage.getItem(`obrador_local_plays_${gameId}`) || '0', 10) + 1);
    localStorage.setItem(`obrador_local_plays_${gameId}`, String(localGame));
  } catch (e) {}

  // 2. Comptador a l'usuari si tenim UID (col·lecció 'users')
  if (uid) {
    try {
      const userRef = doc(db, 'users', uid);
      if (gameId === GAMES.SASHA_GO) {
        // A Sasha GO és una única aventura contínua per usuari
        await setDoc(userRef, {
          lastPlayedGame: gameId,
          lastPlayedAt: serverTimestamp(),
          [`gamePlays.${gameId}`]: 1
        }, { merge: true });
      } else {
        await setDoc(userRef, {
          gamesPlayed: increment(1),
          lastPlayedGame: gameId,
          lastPlayedAt: serverTimestamp(),
          [`gamePlays.${gameId}`]: increment(1)
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Avís actualitzant partides a users:', err);
    }

    // 3. Comptador al document individual del jugador a scores/{gameId}/players/{uid}
    try {
      const playerRef = doc(db, 'scores', gameId, 'players', uid);
      if (gameId === GAMES.SASHA_GO) {
        await setDoc(playerRef, {
          playsCount: 1,
          lastPlayedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await setDoc(playerRef, {
          playsCount: increment(1),
          lastPlayedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Avís actualitzant partides a scores/players:', err);
    }
  }

  // 4. Intentar actualitzar stats/games si els permisos ho permeten
  try {
    const statsRef = doc(db, 'stats', 'games');
    await setDoc(statsRef, {
      totalPlays: increment(1),
      [gameId]: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    // Silenciós si les regles de Firestore no permeten escriure a 'stats'
  }
}

/* ─── Obtenir estadístiques globals de partides ─── */
export async function getGamesStats() {
  const byGame = {};
  Object.values(GAMES).forEach(g => { byGame[g] = 0; });
  let totalPlays = 0;

  // 1. Intentem calcular les partides a partir de tots els usuaris registrats ('users')
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach(docSnap => {
      const u = docSnap.data();
      const uTotal = Number(u.gamesPlayed) || 0;
      
      if (u.gamePlays && typeof u.gamePlays === 'object') {
        let sumUser = 0;
        Object.entries(u.gamePlays).forEach(([gId, cnt]) => {
          let count = Number(cnt) || 0;
          // Normalitzar Sasha GO a 1 partida màxim per usuari
          if (gId === GAMES.SASHA_GO) {
            count = count > 0 ? 1 : 0;
          }
          if (byGame[gId] !== undefined) {
            byGame[gId] += count;
            sumUser += count;
          }
        });
        totalPlays += Math.max(uTotal, sumUser);
      } else if (uTotal > 0) {
        totalPlays += uTotal;
        if (u.lastPlayedGame && byGame[u.lastPlayedGame] !== undefined) {
          const gAdd = (u.lastPlayedGame === GAMES.SASHA_GO) ? 1 : uTotal;
          byGame[u.lastPlayedGame] += gAdd;
        }
      }
    });
  } catch (err) {
    console.warn('Avís obtenint estadístiques des de users:', err);
  }

  // 2. Consulta les col·leccions de cada joc a 'scores/{gameId}/players' per comptar partides/jugadors
  try {
    await Promise.all(Object.values(GAMES).map(async (gameId) => {
      try {
        const scoresSnap = await getDocs(collection(db, 'scores', gameId, 'players'));
        let gameSum = 0;
        scoresSnap.forEach(docSnap => {
          const data = docSnap.data();
          let pCount = Number(data.playsCount) || (data.score ? 1 : 0);
          if (gameId === GAMES.SASHA_GO) pCount = 1; // 1 partida per jugador a Sasha GO
          gameSum += pCount;
        });
        if (gameSum > (byGame[gameId] || 0)) {
          const diff = gameSum - (byGame[gameId] || 0);
          byGame[gameId] = gameSum;
          totalPlays += diff;
        }
      } catch (e) {}
    }));
  } catch (err) {
    console.warn('Avís obtenint estadístiques des de scores:', err);
  }

  // 3. Comprova també doc('stats', 'games') si està disponible
  try {
    const statsRef = doc(db, 'stats', 'games');
    const snap = await getDoc(statsRef);
    if (snap.exists()) {
      const data = snap.data();
      Object.values(GAMES).forEach(g => {
        if (data[g] && g !== GAMES.SASHA_GO) {
          byGame[g] = Math.max(byGame[g] || 0, Number(data[g]) || 0);
        }
      });
      if (data.totalPlays) {
        totalPlays = Math.max(totalPlays, Number(data.totalPlays) || 0);
      }
    }
  } catch (e) {}

  // 4. Sumatori final de seguretat
  let sumAll = 0;
  Object.values(byGame).forEach(c => { sumAll += c; });
  totalPlays = Math.max(totalPlays, sumAll);

  // 5. Fallback amb partides locals si encara és 0
  if (totalPlays === 0) {
    try {
      const localTotal = parseInt(localStorage.getItem('obrador_local_plays_total') || '0', 10);
      if (localTotal > 0) {
        totalPlays = localTotal;
        Object.values(GAMES).forEach(g => {
          const localG = parseInt(localStorage.getItem(`obrador_local_plays_${g}`) || '0', 10);
          if (localG > 0) byGame[g] = localG;
        });
      }
    } catch (e) {}
  }

  return { totalPlays, byGame };
}

/* ─── Desar score (desa rècord i opcionalment enregistra la partida jugada) ─── */
export async function saveScore(gameId, uid, score, profile, skipRecordPlay = false) {
  if (!skipRecordPlay) {
    await recordGamePlay(gameId, uid);
  }

  const ref = doc(db, 'scores', gameId, 'players', uid);
  let prevScore = 0;
  let prevSnap = null;
  try {
    prevSnap = await getDoc(ref);
    if (prevSnap && prevSnap.exists()) {
      prevScore = prevSnap.data().score || 0;
    }
  } catch (e) {}

  if (prevSnap && prevSnap.exists() && prevScore >= score) {
    return false; // No millora el rècord personal
  }

  try {
    await setDoc(ref, {
      uid,
      score,
      displayName:  profile?.displayName || 'Jugador',
      avatarStyle:  profile?.avatarStyle || 'adventurer',
      avatarSeed:   profile?.avatarSeed || uid,
      updatedAt:    serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Error desant score a Firestore:', err);
  }

  // Actualitzar puntuació total a l'usuari
  try {
    await recalcTotalScore(uid);
  } catch (err) {
    console.warn('Error recalculant puntuació total:', err);
  }

  return true; // Nou rècord!
}

/* ─── Recalcular puntuació total ─── */
async function recalcTotalScore(uid) {
  let total = 0;
  for (const gameId of Object.values(GAMES)) {
    try {
      const ref  = doc(db, 'scores', gameId, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        total += snap.data().score || 0;
      }
    } catch (e) {}
  }
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { totalScore: total }, { merge: true });
  } catch (e) {}
}

/* ─── Obtenir ranking d'un joc (permet obtenir tots els jugadors) ─── */
export async function getGameRanking(gameId, topN = 200) {
  const q = query(
    collection(db, 'scores', gameId, 'players'),
    orderBy('score', 'desc'),
    limit(topN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => {
    const data = d.data();
    let plays = Number(data.playsCount);
    if (gameId === GAMES.SASHA_GO) {
      plays = 1;
    } else if (isNaN(plays) || plays <= 0) {
      plays = (data.score > 0) ? 1 : 0;
    }
    return {
      rank: i + 1,
      uid: d.id,
      ...data,
      playsCount: plays,
      gamesPlayed: plays
    };
  });
}

/* ─── Obtenir ranking general (tots els jugadors per totalScore) ─── */
export async function getGeneralRanking(topN = 200) {
  const q = query(
    collection(db, 'users'),
    orderBy('totalScore', 'desc'),
    limit(topN)
  );
  const snap = await getDocs(q);
  const users = snap.docs.map((d, i) => ({
    rank: i + 1,
    uid: d.id,
    ...d.data()
  }));

  // Agreguem les partides de cada jugador consultant les col·leccions de cada joc a scores/{gameId}/players
  const userUids = new Set(users.map(u => u.uid));
  const userScoresPlaysMap = {};

  try {
    await Promise.all(Object.values(GAMES).map(async (gameId) => {
      try {
        const scoresSnap = await getDocs(collection(db, 'scores', gameId, 'players'));
        scoresSnap.forEach(docSnap => {
          const pUid = docSnap.id;
          if (userUids.has(pUid)) {
            const data = docSnap.data();
            let pCount = Number(data.playsCount) || (data.score > 0 ? 1 : 0);
            if (gameId === GAMES.SASHA_GO) pCount = 1;
            userScoresPlaysMap[pUid] = (userScoresPlaysMap[pUid] || 0) + pCount;
          }
        });
      } catch (e) {}
    }));
  } catch (err) {
    console.warn('Avís agregant partides per usuari:', err);
  }

  return users.map(u => {
    const playsFromScores = userScoresPlaysMap[u.uid] || 0;
    let playsFromUserDoc = Number(u.gamesPlayed) || 0;
    let playsFromGamePlays = 0;
    let hasInflatedSashaGo = false;

    if (u.gamePlays && typeof u.gamePlays === 'object') {
      Object.entries(u.gamePlays).forEach(([gId, cnt]) => {
        let count = Number(cnt) || 0;
        if (gId === GAMES.SASHA_GO) {
          if (count > 1) hasInflatedSashaGo = true;
          count = count > 0 ? 1 : 0;
        }
        playsFromGamePlays += count;
      });
    }

    const calculatedPlays = Math.max(playsFromScores, playsFromGamePlays, (u.totalScore > 0 ? 1 : 0));

    // Auto-curació a Firestore si les dades de Sasha GO estaven inflades
    if (hasInflatedSashaGo && u.uid) {
      try {
        setDoc(doc(db, 'users', u.uid), {
          gamesPlayed: calculatedPlays,
          'gamePlays.sasha-go': 1
        }, { merge: true }).catch(() => {});
      } catch (e) {}
    } else if (calculatedPlays > playsFromUserDoc && u.uid) {
      try {
        setDoc(doc(db, 'users', u.uid), { gamesPlayed: calculatedPlays }, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    return {
      ...u,
      gamesPlayed: calculatedPlays
    };
  });
}

/* ─── Obtenir posició de l'usuari en un joc ─── */
export async function getUserRank(gameId, uid) {
  const ranking = await getGameRanking(gameId, 200);
  const pos = ranking.findIndex(r => r.uid === uid);
  return pos >= 0 ? pos + 1 : null;
}

/* ─── Estat intern de paginació per contenidor ─── */
const tablePaginationState = new Map();

/* ─── Renderitzar taula de ranking paginable ─── */
export function renderRankingTable(entries, containerId, highlight = null, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!entries || !entries.length) {
    container.innerHTML = `
      <div class="text-center" style="padding:2.5rem 1rem;color:var(--choco-light);">
        <div style="font-size:3.5rem;margin-bottom:0.5rem">🎂</div>
        <p style="font-family:var(--font-display);font-size:1rem;color:var(--chocolate)">Encara no hi ha puntuacions registrades.</p>
        <p style="font-size:0.9rem;opacity:0.8">Sigues el primer pastisser a deixar la teva empremta!</p>
      </div>`;
    return;
  }

  // Estat de paginació
  const pageSize = options.pageSize || 10;
  let state = tablePaginationState.get(containerId);
  if (!state || options.page !== undefined || options.resetPage) {
    state = {
      page: options.page || 1,
      pageSize
    };
    tablePaginationState.set(containerId, state);
  }

  const totalEntries = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  let currentPage = Math.max(1, Math.min(state.page, totalPages));
  state.page = currentPage;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(totalEntries, startIdx + pageSize);
  const pageEntries = entries.slice(startIdx, endIdx);

  const medals = ['🥇', '🥈', '🥉'];

  // Generar botons de pàgina
  const generatePageButtons = () => {
    let pages = [];
    if (totalPages <= 7) {
      for (let p = 1; p <= totalPages; p++) pages.push(p);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let p = start; p <= end; p++) pages.push(p);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map(p => {
      if (p === '...') {
        return `<span class="pagination-ellipsis">…</span>`;
      }
      const isActive = p === currentPage;
      return `<button class="pagination-page-btn ${isActive ? 'active' : ''}" data-page="${p}" ${isActive ? 'aria-current="page"' : ''}>${p}</button>`;
    }).join('');
  };

  container.innerHTML = `
    <div class="ranking-table-responsive">
      <table class="ranking-table">
        <thead>
          <tr>
            <th class="th-rank">#</th>
            <th class="th-avatar">Avatar</th>
            <th class="th-name">Nom</th>
            <th class="th-score" style="text-align:right">Punts</th>
            <th class="th-plays" style="text-align:center">Partides</th>
          </tr>
        </thead>
        <tbody>
          ${pageEntries.map(e => {
            const plays = e.gamesPlayed ?? e.playsCount ?? (e.score ? 1 : 0);
            const isHighlighted = e.uid === highlight;
            return `
            <tr class="rank-${e.rank} ${isHighlighted ? 'highlight' : ''}">
              <td class="rank-number">${medals[e.rank - 1] || e.rank}</td>
              <td class="td-avatar">
                <img class="rank-avatar"
                  src="${getDiceBearUrl(e.avatarStyle || 'adventurer', e.avatarSeed || e.uid, 36)}"
                  alt="${escapeHtml(e.displayName || 'Jugador')}" />
              </td>
              <td class="rank-name" title="${escapeHtml(e.displayName || 'Jugador')}">${escapeHtml(e.displayName || 'Jugador')}</td>
              <td class="rank-score">${(e.score || e.totalScore || 0).toLocaleString()}</td>
              <td class="rank-plays" style="text-align:center">
                <span class="player-plays-badge" title="${plays} partides jugades">${plays.toLocaleString()}</span>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${totalPages > 1 ? `
    <div class="ranking-pagination">
      <div class="pagination-info">
        Mostrant <strong>${startIdx + 1}–${endIdx}</strong> de <strong>${totalEntries}</strong> jugadors
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn pagination-prev" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>◀ Anterior</button>
        <div class="pagination-pages">
          ${generatePageButtons()}
        </div>
        <button class="pagination-btn pagination-next" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>Següent ▶</button>
      </div>
    </div>` : `
    <div class="ranking-pagination" style="justify-content:flex-end">
      <div class="pagination-info" style="font-size:0.85rem">
        Total: <strong>${totalEntries}</strong> jugadors registrats
      </div>
    </div>`}
  `;

  // Afegir listeners als botons de paginació
  if (totalPages > 1) {
    const prevBtn = container.querySelector('.pagination-prev');
    const nextBtn = container.querySelector('.pagination-next');
    const pageBtns = container.querySelectorAll('.pagination-page-btn');

    const goToPage = (p) => {
      renderRankingTable(entries, containerId, highlight, { pageSize, page: p });
    };

    if (prevBtn && !prevBtn.disabled) {
      prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    }
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    }
    pageBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page, 10);
        if (!isNaN(p) && p !== currentPage) {
          goToPage(p);
        }
      });
    });
  }
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
          Continua 🎂
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
