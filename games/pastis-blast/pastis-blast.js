/**
 * pastis-blast.js — Joc Block Blast amb figures de postres i la Sasha
 *
 * Mecànica:
 * - Tauler de 9×9 cel·les
 * - 3 peces (formes geomètriques de postres) disponibles al torn
 * - Arrossega una peça al tauler per col·locar-la
 * - Quan una fila o columna queda completa → s'elimina (els postres desapareixen)
 * - Cada 3 eliminacions la Sasha apareix a menjar-se la fila amb animació
 * - Si cap de les peces restants pot ser col·locada → Game Over
 * - El botó de Reiniciar desa la puntuació actual i mostra el resultat
 */

import { requireAuth, renderNavbarUser, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ══════════════════════════════════════════
   CONFIGURACIÓ
   ══════════════════════════════════════════ */

const COLS = 9;
const ROWS = 9;
const SASHA_TRIGGER = 3; // cada N eliminacions apareix la Sasha
const PASTRY_IMG_BASE = '../../assets/img/pasteles/';

/* Postres disponibles amb la seva imatge */
const PASTRIES = [
  { id: 'cruasan',   img: 'cruasan.png',   label: 'Cruasant',   color: '#D4A017' },
  { id: 'magdalena', img: 'magdalena.png', label: 'Magdalena',  color: '#CE93D8' },
  { id: 'donut',     img: 'donut.png',     label: 'Donut',      color: '#FF8FAB' },
  { id: 'pastis',    img: 'pastis.png',    label: 'Pastís',     color: '#FFD6E5' },
  { id: 'ensaimada', img: 'ensaimada.png', label: 'Ensaïmada',  color: '#B8F0D8' },
  { id: 'cunya',     img: 'cunya.png',     label: 'Cunya',      color: '#F0C040' },
];

/* Missatges de la Sasha */
const SASHA_MSGS = [
  'Mmm! 😋', 'Boníssim! 🤤', 'Més, més! 😍',
  'Deliciós! ✨', 'Que bo! 🥰', 'Olé! 🎉',
  'Increïble! 😲', 'Me\'n menjo un altre! 🤭',
];

/* ══════════════════════════════════════════
   DEFINICIÓ DE FORMES DE PECES
   Cada forma és una matriu de [row, col] relatius
   ══════════════════════════════════════════ */
const PIECE_SHAPES = [
  // 1×1
  { name: 'punt',    cells: [[0,0]],
    pastry: 'cunya' },

  // 1×2 horitzontal
  { name: 'barra-h2', cells: [[0,0],[0,1]],
    pastry: 'donut' },
  // 2×1 vertical
  { name: 'barra-v2', cells: [[0,0],[1,0]],
    pastry: 'donut' },

  // 1×3 horitzontal
  { name: 'barra-h3', cells: [[0,0],[0,1],[0,2]],
    pastry: 'ensaimada' },
  // 3×1 vertical
  { name: 'barra-v3', cells: [[0,0],[1,0],[2,0]],
    pastry: 'ensaimada' },

  // 1×4 horitzontal — cruasants!
  { name: 'barra-h4', cells: [[0,0],[0,1],[0,2],[0,3]],
    pastry: 'cruasan' },
  // 4×1 vertical
  { name: 'barra-v4', cells: [[0,0],[1,0],[2,0],[3,0]],
    pastry: 'cruasan' },

  // 1×5 horitzontal
  { name: 'barra-h5', cells: [[0,0],[0,1],[0,2],[0,3],[0,4]],
    pastry: 'cruasan' },
  // 5×1 vertical
  { name: 'barra-v5', cells: [[0,0],[1,0],[2,0],[3,0],[4,0]],
    pastry: 'cruasan' },

  // 2×2 quadrat — magdalenes!
  { name: 'quadrat-2', cells: [[0,0],[0,1],[1,0],[1,1]],
    pastry: 'magdalena' },

  // 3×3 quadrat — pastís gran!
  { name: 'quadrat-3', cells: [
    [0,0],[0,1],[0,2],
    [1,0],[1,1],[1,2],
    [2,0],[2,1],[2,2]
  ], pastry: 'pastis' },

  // L-shape dreta
  { name: 'l-dr', cells: [[0,0],[1,0],[2,0],[2,1]],
    pastry: 'pastis' },
  // L-shape esquerra
  { name: 'l-dl', cells: [[0,1],[1,1],[2,1],[2,0]],
    pastry: 'pastis' },
  // L-shape cap amunt dreta
  { name: 'l-ur', cells: [[0,0],[0,1],[1,0],[2,0]],
    pastry: 'pastis' },
  // L-shape cap amunt esquerra
  { name: 'l-ul', cells: [[0,0],[0,1],[1,1],[2,1]],
    pastry: 'pastis' },

  // T-shape
  { name: 't-h', cells: [[0,0],[0,1],[0,2],[1,1]],
    pastry: 'cunya' },
  { name: 't-v', cells: [[0,1],[1,0],[1,1],[2,1]],
    pastry: 'cunya' },

  // S/Z shapes
  { name: 's-h', cells: [[0,1],[0,2],[1,0],[1,1]],
    pastry: 'ensaimada' },
  { name: 'z-h', cells: [[0,0],[0,1],[1,1],[1,2]],
    pastry: 'ensaimada' },

  // Corner / angle (2×2 amb 3 cel·les)
  { name: 'angle-tr', cells: [[0,0],[0,1],[1,0]],
    pastry: 'magdalena' },
  { name: 'angle-tl', cells: [[0,0],[0,1],[1,1]],
    pastry: 'magdalena' },
  { name: 'angle-br', cells: [[0,0],[1,0],[1,1]],
    pastry: 'magdalena' },
  { name: 'angle-bl', cells: [[0,1],[1,0],[1,1]],
    pastry: 'magdalena' },

  // Creu petita
  { name: 'creu', cells: [[0,1],[1,0],[1,1],[1,2],[2,1]],
    pastry: 'donut' },
];

/* ══════════════════════════════════════════
   ESTAT DEL JOC
   ══════════════════════════════════════════ */
let board       = [];   // board[r][c] = pastry id o null
let pieces      = [];   // 3 peces actuals [ { shape, pastryIdx, used }, ... ]
let score       = 0;
let bestScore   = 0;
let linesTotal  = 0;    // total de files/columnes eliminades
let sashaCount  = 0;    // comptador per al trigger de Sasha
let uid         = null;
let profile     = null;
let gameOver    = false;
let placing     = false; // evita re-entrades durant col·locació asíncrona

// Drag & drop estat
let dragging    = null; // { pieceIdx, piece, cellSize, ghost }

/* ══════════════════════════════════════════
   PRECARREGAR IMATGES
   ══════════════════════════════════════════ */
const pastryImages = {};
PASTRIES.forEach(p => {
  const img = new Image();
  img.src = PASTRY_IMG_BASE + p.img;
  pastryImages[p.id] = img;
});

/* ══════════════════════════════════════════
   DOM REFERENCES
   ══════════════════════════════════════════ */
const boardEl        = document.getElementById('pb-board');
const overlayEl      = document.getElementById('pb-overlay');
const sashaContainer = document.getElementById('sasha-container');
const sashaChar      = document.getElementById('sasha-char');
const sashaSpeech    = document.getElementById('sasha-speech');
const trayEl         = document.getElementById('pb-pieces-tray');

/* ══════════════════════════════════════════
   AUTENTICACIÓ
   ══════════════════════════════════════════ */
requireAuth('../../login.html')
  .then(async ({ user, profile: p }) => {
    uid = user.uid; profile = p;
    renderNavbarUser(p, user);
    try {
      const ref  = doc(db, 'scores', GAMES.PASTIS_BLAST, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) bestScore = snap.data().score || 0;
    } catch(e) {}
    updateHUD();
    initGame();
    loadRanking();
  })
  .catch(() => {});

/* ══════════════════════════════════════════
   INICIALITZACIÓ
   ══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   INICIALITZACIÓ
   ══════════════════════════════════════════ */
let selectedPieceIdx = null; // per a selecció per toc/clic

function initGame() {
  board            = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  score            = 0;
  linesTotal       = 0;
  sashaCount       = 0;
  gameOver         = false;
  placing          = false;
  pieces           = [];
  selectedPieceIdx = null;

  overlayEl.classList.add('hidden');
  sashaContainer.classList.add('hidden');

  buildBoardDOM();
  dealPieces();
  updateHUD();
}

/* ── Construeix la graella DOM ── */
function buildBoardDOM() {
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'pb-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.id = `cell-${r}-${c}`;
      
      // Suport per fer clic/toc sobre la cel·la quan hi ha una peça seleccionada
      cell.addEventListener('click', () => onCellClick(r, c));
      cell.addEventListener('mouseenter', () => {
        if (selectedPieceIdx !== null && !dragging) {
          clearHighlights();
          const piece = pieces[selectedPieceIdx];
          if (piece && !piece.used) {
            const anchor = getAnchorPos(r, c, piece.shape);
            highlightPlacement(anchor.r, anchor.c, piece);
          }
        }
      });
      boardEl.appendChild(cell);
    }
  }

  boardEl.addEventListener('mouseleave', () => {
    if (selectedPieceIdx !== null && !dragging) {
      clearHighlights();
    }
  });
}

