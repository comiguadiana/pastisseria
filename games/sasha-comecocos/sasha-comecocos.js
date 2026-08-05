/**
 * sasha-comecocos.js — Sasha Comecocos (Te de Maracujà)
 * Joc d'estil Pac-Man on la Sasha obre la boca, recull gotes de fruita i captura Maracuyàs
 * per fabricar la famosa llauna de Te de Maracujà!
 */

import { onAuthReady, renderNavbarUser } from '../../assets/js/auth.js';
import {
  saveScore, getGameRanking, renderRankingTable,
  launchConfetti, unlockNextGame, recordGamePlay
} from '../../assets/js/ranking.js';

const GAME_ID = 'sasha-comecocos';

/* ─── Web Audio API Synthesizer ─── */
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', gainVal = 0.1) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

let chompToggle = false;
function playChompSound() {
  chompToggle = !chompToggle;
  playTone(chompToggle ? 460 : 340, 0.07, 'triangle', 0.08);
}

function playPowerSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.14, 'sine', 0.1), i * 55);
    });
  } catch (e) {}
}

function playEatMaracuyaSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    [350, 520, 780, 1100].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.12, 'square', 0.09), i * 45);
    });
  } catch (e) {}
}

function playDeathSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    [560, 500, 440, 380, 320, 260, 200, 150].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.12, 'sawtooth', 0.09), i * 65);
    });
  } catch (e) {}
}

function playVictorySound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.28, 'triangle', 0.12), i * 80);
    });
  } catch (e) {}
}

/* ─── Imatges Transparents ─── */
const sashaImg = new Image();
sashaImg.src = '../../assets/img/sasha.png';

const maracujaImg = new Image();
maracujaImg.src = '../../assets/img/pasteles/maracuja.png';

const maracujaSliceImg = new Image();
maracujaSliceImg.src = '../../assets/img/pasteles/maracuja_slice.png';

const teMaracujaImg = new Image();
teMaracujaImg.src = '../../assets/img/pasteles/te_maracuja.png';

/* ─── Disseny del Laberint (19 cols x 21 files) ───
 * 1: Mur
 * 2: Gota de suc de maracujà (+10 pts)
 * 3: Super Maracujà tallat (+50 pts + Mode Super-Sasha)
 * 0: Pas buit
 * 4: Viver dels Maracuyàs (Spawn)
 * 5: Porta de sortida dels Maracuyàs
 * 6: Túnel lateral
 */
const ORIGINAL_MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,5,1,1,0,1,2,1,1,1,1],
  [6,0,0,0,2,0,0,1,4,4,4,1,0,0,2,0,0,0,6],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const COLS = 19;
const ROWS = 21;
let TILE_SIZE = 24;

let maze = [];
let totalMaracuyas = 0;
let remainingMaracuyas = 0;

/* ─── Colors de l'Obrador ─── */
const WALL_COLOR = '#6A1B9A';
const WALL_BORDER = '#BA68C8';
const FLOOR_COLOR = '#160826';

/* ─── Estat del Joc ─── */
let score = 0;
let bestScore = parseInt(localStorage.getItem('obrador_sc_best') || '0', 10);
let lives = 3;
let level = 1;
let isPlaying = false;
let isPaused = false;
let powerTimer = 0;
let currentPowerDuration = 5.0;
let maracuyaMultiplier = 1;

function getPowerDuration() {
  if (level === 1) return 5.0;
  if (level === 2) return 3.5;
  return 2.0;
}

function getGhostDelay(ghostId) {
  if (ghostId === 0) return 0;
  if (level === 1) return [0, 0.8, 2.0, 3.5][ghostId];
  if (level === 2) return [0, 0.5, 1.2, 2.0][ghostId];
  return [0, 0.3, 0.6, 1.0][ghostId];
}

let particles = [];

/* ─── Sasha (Protagonista) ─── */
const sasha = {
  gridX: 9,
  gridY: 16,
  x: 9 * 24,
  y: 16 * 24,
  dirX: 0,
  dirY: 0,
  bufferedDirX: 0,
  bufferedDirY: 0,
  mouthPhase: 0,
  isMoving: false
};

