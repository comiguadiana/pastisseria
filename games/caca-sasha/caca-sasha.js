/**
 * caca-sasha.js — Llança pastissos a la Sasha la serp alienígena!
 *
 * Mecànica:
 * - La Sasha es mou erràticament per la pantalla
 * - Clica (o toca) per llançar un pastís cap allà on la Sasha estava
 * - Encerta per acumular punts, erra per perdre el combo
 * - Sistema de combo: encerts consecutius multipliquen punts
 * - Dura 60 segons
 */

import { requireAuth, renderNavbarUser, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Config ── */
const GAME_TIME    = 60;
const SASHA_SIZE   = 80;   // px
const PASTRY_SPEED = 600;  // px/s
const COMBO_TIME   = 2.5;  // s per mantenir combo

const PASTRIES = ['🥐','🍩','🧁','🎂','🍪','🥧'];
const SASHA_PHRASES_MISS  = ['Ha, ha, ha! 😈', 'No m\'atraparàs!', '🐍💨', 'Poca-traça!', 'I un be negre!'];
const SASHA_PHRASES_HIT   = ['Aïïïïïïï! 😤', 'M\'has tocat!', '🤕', 'Tornaré...', 'Compte!'];

/* ── Estat ── */
let canvas = document.getElementById('cs-canvas');
let ctx    = canvas ? canvas.getContext('2d') : null;
let sashaImg = new Image();
sashaImg.src = '../../assets/img/sasha.png';
let score = 0, bestScore = 0, combo = 1, comboTimer = 0;
let timeLeft = GAME_TIME;
let gameRunning = false;
let animFrame, countdownTimer;
let lastTime = 0;
let uid = null, profile = null;

/* ── Audio sintetitzat ── */
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

function playHitSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (e) {}
}

function playShootSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch (e) {}
}

// Sasha
let sasha = { x: 200, y: 200, vx: 120, vy: 80, phrase: '', phraseTimer: 0, hit: false, hitTimer: 0 };

// Projectils llançats
let projectiles = [];

// Partícules
let particles = [];

// Nombre de pastissos llançats (per precisió)
let totalShots = 0, totalHits = 0;

/* ── Auth ── */
requireAuth('../../login.html')
  .then(async ({ user, profile: p }) => {
    uid = user.uid; profile = p;
    renderNavbarUser(p, user);
    try {
      const ref = doc(db, 'scores', GAMES.CACA_SASHA, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) bestScore = snap.data().score;
    } catch(e) {}
    const bestEl = document.getElementById('best');
    if (bestEl) bestEl.textContent = bestScore.toLocaleString();
    initGame();
  }).catch(() => {});

