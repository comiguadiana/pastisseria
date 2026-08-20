/**
 * mapa.js — Lògica del mapa arcade
 *
 * Desbloqueig basat en puntuacions:
 *   - El primer joc sempre és accessible.
 *   - Un joc N és desbloquejat si el joc N-1 té alguna puntuació a Firebase.
 *   - Afegir nous jocs al mapa no obliga els jugadors a tornar a jugar.
 *   - L'Easter Egg (Racó de l'Edurne) es desbloqueja conjuntament amb «La Comissió» (Memòria Pastissera).
 */

import { requireAuth, renderNavbarUser, logout, getDiceBearUrl }
  from './assets/js/auth.js';
import { db } from './assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Ordre dels jocs (la clau d'ordre és aquí, no a ranking.js) ── */
const GAME_ORDER = [
  'pasteblock',
  'pastis-caigut',
  'llanca-ensaimada',
  'memoria-pastissera',
  'pastis-perfecte',
  'caca-sasha',
  'fusio-pastissera',
  'pastis-blast',
  'kart-pastisser',
  'sasha-comecocos',
  'mots-pastissers',
  'sasha-go',
  'bingo-musical',
  'trivial-pastisseries',
];

const GAME_URLS = {
  'pasteblock':         'games/pasteblock/index.html',
  'pastis-caigut':      'games/pastis-caigut/index.html',
  'llanca-ensaimada':   'games/llanca-ensaimada/index.html',
  'memoria-pastissera': 'games/memoria-pastissera/index.html',
  'pastis-perfecte':    'games/pastis-perfecte/index.html',
  'caca-sasha':         'games/caca-sasha/index.html',
  'fusio-pastissera':   'games/suika-pastis/index.html',
  'pastis-blast':       'games/pastis-blast/index.html',
  'kart-pastisser':     'games/kart-pastisser/index.html',
  'sasha-comecocos':    'games/sasha-comecocos/index.html',
  'mots-pastissers':    'games/mots-pastissers/index.html',
  'sasha-go':           'games/sasha-go/index.html',
  'bingo-musical':      'games/bingo-musical/index.html',
  'trivial-pastisseries': 'games/trivial-pastisseries/index.html',
  'raco-edurne':        'games/raco-edurne/index.html',
};

/* Posicions de l'avatar per a cada parada (índex del GAME_ORDER) */
const STOP_POSITIONS = {
  0: { left: '50%',   top: 200  }, // La Portalada (PasteBlock)
  1: { left: '32.5%', top: 500  }, // Pastís Caigut
  2: { left: '65.1%', top: 800  }, // Llança Ensaïmada
  3: { left: '32.5%', top: 1100 }, // Memòria
  4: { left: '65.1%', top: 1400 }, // Pastís Perfecte
  5: { left: '32.5%', top: 1700 }, // Caça Sasha
  6: { left: '65.1%', top: 2000 }, // Fusió Pastissera
  7: { left: '32.5%', top: 2400 }, // Pastis Blast
  8: { left: '65.1%', top: 2800 }, // Kart Pastisser
  9: { left: '32.5%', top: 3200 }, // Sasha Menjamaracujàs
  10: { left: '65.1%', top: 3600 }, // Mots Pastissers
  11: { left: '32.5%', top: 4000 }, // Sasha GO (Safari de Sants)
  12: { left: '65.1%', top: 4400 }, // Sasha DJ (Bingo Musical)
  13: { left: '32.5%', top: 4800 }, // Trivial Pastisseries
  14: { left: '50%',   top: 5200 }, // Fama (fi del recorregut)
  'raco-edurne': { left: '15%', top: 1250 }, // Easter Egg
};

/* ── Mapa gameId → id del stop al DOM ── */
function stopDomId(gameId) {
  const m = {
    'pasteblock':         'pasteblock',
    'pastis-caigut':      'pastis-caigut',
    'llanca-ensaimada':   'llanca',
    'memoria-pastissera': 'memoria',
    'pastis-perfecte':    'pastis-perfecte',
    'caca-sasha':         'sasha',
    'fusio-pastissera':   'fusio-pastissera',
    'pastis-blast':       'pastis-blast',
    'kart-pastisser':     'kart-pastisser',
    'sasha-comecocos':    'sasha-comecocos',
    'mots-pastissers':    'mots-pastissers',
    'sasha-go':           'sasha-go',
    'bingo-musical':      'bingo-musical',
    'trivial-pastisseries': 'trivial-pastisseries',
    'raco-edurne':        'raco-edurne',
  };
  return m[gameId] || gameId;
}