function onCellClick(r, c) {
  if (gameOver || placing || selectedPieceIdx === null) return;
  const piece = pieces[selectedPieceIdx];
  if (!piece || piece.used) {
    deselectPiece();
    return;
  }
  const anchor = getAnchorPos(r, c, piece.shape);
  if (canPlace(piece.shape.cells, anchor.r, anchor.c)) {
    const idx = selectedPieceIdx;
    deselectPiece();
    tryPlacePiece(idx, anchor.r, anchor.c);
  } else {
    showToast('⚠️ No cap aquí!', 'info', 900);
  }
}

function toggleSelectPiece(pieceIdx) {
  if (gameOver || placing) return;
  const piece = pieces[pieceIdx];
  if (!piece || piece.used) return;

  if (selectedPieceIdx === pieceIdx) {
    deselectPiece();
  } else {
    deselectPiece();
    selectedPieceIdx = pieceIdx;
    const pieceEl = document.querySelector(`.pb-piece[data-piece-idx="${pieceIdx}"]`);
    if (pieceEl) pieceEl.classList.add('selected');
  }
}

function deselectPiece() {
  selectedPieceIdx = null;
  clearHighlights();
  document.querySelectorAll('.pb-piece.selected').forEach(el => el.classList.remove('selected'));
}

/* ── Sincronitza board[] → DOM ── */
/* ── Sincronitza board[] → DOM ── */
function renderBoard() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.getElementById(`cell-${r}-${c}`);
      if (!cell) continue;

      // Netejar sempre classes temporals
      cell.classList.remove('clearing', 'appearing', 'drag-over', 'drag-over-invalid');

      const pastryId = board[r][c];
      if (pastryId) {
        cell.classList.add('filled');
        const pastry = PASTRIES.find(p => p.id === pastryId);
        const existingImg = cell.querySelector('img');
        if (!existingImg || existingImg.alt !== pastryId) {
          cell.innerHTML = '';
          const img = document.createElement('img');
          img.src = PASTRY_IMG_BASE + (pastry ? pastry.img : 'pastis.png');
          img.alt = pastryId;
          img.draggable = false;
          cell.appendChild(img);
        }
      } else {
        cell.classList.remove('filled');
        cell.innerHTML = '';
      }
    }
  }
}

