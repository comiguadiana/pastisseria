/**
 * pasteblock.js — Joc BlockBlast amb pastissos de paper maixé
 *
 * Mecànica:
 * - Tauler de 8x10 cel·les amb 6 tipus de pastissos
 * - Clica un grup de 2+ pastissos iguals connectats per eliminar-los
 * - Punts = n² on n = mida del grup
 * - El joc acaba quan no hi ha grups de 2+ pastissos
 */

import { requireAuth, renderNavbarUser, logout, getDiceBearUrl, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Config del joc ── */
const COLS   = 8;
const ROWS   = 10;
const TYPES  = 6; // 6 tipus de pastissos
const CELL   = 64; // px per cel·la

/* Emojis + colors de fons per a cada tipus */
const PASTRY = [
  { emoji: '🥐', color: '#D4A017', label: 'Cruasán'  },
  { emoji: '🍩', color: '#FF8FAB', label: 'Donut'    },
  { emoji: '🧁', color: '#CE93D8', label: 'Magdalena'},
  { emoji: '🎂', color: '#FFD6E5', label: 'Pastís'   },
  { emoji: '🥧', color: '#B8F0D8', label: 'Tarta'    },
  { emoji: '🍪', color: '#8B5E3C', label: 'Galeta'   },
];

let board      = [];
let score      = 0;
let bestScore  = 0;
let level      = 1;
let moves      = 0;
let animating  = false;
let selected   = null; // grup seleccionat
let uid        = null;
let profile    = null;

const canvas    = document.getElementById('pb-canvas');
const ctx       = canvas.getContext('2d');

/* ── Autenticació ── */
requireAuth('../../login.html')
  .then(async ({ user, profile: p }) => {
    uid = user.uid; profile = p;
    renderNavbarUser(p, user);
    try {
      const ref = doc(db, 'scores', GAMES.PASTEBLOCK, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) bestScore = snap.data().score;
    } catch(e) {}
    const bestEl = document.getElementById('best');
    if (bestEl) bestEl.textContent = bestScore.toLocaleString();
    initGame();
    loadRanking();
  })
  .catch(() => {});

/* ── Inicialitza el joc ── */
function initGame() {
  score  = 0;
  level  = 1;
  moves  = 0;
  selected = null;
  board  = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => Math.floor(Math.random() * TYPES))
  );

  resizeCanvas();
  updateHUD();
  draw();
  document.getElementById('pb-overlay').classList.add('hidden');
}

/* ── Redimensiona el canvas (adaptatiu a amplada i alçada de pantalla) ── */
function resizeCanvas() {
  const isHeaderHidden = document.body.classList.contains('navbar-hidden');
  const navEl = document.querySelector('.navbar');
  const hudEl = document.querySelector('.pb-hud') || document.querySelector('.game-hud');
  
  const navH = (!isHeaderHidden && navEl && navEl.offsetParent !== null) ? navEl.offsetHeight : 0;
  const hudH = (hudEl && hudEl.offsetParent !== null) ? hudEl.offsetHeight : 45;
  
  // Ample i alt màxims disponibles per al tauler
  const maxW = Math.min(window.innerWidth - (window.innerWidth < 500 ? 12 : 24), 560);
  
  // Deixem marge per al HUD, espaiat i padding
  const extraPadding = window.innerWidth < 500 ? 18 : 36;
  const maxH = Math.max(260, window.innerHeight - navH - hudH - extraPadding);
  
  // Calculem la cel·la perquè càpiga TANT en amplada (8 cols) com en alçada (10 rows)
  const cellByW = Math.floor(maxW / COLS);
  const cellByH = Math.floor(maxH / ROWS);
  
  const cell = Math.max(24, Math.min(cellByW, cellByH, 56));
  
  canvas.width  = cell * COLS;
  canvas.height = cell * ROWS;
  canvas._cell  = cell;
  draw();
}

window.addEventListener('resize', resizeCanvas);