/* ── Estat global ── */
let currentUser    = null;
let currentProfile = null;
/**
 * myScores: { gameId: score } per a tots els jocs que el jugador ha completat.
 * Poblat per loadMyScores(). Usat per goToGame() per decidir accés.
 */
let myScores = {};

/* ══════════════════════════════════════════════════════════
   AUTENTICACIÓ
   ══════════════════════════════════════════════════════════ */
requireAuth('login.html?next=mapa.html')
  .then(({ user, profile }) => {
    currentUser    = user;
    currentProfile = profile;
    renderNavbarUser(profile, user);
    initMapBase(profile);
    loadMyScores(user.uid);
  })
  .catch(() => {});

/* ── Logout ── */
document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
  await logout();
  window.location.href = 'login.html';
});

/* ══════════════════════════════════════════════════════════
   INICIALITZACIÓ BASE DEL MAPA
   (sense dades de Firebase: avatar + primer joc desbloquejat)
   ══════════════════════════════════════════════════════════ */
function getAvatarStop(profile) {
  const lastPlayed = profile?.lastPlayedGame || localStorage.getItem('obrador_last_played_game');
  if (lastPlayed === 'raco-edurne') {
    const isComissioUnlocked = (myScores['llanca-ensaimada'] !== undefined) || (myScores['memoria-pastissera'] !== undefined) || (myScores['raco-edurne'] !== undefined);
    if (isComissioUnlocked) return 'raco-edurne';
  }
  if (lastPlayed && GAME_ORDER.includes(lastPlayed)) {
    const idx = GAME_ORDER.indexOf(lastPlayed);
    const isAccessible = idx === 0 || myScores[GAME_ORDER[idx - 1]] !== undefined || myScores[lastPlayed] !== undefined;
    if (isAccessible) return idx;
  }

  // Si no tenim registre de l'últim joc jugat, fem servir l'últim completat (o el primer si no n'hi ha cap)
  const lastCompletedIdx = GAME_ORDER.reduce((acc, gId, idx) => {
    return myScores[gId] !== undefined ? idx : acc;
  }, -1);

  return lastCompletedIdx >= 0 ? lastCompletedIdx : 0;
}

function initMapBase(profile) {
  // Avatar del jugador
  const avatarImg = document.getElementById('player-avatar-img');
  const nameLabel = document.getElementById('player-name-label');
  if (avatarImg) avatarImg.src = getDiceBearUrl(profile.avatarStyle, profile.avatarSeed, 48);
  if (nameLabel) nameLabel.textContent = profile.displayName;

  // Posició inicial de l'avatar a l'últim joc jugat
  const initialStop = getAvatarStop(profile);
  moveAvatar(initialStop);

  // Il·luminar la parada inicial mentre carreguen les dades
  const initialIllum = [0];
  if (typeof initialStop === 'number' && !initialIllum.includes(initialStop)) {
    initialIllum.push(initialStop);
  }
  illuminateFog(initialIllum);
}

/* ══════════════════════════════════════════════════════════
   CÀRREGA DE PUNTUACIONS I ACTUALITZACIÓ DEL MAPA
   ══════════════════════════════════════════════════════════ */