/* ══════════════════════════════════════════
   PECES
   ══════════════════════════════════════════ */
function dealPieces() {
  pieces = [];
  for (let i = 0; i < 3; i++) {
    pieces.push(createRandomPiece());
  }
  renderTray();
}

function createRandomPiece() {
  const shapeIdx  = Math.floor(Math.random() * PIECE_SHAPES.length);
  const shape     = PIECE_SHAPES[shapeIdx];
  const pastryObj = PASTRIES.find(p => p.id === shape.pastry) || PASTRIES[0];
  return { shape, pastryObj, used: false };
}

/* ── Renderitza la safata de peces ── */
function renderTray() {
  deselectPiece();
  const slots = trayEl.querySelectorAll('.pb-piece-slot');
  slots.forEach((slot, i) => {
    slot.innerHTML = '';
    slot.classList.remove('used', 'cant-fit');
    if (!pieces[i] || pieces[i].used) {
      slot.classList.add('used');
      return;
    }
    const pieceEl = buildPieceElement(pieces[i], i);
    slot.appendChild(pieceEl);
  });
  updatePieceFitStates();
}

function updatePieceFitStates() {
  const slots = trayEl.querySelectorAll('.pb-piece-slot');
  slots.forEach((slot, i) => {
    if (!pieces[i] || pieces[i].used) {
      slot.classList.add('used');
      slot.classList.remove('cant-fit');
    } else {
      slot.classList.remove('used');
      const fits = canPieceFitAnywhere(pieces[i]);
      if (!fits) {
        slot.classList.add('cant-fit');
      } else {
        slot.classList.remove('cant-fit');
      }
    }
  });
}