/* ─── Maracuyàs Enemics (Els Dolents) ─── */
const MARACUYA_TYPES = [
  { id: 0, name: 'Maracujà Morat',     color: '#AB47BC', glowColor: 'rgba(171, 71, 188, 0.7)', eyeColor: '#4A148C', homeX: 17, homeY: 1,  spawnX: 9, spawnY: 8,  delay: 0 },
  { id: 1, name: 'Maracujà Groc',      color: '#FFCA28', glowColor: 'rgba(255, 202, 40, 0.7)',  eyeColor: '#F57F17', homeX: 1,  homeY: 1,  spawnX: 9, spawnY: 10, delay: 0.8 },
  { id: 2, name: 'Maracujà Tropical',  color: '#FF7043', glowColor: 'rgba(255, 112, 67, 0.7)',  eyeColor: '#D84315', homeX: 17, homeY: 19, spawnX: 8, spawnY: 10, delay: 2.0 },
  { id: 3, name: 'Maracujà Espavilat', color: '#66BB6A', glowColor: 'rgba(102, 187, 106, 0.7)', eyeColor: '#1B5E20', homeX: 1,  homeY: 19, spawnX: 10, spawnY: 10, delay: 3.5 }
];

let maracuyas = [];
let gameTimer = 0;
let lastGlobalMode = 'SCATTER';

function createMaracuyas() {
  maracuyas = MARACUYA_TYPES.map(m => ({
    id: m.id,
    name: m.name,
    color: m.color,
    glowColor: m.glowColor,
    eyeColor: m.eyeColor,
    homeX: m.homeX,
    homeY: m.homeY,
    spawnX: m.spawnX,
    spawnY: m.spawnY,
    gridX: m.spawnX,
    gridY: m.spawnY,
    x: (m.spawnX + 0.5) * TILE_SIZE,
    y: (m.spawnY + 0.5) * TILE_SIZE,
    dirX: (m.id === 0) ? -1 : 0,
    dirY: (m.id === 0) ? 0 : -1,
    spawnDelay: getGhostDelay(m.id),
    isExiting: (m.id !== 0)
  }));
}

/* ─── Inicialització del Laberint ─── */
function initMaze() {
  maze = [];
  totalMaracuyas = 0;
  for (let r = 0; r < ROWS; r++) {
    maze[r] = [];
    for (let c = 0; c < COLS; c++) {
      const val = ORIGINAL_MAZE[r][c];
      maze[r][c] = val;
      if (val === 2 || val === 3) {
        totalMaracuyas++;
      }
    }
  }
  remainingMaracuyas = totalMaracuyas;
  updateCounters();
}

/* ─── Canvas & Resize ─── */
const canvas = document.getElementById('sc-canvas');
const ctx = canvas.getContext('2d');
const boardWrap = document.getElementById('board-wrap');

function resizeCanvas() {
  const rect = boardWrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  TILE_SIZE = rect.width / COLS;

  // Reajustar posicions exactes
  sasha.x = (sasha.gridX + 0.5) * TILE_SIZE;
  sasha.y = (sasha.gridY + 0.5) * TILE_SIZE;
  maracuyas.forEach(m => {
    m.x = (m.gridX + 0.5) * TILE_SIZE;
    m.y = (m.gridY + 0.5) * TILE_SIZE;
  });
}
window.addEventListener('resize', resizeCanvas);

/* ─── Reset Personatges ─── */
function resetPositions() {
  sasha.gridX = 9;
  sasha.gridY = 16;
  sasha.x = (sasha.gridX + 0.5) * TILE_SIZE;
  sasha.y = (sasha.gridY + 0.5) * TILE_SIZE;
  sasha.dirX = 0;
  sasha.dirY = 0;
  sasha.bufferedDirX = 0;
  sasha.bufferedDirY = 0;
  sasha.isMoving = false;

  maracuyas.forEach(m => {
    m.gridX = m.spawnX;
    m.gridY = m.spawnY;
    m.x = (m.spawnX + 0.5) * TILE_SIZE;
    m.y = (m.spawnY + 0.5) * TILE_SIZE;
    m.dirX = (m.id === 0) ? -1 : 0;
    m.dirY = (m.id === 0) ? 0 : -1;
    m.spawnDelay = getGhostDelay(m.id);
    m.isExiting = (m.id !== 0);
  });

  powerTimer = 0;
  gameTimer = 0;
  lastGlobalMode = 'SCATTER';
  document.getElementById('power-bar-wrap')?.classList.add('hidden');
}

/* ─── Reset Individual d'un Maracujà Capturat ─── */
function respawnSingleMaracuya(m) {
  m.gridX = 9;
  m.gridY = 10;
  m.x = (9 + 0.5) * TILE_SIZE;
  m.y = (10 + 0.5) * TILE_SIZE;
  m.dirX = 0;
  m.dirY = -1;
  m.spawnDelay = Math.max(0.4, 1.0 - (level - 1) * 0.25);
  m.isExiting = true;
}

