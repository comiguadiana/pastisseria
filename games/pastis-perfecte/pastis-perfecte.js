/**
 * pastis-perfecte.js — Puzzle de capes de pastís
 * Arrossega les capes a l'ordre correcte. Contra el temps.
 */

import { requireAuth, renderNavbarUser, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const LEVELS = [
  {
    name: 'Pastís de Maduixa',
    layers: [
      { emoji: '🟫', label: 'Base de pa de pessic', color: '#8B5E3C' },
      { emoji: '🤍', label: 'Crema de vainilla',    color: '#FFFDE7' },
      { emoji: '🍓', label: 'Maduixes',             color: '#E53935' },
      { emoji: '🟫', label: 'Pa de pessic',         color: '#8B5E3C' },
      { emoji: '🩷', label: 'Glassa de maduixa',    color: '#FF8FAB' },
    ],
    time: 30
  },
  {
    name: 'Pastís de Xocolata',
    layers: [
      { emoji: '🟫', label: 'Base xocolata',        color: '#3E2723' },
      { emoji: '🍫', label: 'Ganache xocolata',     color: '#5D4037' },
      { emoji: '🟫', label: 'Bescuit de cacao',     color: '#4E342E' },
      { emoji: '⬜', label: 'Crema de mantequilla', color: '#FFF9C4' },
      { emoji: '🍫', label: 'Cobertura de xocolata',color: '#3E2723' },
      { emoji: '✨', label: 'Decoració final',       color: '#FFD700' },
    ],
    time: 35
  },
  {
    name: 'Pastís de Fruites',
    layers: [
      { emoji: '🟡', label: 'Base de pa de pessic llimona', color: '#FDD835' },
      { emoji: '🍋', label: 'Crema de llimona',     color: '#FFEE58' },
      { emoji: '🟡', label: 'Segon pa de pessic',   color: '#FDD835' },
      { emoji: '🍊', label: 'Confitura de taronja', color: '#FF8F00' },
      { emoji: '🟡', label: 'Tercer pa de pessic',  color: '#FDD835' },
      { emoji: '🍋', label: 'Cobertura llimona',    color: '#FFEE58' },
      { emoji: '🍇', label: 'Fruites del bosc',     color: '#9C27B0' },
    ],
    time: 40
  },
];

let currentLevel = 0;
let score = 0, bestScore = 0;
let timeLeft = 30;
let gameRunning = false;
let countdownTimer = null;
let dragSrc = null;
let cakeZoneLayers = [];
let uid = null, profile = null;

requireAuth('../../login.html')
  .then(({ user, profile: p }) => {
    uid = user.uid; profile = p;
    renderNavbarUser(p, user);
    bestScore = parseInt(localStorage.getItem(`pp_best_${uid}`) || '0');
    document.getElementById('best').textContent = bestScore.toLocaleString();
    initLevel();
    loadRanking();
  }).catch(() => {});

function initLevel() {
  const lvl = LEVELS[currentLevel % LEVELS.length];
  timeLeft = lvl.time; gameRunning = true;
  cakeZoneLayers = [];
  document.getElementById('pp-overlay').classList.add('hidden');
  document.getElementById('timer').style.color = '';
  document.getElementById('level').textContent = currentLevel + 1;
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;
    if (timeLeft <= 10) document.getElementById('timer').style.color = '#FF8FAB';
    if (timeLeft <= 0) { endLevel(false); }
  }, 1000);
  buildUI(lvl);
  updateHUD();
}

function buildUI(lvl) {
  // Recepta (ordre correcte)
  const recipe = document.getElementById('pp-recipe');
  recipe.innerHTML = '';
  [...lvl.layers].reverse().forEach((l, i) => {
    const el = document.createElement('div');
    el.className = 'pp-layer';
    el.style.borderLeft = `4px solid ${l.color}`;
    el.innerHTML = `<span class="pp-layer-num">${lvl.layers.length - i}</span>
      <span>${l.emoji}</span><span>${l.label}</span>`;
    recipe.appendChild(el);
  });

  // Ingredients (barrejats)
  const shuffled = [...lvl.layers].sort(() => Math.random() - 0.5);
  const ingred = document.getElementById('pp-ingredients');
  ingred.innerHTML = '';
  shuffled.forEach((l, i) => {
    const el = document.createElement('div');
    el.className = 'pp-layer';
    el.draggable = true;
    el.dataset.label = l.label;
    el.style.borderLeft = `4px solid ${l.color}`;
    el.innerHTML = `<span>${l.emoji}</span><span>${l.label}</span>`;
    el.addEventListener('dragstart', (e) => {
      dragSrc = el;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', l.label);
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    // Touch drag support (simple: click per afegir)
    el.addEventListener('click', () => addLayerToZone(l, el));
    ingred.appendChild(el);
  });

  // Zona de construcció
  const zone = document.getElementById('pp-cake-zone');
  zone.innerHTML = '<div class="pp-cake-placeholder">← Arrossega o clica les capes</div>';
  cakeZoneLayers = [];

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (!dragSrc) return;
    const label = e.dataTransfer.getData('text/plain');
    const layer = lvl.layers.find(l => l.label === label);
    if (!layer) return;
    addLayerToZone(layer, dragSrc);
    dragSrc = null;
  });
}