function canPieceFitAnywhere(piece) {
  if (!piece || piece.used) return false;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (canPlace(piece.shape.cells, r, c)) return true;
    }
  }
  return false;
}

function buildPieceElement(piece, pieceIdx) {
  const { shape, pastryObj } = piece;
  const cells = shape.cells;

  // Calcular bounding box
  const maxR = Math.max(...cells.map(c => c[0]));
  const maxC = Math.max(...cells.map(c => c[1]));
  const rows = maxR + 1;
  const cols = maxC + 1;

  // Mida de cel·la adaptativa (peces petites = més grans)
  const maxDim = Math.max(rows, cols);
  const cellSize = maxDim <= 2 ? 30 : maxDim <= 3 ? 26 : maxDim <= 4 ? 22 : 18;

  const el = document.createElement('div');
  el.className = 'pb-piece';
  el.dataset.pieceIdx = pieceIdx;
  el.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  el.style.gridTemplateRows    = `repeat(${rows}, ${cellSize}px)`;

  // Construir graella de la peça
  const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
  cells.forEach(([r, c]) => grid[r][c] = true);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      if (grid[r][c]) {
        cell.className = 'pb-piece-cell';
        const img = document.createElement('img');
        img.src = PASTRY_IMG_BASE + pastryObj.img;
        img.alt = pastryObj.label;
        img.draggable = false;
        cell.appendChild(img);
      } else {
        cell.className = 'pb-piece-cell empty-cell';
      }
      el.appendChild(cell);
    }
  }

  // Clic per seleccionar
  el.addEventListener('click', (e) => {
    if (dragging) return;
    toggleSelectPiece(pieceIdx);
  });

  setupPieceDrag(el, pieceIdx, cellSize);
  return el;
}

/* ══════════════════════════════════════════
   DRAG & DROP (Desktop + Touch)
   ══════════════════════════════════════════ */

function getBoardCellSize() {
  const firstCell = boardEl.querySelector('.pb-cell');
  if (firstCell && firstCell.offsetWidth > 0) {
    return firstCell.offsetWidth;
  }
  const rect = boardEl.getBoundingClientRect();
  return (rect.width - 16 - 24) / COLS;
}

function getAnchorPos(targetR, targetC, shape) {
  const maxR = Math.max(...shape.cells.map(c => c[0]));
  const maxC = Math.max(...shape.cells.map(c => c[1]));
  const offsetR = Math.floor(maxR / 2);
  const offsetC = Math.floor(maxC / 2);
  return {
    r: targetR - offsetR,
    c: targetC - offsetC,
  };
}

function setupPieceDrag(el, pieceIdx, cellSize) {
  let isTouchDragging = false;
  let startX = 0;
  let startY = 0;

  // Desktop
  el.addEventListener('mousedown', (e) => {
    if (gameOver || placing) return;
    if (e.button !== 0) return;
    e.preventDefault();
    deselectPiece();
    startDrag(e.clientX, e.clientY, pieceIdx, false);
  });

  // Touch
  el.addEventListener('touchstart', (e) => {
    if (gameOver || placing) return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    isTouchDragging = false;
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (gameOver || placing) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!isTouchDragging && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isTouchDragging = true;
      e.preventDefault();
      deselectPiece();
      startDrag(t.clientX, t.clientY, pieceIdx, true);
    }
  }, { passive: false });
}