/* ─── Controls de Moviment & Buffering ─── */
function requestMove(dx, dy) {
  sasha.bufferedDirX = dx;
  sasha.bufferedDirY = dy;
  if (!isPlaying) return;
  getAudioContext();
}

// Teclat
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'KeyW'].includes(e.code))    { requestMove(0, -1); e.preventDefault(); }
  if (['ArrowDown', 'KeyS'].includes(e.code))  { requestMove(0, 1);  e.preventDefault(); }
  if (['ArrowLeft', 'KeyA'].includes(e.code))  { requestMove(-1, 0); e.preventDefault(); }
  if (['ArrowRight', 'KeyD'].includes(e.code)) { requestMove(1, 0);  e.preventDefault(); }
  if (e.code === 'Space' && !isPlaying) { startGame(); }
});

// D-Pad Tàctil
document.getElementById('btn-up')?.addEventListener('pointerdown', (e) => { e.preventDefault(); requestMove(0, -1); });
document.getElementById('btn-down')?.addEventListener('pointerdown', (e) => { e.preventDefault(); requestMove(0, 1); });
document.getElementById('btn-left')?.addEventListener('pointerdown', (e) => { e.preventDefault(); requestMove(-1, 0); });
document.getElementById('btn-right')?.addEventListener('pointerdown', (e) => { e.preventDefault(); requestMove(1, 0); });

// Swipes tàctils
let touchStartX = 0, touchStartY = 0;
boardWrap.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

boardWrap.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 18) {
    requestMove(dx > 0 ? 1 : -1, 0);
  } else if (Math.abs(dy) > 18) {
    requestMove(0, dy > 0 ? 1 : -1);
  }
}, { passive: true });

/* ─── Navegació & Murs ─── */
function isWall(col, row, forEnemy = false, isExiting = false) {
  if (col < 0 || col >= COLS) return false; // túnels
  if (row < 0 || row >= ROWS) return true;
  const val = maze[row][col];
  if (val === 1) return true;
  if (val === 5) {
    return !isExiting; // porta transitable només quan l'enemic està sortint del viver
  }
  if (val === 4 && !forEnemy) return true; // Sasha mai entra al viver
  return false;
}

function canPass(gx, gy, dx, dy, forEnemy = false, isExiting = false) {
  const tx = gx + dx;
  const ty = gy + dy;
  if (tx < 0 || tx >= COLS) return true;
  return !isWall(tx, ty, forEnemy, isExiting);
}

/* ─── Modes Globals dels Dolents (Cicles Pac-Man) ─── */
function getGlobalGhostMode() {
  if (powerTimer > 0) return 'FRIGHTENED';
  const t = gameTimer;
  const scatterTime = level === 1 ? 5 : (level === 2 ? 3 : 2);
  const chaseTime   = level === 1 ? 25 : (level === 2 ? 30 : 35);
  const cycleLen    = scatterTime + chaseTime;
  const cyclePos    = t % cycleLen;
  return cyclePos < scatterTime ? 'SCATTER' : 'CHASE';
}

function reverseGhostDirections() {
  maracuyas.forEach(m => {
    if (!m.isExiting && m.spawnDelay <= 0) {
      m.dirX = -m.dirX;
      m.dirY = -m.dirY;
    }
  });
}

function isWalkableForGhost(col, row, isExiting = false) {
  if (row === 10 && (col < 0 || col >= COLS)) return true; // Túnel lateral
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  const tile = maze[row][col];
  if (tile === 1) return false; // Mur
  if (tile === 5) return isExiting; // Porta del viver
  if (tile === 4) return isExiting; // Interior del viver
  return true;
}

function getValidDirsForGhost(col, row, currentDirX, currentDirY, isExiting = false) {
  const dirs = [
    { dx: 0, dy: -1 }, // Amunt
    { dx: -1, dy: 0 }, // Esquerra
    { dx: 0, dy: 1 },  // Avall
    { dx: 1, dy: 0 }   // Dreta
  ];
  return dirs.filter(d => {
    // Prohibir fer mitja volta a la mateixa cruïlla (excepte si estava aturat)
    if ((currentDirX !== 0 || currentDirY !== 0) && d.dx === -currentDirX && d.dy === -currentDirY) {
      return false;
    }
    const nx = col + d.dx;
    const ny = row + d.dy;
    return isWalkableForGhost(nx, ny, isExiting);
  });
}