async function loadMyScores(uid) {
  // Carregar totes les puntuacions en paral·lel (inclosos jocs del camí i Easter Egg)
  const allGameIds = [...GAME_ORDER, 'raco-edurne'];
  const results = await Promise.all(
    allGameIds.map(async (gameId) => {
      try {
        const ref  = doc(db, 'scores', gameId, 'players', uid);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().score > 0) {
          return { gameId, score: snap.data().score };
        }
      } catch(e) { /* Firebase no configurat */ }
      return { gameId, score: null };
    })
  );

  // Construir el mapa de puntuacions
  myScores = {};
  results.forEach(({ gameId, score }) => {
    if (score !== null) myScores[gameId] = score;
  });

  // Actualitzar el DOM de cada parada
  GAME_ORDER.forEach((gameId, idx) => {
    const stopEl  = document.getElementById('stop-' + stopDomId(gameId));
    const scoreEl = document.getElementById('score-' + gameId);

    if (!stopEl) return;

    const hasScore    = myScores[gameId] !== undefined;
    const prevHasScore = idx === 0 || myScores[GAME_ORDER[idx - 1]] !== undefined;

    // Mostrar puntuació
    if (scoreEl && hasScore) {
      scoreEl.textContent = myScores[gameId].toLocaleString() + ' pts';
    }

    // Estat visual del node
    stopEl.classList.remove('unlocked', 'completed');
    if (hasScore) {
      stopEl.classList.add('completed');
    } else if (prevHasScore) {
      stopEl.classList.add('unlocked');
    }
    // else: queda sense classe (bloquejat, aspecte per defecte)
  });

  // Actualitzar estat del Racó de l'Edurne (Easter Egg vinculat a La Comissió)
  const isComissioUnlocked = (myScores['llanca-ensaimada'] !== undefined) || (myScores['memoria-pastissera'] !== undefined);
  const edurneStopEl  = document.getElementById('stop-raco-edurne');
  const edurneScoreEl = document.getElementById('score-raco-edurne');
  if (edurneStopEl) {
    const hasEdurneScore = myScores['raco-edurne'] !== undefined;
    if (edurneScoreEl && hasEdurneScore) {
      edurneScoreEl.textContent = myScores['raco-edurne'].toLocaleString() + ' pts';
    }
    edurneStopEl.classList.remove('unlocked', 'completed');
    if (hasEdurneScore) {
      edurneStopEl.classList.add('completed');
    } else if (isComissioUnlocked) {
      edurneStopEl.classList.add('unlocked');
    }
  }

  // Calcular el joc desbloquejat per progressió
  const lastCompletedIdx = GAME_ORDER.reduce((acc, gId, idx) => {
    return myScores[gId] !== undefined ? idx : acc;
  }, -1);
  const unlockedIdx = Math.min(lastCompletedIdx + 1, GAME_ORDER.length);

  // Moure l'avatar a l'últim joc jugat (no a l'últim jugable ni al final)
  const avatarStop = getAvatarStop(currentProfile);
  moveAvatar(avatarStop);

  // Actualitzar la boira de guerra
  const illuminated = [];
  GAME_ORDER.forEach((gId, idx) => {
    // Il·luminar tots els jocs completats i el següent desbloquejat
    if (myScores[gId] !== undefined || idx <= unlockedIdx) {
      illuminated.push(idx);
    }
  });
  if (typeof avatarStop === 'number' && !illuminated.includes(avatarStop)) {
    illuminated.push(avatarStop);
  }
  // Il·luminar la Fama si s'ha completat tot
  if (unlockedIdx >= GAME_ORDER.length) illuminated.push(GAME_ORDER.length);

  illuminateFog(illuminated);

  // Scroll cap a la posició de l'avatar (l'últim joc jugat)
  scrollToPosition(avatarStop);
}

/* ══════════════════════════════════════════════════════════
   HELPERS DE MAPA
   ══════════════════════════════════════════════════════════ */

function moveAvatar(stopIdx) {
  const player = document.getElementById('map-player');
  if (!player) return;
  const pos = STOP_POSITIONS[stopIdx] || STOP_POSITIONS[0];
  player.style.left      = pos.left;
  player.style.top       = (pos.top - 30) + 'px';
  player.style.transform = 'translate(-50%, -100%)';
}