function startDrag(clientX, clientY, pieceIdx, isTouch) {
  const piece = pieces[pieceIdx];
  if (!piece || piece.used) return;

  // Crear ghost visual escalat a la mida real de cel·la del tauler
  const boardCellSize = Math.max(24, Math.round(getBoardCellSize()));
  const ghost = buildGhostElement(piece, boardCellSize);
  document.body.appendChild(ghost);
  ghost.classList.add('dragging');

  ghost.style.position  = 'fixed';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex    = '9999';
  ghost.style.transition = 'none';

  const offsetY = isTouch ? 55 : 30;
  const targetX = clientX;
  const targetY = clientY - offsetY;

  const ghostW = ghost.offsetWidth;
  const ghostH = ghost.offsetHeight;
  ghost.style.left = (targetX - ghostW / 2) + 'px';
  ghost.style.top  = (targetY - ghostH / 2) + 'px';

  dragging = { pieceIdx, piece, ghost, isTouch, offsetY };

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup',   onDragEnd);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend',  onTouchEnd);

  const target = getCellAtPos(targetX, targetY);
  if (target) {
    const anchor = getAnchorPos(target.r, target.c, piece.shape);
    highlightPlacement(anchor.r, anchor.c, piece);
  }
}

function buildGhostElement(piece, cellSize) {
  const { shape, pastryObj } = piece;
  const cells = shape.cells;
  const maxR  = Math.max(...cells.map(c => c[0]));
  const maxC  = Math.max(...cells.map(c => c[1]));
  const rows  = maxR + 1;
  const cols  = maxC + 1;

  const el = document.createElement('div');
  el.className = 'pb-piece dragging';
  el.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  el.style.gridTemplateRows    = `repeat(${rows}, ${cellSize}px)`;

  const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
  cells.forEach(([r, c]) => grid[r][c] = true);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      if (grid[r][c]) {
        cell.className = 'pb-piece-cell';
        const img = document.createElement('img');
        img.src = PASTRY_IMG_BASE + pastryObj.img;
        img.alt = pastryObj.label;
        img.draggable = false;
        cell.appendChild(img);
      } else {
        cell.className = 'pb-piece-cell empty-cell';
      }
      el.appendChild(cell);
    }
  }
  return el;
}

function onDragMove(e) { moveDrag(e.clientX, e.clientY); }
function onTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  moveDrag(t.clientX, t.clientY);
}

function moveDrag(clientX, clientY) {
  if (!dragging) return;
  const { ghost, offsetY, piece } = dragging;
  const ghostW = ghost.offsetWidth;
  const ghostH = ghost.offsetHeight;

  const targetX = clientX;
  const targetY = clientY - offsetY;

  ghost.style.left = (targetX - ghostW / 2) + 'px';
  ghost.style.top  = (targetY - ghostH / 2) + 'px';

  clearHighlights();
  const target = getCellAtPos(targetX, targetY);
  if (target) {
    const anchor = getAnchorPos(target.r, target.c, piece.shape);
    highlightPlacement(anchor.r, anchor.c, piece);
  }
}

function onDragEnd(e) { endDrag(e.clientX, e.clientY); }
function onTouchEnd(e) {
  const t = e.changedTouches[0];
  endDrag(t.clientX, t.clientY);
}

function endDrag(clientX, clientY) {
  if (!dragging) return;
  const { ghost, pieceIdx, piece, offsetY } = dragging;

  clearHighlights();
  ghost.remove();
  dragging = null;

  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup',   onDragEnd);
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend',  onTouchEnd);

  const targetX = clientX;
  const targetY = clientY - offsetY;
  const target = getCellAtPos(targetX, targetY);
  if (target) {
    const anchor = getAnchorPos(target.r, target.c, piece.shape);
    tryPlacePiece(pieceIdx, anchor.r, anchor.c);
  }
}

/* ── Troba la cel·la del tauler mitjançant el rectangle de la graella ── */
function getCellAtPos(clientX, clientY) {
  const boardRect = boardEl.getBoundingClientRect();
  if (
    clientX < boardRect.left ||
    clientX > boardRect.right ||
    clientY < boardRect.top ||
    clientY > boardRect.bottom
  ) {
    return null;
  }
  const relX = clientX - boardRect.left;
  const relY = clientY - boardRect.top;
  const c = Math.floor((relX / boardRect.width) * COLS);
  const r = Math.floor((relY / boardRect.height) * ROWS);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
    return { r, c };
  }
  return null;
}