function chooseGhostDirection(m, col, row, mode) {
  const validDirs = getValidDirsForGhost(col, row, m.dirX, m.dirY, m.isExiting);

  if (validDirs.length === 0) {
    return { dx: -m.dirX, dy: -m.dirY };
  }

  if (validDirs.length === 1) {
    return validDirs[0];
  }

  // Si està espantat, tria una sortida vàlida aleatòria (pànic)
  if (mode === 'FRIGHTENED') {
    return validDirs[Math.floor(Math.random() * validDirs.length)];
  }

  // Determinar destí segons el mode i personalitat
  let targetX = sasha.gridX;
  let targetY = sasha.gridY;

  if (mode === 'SCATTER') {
    targetX = m.homeX;
    targetY = m.homeY;
  } else {
    // Mode CHASE
    if (m.id === 0) {
      // Maracujà Morat (Blinky): Persecució directa
      targetX = sasha.gridX;
      targetY = sasha.gridY;
    } else if (m.id === 1) {
      // Maracujà Groc (Pinky): Emboscada 4 caselles per davant de la Sasha
      targetX = sasha.gridX + (sasha.dirX || 0) * 4;
      targetY = sasha.gridY + (sasha.dirY || 0) * 4;
    } else if (m.id === 2) {
      // Maracujà Tropical (Inky): Pinceta cooperativa
      const pivotX = sasha.gridX + (sasha.dirX || 0) * 2;
      const pivotY = sasha.gridY + (sasha.dirY || 0) * 2;
      const morat = maracuyas[0] || { gridX: 9, gridY: 8 };
      targetX = pivotX + (pivotX - morat.gridX);
      targetY = pivotY + (pivotY - morat.gridY);
    } else if (m.id === 3) {
      // Maracujà Espavilat (Clyde): Persegueix de lluny, es retira al seu racó si és a prop
      const dist = Math.hypot(col - sasha.gridX, row - sasha.gridY);
      if (dist > 6) {
        targetX = sasha.gridX;
        targetY = sasha.gridY;
      } else {
        targetX = m.homeX;
        targetY = m.homeY;
      }
    }
  }

  // Triar la direcció que acosta més al destí
  let bestDir = validDirs[0];
  let minDistSq = Infinity;
  for (const d of validDirs) {
    const nx = col + d.dx;
    const ny = row + d.dy;
    const distSq = (nx - targetX) ** 2 + (ny - targetY) ** 2;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      bestDir = d;
    }
  }

  return bestDir;
}

function updateGhost(m, dt, globalMode) {
  if (m.spawnDelay > 0) {
    m.spawnDelay -= dt;
    return;
  }

  let ghostSpeedTilesPerSec;
  if (globalMode === 'FRIGHTENED') {
    ghostSpeedTilesPerSec = 2.8;
  } else {
    if (level === 1) ghostSpeedTilesPerSec = 4.7;
    else if (level === 2) ghostSpeedTilesPerSec = 5.3;
    else ghostSpeedTilesPerSec = 5.7; // més ràpids que la Sasha!
  }

  let moveDist = ghostSpeedTilesPerSec * TILE_SIZE * dt;

  // Si està sortint del viver
  if (m.isExiting) {
    const exitCenterX = (9 + 0.5) * TILE_SIZE;
    const exitTargetY = (8 + 0.5) * TILE_SIZE;

    if (Math.abs(m.x - exitCenterX) > 1.5) {
      const step = Math.min(moveDist, Math.abs(m.x - exitCenterX));
      m.x += (m.x < exitCenterX ? 1 : -1) * step;
    } else {
      m.x = exitCenterX;
      if (m.y > exitTargetY) {
        const step = Math.min(moveDist, m.y - exitTargetY);
        m.y -= step;
        m.dirX = 0;
        m.dirY = -1;
      }
      if (m.y <= exitTargetY) {
        m.y = exitTargetY;
        m.gridX = 9;
        m.gridY = 8;
        m.isExiting = false;
        m.dirX = (m.id % 2 === 0) ? -1 : 1;
        m.dirY = 0;
      }
    }
    return;
  }

  // Moviment de laberint precís casella a casella
  while (moveDist > 0) {
    const cellX = Math.floor(m.x / TILE_SIZE);
    const cellY = Math.floor(m.y / TILE_SIZE);
    const centerX = (cellX + 0.5) * TILE_SIZE;
    const centerY = (cellY + 0.5) * TILE_SIZE;

    let crossedCenter = false;
    let distToCenter = 0;

    if (m.dirX > 0) {
      if (m.x <= centerX && m.x + moveDist >= centerX) {
        crossedCenter = true;
        distToCenter = centerX - m.x;
      }
    } else if (m.dirX < 0) {
      if (m.x >= centerX && m.x - moveDist <= centerX) {
        crossedCenter = true;
        distToCenter = m.x - centerX;
      }
    } else if (m.dirY > 0) {
      if (m.y <= centerY && m.y + moveDist >= centerY) {
        crossedCenter = true;
        distToCenter = centerY - m.y;
      }
    } else if (m.dirY < 0) {
      if (m.y >= centerY && m.y - moveDist <= centerY) {
        crossedCenter = true;
        distToCenter = m.y - centerY;
      }
    } else {
      crossedCenter = true;
      distToCenter = 0;
    }

    if (crossedCenter) {
      m.x = centerX;
      m.y = centerY;
      moveDist -= distToCenter;

      const nextDir = chooseGhostDirection(m, cellX, cellY, globalMode);
      m.dirX = nextDir.dx;
      m.dirY = nextDir.dy;

      if ((m.dirX === 0 && m.dirY === 0) || moveDist <= 0) {
        break;
      }

      m.x += m.dirX * moveDist;
      m.y += m.dirY * moveDist;
      moveDist = 0;
    } else {
      m.x += m.dirX * moveDist;
      m.y += m.dirY * moveDist;
      moveDist = 0;
    }
  }

  m.gridX = Math.floor(m.x / TILE_SIZE);
  m.gridY = Math.floor(m.y / TILE_SIZE);

  // Túnels
  if (m.x < -TILE_SIZE * 0.5) m.x = (COLS - 0.5) * TILE_SIZE;
  if (m.x > (COLS + 0.5) * TILE_SIZE) m.x = 0.5 * TILE_SIZE;
}