/* ── Dibuix ── */
function draw() {
  const cell   = canvas._cell || CELL;
  const w      = canvas.width;
  const h      = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Fons
  ctx.fillStyle = '#FFF8F0';
  roundRect(ctx, 0, 0, w, h, 20);
  ctx.fill();

  // Línies de la graella
  ctx.strokeStyle = 'rgba(212,160,23,0.15)';
  ctx.lineWidth   = 1;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r*cell); ctx.lineTo(w, r*cell); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c*cell, 0); ctx.lineTo(c*cell, h); ctx.stroke();
  }

  // Cel·les
  const selGroup = selected || [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const type = board[r][c];
      if (type === null) continue;

      const x   = c * cell;
      const y   = r * cell;
      const pad = 4;
      const p   = PASTRY[type];

      // Fons cel·la
      const isSelected = selGroup.some(s => s.r === r && s.c === c);
      ctx.fillStyle = isSelected
        ? 'rgba(255,143,171,0.6)'
        : hexToRgba(p.color, 0.35);

      roundRect(ctx, x+pad, y+pad, cell-pad*2, cell-pad*2, 10);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#FF8FAB';
        ctx.lineWidth   = 3;
        roundRect(ctx, x+pad, y+pad, cell-pad*2, cell-pad*2, 10);
        ctx.stroke();
      }

      // Emoji del pastís
      ctx.font = `${Math.floor(cell * 0.52)}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, x + cell/2, y + cell/2);
    }
  }
}

/* ── Events de ratolí / touch ── */
canvas.addEventListener('click', onCanvasClick);
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const t = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (t.clientX - rect.left) * scaleX;
  const y = (t.clientY - rect.top)  * scaleY;
  handleTap(x, y);
}, { passive: false });

function onCanvasClick(e) {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  handleTap((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
}

function handleTap(x, y) {
  if (animating) return;
  const cell = canvas._cell || CELL;
  const c    = Math.floor(x / cell);
  const r    = Math.floor(y / cell);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  if (board[r][c] === null) return;

  const group = findGroup(r, c);

  if (selected && selected.length > 0 &&
      selected[0].r === group[0]?.r && selected[0].c === group[0]?.c) {
    // Segon clic al mateix grup → eliminar
    if (group.length >= 2) {
      removeGroup(group);
    }
    selected = null;
    draw();
    return;
  }

  if (group.length < 2) {
    selected = null;
    showToast('⚠️ Cal un grup de 2 o més pastissos!', 'info', 1500);
    draw();
    return;
  }

  selected = group;
  draw();
}

/* ── Cerca flood-fill del grup ── */
function findGroup(r, c) {
  const type   = board[r][c];
  const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const group  = [];

  function dfs(row, col) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (visited[row][col]) return;
    if (board[row][col] !== type) return;
    visited[row][col] = true;
    group.push({ r: row, c: col });
    dfs(row-1, col); dfs(row+1, col);
    dfs(row, col-1); dfs(row, col+1);
  }

  dfs(r, c);
  return group;
}

/* ── Elimina el grup i aplica gravetat ── */
function removeGroup(group) {
  animating = true;
  const n = group.length;

  // Puntuació: n^2 * bonus de nivell
  const pts = n * n * level;
  score += pts;
  moves++;

  // Eliminar cel·les
  for (const { r, c } of group) {
    board[r][c] = null;
  }

  // Gravetat (les peces cauen)
  applyGravity();

  // Comprova si el joc ha acabat
  if (!hasValidMove()) {
    // Bonus si s'ha buidat tot el tauler
    if (isBoardEmpty()) {
      score += 1000 * level;
      showToast('🏆 TAULER BUIT! +1000 punts!', 'success', 3000);
    }
    endGame();
  } else {
    // Pujar de nivell cada 500 punts
    const newLevel = Math.floor(score / 500) + 1;
    if (newLevel > level) {
      level = newLevel;
      showToast(`🎉 Nivell ${level}!`, 'success', 2000);
    }
  }

  updateHUD();
  animating = false;
  selected  = null;
  draw();
}

/* ── Gravetat: les peces cauen ── */
function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    let writeR = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== null) {
        board[writeR][c] = board[r][c];
        if (writeR !== r) board[r][c] = null;
        writeR--;
      }
    }
    while (writeR >= 0) { board[writeR][c] = null; writeR--; }
  }
}

/* ── Comprova si hi ha moviments vàlids ── */
function hasValidMove() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== null && findGroup(r, c).length >= 2) return true;
    }
  }
  return false;
}

function isBoardEmpty() {
  return board.every(row => row.every(cell => cell === null));
}

/* ── Fi del joc ── */
async function endGame() {
  const isNewBest = score > bestScore;
  if (isNewBest) {
    bestScore = score;
    
  }

  const overlay     = document.getElementById('pb-overlay');
  const overlayEmoji = document.getElementById('overlay-emoji');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayScore = document.getElementById('overlay-score');
  const overlayMsg   = document.getElementById('overlay-msg');

  overlayEmoji.textContent = isNewBest ? '🏆' : '🎂';
  overlayTitle.textContent = isNewBest ? 'Nou Rècord!' : 'Fi del Joc!';
  overlayScore.textContent = score.toLocaleString() + ' punts';
  overlayMsg.textContent   = isNewBest
    ? '¡Fantàstic! Has superat el teu millor marcador!'
    : `Millor puntuació: ${bestScore.toLocaleString()}`;

  overlay.classList.remove('hidden');

  // Desa a Firebase
  if (uid && profile) {
    try {
      const isRecord = await saveScore(GAMES.PASTEBLOCK, uid, score, profile);
      if (isRecord) {
        const ranking  = await getGameRanking(GAMES.PASTEBLOCK, 10);
        const myRank   = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.PASTEBLOCK, uid);
        
      }
    } catch(e) { /* Firebase no configurat */ }
  }
}

/* ── HUD ── */
function updateHUD() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('best-score').textContent = bestScore.toLocaleString();
  document.getElementById('level').textContent = level;
  document.getElementById('moves').textContent = moves;
}

/* ── Ranking ── */
async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.PASTEBLOCK, 10);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch(e) {
    document.getElementById('ranking-container').innerHTML =
      '<p class="text-center" style="color:var(--gray-400);padding:1rem">Configura Firebase per veure el rànquing</p>';
  }
}

/* ── Events botons ── */
document.getElementById('btn-restart').addEventListener('click', initGame);
document.getElementById('overlay-restart').addEventListener('click', initGame);

const btnToggleHeader = document.getElementById('btn-toggle-header');
if (btnToggleHeader) {
  // Comprovar si ja s'havia amagat la capçalera
  const savedState = localStorage.getItem('pasteblock_hide_header');
  if (savedState === 'true') {
    document.body.classList.add('navbar-hidden');
    btnToggleHeader.classList.add('active');
    btnToggleHeader.title = 'Mostrar capçalera';
    const icon = btnToggleHeader.querySelector('.toggle-icon');
    if (icon) icon.textContent = '🖥️';
  }

  btnToggleHeader.addEventListener('click', () => {
    const isHidden = document.body.classList.toggle('navbar-hidden');
    btnToggleHeader.classList.toggle('active', isHidden);
    btnToggleHeader.title = isHidden ? 'Mostrar capçalera' : 'Amagar capçalera';
    const icon = btnToggleHeader.querySelector('.toggle-icon');
    if (icon) icon.textContent = isHidden ? '🖥️' : '📱';
    localStorage.setItem('pasteblock_hide_header', isHidden ? 'true' : 'false');
    
    // Reajustar canvas després del canvi de visibilitat
    setTimeout(resizeCanvas, 50);
  });
}

document.getElementById('btn-ranking').addEventListener('click', async () => {
  const modal = document.getElementById('ranking-modal');
  const body  = document.getElementById('ranking-modal-body');
  body.innerHTML = '<div class="flex-center"><div class="spinner"></div></div>';
  modal.classList.remove('hidden');
  try {
    const entries = await getGameRanking(GAMES.PASTEBLOCK, 20);
    renderRankingTable(entries, 'ranking-modal-body', uid);
  } catch(e) {
    body.innerHTML = '<p class="text-center" style="padding:1rem">Configura Firebase per veure el rànquing</p>';
  }
});

document.getElementById('close-ranking').addEventListener('click', () => {
  document.getElementById('ranking-modal').classList.add('hidden');
});

/* ── Utilitats ── */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
