/**
 * llanca-ensaimada.js — Llança ensaïmades al donut gegant!
 *
 * Mecànica:
 * - Tens 10 llançaments per ronda
 * - Clica i arrossega per apuntar (es veu la trajectòria prevista)
 * - Deixa anar per llançar amb física de paràbola
 * - El donut és la diana: el forat central val el doble de punts
 * - Puntuació per precisió i distància
 */

import { requireAuth, renderNavbarUser, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, launchConfetti, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Configuració ── */
const MAX_THROWS    = 10;
const GRAVITY       = 750;     // px/s²
const MAX_POWER     = 900;     // px/s velocitat màxima
const DRAG_SCALE    = 2.5;     // multiplicador de la distància d'arrossegament
const DONUT_RADIUS  = 60;      // radi exterior del donut (reduït per dificultat)
const HOLE_RADIUS   = 22;      // radi del forat central (bonus!)
const ENSAIMADA_R   = 22;      // radi de l'ensaïmada

/* ── Estat ── */
let canvas, ctx;
let throwsLeft = MAX_THROWS;
let score = 0, bestScore = 0;
let hits = 0, totalThrows = 0;
let gameRunning   = false;
let animFrame     = null;
let uid = null, profile = null;

// Posicions fixes
let launchPos  = { x: 0, y: 0 };   // on llança l'usuari (baix esquerra)
let donutPos   = { x: 0, y: 0 };   // centre del donut (dalt dreta)
let donutBaseX = 0;                 // posició base x per l'oscil·lació
let donutAngle = 0;                 // rotació animada
let gameTime   = 0;                 // temps de joc per l'oscil·lació

// Arrossegament
let isDragging  = false;
let dragStart   = { x: 0, y: 0 };
let dragCurrent = { x: 0, y: 0 };

// Projectil en vol
let projectile = null;  // { x, y, vx, vy, active }

// Partícules
let particles = [];

// Efecte impacte (flash del donut)
let donutFlash = 0;   // 0..1, decreix amb el temps

/* ── Auth ── */
requireAuth('../../login.html')
  .then(async ({ user, profile: p }) => {
    uid = user.uid; profile = p;
    renderNavbarUser(p, user);
    try {
      const ref = doc(db, 'scores', GAMES.LLANCA_ENSAIMADA, 'players', uid);
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
  canvas = document.getElementById('le-canvas');
  ctx    = canvas.getContext('2d');
  resizeCanvas();

  throwsLeft = MAX_THROWS;
  score = 0; hits = 0; totalThrows = 0;
  projectile = null; particles = []; donutFlash = 0;
  isDragging = false;
  gameRunning = true;
  gameTime = 0;

  document.getElementById('le-overlay').classList.add('hidden');
  updateHUD();
  bindEvents();
  cancelAnimationFrame(animFrame);
  animFrame = requestAnimationFrame(loop);
}

function resizeCanvas() {
  const maxW = Math.min(window.innerWidth - 20, 600);
  const navEl = document.querySelector('.navbar');
  const hudEl = document.querySelector('.game-hud');
  const navH = (navEl && navEl.offsetHeight) || 45;
  const hudH = (hudEl && hudEl.offsetHeight) || 55;
  const availH = window.innerHeight - navH - hudH - 50;
  
  canvas.width  = maxW;
  canvas.height = Math.max(260, Math.min(availH, 480));

  // Posicions relatives al canvas
  launchPos.x = Math.floor(canvas.width  * 0.18);
  launchPos.y = Math.floor(canvas.height * 0.82);
  donutBaseX  = Math.floor(canvas.width  * 0.75);
  donutPos.x  = donutBaseX;
  donutPos.y  = Math.floor(canvas.height * 0.28);
}

window.addEventListener('resize', () => {
  if (gameRunning) { resizeCanvas(); }
});

/* ── Game loop ── */
let lastTime = 0;
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  animFrame = requestAnimationFrame(loop);
}

/* ── Update ── */
function update(dt) {
  gameTime += dt;
  donutAngle += dt * 0.6;  // rotació lenta del donut
  
  // Moviment oscil·lant del donut (més difícil!)
  donutPos.x = donutBaseX + Math.sin(gameTime * 2.2) * (canvas.width * 0.15);

  // Projectil en vol
  if (projectile?.active) {
    projectile.x  += projectile.vx * dt;
    projectile.y  += projectile.vy * dt;
    projectile.vy += GRAVITY * dt;
    projectile.rot = (projectile.rot || 0) + dt * 8;

    // Col·lisió amb el donut
    const dx   = projectile.x - donutPos.x;
    const dy   = projectile.y - donutPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < DONUT_RADIUS + ENSAIMADA_R) {
      const inHole   = dist < HOLE_RADIUS + ENSAIMADA_R;
      const pts      = inHole ? 300 : Math.max(50, Math.round(200 * (1 - dist / DONUT_RADIUS)));
      score         += pts;
      hits++;
      donutFlash     = 1;

      addBurst(projectile.x, projectile.y, inHole ? '#FFD700' : '#FF8FAB');
      if (inHole) {
        launchConfetti(40);
        showToast('🍩 FORAT CENTRAL! +300 pts!', 'success', 2000);
      } else {
        showToast(`🎯 Encert! +${pts} pts`, 'success', 1200);
      }
      projectile.active = false;
      updateHUD();
      checkGameOver();
    }

    // Surt del canvas (fora de joc)
    if (projectile.y > canvas.height + 50 ||
        projectile.x < -50 || projectile.x > canvas.width + 50) {
      showToast('💨 Fora! Torna a intentar-ho', 'info', 1000);
      projectile.active = false;
      checkGameOver();
    }
  }

  // Flash del donut
  if (donutFlash > 0) donutFlash = Math.max(0, donutFlash - dt * 3);

  // Partícules
  particles = particles.filter(p => {
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.vy += 200 * dt;
    p.life -= dt;
    return p.life > 0;
  });
}

/* ── Comprova si hem acabat ── */
function checkGameOver() {
  if (throwsLeft <= 0 && !projectile?.active) {
    setTimeout(() => endGame(), 600);
  }
}

/* ── Dibuix ── */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fons (cel + terra)
  drawBackground();

  // Guia de trajectòria (mentre arrosseguem)
  if (isDragging) drawTrajectory();

  // Donut diana
  drawDonut();

  // Llançador (cistella / peu)
  drawLauncher();

  // Projectil en vol
  if (projectile?.active) drawProjectile();

  // Partícules
  drawParticles();

  // HUD inline: fletxa potència
  if (isDragging) drawPowerIndicator();
}