function addLayerToZone(layer, srcEl) {
  if (!gameRunning) return;
  if (cakeZoneLayers.find(l => l.label === layer.label)) return; // ja afegit

  cakeZoneLayers.unshift(layer); // afegir a dalt (les capes s'apilen de baix cap amunt)
  srcEl.style.opacity = '0.3';
  srcEl.style.pointerEvents = 'none';

  renderCakeZone();
}

function renderCakeZone() {
  const zone = document.getElementById('pp-cake-zone');
  zone.innerHTML = '';
  if (!cakeZoneLayers.length) {
    zone.innerHTML = '<div class="pp-cake-placeholder">← Arrossega o clica les capes</div>';
    return;
  }
  cakeZoneLayers.forEach((l, i) => {
    const el = document.createElement('div');
    el.className = 'pp-layer';
    el.style.width = '100%';
    el.style.borderLeft = `4px solid ${l.color}`;
    el.innerHTML = `<span>${l.emoji}</span><span style="font-size:0.85rem">${l.label}</span>`;
    // Click per eliminar
    el.title = 'Clica per eliminar';
    el.addEventListener('click', () => removeCakeLayer(i, l));
    zone.appendChild(el);
  });
}

function removeCakeLayer(idx, layer) {
  cakeZoneLayers.splice(idx, 1);
  renderCakeZone();
  // Torna a habilitar l'ingredient
  const ingreds = document.querySelectorAll('#pp-ingredients .pp-layer');
  ingreds.forEach(el => {
    if (el.dataset.label === layer.label) {
      el.style.opacity = '';
      el.style.pointerEvents = '';
    }
  });
}

/* ── Comprovar ── */
document.getElementById('btn-check').addEventListener('click', checkCake);

function checkCake() {
  if (!gameRunning) return;
  const lvl = LEVELS[currentLevel % LEVELS.length];

  if (cakeZoneLayers.length !== lvl.layers.length) {
    showToast(`⚠️ Falten ${lvl.layers.length - cakeZoneLayers.length} capes!`, 'info', 2000);
    return;
  }

  // Les capes de la zona van de dalt a baix (cakeZoneLayers[0] = top)
  // Les capes de la recepta van de baix a dalt (layers[0] = base)
  const correct = [...cakeZoneLayers].reverse();
  let errors = 0;
  correct.forEach((l, i) => {
    if (l.label !== lvl.layers[i].label) errors++;
  });

  if (errors === 0) {
    endLevel(true);
  } else {
    score = Math.max(0, score - errors * 20);
    showToast(`❌ ${errors} capes incorrectes! -${errors*20}pts`, 'error', 2000);
    updateHUD();
  }
}

function updateHUD() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('best').textContent  = bestScore.toLocaleString();
}

async function endLevel(won) {
  gameRunning = false;
  clearInterval(countdownTimer);

  if (won) {
    const bonus = timeLeft * 10 + 200;
    score += bonus;
    showToast(`🎂 Perfecte! +${bonus} punts`, 'success', 2000);
  }

  const isNew = score > bestScore;
  if (isNew) { bestScore = score; }

  document.getElementById('pp-emoji').textContent = won ? '🎂' : '⏰';
  document.getElementById('pp-title').textContent = won ? 'Pastís Perfecte!' : 'Temps esgotat!';
  document.getElementById('pp-score').textContent = score.toLocaleString() + ' punts';
  document.getElementById('pp-msg').textContent   = won
    ? `Nivell ${currentLevel + 1} completat! Temps restant: ${timeLeft}s`
    : 'Intenta-ho més ràpid!';
  document.getElementById('btn-next').textContent = won ? 'Següent nivell! 🎂' : 'Tornar a intentar-ho!';
  document.getElementById('pp-overlay').classList.remove('hidden');

  if (uid && profile && won) {
    try {
      const isRecord = await saveScore(GAMES.PASTIS_PERFECTE, uid, score, profile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.PASTIS_PERFECTE, 10);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.PASTIS_PERFECTE, uid);
        
      }
    } catch(e) {}
  }
}

async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.PASTIS_PERFECTE, 10);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch(e) {
    document.getElementById('ranking-container').innerHTML =
      '<p style="text-align:center;padding:1rem;color:var(--gray-400)">Configura Firebase per veure el rànquing</p>';
  }
}

document.getElementById('btn-restart').addEventListener('click', () => { clearInterval(countdownTimer); initLevel(); });
document.getElementById('btn-next').addEventListener('click', () => {
  document.getElementById('pp-overlay').classList.add('hidden');
  currentLevel++;
  initLevel();
});