/* ─── Partícules de Suc ─── */
function addJuiceParticles(x, y, isSuper = false) {
  const count = isSuper ? 18 : 6;
  const colors = isSuper ? ['#FFD700', '#FF9100', '#FFFFFF', '#E040FB'] : ['#FFA000', '#FFD54F', '#BA68C8', '#8E24AA'];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 2.5 + 1.2) * (isSuper ? 1.5 : 1);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: Math.random() * 0.04 + 0.02,
      size: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

/* ─── Bucle Principal d'Actualització ─── */
let lastTime = performance.now();

function update(dt) {
  if (!isPlaying || isPaused) return;

  // 1. Superpoder Timer
  if (powerTimer > 0) {
    powerTimer -= dt;
    const fillEl = document.getElementById('power-bar-fill');
    if (fillEl) {
      fillEl.style.width = `${Math.max(0, (powerTimer / currentPowerDuration) * 100)}%`;
    }
    if (powerTimer <= 0) {
      powerTimer = 0;
      document.getElementById('power-bar-wrap')?.classList.add('hidden');
    }
  }

  // Gestió de les ones Globals (Scatter / Chase)
  gameTimer += dt;
  const currentGlobalMode = getGlobalGhostMode();
  if (currentGlobalMode !== lastGlobalMode) {
    if (currentGlobalMode !== 'FRIGHTENED' && lastGlobalMode !== 'FRIGHTENED') {
      reverseGhostDirections();
    }
    lastGlobalMode = currentGlobalMode;
  }

  // 2. Moviment de la Sasha
  const sashaSpeed = 5.5 * TILE_SIZE * dt;
  const curGX = Math.floor(sasha.x / TILE_SIZE);
  const curGY = Math.floor(sasha.y / TILE_SIZE);
  const cellCenterX = (curGX + 0.5) * TILE_SIZE;
  const cellCenterY = (curGY + 0.5) * TILE_SIZE;

  // Corner buffering (Girs fluids)
  if (sasha.bufferedDirX !== 0 || sasha.bufferedDirY !== 0) {
    if (sasha.bufferedDirX === -sasha.dirX && sasha.bufferedDirY === -sasha.dirY) {
      sasha.dirX = sasha.bufferedDirX;
      sasha.dirY = sasha.bufferedDirY;
    } else {
      const dist = Math.hypot(sasha.x - cellCenterX, sasha.y - cellCenterY);
      if (dist < TILE_SIZE * 0.45) {
        if (canPass(curGX, curGY, sasha.bufferedDirX, sasha.bufferedDirY, false)) {
          sasha.dirX = sasha.bufferedDirX;
          sasha.dirY = sasha.bufferedDirY;
          if (sasha.dirX !== 0) sasha.y = cellCenterY;
          if (sasha.dirY !== 0) sasha.x = cellCenterX;
        }
      }
    }
  }

  if (!canPass(curGX, curGY, sasha.dirX, sasha.dirY, false)) {
    const isPastCenter = (sasha.dirX > 0 && sasha.x >= cellCenterX) ||
                         (sasha.dirX < 0 && sasha.x <= cellCenterX) ||
                         (sasha.dirY > 0 && sasha.y >= cellCenterY) ||
                         (sasha.dirY < 0 && sasha.y <= cellCenterY);
    if (isPastCenter) {
      sasha.x = cellCenterX;
      sasha.y = cellCenterY;
      sasha.dirX = 0;
      sasha.dirY = 0;
    }
  }

  sasha.isMoving = (sasha.dirX !== 0 || sasha.dirY !== 0);
  if (sasha.isMoving) {
    sasha.x += sasha.dirX * sashaSpeed;
    sasha.y += sasha.dirY * sashaSpeed;
    sasha.mouthPhase += 14 * dt;
  }

  sasha.gridX = Math.floor(sasha.x / TILE_SIZE);
  sasha.gridY = Math.floor(sasha.y / TILE_SIZE);

  // Teleport lateral
  if (sasha.x < -TILE_SIZE * 0.5) sasha.x = (COLS - 0.5) * TILE_SIZE;
  if (sasha.x > (COLS + 0.5) * TILE_SIZE) sasha.x = 0.5 * TILE_SIZE;

  // Menjar gotes de suc / super maracujà
  if (sasha.gridY >= 0 && sasha.gridY < ROWS && sasha.gridX >= 0 && sasha.gridX < COLS) {
    const tile = maze[sasha.gridY][sasha.gridX];
    if (tile === 2) {
      maze[sasha.gridY][sasha.gridX] = 0;
      score += 2;
      remainingMaracuyas--;
      playChompSound();
      addJuiceParticles(sasha.x, sasha.y, false);
      updateCounters();
      checkVictory();
    } else if (tile === 3) {
      maze[sasha.gridY][sasha.gridX] = 0;
      score += 15;
      remainingMaracuyas--;
      currentPowerDuration = getPowerDuration();
      powerTimer = currentPowerDuration;
      maracuyaMultiplier = 1;
      reverseGhostDirections();
      document.getElementById('power-bar-wrap')?.classList.remove('hidden');
      playPowerSound();
      addJuiceParticles(sasha.x, sasha.y, true);
      updateCounters();
      checkVictory();
    }
  }

  // 3. IA I MOVIMENT DELS MARACUYÀS
  maracuyas.forEach(m => {
    updateGhost(m, dt, currentGlobalMode);

    // 4. Col·lisió Sasha - Maracujà
    const colDist = Math.hypot(sasha.x - m.x, sasha.y - m.y);
    if (colDist < TILE_SIZE * 0.8) {
      if (powerTimer > 0) {
        // ── SASHA CAPTURA EL MARACUJÀ! ──
        const pts = 30 * maracuyaMultiplier;
        score += pts;
        maracuyaMultiplier *= 2;
        playEatMaracuyaSound();
        addJuiceParticles(m.x, m.y, true);
        updateCounters();
        respawnSingleMaracuya(m);
      } else {
        // La Sasha rep un cop
        handleSashaHit();
      }
    }
  });

  // 5. Partícules
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
  });
  particles = particles.filter(p => p.life > 0);
}

