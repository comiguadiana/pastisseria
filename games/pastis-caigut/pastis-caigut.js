/**
 * pastis-caigut.js — Joc de recollir pastissos que cauen
 * Mecànica: Mou la cistella per recollir dolços sense temporitzador.
 * Dificultat progressiva: Puja de nivell cada 8 pastissos, accelerant la caiguda i augmentant obstacles!
 * Vides: 3 vides. Perds una si en cau un a terra o toques una bomba.
 */

import { requireAuth, renderNavbarUser, getDiceBearUrl, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Configuració ── */
const MAX_LIVES   = 3;
const BASE_SPEED  = 180;  // px/s inicial
const BASE_SPAWN  = 1100; // ms inicial

const PASTRIES = [
  { emoji:'🥐', pts:4,  label:'Croissant' },
  { emoji:'🍩', pts:6,  label:'Dònut'     },
  { emoji:'🧁', pts:8,  label:'Magdalena' },
  { emoji:'🎂', pts:12, label:'Pastís'    },
  { emoji:'🍪', pts:4,  label:'Galeta'    },
  { emoji:'💣', pts:-30, label:'Bomba!'   }, // obstacle
];

let canvas = document.getElementById('pc-canvas');
let ctx    = canvas ? canvas.getContext('2d') : null;
let score = 0, bestScore = 0, lives = MAX_LIVES;
let level = 1;
let caughtCount = 0;
let gameRunning = false;
let animFrame   = null;
let spawnTimer  = null;
let lastTime    = 0;
let uid = null, profile = null;

let basket = { x: 200, y: 0, w: 100, h: 50 };
let falling = []; // { x, y, type, speed, vx }
let particles = []; // efectes visuals

const BASKET_Y_OFFSET = 80; // des de baix del canvas

/* ── Auth ── */
requireAuth('../../login.html')
  .then(async ({ user, profile: p }) => {
    uid = user.uid; profile = p;
    renderNavbarUser(p, user);
    try {
      const ref = doc(db, 'scores', GAMES.PASTIS_CAIGUT, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) bestScore = snap.data().score || 0;
    } catch(e) {}
    const bestEl = document.getElementById('best');
    if (bestEl) bestEl.textContent = bestScore.toLocaleString();
    initGame();
    loadRanking();
  }).catch(() => {});

/* ── Init ── */
function initGame() {
  canvas  = document.getElementById('pc-canvas');
  ctx     = canvas.getContext('2d');
  resizeCanvas();

  score       = 0;
  lives       = MAX_LIVES;
  level       = 1;
  caughtCount = 0;
  falling     = [];
  particles   = [];
  gameRunning = true;

  updateBasketSize();
  basket.x = canvas.width / 2 - basket.w / 2;

  document.getElementById('pc-overlay').classList.add('hidden');
  updateHUD();
  restartSpawnTimer();
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function updateBasketSize() {
  if (!canvas) return;
  const baseW = Math.min(canvas.width * 0.25, 115);
  // Reducció suau de l'amplada de la cistella amb el nivell
  basket.w = Math.max(65, baseW - (level - 1) * 3);
  basket.y = canvas.height - BASKET_Y_OFFSET;
  basket.x = Math.max(0, Math.min(canvas.width - basket.w, basket.x));
}

function resizeCanvas() {
  const maxW = Math.min(window.innerWidth - 20, 480);
  const navEl = document.querySelector('.navbar');
  const hudEl = document.querySelector('.game-hud');
  const navH = (navEl && navEl.offsetHeight) || 45;
  const hudH = (hudEl && hudEl.offsetHeight) || 55;
  const availH = window.innerHeight - navH - hudH - 50;

  canvas.width  = maxW;
  canvas.height = Math.max(260, Math.min(availH, 520));
  updateBasketSize();
}

window.addEventListener('resize', () => {
  if (canvas) resizeCanvas();
});

/* ── Game loop ── */
function loop(ts) {
  if (!gameRunning) return;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  update(dt);
  draw();
  animFrame = requestAnimationFrame(loop);
}

/* ── Update ── */
function update(dt) {
  // Mou els pastissos
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    f.y += f.speed * dt;
    if (f.vx) {
      f.x += f.vx * dt;
      // Rebot suau a parets
      if (f.x < 25) { f.x = 25; f.vx = Math.abs(f.vx); }
      if (f.x > canvas.width - 25) { f.x = canvas.width - 25; f.vx = -Math.abs(f.vx); }
    }

    // Col·lisió amb la cistella
    if (f.y + 30 >= basket.y &&
        f.y      <= basket.y + basket.h + 10 &&
        f.x + 20 >= basket.x &&
        f.x - 20 <= basket.x + basket.w) {

      const p = PASTRIES[f.type];
      if (p.pts > 0) {
        score += p.pts;
        caughtCount++;
        addParticle(f.x, f.y, p.emoji, '#5DBB63');
        showToast(`+${p.pts} ${p.emoji}`, 'success', 600);

        // Pujada de nivell cada 8 pastissos recollits
        const newLevel = Math.floor(caughtCount / 8) + 1;
        if (newLevel > level) {
          level = newLevel;
          updateBasketSize();
          restartSpawnTimer();
          addParticle(canvas.width / 2, canvas.height / 2, '⚡', '#FFD700');
          showToast(`🚀 NIVELL ${level}! Més velocitat!`, 'warning', 1500);
        }
      } else {
        lives = Math.max(0, lives - 1);
        score = Math.max(0, score + p.pts);
        addParticle(f.x, f.y, '💥', '#FF4444');
        showToast('💣 Bomba! -1 Vida', 'error', 1000);
        if (lives === 0) { endGame(); return; }
      }
      falling.splice(i, 1);
      updateHUD();
      continue;
    }

    // Ha caigut a terra sense recollir
    if (f.y > canvas.height + 30) {
      falling.splice(i, 1);
      if (PASTRIES[f.type].pts > 0) {
        lives = Math.max(0, lives - 1);
        addParticle(f.x, canvas.height - 20, '💔', '#FF8FAB');
        showToast('💔 Se t\'ha escapat!', 'error', 700);
        if (lives === 0) { endGame(); return; }
        updateHUD();
      }
    }
  }

  // Partícules
  particles = particles.filter(p => { p.life -= dt; return p.life > 0; });
}

/* ── Dibuix ── */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Cel
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#5B9BD5');
  grad.addColorStop(0.6, '#87CEEB');
  grad.addColorStop(0.8, '#C4A882');
  grad.addColorStop(1, '#8B7355');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Terra
  ctx.fillStyle = '#5C3317';
  ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(0, canvas.height - 35, canvas.width, 8);

  // Pastissos caient
  ctx.font = '36px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  for (const f of falling) {
    ctx.fillText(PASTRIES[f.type].emoji, f.x, f.y);
  }

  // Cistella
  drawBasket();

  // Partícules
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.font = '28px serif';
    ctx.fillText(p.emoji, p.x, p.y - (1 - p.life) * 50);
  }
  ctx.globalAlpha = 1;
}