function drawBackground() {
  // Cel
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.75);
  sky.addColorStop(0,   '#4A90D9');
  sky.addColorStop(0.6, '#87CEEB');
  sky.addColorStop(1,   '#C8E6FF');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.75);

  // Terra
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height * 0.25);
  ctx.fillStyle = '#6B5A3E';
  ctx.fillRect(0, canvas.height * 0.75, canvas.width, 6);

  // Banderoles festives al fons
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.18);
  ctx.lineTo(canvas.width, canvas.height * 0.12);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pastissos decoratius al fons (subtils)
  ctx.font = '24px serif';
  ctx.globalAlpha = 0.18;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [[0.1,0.5],[0.3,0.35],[0.55,0.45],[0.88,0.55]].forEach(([rx,ry]) => {
    ctx.fillText('🎂', rx * canvas.width, ry * canvas.height);
  });
  ctx.globalAlpha = 1;
}

function drawDonut() {
  ctx.save();
  ctx.translate(donutPos.x, donutPos.y);
  ctx.rotate(donutAngle * 0.3);

  // Flash quan és encertat
  if (donutFlash > 0) {
    ctx.shadowColor  = '#FFD700';
    ctx.shadowBlur   = 30 * donutFlash;
  }

  // Cos exterior del donut (paper maixé)
  ctx.fillStyle = donutFlash > 0 ? `rgba(255,215,0,${0.5 + donutFlash * 0.5})` : '#FF8FAB';
  ctx.beginPath();
  ctx.arc(0, 0, DONUT_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Texture rústica (paper maixé)
  ctx.strokeStyle = 'rgba(201,64,112,0.4)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, DONUT_RADIUS - 8 - i * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Forat central (cel blau = transpar)
  ctx.fillStyle = '#5B9BD5';
  ctx.beginPath();
  ctx.arc(0, 0, HOLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Vora del forat
  ctx.strokeStyle = '#4A7AB5';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Sprinkles (confeti)
  const sprinkleColors = ['#FFD700','#5DBB63','#9B59B6','#E53935','#2196F3'];
  for (let i = 0; i < 10; i++) {
    const ang  = (i / 10) * Math.PI * 2 + donutAngle;
    const r    = HOLE_RADIUS + 15 + (i % 3) * 10;
    const sx   = Math.cos(ang) * r;
    const sy   = Math.sin(ang) * r;
    ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5, 2, ang, 0, Math.PI * 2);
    ctx.fill();
  }

  // Etiqueta "DIANA"
  ctx.shadowBlur = 0;
  ctx.fillStyle  = 'rgba(255,255,255,0.9)';
  ctx.font       = 'bold 11px sans-serif';
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DIANA', 0, DONUT_RADIUS + 16);

  ctx.restore();
}

function drawLauncher() {
  // Plataforma de llançament
  ctx.fillStyle = '#5C3317';
  ctx.beginPath();
  ctx.ellipse(launchPos.x, launchPos.y + 14, 40, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Canya (fletxa cap a la diana si no estem arrossegant)
  if (!isDragging && !projectile?.active) {
    ctx.strokeStyle = '#8B5E3C';
    ctx.lineWidth   = 4;
    ctx.lineCap     = 'round';
    const ang = Math.atan2(donutPos.y - launchPos.y, donutPos.x - launchPos.x);
    ctx.beginPath();
    ctx.moveTo(launchPos.x, launchPos.y);
    ctx.lineTo(
      launchPos.x + Math.cos(ang) * 50,
      launchPos.y + Math.sin(ang) * 50
    );
    ctx.stroke();
  }

  // Ensaïmada preparada (si no n'hi ha cap en vol)
  if (!projectile?.active || projectile?.launched === false) {
    ctx.font = `${ENSAIMADA_R * 1.5}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🥐', launchPos.x, launchPos.y - 18);
  }
}

function drawProjectile() {
  if (!projectile) return;
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(projectile.rot || 0);
  ctx.font = `${ENSAIMADA_R * 1.5}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  // Ombra de moviment
  ctx.globalAlpha = 0.3;
  ctx.fillText('🥐', -8, 4);
  ctx.globalAlpha = 1;
  ctx.fillText('🥐', 0, 0);
  ctx.restore();
}

function drawTrajectory() {
  const { vx, vy } = calcVelocity();
  const steps  = 30;
  const dt     = 0.04;

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth   = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();

  let px = launchPos.x, py = launchPos.y;
  let pvx = vx, pvy = vy;

  for (let i = 0; i < steps; i++) {
    px  += pvx * dt;
    py  += pvy * dt;
    pvy += GRAVITY * dt;
    if (i === 0) ctx.moveTo(px, py);
    else         ctx.lineTo(px, py);
    if (py > canvas.height + 20) break;
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Punta de la fletxa al punt de mira
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPowerIndicator() {
  const dx   = dragCurrent.x - dragStart.x;
  const dy   = dragCurrent.y - dragStart.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const pct  = Math.min(dist / 120, 1);

  const barH  = 120;
  const barX  = 16;
  const barY  = canvas.height / 2 - barH / 2;

  // Fons
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, barX, barY, 14, barH, 7);
  ctx.fill();

  // Barra de potència
  const filled = barH * pct;
  const grad   = ctx.createLinearGradient(0, barY + barH, 0, barY + barH - filled);
  grad.addColorStop(0, '#5DBB63');
  grad.addColorStop(0.5, '#FFD700');
  grad.addColorStop(1, '#FF4444');
  ctx.fillStyle = grad;
  roundRect(ctx, barX, barY + barH - filled, 14, filled, 7);
  ctx.fill();

  // Etiqueta
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('💪', barX + 7, barY + barH + 4);
}

/* ── Càlcul de velocitat des de l'arrossegament ── */
function calcVelocity() {
  const dx  = dragStart.x - dragCurrent.x;  // invertit: estirem cap enrere
  const dy  = dragStart.y - dragCurrent.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  const power = Math.min(mag * DRAG_SCALE, MAX_POWER);
  if (mag === 0) return { vx: 0, vy: 0 };
  return {
    vx: (dx / mag) * power,
    vy: (dy / mag) * power,
  };
}

/* ── Partícules d'explosió ── */
function addBurst(x, y, color) {
  const emojis = ['🎊','✨','⭐','🌟','💥'];
  for (let i = 0; i < 12; i++) {
    const ang  = (i / 12) * Math.PI * 2;
    const spd  = 80 + Math.random() * 120;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 60,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      color,
      life: 0.8 + Math.random() * 0.4,
    });
  }
}

function drawParticles() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.font = '20px serif';
    ctx.fillText(p.emoji, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

/* ── HUD ── */
function updateHUD() {
  document.getElementById('score').textContent  = score.toLocaleString();
  document.getElementById('throws').textContent = throwsLeft;
  const pct = totalThrows > 0 ? Math.round((hits / totalThrows) * 100) : 0;
  document.getElementById('ratio').textContent  = pct + '%';
}

/* ── Events de ratolí ── */
function getCanvasPos(e) {
  const rect  = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top)  * scaleY,
  };
}

let eventsBound = false;
function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  canvas.addEventListener('mousedown', (e) => {
    if (!gameRunning || projectile?.active || throwsLeft <= 0) return;
    const pos  = getCanvasPos(e);
    isDragging = true;
    dragStart  = { ...pos };
    dragCurrent = { ...pos };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    dragCurrent = getCanvasPos(e);
  });

  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    launch();
  });

  // Touch
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameRunning || projectile?.active || throwsLeft <= 0) return;
    const pos  = getCanvasPos(e);
    isDragging = true;
    dragStart  = { ...pos };
    dragCurrent = { ...pos };
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    dragCurrent = getCanvasPos(e);
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    launch();
  }, { passive: false });
}