/* ── Init ── */
function initGame() {
  canvas = document.getElementById('cs-canvas');
  ctx    = canvas.getContext('2d');
  resizeCanvas();

  score = 0; combo = 1; comboTimer = 0;
  timeLeft = GAME_TIME;
  gameRunning = true;
  totalShots = 0; totalHits = 0;
  projectiles = []; particles = [];

  sasha.x = canvas.width / 2; sasha.y = canvas.height / 2;
  sasha.vx = 100 + Math.random() * 80;
  sasha.vy = 80  + Math.random() * 60;
  sasha.phrase = 'Atrapa\'m!'; sasha.phraseTimer = 2;

  document.getElementById('cs-overlay').classList.add('hidden');
  document.getElementById('timer').style.color = '';
  updateHUD();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(tick, 1000);
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function resizeCanvas() {
  const maxW = Math.min(window.innerWidth - 24, 600);
  const navEl = document.querySelector('.navbar');
  const hudEl = document.querySelector('.game-hud');
  const navH = (navEl && navEl.offsetHeight) || 50;
  const hudH = (hudEl && hudEl.offsetHeight) || 60;
  const availH = window.innerHeight - navH - hudH - 50;
  canvas.width  = maxW;
  canvas.height = Math.max(260, Math.min(availH, 480));

  if (sasha) {
    sasha.x = Math.max(30, Math.min(canvas.width - 30, sasha.x));
    sasha.y = Math.max(30, Math.min(canvas.height - 30, sasha.y));
  }
}

window.addEventListener('resize', resizeCanvas);

/* ── Tick del temps ── */
function tick() {
  timeLeft--;
  document.getElementById('timer').textContent = timeLeft;
  if (timeLeft <= 10) document.getElementById('timer').style.color = '#FF8FAB';
  if (timeLeft <= 0) endGame();
}

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
  // Mou Sasha (erràticament)
  const speedMult = 1 + (GAME_TIME - timeLeft) * 0.02; // accelera amb el temps
  sasha.x += sasha.vx * dt * speedMult;
  sasha.y += sasha.vy * dt * speedMult;

  // Rebota a les parets
  if (sasha.x < SASHA_SIZE/2 || sasha.x > canvas.width - SASHA_SIZE/2) {
    sasha.vx *= -1;
    sasha.x = Math.max(SASHA_SIZE/2, Math.min(canvas.width - SASHA_SIZE/2, sasha.x));
    // Canvi de direcció aleatori
    if (Math.random() < 0.3) sasha.vy += (Math.random() - 0.5) * 60;
  }
  if (sasha.y < SASHA_SIZE/2 || sasha.y > canvas.height - SASHA_SIZE/2) {
    sasha.vy *= -1;
    sasha.y = Math.max(SASHA_SIZE/2, Math.min(canvas.height - SASHA_SIZE/2, sasha.y));
    if (Math.random() < 0.3) sasha.vx += (Math.random() - 0.5) * 60;
  }

  // Canvi de direcció aleatori ocasional
  if (Math.random() < 0.01) {
    sasha.vx += (Math.random() - 0.5) * 80;
    sasha.vy += (Math.random() - 0.5) * 60;
    // Limita velocitat màxima
    const maxV = 200 + (GAME_TIME - timeLeft) * 3;
    const v = Math.sqrt(sasha.vx**2 + sasha.vy**2);
    if (v > maxV) { sasha.vx = (sasha.vx/v)*maxV; sasha.vy = (sasha.vy/v)*maxV; }
  }

  sasha.phraseTimer -= dt;
  sasha.hitTimer    -= dt;

  // Combo timer
  comboTimer -= dt;
  if (comboTimer <= 0 && combo > 1) {
    combo = 1;
    updateHUD();
  }

  // Projectils
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const dx = p.tx - p.sx;
    const dy = p.ty - p.sy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    p.progress += (PASTRY_SPEED / dist) * dt;

    if (p.progress >= 1) {
      // Comprova si ha encertat la Sasha (en la posició on ERA, no on és ara)
      const hx = p.sx + dx * 1;
      const hy = p.sy + dy * 1;
      const sashaDistAtShot = Math.sqrt((hx - p.sashaX)**2 + (hy - p.sashaY)**2);

      if (sashaDistAtShot < SASHA_SIZE * 0.8) {
        // ENCERT!
        totalHits++;
        playHitSound();
        const pts = 10 * combo;
        score += pts;
        comboTimer = COMBO_TIME;
        combo = Math.min(combo + 1, 8);
        sasha.phrase    = SASHA_PHRASES_HIT[Math.floor(Math.random() * SASHA_PHRASES_HIT.length)];
        sasha.phraseTimer = 1.5;
        sasha.hit       = true; sasha.hitTimer = 0.3;
        addParticle(p.sashaX, p.sashaY, PASTRIES[p.type], '#FFD700');
        addParticle(p.sashaX, p.sashaY - 20, `+${pts}`, '#FFD700', true);
        updateComboDisplay();
      } else {
        // Fallat
        combo = 1; comboTimer = 0;
        sasha.phrase    = SASHA_PHRASES_MISS[Math.floor(Math.random() * SASHA_PHRASES_MISS.length)];
        sasha.phraseTimer = 1.5;
        addParticle(hx, hy, '💨', '#aaa');
      }

      projectiles.splice(i, 1);
      updateHUD();
      continue;
    }

    p.x = p.sx + dx * p.progress;
    p.y = p.sy + dy * p.progress;
  }

  // Partícules
  particles = particles.filter(p => { p.life -= dt; return p.life > 0; });
}

/* ── Dibuix ── */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fons galàctic
  drawStars();

  // Sasha
  drawSasha();

  // Projectils
  ctx.font = '28px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of projectiles) {
    const angle = Math.atan2(p.ty - p.sy, p.tx - p.sx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle + Math.PI/4);
    ctx.fillText(PASTRIES[p.type], 0, 0);
    ctx.restore();
  }

  // Partícules
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    if (p.isText) {
      ctx.font = 'bold 18px ' + getComputedStyle(document.body).getPropertyValue('--font-display') || 'serif';
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.fillText(p.emoji, p.x, p.y - (1 - p.life) * 40);
    } else {
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.emoji, p.x, p.y - (1 - p.life) * 30);
    }
  }
  ctx.globalAlpha = 1;
}