/* ─── Dany & Vides ─── */
function handleSashaHit() {
  lives--;
  playDeathSound();
  updateCounters();

  if (lives <= 0) {
    gameOver();
  } else {
    isPaused = true;
    setTimeout(() => {
      resetPositions();
      isPaused = false;
    }, 1200);
  }
}

/* ─── Render Gràfic ─── */
function draw() {
  const w = COLS * TILE_SIZE;
  const h = ROWS * TILE_SIZE;

  // Fons fosc net
  ctx.fillStyle = FLOOR_COLOR;
  ctx.fillRect(0, 0, w, h);

  // 1. Murs i Items
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = maze[r][c];
      const px = c * TILE_SIZE;
      const py = r * TILE_SIZE;

      if (tile === 1) {
        // Mur amb brillantor
        ctx.fillStyle = WALL_COLOR;
        ctx.strokeStyle = WALL_BORDER;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 4);
        ctx.fill();
        ctx.stroke();
      } else if (tile === 5) {
        // Porta del viver
        ctx.fillStyle = '#E040FB';
        ctx.fillRect(px, py + TILE_SIZE * 0.35, TILE_SIZE, TILE_SIZE * 0.3);
      } else if (tile === 2) {
        // Gota de maracujà
        const cx = px + TILE_SIZE * 0.5;
        const cy = py + TILE_SIZE * 0.5;
        const rad = TILE_SIZE * 0.16;

        ctx.fillStyle = '#8E24AA';
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.65, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 3) {
        // Super Maracujà tallat (obert daurat)
        const cx = px + TILE_SIZE * 0.5;
        const cy = py + TILE_SIZE * 0.5;
        const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.15;
        const size = TILE_SIZE * 0.88 * pulse;

        if (maracujaSliceImg.complete && maracujaSliceImg.naturalWidth > 0) {
          ctx.drawImage(maracujaSliceImg, cx - size / 2, cy - size / 2, size, size);
        } else {
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(cx, cy, TILE_SIZE * 0.38 * pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 2. Partícules
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  // 3. Dibuixar la Sasha (protagonista real)
  drawSasha(sasha.x, sasha.y, sasha.dirX, sasha.dirY, powerTimer > 0);

  // 4. Dibuixar els Maracuyàs dolents
  maracuyas.forEach(m => {
    drawMaracuya(m, powerTimer > 0);
  });
}

function drawSasha(x, y, dirX, dirY, isSuper) {
  ctx.save();
  ctx.translate(x, y);

  if (isSuper) {
    const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.2;
    const grad = ctx.createRadialGradient(0, 0, TILE_SIZE * 0.3, 0, 0, TILE_SIZE * 0.95 * pulse);
    grad.addColorStop(0, 'rgba(255, 215, 0, 0.85)');
    grad.addColorStop(0.5, 'rgba(255, 152, 0, 0.45)');
    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, TILE_SIZE * 0.95 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  if (dirX < 0) {
    ctx.scale(-1, 1);
  } else if (dirY < 0) {
    ctx.rotate(-0.08);
  } else if (dirY > 0) {
    ctx.rotate(0.08);
  }

  const spriteSize = TILE_SIZE * 1.55;
  const bob = sasha.isMoving ? Math.abs(Math.sin(performance.now() * 0.014)) * 3 : 0;

  if (sashaImg.complete && sashaImg.naturalWidth > 0) {
    ctx.drawImage(sashaImg, -spriteSize / 2, -spriteSize / 2 - bob, spriteSize, spriteSize);

    // Boca animada de la Sasha que s'obre i es tanca
    const mouthOpen = Math.sin(sasha.mouthPhase) * 0.5 + 0.5;
    const mouthY = -spriteSize * 0.06 - bob;
    const mouthW = spriteSize * 0.16;
    const mouthH = spriteSize * (0.10 + mouthOpen * 0.16);

    ctx.fillStyle = '#2A0818';
    ctx.beginPath();
    ctx.ellipse(0, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF4081';
    ctx.beginPath();
    ctx.ellipse(0, mouthY + mouthH * 0.45, mouthW * 0.75, mouthH * 0.45, 0, 0, Math.PI);
    ctx.fill();

    if (mouthOpen > 0.35) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-mouthW * 0.5, mouthY - mouthH * 0.85, mouthW * 0.4, mouthH * 0.55);
      ctx.fillRect(mouthW * 0.1, mouthY - mouthH * 0.85, mouthW * 0.4, mouthH * 0.55);
    }
  }

  ctx.restore();
}

function drawMaracuya(m, isFrightened) {
  ctx.save();
  ctx.translate(m.x, m.y);

  const size = TILE_SIZE * 1.35;
  const bounce = Math.sin(performance.now() * 0.012 + m.id * 1.5) * 2;

  if (isFrightened) {
    // ── Maracujà espantat (blau / tremolant) ──
    const flash = powerTimer < 2.0 && Math.floor(performance.now() / 150) % 2 === 0;
    const shiverX = (Math.random() - 0.5) * 3;

    ctx.fillStyle = flash ? '#FFFFFF' : '#1E88E5';
    ctx.strokeStyle = flash ? '#90CAF9' : '#0D47A1';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(shiverX, bounce, TILE_SIZE * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ulls espantats
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(shiverX - 6, bounce - 4, 4, 4);
    ctx.fillRect(shiverX + 2, bounce - 4, 4, 4);

    // Boca ondulada
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(shiverX - 6, bounce + 4);
    ctx.lineTo(shiverX - 2, bounce + 2);
    ctx.lineTo(shiverX + 2, bounce + 4);
    ctx.lineTo(shiverX + 6, bounce + 2);
    ctx.stroke();
  } else {
    // ── Maracujà salvatge i vibrant (sense fons blanc!) ──
    if (maracujaImg.complete && maracujaImg.naturalWidth > 0) {
      ctx.drawImage(maracujaImg, -size / 2, -size / 2 + bounce, size, size);

      // Ulls animats segons la direcció del moviment
      const eyeY = bounce + size * 0.05;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-5, eyeY, 4, 0, Math.PI * 2);
      ctx.arc(5, eyeY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Ninetes que miren en la direcció del desplaçament
      ctx.fillStyle = m.eyeColor;
      ctx.beginPath();
      ctx.arc(-5 + m.dirX * 2, eyeY + m.dirY * 2, 2.2, 0, Math.PI * 2);
      ctx.arc(5 + m.dirX * 2, eyeY + m.dirY * 2, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Brillantor de personalitat
      ctx.strokeStyle = m.glowColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, bounce + size * 0.08, TILE_SIZE * 0.44, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* ─── Bucle d'Animació ─── */
function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

/* ─── Victòria & Fabricació del Te ─── */
async function checkVictory() {
  if (remainingMaracuyas <= 0) {
    isPlaying = false;
    playVictorySound();
    launchConfetti(90);

    const levelBonus = 100 * level;
    score += levelBonus;
    updateCounters();

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('obrador_sc_best', bestScore);
    }

    document.getElementById('victory-score').textContent = score.toLocaleString();
    document.getElementById('overlay-victory').classList.remove('hidden');

    if (currentUser) {
      await saveScore(GAME_ID, currentUser.uid, score, currentProfile);
      await unlockNextGame(GAME_ID, currentUser.uid);
      loadRanking();
    }
  }
}

/* ─── Game Over ─── */
async function gameOver() {
  isPlaying = false;
  document.getElementById('gameover-score').textContent = `${score.toLocaleString()} punts`;
  document.getElementById('overlay-gameover').classList.remove('hidden');

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('obrador_sc_best', bestScore);
  }

  if (currentUser) {
    await saveScore(GAME_ID, currentUser.uid, score, currentProfile);
    loadRanking();
  }
}

/* ─── Actualitzar HUD ─── */
function updateCounters() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('best-score').textContent = bestScore.toLocaleString();
  document.getElementById('lives').textContent = '❤️'.repeat(Math.max(0, lives));
  document.getElementById('fruit-counter').textContent = `${totalMaracuyas - remainingMaracuyas}/${totalMaracuyas}`;
}

/* ─── Control de Partides ─── */
function startGame() {
  score = 0;
  lives = 3;
  level = 1;
  initMaze();
  createMaracuyas();
  resetPositions();
  isPlaying = true;
  isPaused = false;
  document.getElementById('overlay-start').classList.add('hidden');
  document.getElementById('overlay-victory').classList.add('hidden');
  document.getElementById('overlay-gameover').classList.add('hidden');
  getAudioContext();
}

function nextLevel() {
  level++;
  initMaze();
  createMaracuyas();
  resetPositions();
  isPlaying = true;
  isPaused = false;
  document.getElementById('overlay-victory').classList.add('hidden');
}

/* ─── Toggle Navbar ─── */
const btnToggleNav = document.getElementById('btn-toggle-nav');
if (btnToggleNav) {
  const isNavHidden = localStorage.getItem('sasha_nav_hidden') === 'true';
  if (isNavHidden) document.body.classList.add('navbar-hidden');

  btnToggleNav.addEventListener('click', () => {
    document.body.classList.toggle('navbar-hidden');
    const hidden = document.body.classList.contains('navbar-hidden');
    localStorage.setItem('sasha_nav_hidden', hidden);
    setTimeout(resizeCanvas, 100);
  });
}

/* ─── Listeners de Botons ─── */
document.getElementById('btn-start')?.addEventListener('click', startGame);
document.getElementById('btn-restart')?.addEventListener('click', startGame);
document.getElementById('btn-victory-replay')?.addEventListener('click', startGame);
document.getElementById('btn-gameover-replay')?.addEventListener('click', startGame);
document.getElementById('btn-next-level')?.addEventListener('click', nextLevel);

/* ─── Rànquings & Autenticació ─── */
let currentUser = null;
let currentProfile = null;

async function loadRanking() {
  try {
    const entries = await getGameRanking(GAME_ID);
    renderRankingTable(entries, 'ranking-container', currentUser?.uid);
  } catch (e) {
    const el = document.getElementById('ranking-container');
    if (el) el.innerHTML = '<p class="text-center text-muted" style="padding:1.5rem">Inicia sessió per veure el rànquing</p>';
  }
}

onAuthReady((user, profile) => {
  currentUser = user;
  currentProfile = profile;
  if (user) {
    renderNavbarUser(profile, user);
  }
  loadRanking();
});

/* ─── Inicialització ─── */
initMaze();
createMaracuyas();
resizeCanvas();
updateCounters();
requestAnimationFrame(gameLoop);