/* ── Llançament ── */
function launch() {
  if (!gameRunning || throwsLeft <= 0) return;
  const { vx, vy } = calcVelocity();
  if (Math.abs(vx) < 10 && Math.abs(vy) < 10) return; // massa poc arrossegament

  throwsLeft--;
  totalThrows++;

  projectile = {
    x: launchPos.x,
    y: launchPos.y - 18,
    vx, vy,
    rot: 0,
    active: true,
  };

  updateHUD();
}

/* ── Fi del joc ── */
async function endGame() {
  gameRunning = false;
  const accuracy = totalThrows > 0 ? Math.round((hits / totalThrows) * 100) : 0;
  const isNew    = score > bestScore;
  if (isNew) { bestScore = score; }

  document.getElementById('le-emoji').textContent = isNew ? '🏆' : (hits >= 7 ? '🎯' : '🍩');
  document.getElementById('le-title').textContent = isNew ? 'Nou Rècord!' : (hits >= 7 ? 'Ets un As!' : 'Fi del joc!');
  document.getElementById('le-score').textContent = score.toLocaleString() + ' punts';
  document.getElementById('le-msg').textContent   =
    `${hits} encerts de ${totalThrows} llançaments (${accuracy}% de precisió)`;
  document.getElementById('le-overlay').classList.remove('hidden');

  if (uid && profile) {
    try {
      const isRecord = await saveScore(GAMES.LLANCA_ENSAIMADA, uid, score, profile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.LLANCA_ENSAIMADA, 10);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.LLANCA_ENSAIMADA, uid);
        
      }
    } catch(e) { /* Firebase no configurat */ }
  }
}

/* ── Ranking ── */
async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.LLANCA_ENSAIMADA, 10);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch(e) {
    document.getElementById('ranking-container').innerHTML =
      '<p style="text-align:center;padding:1rem;color:var(--gray-400)">Configura Firebase per veure el rànquing</p>';
  }
}

/* ── Botons ── */
document.getElementById('btn-restart').addEventListener('click', () => {
  cancelAnimationFrame(animFrame);
  initGame();
});
document.getElementById('btn-play-again').addEventListener('click', () => {
  cancelAnimationFrame(animFrame);
  document.getElementById('le-overlay').classList.add('hidden');
  initGame();
});

/* ── Utilitat ── */
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