function drawBasket() {
  const bx = basket.x, by = basket.y, bw = basket.w, bh = basket.h;
  // Ombra
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(bx + bw/2, by + bh + 4, bw/2, 8, 0, 0, Math.PI*2);
  ctx.fill();
  // Cos cistella
  ctx.fillStyle = '#8B5E3C';
  ctx.beginPath();
  ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw - 10, by + bh);
  ctx.lineTo(bx + 10, by + bh); ctx.closePath(); ctx.fill();
  // Vora
  ctx.strokeStyle = '#5C3317'; ctx.lineWidth = 3;
  ctx.stroke();
  // Línies de teixit
  ctx.strokeStyle = 'rgba(92,51,23,0.4)'; ctx.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) {
    const yy = by + (bh / 4) * i;
    ctx.beginPath(); ctx.moveTo(bx + (i*2), yy);
    ctx.lineTo(bx + bw - (i*2), yy); ctx.stroke();
  }
  // Emoji cistella
  ctx.font = '14px serif'; ctx.fillStyle = '#D4A017';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🧺', bx + bw/2, by + bh/2);
}

/* ── Partícules ── */
function addParticle(x, y, emoji, color) {
  particles.push({ x, y, emoji, color, life: 1 });
}

/* ── Spawn de pastissos amb dificultat progressiva ── */
function spawnSinglePastry(forcedOffset = 0) {
  const margin = 35;
  const x = margin + Math.random() * (canvas.width - margin * 2) + forcedOffset;
  const clampedX = Math.max(margin, Math.min(canvas.width - margin, x));

  // Probabilitat de bomba segons nivell (8% nivell 1 fins a 25% nivell 7+)
  const bombChance = Math.min(0.25, 0.08 + (level - 1) * 0.025);
  let type;
  if (Math.random() < bombChance) {
    type = 5; // bomba
  } else {
    type = Math.floor(Math.random() * 5);
  }

  // Velocitat segons nivell
  const speed = BASE_SPEED + (level - 1) * 35 + (type === 5 ? 30 : 0) + Math.random() * 30;
  // A nivells alts, petit balanceig horitzontal
  const vx = level >= 4 && Math.random() < 0.35 ? (Math.random() - 0.5) * 60 : 0;

  falling.push({ x: clampedX, y: -30, type, speed, vx });
}