function illuminateFog(indices) {
  const fogHoles = document.getElementById('fog-holes');
  if (!fogHoles) return;
  fogHoles.innerHTML = '';

  // Il·luminar les parades numèriques
  indices.forEach(idx => {
    const p = STOP_POSITIONS[idx];
    if (!p) return;
    const pxLeft = parseFloat(p.left) * 7.68;
    fogHoles.innerHTML +=
      `<circle cx="${pxLeft}" cy="${p.top}" r="220" fill="black" opacity="0.95"/>` +
      `<circle cx="${pxLeft}" cy="${p.top}" r="350" fill="black" opacity="0.6"/>`;
  });

  // L'Easter Egg (Racó de l'Edurne) només s'il·lumina si La Comissió està desbloquejada/il·luminada
  const isComissioIlluminated = indices.includes(3) || indices.includes('raco-edurne') || myScores['raco-edurne'] !== undefined;
  const eg = STOP_POSITIONS['raco-edurne'];
  if (eg && isComissioIlluminated) {
    const pxLeft = parseFloat(eg.left) * 7.68;
    fogHoles.innerHTML +=
      `<circle cx="${pxLeft}" cy="${eg.top}" r="120" fill="black" opacity="0.95"/>` +
      `<circle cx="${pxLeft}" cy="${eg.top}" r="200" fill="black" opacity="0.6"/>`;
  }
}

function scrollToPosition(stopIdx) {
  setTimeout(() => {
    const scrollArea = document.getElementById('map-scroll');
    if (!scrollArea) return;
    const pos = STOP_POSITIONS[stopIdx] || STOP_POSITIONS[0];
    const viewHeight = scrollArea.clientHeight || window.innerHeight;
    scrollArea.scrollTop = Math.max(0, pos.top - viewHeight / 2 + 60);
  }, 500);
}

/* ══════════════════════════════════════════════════════════
   NAVEGACIÓ ALS JOCS
   ══════════════════════════════════════════════════════════ */

/**
 * Comprova si un joc és accessible:
 *   - El primer joc (idx 0) sempre ho és.
 *   - Un joc és accessible si el joc anterior té puntuació.
 *   - L'Easter Egg es desbloqueja conjuntament amb «La Comissió».
 */
window.goToGame = function(gameId) {
  if (gameId === 'raco-edurne') {
    const isComissioUnlocked = (myScores['llanca-ensaimada'] !== undefined) || (myScores['memoria-pastissera'] !== undefined) || (myScores['raco-edurne'] !== undefined);
    if (!isComissioUnlocked) {
      const modal = document.getElementById('locked-modal');
      const msg   = document.getElementById('locked-modal-msg');
      if (msg) {
        msg.textContent = `Primer has de desbloquejar «La Comissió» per accedir a aquest racó secret!`;
      }
      if (modal) modal.classList.remove('hidden');
      return;
    }

    try {
      localStorage.setItem('obrador_last_played_game', gameId);
    } catch (e) {}
    window.location.href = GAME_URLS[gameId];
    return;
  }

  const idx = GAME_ORDER.indexOf(gameId);
  if (idx < 0) return; // gameId no reconegut

  const isAccessible = idx === 0 || myScores[GAME_ORDER[idx - 1]] !== undefined;

  if (!isAccessible) {
    const prevGameId   = GAME_ORDER[idx - 1];
    const modal = document.getElementById('locked-modal');
    const msg   = document.getElementById('locked-modal-msg');
    if (msg) {
      msg.textContent = `Primer has de completar «${gameLabel(prevGameId)}» per desbloquejar aquest joc!`;
    }
    if (modal) modal.classList.remove('hidden');
    return;
  }

  try {
    localStorage.setItem('obrador_last_played_game', gameId);
  } catch (e) {}

  const url = GAME_URLS[gameId];
  if (url) window.location.href = url;
};

/* ── Nom llegible de cada joc ── */
function gameLabel(gameId) {
  const labels = {
    'pasteblock':         'PasteBlock',
    'pastis-caigut':      'Pastís Caigut',
    'llanca-ensaimada':   'Llança Ensaïmada',
    'memoria-pastissera': 'Memòria Pastissera',
    'pastis-perfecte':    'Pastís Perfecte',
    'caca-sasha':         'Caça Sasha',
    'fusio-pastissera':   'Fusió Suika',
    'pastis-blast':       'Pastis Blast',
    'kart-pastisser':     'Kart Pastisser',
    'sasha-comecocos':    'Sasha Menjamaracujàs',
    'mots-pastissers':       'Mots Pastissers',
    'sasha-go':              'Sasha GO (Safari Sants)',
    'bingo-musical':         'Bingo Musical',
    'trivial-pastisseries':  'Trivial Pastisseries',
  };
  return labels[gameId] || gameId;
}