/* ── Highlight visual de la col·locació ── */
function highlightPlacement(anchorR, anchorC, piece) {
  const { shape } = piece;
  const valid = canPlace(shape.cells, anchorR, anchorC);
  shape.cells.forEach(([dr, dc]) => {
    const r = anchorR + dr;
    const c = anchorC + dc;
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (cell) cell.classList.add(valid ? 'drag-over' : 'drag-over-invalid');
  });
}

function clearHighlights() {
  boardEl.querySelectorAll('.drag-over, .drag-over-invalid').forEach(el => {
    el.classList.remove('drag-over', 'drag-over-invalid');
  });
}

/* ══════════════════════════════════════════
   COL·LOCACIÓ DE PECES
   ══════════════════════════════════════════ */

function canPlace(cells, anchorR, anchorC) {
  return cells.every(([dr, dc]) => {
    const r = anchorR + dr;
    const c = anchorC + dc;
    return r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === null;
  });
}

/**
 * Intenta col·locar la peça pieceIdx a (anchorR, anchorC).
 * Després comprova si hi ha moviments vàlids:
 *   - Si queden peces al torn: comprova les que queden
 *   - Si s'esgoten totes: reparteix 3 noves i comprova les noves
 * Si en cap cas cap cap peça → endGame()
 */
async function tryPlacePiece(pieceIdx, anchorR, anchorC) {
  if (gameOver || placing) return;

  const piece = pieces[pieceIdx];
  if (!piece || piece.used) return;

  const { shape, pastryObj } = piece;

  if (!canPlace(shape.cells, anchorR, anchorC)) {
    showToast('⚠️ No cap aquí!', 'info', 1000);
    return;
  }

  // Bloquejar re-entrades mentre es processa
  placing = true;

  try {
    // Col·locar la peça al tauler
    shape.cells.forEach(([dr, dc]) => {
      board[anchorR + dr][anchorC + dc] = pastryObj.id;
    });

    piece.used = true;
    const slot = document.getElementById(`slot-${pieceIdx}`);
    if (slot) slot.classList.add('used');

    renderBoard();
    animatePlacement(shape.cells, anchorR, anchorC);

    // Comprovar línies completades
    await delay(150);
    await checkAndClearLines();

    // Si s'esgoten totes les peces del torn → repartir-ne de noves
    if (pieces.every(p => p.used)) {
      await delay(200);
      dealPieces();
    } else {
      renderTray();
    }

    // Comprovar si les peces disponibles caben al tauler
    if (!hasAnyValidMove()) {
      await delay(350);
      await endGame();
      return;
    }

    updateHUD();
  } catch (err) {
    console.error('Error a tryPlacePiece:', err);
  } finally {
    placing = false;
  }
}

function animatePlacement(cells, anchorR, anchorC) {
  cells.forEach(([dr, dc]) => {
    const cell = document.getElementById(`cell-${anchorR + dr}-${anchorC + dc}`);
    if (cell) {
      cell.classList.add('appearing');
      setTimeout(() => cell.classList.remove('appearing'), 300);
    }
  });
}

/* ══════════════════════════════════════════
   COMPROVACIÓ I ELIMINACIÓ DE LÍNIES
   ══════════════════════════════════════════ */

async function checkAndClearLines() {
  const fullRows = [];
  const fullCols = [];

  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(c => c !== null)) fullRows.push(r);
  }
  for (let c = 0; c < COLS; c++) {
    if (board.every(row => row[c] !== null)) fullCols.push(c);
  }

  if (fullRows.length === 0 && fullCols.length === 0) return;

  // Recollir totes les cel·les a eliminar (sense duplicats)
  const toRemove = new Set();
  fullRows.forEach(r => {
    for (let c = 0; c < COLS; c++) toRemove.add(`${r},${c}`);
  });
  fullCols.forEach(c => {
    for (let r = 0; r < ROWS; r++) toRemove.add(`${r},${c}`);
  });

  const numLines     = fullRows.length + fullCols.length;
  const cellsCleared = toRemove.size;

  // Animació d'eliminació
  const cellEls = [];
  toRemove.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (cell) {
      cellEls.push(cell);
      cell.classList.add('clearing');
    }
  });

  // Puntuació: cel·les × 10 × combo de línies simultànies
  const comboMult = numLines > 1 ? numLines : 1;
  const pts = cellsCleared * 10 * comboMult;
  score += pts;
  linesTotal += numLines;
  if (score > bestScore) bestScore = score;

  // Mostrar punts flotants
  if (cellEls.length > 0) {
    showFloatingScore(pts, cellEls[0]);
  }

  // Esperar que acabi l'animació d'eliminació
  await delay(380);

  // Eliminar del board i netejar DOM
  toRemove.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    board[r][c] = null;
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (cell) {
      cell.classList.remove('clearing', 'filled');
      cell.innerHTML = '';
    }
  });
  renderBoard();

  // Comptador de Sasha
  sashaCount += numLines;
  if (sashaCount >= SASHA_TRIGGER) {
    sashaCount -= SASHA_TRIGGER;
    const affectedRows = fullRows.length > 0 ? fullRows : null;
    const affectedCols = fullCols.length > 0 ? fullCols : null;
    await triggerSasha(affectedRows, affectedCols);
  }

  updateHUD();
}

