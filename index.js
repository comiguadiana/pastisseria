/**
 * index.js — Landing page de la Pastisseria Guadiana
 */

import { onAuthReady, logout, renderNavbarUser, getDiceBearUrl } from './assets/js/auth.js';
import { getUnlockedGames, GAMES } from './assets/js/ranking.js';
import { getFirestore, collection, getCountFromServer }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './assets/js/firebase-config.js';

/* ── Autenticació ── */
onAuthReady((user, profile) => {
  renderNavbarUser(profile, user);

  // Botó "Jugar ara" — redirigeix al mapa si hi ha sessió, sinó al login
  const btnJugar = document.getElementById('btn-jugar');
  if (btnJugar) {
    btnJugar.href = user ? 'mapa.html' : 'login.html';
  }
});

/* ── Logout ── */
document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
  await logout();
  window.location.reload();
});

/* ── Desbloqueix de jocs ── */
function updateGameBadges() {
  const unlocked = getUnlockedGames();
  const badges = {
    'pasteblock':         null, // sempre desbloquejat
    'pastis-caigut':      'badge-pastis-caigut',
    'llanca-ensaimada':   'badge-llanca',
    'memoria-pastissera': 'badge-memoria',
    'pastis-perfecte':    'badge-pastis-perfecte',
    'caca-sasha':         'badge-sasha'
  };

  for (const [gameId, badgeId] of Object.entries(badges)) {
    if (!badgeId) continue;
    const el = document.getElementById(badgeId);
    if (!el) continue;
    if (unlocked.includes(gameId)) {
      el.textContent = '✓ Desbloquejat';
      el.className = 'badge-game unlocked';
    }
  }

  // Les cards bloquejades no es poden clicar
  const cards = document.querySelectorAll('.card-game');
  const gameOrder = ['pasteblock', 'pastis-caigut', 'llanca-ensaimada',
                     'memoria-pastissera', 'pastis-perfecte', 'caca-sasha'];
  cards.forEach((card, i) => {
    if (!unlocked.includes(gameOrder[i])) {
      card.classList.add('locked');
      card.style.cursor = 'not-allowed';
      card.onclick = (e) => {
        e.preventDefault();
        showLockedToast();
      };
    }
  });
}

function showLockedToast() {
  let container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast info';
  toast.textContent = '🔒 Primer has de completar el joc anterior!';
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ── Comptador de jugadors i jocs ── */
async function loadStats() {
  try {
    const snap = await getCountFromServer(collection(db, 'users'));
    const elPlayers = document.getElementById('stat-players');
    if (elPlayers) elPlayers.textContent = snap.data().count;
  } catch (e) {
    console.error("Error loading players count:", e);
  }

  const elGames = document.getElementById('stat-games');
  if (elGames) elGames.textContent = Object.keys(GAMES).length;
}

/* ── Init ── */
updateGameBadges();
loadStats();
