/**
 * pastis-caigut.js — Joc de recollir pastissos que cauen
 * Mecànica: mou la cistella per recollir pastissos (60s)
 * Vides: perds una si en cau un a terra
 */

import { requireAuth, renderNavbarUser, getDiceBearUrl, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Configuració ── */
const GAME_TIME  = 60;   // segons
const MAX_LIVES  = 3;
const BASE_SPEED = 150;  // px/s
const SPAWN_INTERVAL = 1200; // ms

const PASTRIES = [
  { emoji:'🥐', pts:10, label:'Croissant' },
  { emoji:'🍩', pts:15, label:'Dònut'     },
  { emoji:'🧁', pts:20, label:'Magdalena' },
  { emoji:'🎂', pts:30, label:'Pastís'    },
  { emoji:'🍪', pts:10, label:'Galeta'    },
  { emoji:'💣', pts:-50, label:'Bomba!'   }, // obstacle
];

let canvas = document.getElementById('pc-canvas');
let ctx    = canvas ? canvas.getContext('2d') : null;
let score = 0, bestScore = 0, lives = MAX_LIVES;
let timeLeft = GAME_TIME;
let gameRunning = false;
let animFrame   = null;
let spawnTimer  = null;
let countdownTimer = null;
let lastTime    = 0;
let uid = null, profile = null;

let basket = { x: 200, w: 100, h: 50 };
let falling = []; // { x, y, type, speed }
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
      if (snap.exists()) bestScore = snap.data().score;
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

  score   = 0; lives = MAX_LIVES; timeLeft = GAME_TIME;
  falling = []; particles = [];
  gameRunning = true;

  basket.x = canvas.width / 2 - basket.w / 2;
  basket.w = Math.min(canvas.width * 0.25, 120);

  document.getElementById('pc-overlay').classList.add('hidden');
  updateHUD();
  startTimers();
  lastTime = performance.now();
  requestAnimationFrame(loop);
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
  basket.y = canvas.height - BASKET_Y_OFFSET;
  basket.w = Math.min(canvas.width * 0.25, 120);
  basket.x = Math.max(0, Math.min(canvas.width - basket.w, basket.x));
}

window.addEventListener('resize', () => {
  resizeCanvas();
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
  const speed = BASE_SPEED + (GAME_TIME - timeLeft) * 2;
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    f.y += f.speed * dt;

    // Col·lisió amb la cistella
    if (f.y + 30 >= basket.y &&
        f.y      <= basket.y + basket.h + 10 &&
        f.x + 20 >= basket.x &&
        f.x - 20 <= basket.x + basket.w) {

      const p = PASTRIES[f.type];
      if (p.pts > 0) {
        score += p.pts;
        addParticle(f.x, f.y, p.emoji, '#5DBB63');
        showToast(`+${p.pts} ${p.emoji}`, 'success', 700);
      } else {
        lives = Math.max(0, lives - 1);
        addParticle(f.x, f.y, '💥', '#FF4444');
        showToast('💣 Autsch!', 'error', 1000);
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
    ctx.globalAlpha = p.life;
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

/* ── Spawn de pastissos ── */
function spawnPastry() {
  if (!gameRunning) return;
  const x    = 30 + Math.random() * (canvas.width - 60);
  // Bomba cada 8-12 pastissos
  let type;
  if (Math.random() < 0.12) {
    type = 5; // bomba
  } else {
    type = Math.floor(Math.random() * 5);
  }
  const speed = BASE_SPEED + (GAME_TIME - timeLeft) * 2 + Math.random() * 50;
  falling.push({ x, y: -30, type, speed });
}

/* ── Timers ── */
function startTimers() {
  clearInterval(spawnTimer);
  clearInterval(countdownTimer);

  spawnTimer = setInterval(spawnPastry, SPAWN_INTERVAL);

  countdownTimer = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;
    if (timeLeft <= 10) {
      document.getElementById('timer').style.color = '#FF8FAB';
    }
    if (timeLeft <= 0) { endGame(); }
  }, 1000);
}

/* ── Fi del joc ── */
async function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animFrame);
  clearInterval(spawnTimer);
  clearInterval(countdownTimer);

  const isNew = score > bestScore;
  if (isNew) { bestScore = score; }

  document.getElementById('pc-emoji').textContent  = isNew ? '🏆' : '🧺';
  document.getElementById('pc-title').textContent  = isNew ? 'Nou Rècord!' : 'Fi del joc!';
  document.getElementById('pc-score').textContent  = score.toLocaleString() + ' punts';
  document.getElementById('pc-overlay').classList.remove('hidden');

  if (uid && profile) {
    try {
      const isRecord = await saveScore(GAMES.PASTIS_CAIGUT, uid, score, profile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.PASTIS_CAIGUT, 10);
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
  const step = 20;
  if (e.key === 'ArrowLeft')  basket.x = Math.max(0, basket.x - step);
  if (e.key === 'ArrowRight') basket.x = Math.min(canvas.width - basket.w, basket.x + step);
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
  document.getElementById('lives').textContent = '❤️'.repeat(lives) + '🖤'.repeat(MAX_LIVES - lives);
}

/* ── Ranking ── */
async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.PASTIS_CAIGUT, 10);
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
  clearInterval(countdownTimer);
  initGame();
});
document.getElementById('btn-play-again').addEventListener('click', () => {
  document.getElementById('pc-overlay').classList.add('hidden');
  initGame();
});