/* ══════════════════════════════════════════
   ANIMACIÓ DE LA SASHA 🐸
   ══════════════════════════════════════════ */

async function triggerSasha(affectedRows, affectedCols) {
  const msg = SASHA_MSGS[Math.floor(Math.random() * SASHA_MSGS.length)];
  sashaSpeech.textContent = msg;

  const directions = ['left', 'right', 'top'];
  const dir = directions[Math.floor(Math.random() * directions.length)];

  const boardRect = boardEl.getBoundingClientRect();
  let targetX, targetY;

  if (affectedRows && affectedRows.length > 0 && (dir === 'left' || dir === 'right')) {
    const midRow  = affectedRows[Math.floor(affectedRows.length / 2)];
    const cellSize = boardRect.height / ROWS;
    targetY = boardRect.top + (midRow + 0.5) * cellSize;
    targetX = boardRect.left + boardRect.width / 2;
  } else if (affectedCols && affectedCols.length > 0 && dir === 'top') {
    const midCol  = affectedCols[Math.floor(affectedCols.length / 2)];
    const cellSize = boardRect.width / COLS;
    targetX = boardRect.left + (midCol + 0.5) * cellSize;
    targetY = boardRect.top + boardRect.height / 2;
  } else {
    targetX = boardRect.left + boardRect.width / 2;
    targetY = boardRect.top  + boardRect.height / 2;
  }

  sashaContainer.style.left = targetX + 'px';
  sashaContainer.style.top  = targetY + 'px';
  sashaContainer.style.transform = 'translate(-50%, -50%)';
  sashaContainer.classList.remove('hidden');

  sashaChar.className = 'sasha-char';
  void sashaChar.offsetWidth; // forçar reflow per reiniciar animació

  if (dir === 'left') {
    sashaChar.classList.add('anim-from-left');
  } else if (dir === 'right') {
    sashaChar.classList.add('anim-from-right');
  } else {
    sashaChar.classList.add('anim-from-top');
  }

  spawnCrumbs(targetX, targetY);

  await delay(1900);
  sashaContainer.classList.add('hidden');
}

/* ── Engrunes de postres ── */
function spawnCrumbs(x, y) {
  const colors = ['#D4A017', '#FF8FAB', '#CE93D8', '#FFD6E5', '#B8F0D8', '#F0C040'];
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const crumb = document.createElement('div');
      crumb.className = 'crumb';
      const size = 4 + Math.random() * 8;
      const dx   = (Math.random() - 0.5) * 80;
      const rot  = Math.random() * 360 + 'deg';
      crumb.style.cssText = `
        left: ${x}px; top: ${y}px;
        width: ${size}px; height: ${size}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        --dx: ${dx}px; --rot: ${rot};
      `;
      document.body.appendChild(crumb);
      setTimeout(() => crumb.remove(), 900);
    }, i * 60);
  }
}