function spawnWave() {
  if (!gameRunning) return;

  // Determinar quants dolços cauen alhora
  let count = 1;
  if (level >= 6 && Math.random() < 0.20) {
    count = 3;
  } else if (level >= 3 && Math.random() < 0.35) {
    count = 2;
  }

  for (let i = 0; i < count; i++) {
    const offset = (count > 1) ? (i - (count - 1) / 2) * (canvas.width * 0.3) : 0;
    setTimeout(() => {
      if (gameRunning) spawnSinglePastry(offset);
    }, i * 160);
  }
}

/* ── Timers ── */
function restartSpawnTimer() {
  clearInterval(spawnTimer);
  // Interval de spawn es redueix amb el nivell
  const interval = Math.max(380, BASE_SPAWN - (level - 1) * 75);
  spawnTimer = setInterval(spawnWave, interval);
}

/* ── Fi del joc ── */
async function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animFrame);
  clearInterval(spawnTimer);

  const isNew = score > bestScore;
  if (isNew) { bestScore = score; }

  document.getElementById('pc-emoji').textContent  = isNew ? '🏆' : '🧺';
  document.getElementById('pc-title').textContent  = isNew ? 'Nou Rècord!' : 'Fi del joc!';
  document.getElementById('pc-score').textContent  = `${score.toLocaleString()} punts (Nivell ${level})`;
  document.getElementById('pc-overlay').classList.remove('hidden');

  if (uid && profile) {
    try {
      const isRecord = await saveScore(GAMES.PASTIS_CAIGUT, uid, score, profile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.PASTIS_CAIGUT);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.PASTIS_CAIGUT, uid);
      }
    } catch(e) {}
  }
}

/* ── Controls ── */
// Teclat
document.addEventListener('keydown', (e) => {
  if (!gameRunning) return;
  const step = 24;
  if (e.key === 'ArrowLeft' || e.key === 'KeyA')  basket.x = Math.max(0, basket.x - step);
  if (e.key === 'ArrowRight' || e.key === 'KeyD') basket.x = Math.min(canvas.width - basket.w, basket.x + step);
});

// Ratolí
canvas.addEventListener('mousemove', (e) => {
  if (!gameRunning) return;
  const rect = canvas.getBoundingClientRect();
  const mx   = (e.clientX - rect.left) * (canvas.width / rect.width);
  basket.x   = Math.max(0, Math.min(canvas.width - basket.w, mx - basket.w/2));
});

// Touch
let touchStartX = 0;
canvas.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!gameRunning) return;
  const rect = canvas.getBoundingClientRect();
  const tx   = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
  basket.x   = Math.max(0, Math.min(canvas.width - basket.w, tx - basket.w/2));
}, { passive: false });

/* ── HUD ── */
function updateHUD() {
  document.getElementById('score').textContent = score.toLocaleString();
  const levelEl = document.getElementById('level');
  if (levelEl) levelEl.textContent = level;
  document.getElementById('lives').textContent = '❤️'.repeat(lives) + '🖤'.repeat(MAX_LIVES - lives);
}

/* ── Ranking ── */
async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.PASTIS_CAIGUT);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch(e) {
    document.getElementById('ranking-container').innerHTML =
      '<p class="text-center" style="padding:1rem;color:var(--gray-400)">Configura Firebase per veure el rànquing</p>';
  }
}

/* ── Botons ── */
document.getElementById('btn-restart').addEventListener('click', () => {
  cancelAnimationFrame(animFrame);
  clearInterval(spawnTimer);
  initGame();
});
document.getElementById('btn-play-again').addEventListener('click', () => {
  document.getElementById('pc-overlay').classList.add('hidden');
  initGame();
});