let stars = null;
function drawStars() {
  if (!stars) {
    stars = Array.from({length: 60}, () => ({
      x: Math.random() * 600, y: Math.random() * 480,
      r: Math.random() * 1.5, o: 0.3 + Math.random() * 0.7
    }));
  }
  for (const s of stars) {
    ctx.fillStyle = `rgba(255,255,255,${s.o})`;
    ctx.beginPath();
    ctx.arc(s.x % canvas.width, s.y % canvas.height, s.r, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawSasha() {
  const isHit = sasha.hit && sasha.hitTimer > 0;
  if (isHit) {
    ctx.filter = 'brightness(2) saturate(0)';
  }

  if (sashaImg?.complete) {
    const sw = SASHA_SIZE, sh = SASHA_SIZE;
    // Animació lleugera
    const wobble = Math.sin(Date.now() / 200) * 3;
    ctx.save();
    ctx.translate(sasha.x, sasha.y + wobble);
    // Mirall si va cap a l'esquerra
    if (sasha.vx < 0) { ctx.scale(-1, 1); }
    ctx.drawImage(sashaImg, -sw/2, -sh/2, sw, sh);
    ctx.restore();
  } else {
    // Fallback emoji si la imatge no carrega
    ctx.font = `${SASHA_SIZE * 0.6}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐍', sasha.x, sasha.y);
  }
  ctx.filter = 'none';
  sasha.hit = sasha.hitTimer > 0;

  // Frase de la Sasha
  if (sasha.phraseTimer > 0 && sasha.phrase) {
    ctx.save();
    ctx.fillStyle = 'rgba(45,27,105,0.85)';
    const tw = ctx.measureText(sasha.phrase).width + 20;
    let px = sasha.x - tw/2;
    px = Math.max(5, Math.min(canvas.width - tw - 5, px));
    const py = sasha.y - SASHA_SIZE/2 - 45;
    roundRect(ctx, px, py, tw, 30, 8); ctx.fill();
    ctx.fillStyle = '#B8F0D8';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(sasha.phrase, sasha.x, py + 15);
    ctx.restore();
  }
}

/* ── Partícules ── */
function addParticle(x, y, emoji, color, isText = false) {
  particles.push({ x, y, emoji, color, isText, life: 1 });
}

/* ── Combo display ── */
function updateComboDisplay() {
  const el = document.getElementById('combo-display');
  const txt = document.getElementById('combo-text');
  if (combo >= 2) {
    txt.textContent = combo >= 5 ? `🔥 MEGA COMBO x${combo}!` : `COMBO x${combo}!`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 1500);
  }
}

/* ── Click / touch per llançar ── */
function shoot(x, y) {
  if (!gameRunning) return;
  totalShots++;
  playShootSound();
  const cx = canvas.width / 2;
  const cy = canvas.height - 30;
  projectiles.push({
    sx: cx, sy: cy,      // origen (baix centre)
    tx: x, ty: y,        // destí (on has clicat)
    x: cx, y: cy,
    type: Math.floor(Math.random() * PASTRIES.length),
    progress: 0,
    sashaX: sasha.x, sashaY: sasha.y // posició de la Sasha EN EL MOMENT del llançament
  });
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  shoot((e.clientX - rect.left) * (canvas.width / rect.width),
        (e.clientY - rect.top)  * (canvas.height / rect.height));
});

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const t    = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  shoot((t.clientX - rect.left) * (canvas.width / rect.width),
        (t.clientY - rect.top)  * (canvas.height / rect.height));
}, { passive: false });

/* ── HUD ── */
function updateHUD() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('best').textContent  = bestScore.toLocaleString();
  document.getElementById('level').textContent = combo > 1 ? `x${combo}` : '1';
}

/* ── Fi del joc ── */
async function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animFrame);
  clearInterval(countdownTimer);

  const isNew = score > bestScore;
  if (isNew) { bestScore = score; }

  const accuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;

  document.getElementById('cs-title').textContent   = isNew ? 'Nou Rècord! 🏆' : 'Temps esgotat!';
  document.getElementById('cs-score-text').textContent = `${score.toLocaleString()} punts`;
  document.getElementById('cs-msg').textContent     = `${totalHits} encerts de ${totalShots} llançaments (${accuracy}% de precisió)`;
  document.getElementById('cs-overlay').classList.remove('hidden');

  if (uid && profile) {
    try {
      const isRecord = await saveScore(GAMES.CACA_SASHA, uid, score, profile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.CACA_SASHA, 10);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.CACA_SASHA, uid);
        
      }
    } catch(e) {}
  }
}

/* ── Ranking ── */
async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.CACA_SASHA, 10);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch(e) {
    document.getElementById('ranking-container').innerHTML =
      '<p style="text-align:center;padding:1rem;color:rgba(184,240,216,0.5)">Configura Firebase per veure el rànquing</p>';
  }
}

/* ── Botons ── */
document.getElementById('btn-restart').addEventListener('click', () => {
  cancelAnimationFrame(animFrame); clearInterval(countdownTimer);
  initGame();
});
document.getElementById('btn-play-again').addEventListener('click', () => {
  document.getElementById('cs-overlay').classList.add('hidden');
  initGame();
});

/* ── Utilitats ── */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

/* ── Init ranking ── */
requireAuth('../../login.html')
  .then(() => loadRanking())
  .catch(() => {});