/* ── Punts flotants ── */
function showFloatingScore(pts, refEl) {
  if (!refEl) return;
  const rect = refEl.getBoundingClientRect();
  const el   = document.createElement('div');
  el.className = 'float-score';
  el.textContent = `+${pts}`;
  el.style.left = rect.left + 'px';
  el.style.top  = rect.top  + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

/* ══════════════════════════════════════════
   COMPROVACIÓ DE MOVIMENTS VÀLIDS
   ══════════════════════════════════════════ */

/**
 * Retorna true si almenys una de les peces disponibles (no usades)
 * pot ser col·locada en algun lloc del tauler.
 *
 * IMPORTANT: aquesta funció s'ha de cridar SEMPRE que hi hagi peces
 * actives a pieces[]. Si no n'hi ha cap (length === 0), retorna false
 * perquè no hi ha cap moviment possible.
 */
function hasAnyValidMove() {
  const availablePieces = pieces.filter(p => !p.used);
  if (availablePieces.length === 0) return false;

  return availablePieces.some(piece => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (canPlace(piece.shape.cells, r, c)) return true;
      }
    }
    return false;
  });
}

/* ══════════════════════════════════════════
   FI DEL JOC
   ══════════════════════════════════════════ */

async function endGame() {
  if (gameOver) return; // evitar cridar-la dues vegades
  gameOver = true;
  placing  = false;

  const isNewBest = score > bestScore;
  if (isNewBest) bestScore = score;

  document.getElementById('overlay-emoji').textContent = isNewBest ? '🏆' : '🎂';
  document.getElementById('overlay-title').textContent = isNewBest ? 'Nou Rècord!' : 'Fi del Joc!';
  document.getElementById('overlay-score').textContent = score.toLocaleString() + ' punts';
  document.getElementById('overlay-msg').textContent   = isNewBest
    ? '¡Fantàstic! Has superat el teu millor marcador!'
    : `Millor: ${bestScore.toLocaleString()} punts`;

  overlayEl.classList.remove('hidden');
  updateHUD();

  if (uid && profile) {
    try {
      const isRecord = await saveScore(GAMES.PASTIS_BLAST, uid, score, profile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.PASTIS_BLAST, 10);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.PASTIS_BLAST, uid);
        loadRanking();
      }
    } catch(e) { /* Firebase no configurat */ }
  }
}

/* ══════════════════════════════════════════
   HUD
   ══════════════════════════════════════════ */

function updateHUD() {
  document.getElementById('score').textContent         = score.toLocaleString();
  document.getElementById('best-score').textContent    = bestScore.toLocaleString();
  document.getElementById('lines-cleared').textContent = linesTotal;
  const comboEl = document.getElementById('combo');
  if (comboEl) comboEl.textContent = '×1';
}

/* ══════════════════════════════════════════
   RANKING
   ══════════════════════════════════════════ */

async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.PASTIS_BLAST, 10);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch(e) {
    document.getElementById('ranking-container').innerHTML =
      '<p class="text-center" style="color:var(--gray-400);padding:1rem">Configura Firebase per veure el rànquing</p>';
  }
}

/* ══════════════════════════════════════════
   BOTONS
   ══════════════════════════════════════════ */

/**
 * Botó "↺ Reiniciar" al HUD:
 * - Si el joc ja ha acabat (overlay visible) → simplement reinicia
 * - Si el joc està en curs → desa la puntuació i mostra el resultat
 *   (des de l'overlay el jugador podrà fer "Tornar a jugar")
 */
document.getElementById('btn-restart').addEventListener('click', async () => {
  if (gameOver) {
    initGame();
  } else {
    await endGame();
  }
});

/* Botó "Tornar a jugar!" de l'overlay → reinicia de zero */
document.getElementById('overlay-restart').addEventListener('click', initGame);

document.getElementById('btn-ranking').addEventListener('click', async () => {
  const modal = document.getElementById('ranking-modal');
  const body  = document.getElementById('ranking-modal-body');
  body.innerHTML = '<div class="flex-center"><div class="spinner"></div></div>';
  modal.classList.remove('hidden');
  try {
    const entries = await getGameRanking(GAMES.PASTIS_BLAST, 20);
    renderRankingTable(entries, 'ranking-modal-body', uid);
  } catch(e) {
    body.innerHTML = '<p class="text-center" style="padding:1rem">Configura Firebase per veure el rànquing</p>';
  }
});

document.getElementById('close-ranking').addEventListener('click', () => {
  document.getElementById('ranking-modal').classList.add('hidden');
});

/* ══════════════════════════════════════════
   UTILITATS
   ══════════════════════════════════════════ */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
