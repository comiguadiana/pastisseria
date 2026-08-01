/**
 * mapa.js — Lògica del mapa arcade
 */

import { requireAuth, renderNavbarUser, logout, getDiceBearUrl, showToast }
  from './assets/js/auth.js';
import { GAMES, getGameRanking }
  from './assets/js/ranking.js';
import { db } from './assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const GAME_URLS = {
  'pasteblock':         'games/pasteblock/index.html',
  'pastis-caigut':      'games/pastis-caigut/index.html',
  'llanca-ensaimada':   'games/llanca-ensaimada/index.html',
  'memoria-pastissera': 'games/memoria-pastissera/index.html',
  'pastis-perfecte':    'games/pastis-perfecte/index.html',
  'caca-sasha':         'games/caca-sasha/index.html',
  'fusio-pastissera':   'games/suika-pastis/index.html',
  'raco-edurne':        'games/raco-edurne/index.html',
};

// Posicions de l'avatar per a cada parada (centrat sobre el node)
const STOP_POSITIONS = {
  0: { left: 384, top: 200 }, // La Portalada (PasteBlock)
  1: { left: 250, top: 500 }, // Pastís Caigut
  2: { left: 500, top: 800 }, // Llança Ensaïmada
  3: { left: 250, top: 1100 }, // Memòria
  4: { left: 500, top: 1400 }, // Pastís Perfecte
  5: { left: 250, top: 1700 }, // Caça Sasha
  6: { left: 500, top: 2000  }, // Fusió Pastissera
  7: { left: 384, top: 2450  }, // Fama
  'raco-edurne': { left: 60, top: 1100 }, // Easter egg
};

let currentUser = null;
let currentProfile = null;

/* ── Init ── */
requireAuth('login.html?next=mapa.html')
  .then(({ user, profile }) => {
    currentUser    = user;
    currentProfile = profile;
    renderNavbarUser(profile, user);
    initMap(profile);
    loadMyScores(user.uid);
  })
  .catch(() => {});

/* ── Logout ── */
document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
  await logout();
  window.location.href = 'login.html';
});

/* ── Inicialitza el mapa ── */
function initMap(profile) {
  // Posiciona l'avatar
  const player = document.getElementById('map-player');
  const avatarImg = document.getElementById('player-avatar-img');
  const nameLabel = document.getElementById('player-name-label');

  if (avatarImg) {
    avatarImg.src = getDiceBearUrl(profile.avatarStyle, profile.avatarSeed, 48);
  }
  if (nameLabel) nameLabel.textContent = profile.displayName;

  const unlocked = profile.unlockedGames || ['pasteblock'];
  const currentIdx = unlocked.length - 1; // Última parada desbloquejada

  // Mou l'avatar a la posició actual
  const pos = STOP_POSITIONS[currentIdx] || STOP_POSITIONS[0];
  if (player) {
    player.style.left = pos.left + 'px';
    player.style.top  = (pos.top - 30) + 'px'; // l'avatar queda sobre el node
    player.style.transform = 'translate(-50%, -100%)';
  }

  // Actualitza visuals de les parades
  const gameOrder = ['pasteblock','pastis-caigut','llanca-ensaimada',
                     'memoria-pastissera','pastis-perfecte','caca-sasha','fusio-pastissera'];

  gameOrder.forEach((gameId) => {
    const stopEl = document.getElementById('stop-' + stopIdMap(gameId));
    if (!stopEl) return;

    if (unlocked.includes(gameId)) {
      stopEl.classList.add('unlocked');
    }
  });

  // Boira de Guerra
  const fogHoles = document.getElementById('fog-holes');
  if (fogHoles) {
    fogHoles.innerHTML = '';
    const illuminatedIndices = [0]; // Portalada il·luminada
    
    gameOrder.forEach((gameId, idx) => {
      if (unlocked.includes(gameId)) {
        // Il·lumina el joc actual i el següent perquè sàpigues on anar
        if (!illuminatedIndices.includes(idx + 1)) {
          illuminatedIndices.push(idx + 1);
        }
      }
    });

    // Fama sempre s'il·lumina si tens l'últim joc
    if (unlocked.includes('fusio-pastissera')) illuminatedIndices.push(7);

    illuminatedIndices.forEach(idx => {
      const p = STOP_POSITIONS[idx];
      if (p) {
        // Cercle central més intens i gran
        fogHoles.innerHTML += `<circle cx="${p.left}" cy="${p.top}" r="220" fill="black" opacity="0.95"/>`;
        // Halo exterior encara més gran
        fogHoles.innerHTML += `<circle cx="${p.left}" cy="${p.top}" r="350" fill="black" opacity="0.6"/>`;
      }
    });
  }

  // Scroll automàtic Vertical a la posició actual
  setTimeout(() => {
    const scrollArea = document.getElementById('map-scroll');
    if (scrollArea) {
      const viewHeight = scrollArea.clientHeight || window.innerHeight;
      scrollArea.scrollTop = Math.max(0, pos.top - (viewHeight / 2) + 60);
    }
  }, 500);
}

function stopIdMap(gameId) {
  const m = {
    'pasteblock':         'pasteblock',
    'pastis-caigut':      'pastis-caigut',
    'llanca-ensaimada':   'llanca',
    'memoria-pastissera': 'memoria',
    'pastis-perfecte':    'pastis-perfecte',
    'caca-sasha':         'sasha',
    'fusio-pastissera':   'fusio-pastissera',
    'raco-edurne':        'raco-edurne',
  };
  return m[gameId] || gameId;
}

/* ── Carrega puntuacions pròpies ── */
async function loadMyScores(uid) {
  const gameOrder = Object.values(GAMES);
  for (const gameId of gameOrder) {
    try {
      const ref  = doc(db, 'scores', gameId, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const scoreEl = document.getElementById('score-' + gameId);
        if (scoreEl) {
          scoreEl.textContent = snap.data().score.toLocaleString() + ' pts';
        }
        const stopEl = document.getElementById('stop-' + stopIdMap(gameId));
        if (stopEl) {
          stopEl.classList.remove('unlocked');
          stopEl.classList.add('completed');
        }
      }
    } catch (e) { /* Firebase no configurat */ }
  }
}

/* ── Navegar al joc ── */
window.goToGame = function(gameId) {
  // L'easter egg sempre està desbloquejat
  if (gameId === 'raco-edurne') {
    window.location.href = GAME_URLS[gameId];
    return;
  }
  
  const unlocked = currentProfile?.unlockedGames || ['pasteblock'];
  if (!unlocked.includes(gameId)) {
    const modal = document.getElementById('locked-modal');
    const msg   = document.getElementById('locked-modal-msg');
    if (msg) msg.textContent = `Primer has de completar el joc anterior per desbloquejar aquest!`;
    if (modal) modal.classList.remove('hidden');
    return;
  }
  const url = GAME_URLS[gameId];
  if (url) window.location.href = url;
};
