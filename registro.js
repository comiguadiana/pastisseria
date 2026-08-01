/**
 * registro.js — Pàgina de perfil: editar nom i avatar DiceBear
 */

import { requireAuth, updateProfile, renderNavbarUser, logout, getDiceBearUrl, showToast }
  from './assets/js/auth.js';
import { getGameRanking, GAMES } from './assets/js/ranking.js';
import { db } from './assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const DICEBEAR_STYLES = [
  { id: 'bottts', name: 'Robots' },
  { id: 'adventurer', name: 'Aventurers' },
  { id: 'avataaars', name: 'Persones' },
  { id: 'fun-emoji', name: 'Emojis' },
  { id: 'pixel-art', name: 'Píxel Art' },
  { id: 'shapes', name: 'Formes' }
];

let currentCategory = 'adventurer';

const GAME_INFO = [
  { id: GAMES.PASTEBLOCK,         emoji:'🧩', label:'PasteBlock' },
  { id: GAMES.PASTIS_CAIGUT,      emoji:'🧺', label:'Pastís Caigut' },
  { id: GAMES.LLANCA_ENSAIMADA,   emoji:'🎯', label:'Llança l\'Ensaïmada' },
  { id: GAMES.MEMORIA_PASTISSERA, emoji:'🧠', label:'Memòria Pastissera' },
  { id: GAMES.PASTIS_PERFECTE,    emoji:'🍰', label:'Pastís Perfecte' },
  { id: GAMES.CACA_SASHA,         emoji:'🐍', label:'Caça la Sasha!' },
  { id: GAMES.FUSIO_PASTISSERA,   emoji:'🎂', label:'Fusió Pastissera' },
];

let uid = null;
let profile = null;
let selectedStyle = 'adventurer';
let currentSeed   = '';

/* ── Auth ── */
requireAuth('login.html?next=registro.html')
  .then(({ user, profile: p }) => {
    uid     = user.uid;
    profile = p;
    renderNavbarUser(p, user);
    populateProfile(p, user);
    renderTabs();
    buildAvatarStyles();
    loadMyScores();
  })
  .catch(() => {});

document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
  await logout();
  window.location.href = 'login.html';
});

/* ── Omplir perfil ── */
function populateProfile(p, user) {
  selectedStyle = p.avatarStyle || 'adventurer';
  currentSeed   = p.avatarSeed  || uid?.slice(0, 8) || 'guadiana';

  currentCategory = DICEBEAR_STYLES.find(s => s.id === selectedStyle) ? selectedStyle : 'adventurer';

  document.getElementById('input-name').value = p.displayName || '';
  document.getElementById('input-seed').value = currentSeed;
  document.getElementById('profile-name-display').textContent  = p.displayName || 'Jugador';
  document.getElementById('profile-email-display').textContent = user.email || '';

  document.getElementById('stat-total').textContent = (p.totalScore || 0).toLocaleString();
  document.getElementById('stat-games').textContent = p.gamesPlayed || 0;

  updateAvatarPreview();
}

function renderTabs() {
  const container = document.getElementById('avatar-tabs');
  container.innerHTML = DICEBEAR_STYLES.map(style => `
    <button type="button" class="tab-btn ${style.id === currentCategory ? 'active' : ''}" data-category="${style.id}">
      ${style.name}
    </button>
  `).join('');

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.category;
      buildAvatarStyles();
    });
  });
}

/* ── Grid d'estils DiceBear ── */
function buildAvatarStyles() {
  const grid = document.getElementById('avatar-style-grid');
  grid.innerHTML = '';
  
  for (let i = 0; i < 15; i++) {
    const randomSeed = Math.random().toString(36).substring(2, 10);
    
    const btn = document.createElement('button');
    btn.className = 'avatar-style-btn';
    
    const img = document.createElement('img');
    img.src = getDiceBearUrl(currentCategory, randomSeed, 70);
    img.alt = currentCategory;
    img.loading = 'lazy';
    
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-style-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      
      selectedStyle = currentCategory;
      currentSeed = randomSeed;
      document.getElementById('input-seed').value = currentSeed;
      updateAvatarPreview();
    });
    grid.appendChild(btn);
  }
}

/* ── Preview de l'avatar ── */
function updateAvatarPreview() {
  const url = getDiceBearUrl(selectedStyle, currentSeed, 110);
  document.getElementById('profile-avatar-big').src  = url;
  document.getElementById('nav-avatar').src = getDiceBearUrl(selectedStyle, currentSeed, 36);
}

/* ── Inputs en temps real ── */
document.getElementById('input-seed').addEventListener('input', (e) => {
  currentSeed = e.target.value.trim() || uid?.slice(0, 8);
  updateAvatarPreview();
  buildAvatarStyles();
});

document.getElementById('input-name').addEventListener('input', (e) => {
  document.getElementById('profile-name-display').textContent = e.target.value || 'Jugador';
});

document.getElementById('btn-random-seed').addEventListener('click', () => {
  // Regenerem la graella d'opcions sense canviar l'avatar actual
  buildAvatarStyles();
});

/* ── Desar ── */
document.getElementById('btn-save').addEventListener('click', async () => {
  const name = document.getElementById('input-name').value.trim();
  if (!name) { showToast('⚠️ El nom no pot estar buit!', 'error'); return; }
  if (name.length > 20) { showToast('⚠️ Màxim 20 caràcters!', 'error'); return; }

  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Desant...';

  try {
    await updateProfile(uid, {
      displayName: name,
      avatarStyle: selectedStyle,
      avatarSeed:  currentSeed,
    });
    showToast('✅ Perfil actualitzat!', 'success');
    document.getElementById('nav-username').textContent = name;
  } catch(e) {
    showToast('❌ Error desant el perfil', 'error');
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Desar canvis';
  }
});

/* ── Carregar les meves puntuacions ── */
async function loadMyScores() {
  const container = document.getElementById('my-scores-container');
  const grid = document.createElement('div');
  grid.className = 'my-scores-grid';

  for (const game of GAME_INFO) {
    const card = document.createElement('div');
    card.className = 'my-score-card';

    let scoreText = '<div class="my-score-none">Sense puntuació</div>';
    try {
      const ref  = doc(db, 'scores', game.id, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        scoreText = `<div class="my-score-val">${snap.data().score.toLocaleString()} pts</div>`;
      }
    } catch(e) { /* Firebase no configurat */ }

    card.innerHTML = `
      <div class="my-score-emoji">${game.emoji}</div>
      <div class="my-score-game">${game.label}</div>
      ${scoreText}`;
    grid.appendChild(card);
  }

  container.innerHTML = '';
  container.appendChild(grid);
}
