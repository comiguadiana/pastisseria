/**
 * kart-pastisser.js — Motor avançat del joc Kart Pastisser 🛒🏎️
 *
 * Joc arcade de carreres i reflexos sobre carret de supermercat:
 *   - Motor de corbes dinàmiques (Curved Track Engine) amb avisos de gir.
 *   - Seccions temàtiques realistes de supermercat (Forn, Fruiteria, Làctics, Begudes, Congelats).
 *   - Terra de rajoles brillants amb reflexos fluorescents i cartells aeris.
 *   - Carret de supermercat metàl·lic cromat ultra-realista amb rodes pivotants i avatar.
 *   - Carros rivals (clients lents i carrets abandonats) per esquivar.
 *   - Power-ups interactius: Turbo Boost ⚡, Imant de dolços 🧲, Estrella ⭐, Taques d'aigua 💧, Plàtans 🍌 i Bombes 💣.
 *   - Aparicions periòdiques de la Sasha 🐸 per animar el jugador.
 */

import { requireAuth, renderNavbarUser, getDiceBearUrl, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ══════════════════════════════════════════
   CONSTANTS I CONFIGURACIÓ
   ══════════════════════════════════════════ */

const PASTRY_IMG_BASE     = '../../assets/img/pasteles/';
const SASHA_IMG_SRC       = '../../assets/img/sasha.png';
const LANES               = 3;
const SPEED_INITIAL       = 240;   // px/s (coordenades virtuals)
const SPEED_INCREMENT     = 28;    // px/s per nivell
const LEVEL_INTERVAL      = 14;    // segons per pujar de nivell (més ràpid)
const SASHA_SCORE_TRIGGER = 300;   // punts entre aparicions de la Sasha
const INVINCIBLE_DURATION = 2.8;   // segons d'estrella
const TURBO_DURATION      = 2.5;   // segons de turbo boost
const MAGNET_DURATION     = 5.0;   // segons d'imant
const HIT_INVINCIBLE_DUR  = 1.8;   // segons d'invulnerabilitat post-impacte
const VIRTUAL_W           = 360;   // amplada virtual del joc
const VIRTUAL_H           = 600;   // alçada virtual del joc

const PASTRIES = [
  { id: 'cruasan',   img: 'cruasan.png',   label: 'Croissant',  value: 4 },
  { id: 'magdalena', img: 'magdalena.png', label: 'Magdalena', value: 6 },
  { id: 'donut',     img: 'donut.png',     label: 'Dònut',     value: 4 },
  { id: 'pastis',    img: 'pastis.png',    label: 'Pastís',    value: 12 },
  { id: 'ensaimada', img: 'ensaimada.png', label: 'Ensaïmada', value: 8 },
  { id: 'cunya',     img: 'cunya.png',     label: 'Cunya',     value: 10 },
];

const SASHA_MSGS = [
  'Vinga! 🏁', 'Molt bé! 🎉', 'Al ritme! 🥳',
  'Esquiva! 💨', "Agafa'ls tots! 🤤", 'Im-pa-ra-ble! 😲',
  'Endavant! 🛒', 'Ets el millor! 🏆', 'Compte amb el carro! ⚡'
];

/* ── Seccions temàtiques del supermercat ── */
const SUPERMARKET_SECTIONS = [
  {
    id: 'pastisseria',
    name: '🥐 Forn',
    fullName: 'Forn & Pastisseria',
    banner: '🥖 PASSADÍS 1: FORN & PASTISSERIA 🥐',
    floorA: '#FFF9EE',
    floorB: '#F7E7D0',
    tileBorder: 'rgba(180, 130, 70, 0.22)',
    shelfBg: '#5C381E',
    shelfPlank: '#8B5A34',
    shelfEdge: '#3E2412',
    ambientLight: 'rgba(255, 235, 190, 0.12)',
    products: ['#D4A017', '#E8A838', '#F5C26B', '#8B5A2B', '#E58E26', '#FFD166']
  },
  {
    id: 'fruites',
    name: '🍓 Fruites',
    fullName: 'Fruiteria Fresca',
    banner: '🍏 PASSADÍS 2: FRUITES I VERDURES 🍊',
    floorA: '#F4FAF4',
    floorB: '#E2F3E2',
    tileBorder: 'rgba(60, 150, 70, 0.22)',
    shelfBg: '#284F28',
    shelfPlank: '#427842',
    shelfEdge: '#173317',
    ambientLight: 'rgba(190, 255, 200, 0.12)',
    products: ['#E74C3C', '#2ECC71', '#F1C40F', '#E67E22', '#9B59B6', '#1ABC9C']
  },
  {
    id: 'lactics',
    name: '🥛 Làctics',
    fullName: 'Làctics & Formatges',
    banner: '🧀 PASSADÍS 3: LÀCTICS I FORMATGES 🥛',
    floorA: '#F2F8FD',
    floorB: '#DCEBF8',
    tileBorder: 'rgba(60, 120, 190, 0.22)',
    shelfBg: '#204064',
    shelfPlank: '#356394',
    shelfEdge: '#13263C',
    ambientLight: 'rgba(200, 230, 255, 0.15)',
    products: ['#FFFFFF', '#FFEAA7', '#74B9FF', '#81ECEC', '#DFE6E9', '#FAB1A0']
  },
  {
    id: 'begudes',
    name: '🥤 Begudes',
    fullName: 'Begudes & Refrescs',
    banner: '🧃 PASSADÍS 4: BEGUDES I REFRESCS 🥤',
    floorA: '#FFF5F8',
    floorB: '#FFE2EC',
    tileBorder: 'rgba(190, 70, 120, 0.22)',
    shelfBg: '#601834',
    shelfPlank: '#91345B',
    shelfEdge: '#380D1D',
    ambientLight: 'rgba(255, 205, 225, 0.12)',
    products: ['#E84393', '#FD79A8', '#6C5CE7', '#00CEC9', '#FF7675', '#FDCB6E']
  },
  {
    id: 'congelats',
    name: '🧊 Congelats',
    fullName: 'Congelats & Gelats',
    banner: '🍦 PASSADÍS 5: CONGELATS I GELATS 🧊',
    floorA: '#EBF8F8',
    floorB: '#D4EFEF',
    tileBorder: 'rgba(50, 160, 170, 0.25)',
    shelfBg: '#16454D',
    shelfPlank: '#266A75',
    shelfEdge: '#0C2A2F',
    ambientLight: 'rgba(195, 245, 255, 0.18)',
    products: ['#00B894', '#00CEC9', '#0984E3', '#74B9FF', '#A29BFE', '#55EFC4']
  }
];

/* ══════════════════════════════════════════
   DOM ELEMENTS
   ══════════════════════════════════════════ */
const canvas          = document.getElementById('kp-canvas');
const ctx             = canvas.getContext('2d');
const overlayEl       = document.getElementById('kp-overlay');
const countdownEl     = document.getElementById('kp-countdown');
const startWrapEl     = document.getElementById('kp-start-wrap');
const turnWarningEl   = document.getElementById('kp-turn-warning');
const powerupBarEl    = document.getElementById('kp-powerup-bar');
const powerupIconEl   = document.getElementById('kp-powerup-icon');
const powerupNameEl   = document.getElementById('kp-powerup-name');
const powerupFillEl   = document.getElementById('kp-powerup-fill');
const sashaContainerEl= document.getElementById('sasha-container');
const sashaCharEl     = document.getElementById('sasha-char');
const sashaSpeechEl   = document.getElementById('sasha-speech');
const livesEl         = document.getElementById('hud-lives');
const scoreEl         = document.getElementById('hud-score');
const bestEl          = document.getElementById('hud-best');
const levelEl         = document.getElementById('hud-speed');
const sectionEl       = document.getElementById('hud-section');

/* ══════════════════════════════════════════
   DIMENSIONS I COORDENADES
   ══════════════════════════════════════════ */
const SHELF_W  = Math.floor(VIRTUAL_W * 0.12);   // amplada de les prestatgeries (43px)
const PLAY_W   = VIRTUAL_W - SHELF_W * 2;         // amplada zona útil (274px)
const LANE_W   = PLAY_W / LANES;                  // amplada carril (~91.3px)
const BASE_LANE_X = Array.from({ length: LANES }, (_, i) => SHELF_W + LANE_W * (i + 0.5));
const CART_Y   = VIRTUAL_H * 0.76;               // Y fix del carro del jugador
const ITEM_SZ  = Math.floor(LANE_W * 0.54);      // mida objectes (~49px)
const CART_W   = Math.floor(LANE_W * 0.64);      // amplada carro (~58px)
const CART_H   = Math.floor(CART_W * 1.32);      // alçada carro (~76px)

/* ══════════════════════════════════════════
   IMATGES
   ══════════════════════════════════════════ */
const pastryImgs = {};
PASTRIES.forEach(p => {
  const img = new Image();
  img.src = PASTRY_IMG_BASE + p.img;
  pastryImgs[p.id] = img;
});

const sashaImg = new Image();
sashaImg.src = SASHA_IMG_SRC;
let avatarImg = null;

/* ══════════════════════════════════════════
   ESTAT DEL JOC
   ══════════════════════════════════════════ */
let state       = {};
let uid         = null;
let profile     = null;
let bestScore   = 0;
let rafId       = null;
let lastTs      = null;
let floatTexts  = [];
let banners     = []; // cartells aeris que passen pel sostre

function resetState() {
  floatTexts = [];
  banners    = [];
  state = {
    phase:          'idle', // 'idle' | 'running' | 'over'
    lives:          3,
    score:          0,
    level:          1,
    speed:          SPEED_INITIAL,
    baseSpeed:      SPEED_INITIAL,

    playerLane:     1,
    cartX:          BASE_LANE_X[1],
    cartTargetX:    BASE_LANE_X[1],
    cartTilt:       0,      // inclinació angular en girar (-0.2 a 0.2 rad)
    cartSpin:       0,      // gir en relliscar amb aigua/plàtan
    spinTimer:      0,

    trackDistance:  0,      // distància total recorreguda
    sectionIdx:     0,      // índex secció supermercat

    items:          [],     // dolços, bombes, estrelles, turbo, aigua, plàtan, imant
    rivals:         [],     // carros rivals { lane, x, y, speed, type, color, shopperAvatar }
    skidMarks:      [],     // marques de derrapada al terra { x, y, life, maxLife }
    particles:      [],     // partícules de fums, espurnes, llum

    spawnTimer:     1.1,
    rivalTimer:     2.8,
    bannerTimer:    8.0,
    levelTimer:     0,

    // Power-ups
    invincible:     false,
    invincibleTimer:0,
    turbo:          false,
    turboTimer:     0,
    magnet:         false,
    magnetTimer:    0,

    shakeTimer:     0,
    shakeX:         0,
    shakeY:         0,

    // Sasha
    sashaPhase:     'idle',
    sashaX:         -120,
    sashaDir:       1,
    sashaShowTimer: 0,
    lastSashaScore: 0,

    touchStartX:    null,
  };
}

/* ══════════════════════════════════════════
   MOTOR DE CORBES DINÀMIQUES I GIRS PRONUNCIATS
   ══════════════════════════════════════════ */

/**
 * Retorna el desplaçament horitzontal de la corba a una distància Z donada.
 * Genera un circuit amb corbes tancades, xicanes ràpides i girs molt pronunciats.
 */
function getTrackCurveAtZ(z) {
  const cycle = (z % 3200 + 3200) % 3200;
  let base = 0;

  if (cycle < 450) {
    // 1. Recta d'acceleració inicial amb ondulació suau
    base = Math.sin(cycle * 0.008) * 15;
  } else if (cycle < 1150) {
    // 2. GIR TANCAT A L'ESQUERRA (pronunciat, amplitud -95px)
    const progress = (cycle - 450) / 700;
    // Corba en campana amb pic intens
    const shape = Math.sin(progress * Math.PI);
    base = -Math.pow(shape, 0.85) * 98;
  } else if (cycle < 1550) {
    // 3. Recta de transició ràpida
    base = Math.sin((cycle - 1150) * 0.01) * 12;
  } else if (cycle < 2250) {
    // 4. XICANA RÀPIDA EN 'S' (girs ràpids esquerra - dreta - esquerra)
    const progress = (cycle - 1550) / 700;
    base = Math.sin(progress * Math.PI * 2) * 82;
  } else if (cycle < 2900) {
    // 5. GIR TANCAT A LA DRETA (pronunciat, amplitud +98px)
    const progress = (cycle - 2250) / 650;
    const shape = Math.sin(progress * Math.PI);
    base = Math.pow(shape, 0.85) * 98;
  } else {
    // 6. Retorn suau a la recta
    const progress = (cycle - 2900) / 300;
    base = Math.cos(progress * Math.PI * 0.5) * 20;
  }

  // Afegir harmònic secundari per donar textura orgànica al recorregut
  const harmonic = Math.sin(z * 0.0055) * 14;
  return base + harmonic;
}

/**
 * Retorna l'offset horitzontal relatiu a la posició del carro del jugador.
 * A la posició CART_Y, l'offset és 0.
 */
function getCurveOffset(screenY) {
  const currentZ = state.trackDistance;
  const playerZ  = currentZ + (VIRTUAL_H - CART_Y);
  const targetZ  = currentZ + (VIRTUAL_H - screenY);

  const playerCurve = getTrackCurveAtZ(playerZ);
  const targetCurve = getTrackCurveAtZ(targetZ);

  return targetCurve - playerCurve;
}

/**
 * Retorna el pendent / intensitat de gir a una distància Z.
 */
function getCurveSlopeAtZ(z) {
  const dz = 15;
  return (getTrackCurveAtZ(z + dz) - getTrackCurveAtZ(z - dz)) / (dz * 2);
}

/**
 * Retorna el centre X d'un carril determinat a una alçada screenY.
 */
function getLaneXAtY(laneIdx, screenY) {
  const curve = getCurveOffset(screenY);
  return BASE_LANE_X[laneIdx] + curve;
}

/* ══════════════════════════════════════════
   CANVAS RESPONSIVE
   ══════════════════════════════════════════ */
function resizeCanvas() {
  const wrap = document.querySelector('.kp-canvas-wrap');
  if (!wrap) return;
  const navEl = document.querySelector('.navbar');
  const hudEl = document.querySelector('.kp-hud');
  const touchEl = document.querySelector('.kp-touch-row');
  const powerupEl = document.querySelector('.kp-powerup-bar');
  
  const navH = (navEl && navEl.offsetHeight) || 45;
  const hudH = (hudEl && hudEl.offsetHeight) || 55;
  const touchH = (touchEl && touchEl.offsetHeight) || 60;
  const powerH = (powerupEl && !powerupEl.classList.contains('hidden') ? powerupEl.offsetHeight : 0);
  
  const availH = Math.max(260, window.innerHeight - navH - hudH - touchH - powerH - 24);
  const maxW = Math.min(wrap.clientWidth || (window.innerWidth - 20), 440);
  
  const scale = Math.min(maxW / VIRTUAL_W, availH / VIRTUAL_H);
  const finalW = Math.max(240, Math.round(VIRTUAL_W * scale));
  const finalH = Math.max(340, Math.round(VIRTUAL_H * scale));

  canvas.width  = finalW;
  canvas.height = finalH;
  canvas.style.width  = finalW + 'px';
  canvas.style.height = finalH + 'px';
}
window.addEventListener('resize', resizeCanvas);

function getScale() {
  return canvas.width / VIRTUAL_W;
}

/* ══════════════════════════════════════════
   AUTENTICACIÓ
   ══════════════════════════════════════════ */
requireAuth('../../login.html')
  .then(async ({ user, profile: p }) => {
    uid = user.uid;
    profile = p;
    renderNavbarUser(p, user);

    avatarImg = new Image();
    avatarImg.crossOrigin = 'anonymous';
    avatarImg.src = getDiceBearUrl(p.avatarStyle, p.avatarSeed, 80);

    try {
      const ref  = doc(db, 'scores', GAMES.KART_PASTISSER, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) bestScore = snap.data().score || 0;
    } catch(e) {}

    if (bestEl) bestEl.textContent = bestScore.toLocaleString();

    resizeCanvas();
    resetState();
    setupControls();
    drawIdleScreen();
    loadRanking();
  })
  .catch(() => {});

/* ══════════════════════════════════════════
   START / COUNTDOWN
   ══════════════════════════════════════════ */
async function startGame() {
  if (state.phase === 'running') return;

  startWrapEl.classList.add('hidden');
  overlayEl.classList.add('hidden');
  sashaContainerEl.classList.add('hidden');
  turnWarningEl.classList.add('hidden');
  powerupBarEl.classList.add('hidden');

  countdownEl.classList.remove('hidden');
  for (const txt of ['3', '2', '1', '🛒']) {
    countdownEl.textContent = txt;
    countdownEl.style.animation = 'none';
    void countdownEl.offsetWidth;
    countdownEl.style.animation = '';
    await delay(txt === '🛒' ? 550 : 750);
  }
  countdownEl.classList.add('hidden');

  resetState();
  state.phase = 'running';
  lastTs = null;
  rafId = requestAnimationFrame(gameLoop);
}

/* ══════════════════════════════════════════
   GAME LOOP
   ══════════════════════════════════════════ */
function gameLoop(ts) {
  if (state.phase !== 'running') return;

  if (lastTs === null) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;

  update(dt);
  drawGame();

  rafId = requestAnimationFrame(gameLoop);
}

/* ══════════════════════════════════════════
   UPDATE
   ══════════════════════════════════════════ */
function update(dt) {
  // Velocitat efectiva (amb Turbo)
  const targetSpeed = (state.turbo ? state.baseSpeed * 1.55 : state.baseSpeed);
  state.speed += (targetSpeed - state.speed) * Math.min(1, 8 * dt);
  const spd = state.speed;

  // Actualitzar distància de pista
  state.trackDistance += spd * dt;

  // Determinar secció actual de supermercat segons distància (canvia cada 2800px)
  const currentSecIdx = Math.floor(state.trackDistance / 2800) % SUPERMARKET_SECTIONS.length;
  if (currentSecIdx !== state.sectionIdx) {
    state.sectionIdx = currentSecIdx;
    const sec = SUPERMARKET_SECTIONS[currentSecIdx];
    showToast(`🛒 Entrant a: ${sec.fullName}`, 'info', 2000);
  }

  // Moviment suau del carro cap al carril objectiu
  const targetX = BASE_LANE_X[state.playerLane];
  const dx = targetX - state.cartX;
  const moveSpeed = state.spinTimer > 0 ? 3 * dt : 12 * dt;
  state.cartX += dx * Math.min(1, moveSpeed);

  // Força centrífuga a les corbes (arrossega el carro cap a l'exterior del gir)
  const playerZ = state.trackDistance + (VIRTUAL_H - CART_Y);
  const curveSlope = getCurveSlopeAtZ(playerZ);
  const centrifugalForce = -curveSlope * spd * 0.24;
  state.cartX += centrifugalForce * dt;

  // Limitar carro perquè no surti del passadís
  const minCartX = SHELF_W + CART_W * 0.4;
  const maxCartX = VIRTUAL_W - SHELF_W - CART_W * 0.4;
  state.cartX = Math.max(minCartX, Math.min(maxCartX, state.cartX));

  // Inclinació dinàmica del carro (banking pronunciat en girs i corbes)
  const targetTilt = (dx / (LANE_W || 1)) * 0.28 - curveSlope * 0.22;
  state.cartTilt += (targetTilt - state.cartTilt) * Math.min(1, 16 * dt);

  // Derrapada i espurnes a les corbes tancades o canvis sobtats de carril
  const isHardTurn = Math.abs(curveSlope) > 0.16 || Math.abs(dx) > 14;
  if (isHardTurn && Math.random() < 0.45) {
    state.skidMarks.push({
      x: state.cartX + (Math.random() - 0.5) * 22,
      y: CART_Y + CART_H * 0.36,
      life: 0.7,
      maxLife: 0.7
    });

    // Espurnes de fricció de rodes
    if (Math.random() < 0.5) {
      state.particles.push({
        x: state.cartX + (curveSlope > 0 ? -CART_W/2 : CART_W/2),
        y: CART_Y + CART_H * 0.35,
        vx: (Math.random() - 0.5) * 40,
        vy: 30 + Math.random() * 50,
        life: 0.25,
        maxLife: 0.25,
        r: 2.5 + Math.random() * 2.5,
        color: '#FFD700'
      });
    }
  }

  // Efecte de relliscar (aigua o plàtan)
  if (state.spinTimer > 0) {
    state.spinTimer -= dt;
    state.cartSpin += dt * 14;
    if (state.spinTimer <= 0) state.cartSpin = 0;
  }

  // Marques de derrapada
  state.skidMarks.forEach(s => {
    s.y += spd * dt;
    s.life -= dt;
  });
  state.skidMarks = state.skidMarks.filter(s => s.life > 0 && s.y < VIRTUAL_H + 50);

  // Partícules
  state.particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  });
  state.particles = state.particles.filter(p => p.life > 0);

  // Turbo exhaust particles
  if (state.turbo && Math.random() < 0.7) {
    state.particles.push({
      x: state.cartX + (Math.random() - 0.5) * 24,
      y: CART_Y + CART_H * 0.45,
      vx: (Math.random() - 0.5) * 30,
      vy: 120 + Math.random() * 80,
      life: 0.35,
      maxLife: 0.35,
      r: 4 + Math.random() * 4,
      color: Math.random() < 0.5 ? '#FF5722' : '#FFD700'
    });
  }

  // Textos flotants
  floatTexts.forEach(ft => {
    ft.y -= 45 * dt;
    ft.life -= dt;
  });
  floatTexts = floatTexts.filter(ft => ft.life > 0);

  // Cartells aeris
  banners.forEach(b => {
    b.y += spd * dt;
  });
  banners = banners.filter(b => b.y < VIRTUAL_H + 80);

  state.bannerTimer -= dt;
  if (state.bannerTimer <= 0) {
    state.bannerTimer = 10 + Math.random() * 4;
    const sec = SUPERMARKET_SECTIONS[state.sectionIdx];
    banners.push({
      y: -60,
      text: sec.banner,
      secId: sec.id
    });
  }

  // Moviment i física d'objectes
  state.items.forEach(it => {
    it.y += spd * dt;
    it.rot = (it.rot || 0) + dt * 1.8;

    // Efecte de l'imant: atraure postres cap al jugador
    if (state.magnet && it.type === 'pastry') {
      const itemRealX = getLaneXAtY(it.lane, it.y);
      const playerRealX = state.cartX;
      const mdx = playerRealX - itemRealX;
      const mdy = CART_Y - it.y;
      const dist = Math.sqrt(mdx * mdx + mdy * mdy);

      if (dist < 220 && dist > 5) {
        it.y += (mdy / dist) * 280 * dt;
        it.magnetPullX = (it.magnetPullX || 0) + (mdx / dist) * 320 * dt;
      }
    }
  });
  state.items = state.items.filter(it => it.y < VIRTUAL_H + ITEM_SZ + 30);

  // Moviment de carros rivals
  state.rivals.forEach(rv => {
    // Els carros rivals avancen més lentament que el jugador
    rv.y += (spd - rv.speed) * dt;
    // Lleuger balanceig
    rv.wobble = (rv.wobble || 0) + dt * 3;
  });
  state.rivals = state.rivals.filter(rv => rv.y < VIRTUAL_H + CART_H + 40 && rv.y > -CART_H - 100);

  // Spawn d'objectes
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnItems();
    const minI  = 0.38;
    const baseI = 1.15 - (state.level - 1) * 0.08;
    state.spawnTimer = Math.max(minI, baseI);
  }

  // Spawn de carros rivals
  state.rivalTimer -= dt;
  if (state.rivalTimer <= 0) {
    spawnRivalCart();
    state.rivalTimer = Math.max(1.4, 3.8 - state.level * 0.45 + Math.random() * 1.2);
  }

  // Puntuació per distància (calibrada perquè >1000 sigui un gran repte)
  state.score += spd * dt * 0.03;

  // Pujada de nivell
  state.levelTimer += dt;
  if (state.levelTimer >= LEVEL_INTERVAL) {
    state.levelTimer = 0;
    state.level++;
    state.baseSpeed += SPEED_INCREMENT;
    showToast(`🏎️ Nivell ${state.level}! Més velocitat i trànsit!`, 'success', 2000);
    spawnBurst(VIRTUAL_W / 2, VIRTUAL_H / 2);
  }

  // Actualitzar timers de Power-ups
  if (state.invincible && !state.hitInvincible) {
    state.invincibleTimer -= dt;
    if (state.invincibleTimer <= 0) state.invincible = false;
  } else if (state.hitInvincible) {
    state.invincibleTimer -= dt;
    if (state.invincibleTimer <= 0) {
      state.invincible = false;
      state.hitInvincible = false;
    }
  }

  if (state.turbo) {
    state.turboTimer -= dt;
    if (state.turboTimer <= 0) state.turbo = false;
  }

  if (state.magnet) {
    state.magnetTimer -= dt;
    if (state.magnetTimer <= 0) state.magnet = false;
  }

  // Actualitzar avís de gir si ve una corba pronunciada
  updateTurnWarning();

  // Screen shake
  if (state.shakeTimer > 0) {
    state.shakeTimer -= dt;
    state.shakeX = (Math.random() - 0.5) * 12;
    state.shakeY = (Math.random() - 0.5) * 12;
  } else {
    state.shakeX = 0;
    state.shakeY = 0;
  }

  // Sasha
  const sinceLastSasha = state.score - state.lastSashaScore;
  if (sinceLastSasha >= SASHA_SCORE_TRIGGER && state.sashaPhase === 'idle') {
    state.lastSashaScore += SASHA_SCORE_TRIGGER;
    initSasha();
  }
  if (state.sashaPhase !== 'idle') updateSasha(dt);

  // Col·lisions
  checkCollisions();

  // HUD
  updateHUD();

  // Fi de partida si perdem les 3 vides
  if (state.lives <= 0) endGame();
}

/**
 * Detecta si s'apropa una corba forta en els propers 220px i mostra l'avís de gir
 */
function updateTurnWarning() {
  const curveAhead = getCurveOffset(VIRTUAL_H * 0.28);
  if (Math.abs(curveAhead) > 28) {
    turnWarningEl.classList.remove('hidden');
    if (curveAhead > 28) {
      turnWarningEl.textContent = '⚡ GIR TANCAT A LA DRETA ▶▶';
      turnWarningEl.style.background = 'rgba(230, 81, 0, 0.94)';
    } else {
      turnWarningEl.textContent = '◀◀ GIR TANCAT A L\'ESQUERRA ⚡';
      turnWarningEl.style.background = 'rgba(211, 47, 47, 0.94)';
    }
  } else {
    turnWarningEl.classList.add('hidden');
  }
}

/* ══════════════════════════════════════════
   SPAWN D'OBJECTES I RIVALS
   ══════════════════════════════════════════ */
function spawnItems() {
  const count = state.level >= 3 && Math.random() < 0.42 ? 2 : 1;
  const usedLanes = new Set();

  for (let n = 0; n < count; n++) {
    let lane, tries = 0;
    do { lane = Math.floor(Math.random() * LANES); tries++; }
    while (usedLanes.has(lane) && tries < 8);
    usedLanes.add(lane);

    // Taula de probabilitats d'elements (més bombes/obstacles a nivells superiors)
    const r = Math.random();
    let type, pastryId;

    const bombProb = Math.min(0.30, 0.15 + (state.level - 1) * 0.03);
    const hazardProb = bombProb + 0.16; // bombes + taques + plàtans

    if (r < 0.05) {
      type = 'star';       // 5% ⭐ Estrella
    } else if (r < 0.10) {
      type = 'turbo';      // 5% ⚡ Turbo pad
    } else if (r < 0.15) {
      type = 'magnet';     // 5% 🧲 Imant
    } else if (r < 0.15 + (hazardProb - bombProb) * 0.5) {
      type = 'puddle';     // 💧 Taca d'aigua
    } else if (r < 0.15 + (hazardProb - bombProb)) {
      type = 'banana';     // 🍌 Plàtan
    } else if (r < 0.15 + hazardProb) {
      type = 'bomb';       // 💣 Bomba
    } else {
      type = 'pastry';     // Dolç pastisser
      pastryId = PASTRIES[Math.floor(Math.random() * PASTRIES.length)].id;
    }

    state.items.push({
      type,
      pastryId,
      lane,
      y: -ITEM_SZ,
      rot: Math.random() * Math.PI * 2,
    });
  }
}

function spawnRivalCart() {
  const lane = Math.floor(Math.random() * LANES);
  // No fer spawn si ja hi ha un rival molt a prop en aquell carril
  const busy = state.rivals.some(r => r.lane === lane && r.y < 80);
  if (busy) return;

  const types = ['shopper', 'abandoned'];
  const type = Math.random() < 0.75 ? 'shopper' : 'abandoned';
  const colors = ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#E67E22'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // Velocitat relativa del rival (més lent que el jugador per poder-lo avançar)
  const rivalSpeed = type === 'abandoned' ? 0 : state.baseSpeed * (0.35 + Math.random() * 0.25);

  state.rivals.push({
    lane,
    y: -CART_H - 20,
    speed: rivalSpeed,
    type,
    color,
    shopperEmoji: ['👵', '🧔', '👧', '👨‍🍳', '👴'][Math.floor(Math.random() * 5)]
  });
}

/* ══════════════════════════════════════════
   COL·LISIONS
   ══════════════════════════════════════════ */
function checkCollisions() {
  const cx = state.cartX;
  const cy = CART_Y;
  const cartRadius = Math.min(CART_W, CART_H) * 0.42;

  // 1. Col·lisions amb objectes
  state.items = state.items.filter(it => {
    const itemRealX = getLaneXAtY(it.lane, it.y) + (it.magnetPullX || 0);
    const itemRealY = it.y;

    const dx = itemRealX - cx;
    const dy = itemRealY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitRadius = (it.type === 'puddle' || it.type === 'turbo') ? ITEM_SZ * 0.6 : ITEM_SZ * 0.44;

    if (dist > hitRadius + cartRadius) return true;

    // Contacte!
    if (it.type === 'pastry')       onCollectPastry(it, itemRealX, itemRealY);
    else if (it.type === 'bomb')    onHitBomb(it, itemRealX, itemRealY);
    else if (it.type === 'star')    onCollectStar(it, itemRealX, itemRealY);
    else if (it.type === 'turbo')   onCollectTurbo(it, itemRealX, itemRealY);
    else if (it.type === 'magnet')  onCollectMagnet(it, itemRealX, itemRealY);
    else if (it.type === 'puddle')  onHitPuddle(it, itemRealX, itemRealY);
    else if (it.type === 'banana')  onHitBanana(it, itemRealX, itemRealY);

    return false;
  });

  // 2. Col·lisions amb carros rivals
  state.rivals = state.rivals.filter(rv => {
    const rivalRealX = getLaneXAtY(rv.lane, rv.y);
    const rivalRealY = rv.y;

    const dx = rivalRealX - cx;
    const dy = rivalRealY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < CART_W * 0.85) {
      onHitRival(rv, rivalRealX, rivalRealY);
      return false; // eliminar el rival després del xoc
    }
    return true;
  });
}

function onCollectPastry(it, x, y) {
  const p = PASTRIES.find(p => p.id === it.pastryId);
  const pts = p ? p.value : 10;
  state.score += pts;
  spawnParticles(x, y, '#FFD700', 8);
  floatTexts.push({ x, y: y - 10, text: `+${pts}`, color: '#D4A017', life: 0.85, maxLife: 0.85 });
}

function onHitBomb(it, x, y) {
  if (state.invincible) {
    spawnParticles(x, y, '#FFA500', 12);
    floatTexts.push({ x, y: y - 10, text: '💥 Destruïda!', color: '#FFA500', life: 0.8, maxLife: 0.8 });
    return;
  }
  takeDamage(x, y, '💥 Bomba!');
}

function onHitRival(rv, x, y) {
  if (state.invincible) {
    spawnBurst(x, y);
    floatTexts.push({ x, y: y - 10, text: '🛒 Carro apartat!', color: '#FFD700', life: 0.9, maxLife: 0.9 });
    return;
  }
  takeDamage(x, y, '🛒 Xoc amb carro!');
}

function takeDamage(x, y, msg) {
  state.lives = Math.max(0, state.lives - 1);
  state.invincible = true;
  state.hitInvincible = true;
  state.invincibleTimer = HIT_INVINCIBLE_DUR;
  state.shakeTimer = 0.42;
  spawnParticles(x, y, '#FF3333', 14);
  floatTexts.push({ x, y: y - 12, text: msg, color: '#FF3333', life: 0.9, maxLife: 0.9 });
  showToast(msg, 'error', 1200);
}

function onCollectStar(it, x, y) {
  state.invincible = true;
  state.hitInvincible = false;
  state.invincibleTimer = INVINCIBLE_DURATION;
  spawnBurst(x, y);
  floatTexts.push({ x, y: y - 10, text: '⭐ Invulnerable!', color: '#FFD700', life: 1.2, maxLife: 1.2 });
  showToast('⭐ Invulnerabilitat màxima!', 'success', 1600);
}

function onCollectTurbo(it, x, y) {
  state.turbo = true;
  state.turboTimer = TURBO_DURATION;
  spawnParticles(x, y, '#FF5722', 12);
  floatTexts.push({ x, y: y - 10, text: '⚡ TURBO BOOST!', color: '#FF5722', life: 1.0, maxLife: 1.0 });
  showToast('⚡ TURBO BOOST ACTIVAT!', 'success', 1500);
}

function onCollectMagnet(it, x, y) {
  state.magnet = true;
  state.magnetTimer = MAGNET_DURATION;
  spawnParticles(x, y, '#9C27B0', 10);
  floatTexts.push({ x, y: y - 10, text: '🧲 IMANT DOLÇ!', color: '#9C27B0', life: 1.1, maxLife: 1.1 });
  showToast('🧲 Imant de pastissos activat!', 'info', 1600);
}

function onHitPuddle(it, x, y) {
  if (state.spinTimer > 0) return;
  state.spinTimer = 0.8;
  spawnParticles(x, y, '#4FC3F7', 10);
  floatTexts.push({ x, y: y - 10, text: '💧 Relliscada!', color: '#0288D1', life: 0.8, maxLife: 0.8 });
}

function onHitBanana(it, x, y) {
  if (state.spinTimer > 0) return;
  state.spinTimer = 0.9;
  spawnParticles(x, y, '#FBC02D', 10);
  floatTexts.push({ x, y: y - 10, text: '🍌 Plàtan!', color: '#F57F17', life: 0.8, maxLife: 0.8 });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const spd   = 70 + Math.random() * 100;
    state.particles.push({
      x, y,
      vx:      Math.cos(angle) * spd,
      vy:      Math.sin(angle) * spd - 25,
      life:    0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      r:       3 + Math.random() * 4,
      color,
    });
  }
}

function spawnBurst(x, y) {
  const colors = ['#D4A017','#FF8FAB','#CE93D8','#B8F0D8','#F0C040', '#FF5722'];
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const spd   = 90 + Math.random() * 140;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 0.7 + Math.random() * 0.5,
      maxLife: 1.2,
      r: 4 + Math.random() * 5,
      color: colors[i % colors.length],
    });
  }
}

/* ══════════════════════════════════════════
   ANIMACIÓ DE LA SASHA
   ══════════════════════════════════════════ */
function initSasha() {
  const msg = SASHA_MSGS[Math.floor(Math.random() * SASHA_MSGS.length)];
  sashaSpeechEl.textContent = msg;

  state.sashaDir = Math.random() < 0.5 ? 1 : -1;
  state.sashaX   = state.sashaDir === 1 ? -120 : VIRTUAL_W + 120;
  state.sashaPhase = 'enter';
  state.sashaShowTimer = 0;

  sashaContainerEl.classList.remove('hidden');
}

function updateSasha(dt) {
  const scale = getScale();
  const boardRect = canvas.getBoundingClientRect();
  const targetVX  = VIRTUAL_W / 2;

  if (state.sashaPhase === 'enter') {
    state.sashaX += (targetVX - state.sashaX) * Math.min(1, 5 * dt);
    if (Math.abs(state.sashaX - targetVX) < 3) {
      state.sashaX = targetVX;
      state.sashaPhase = 'show';
    }
  } else if (state.sashaPhase === 'show') {
    state.sashaShowTimer += dt;
    if (state.sashaShowTimer >= 1.8) {
      state.sashaPhase = 'exit';
    }
  } else if (state.sashaPhase === 'exit') {
    const exitVX = state.sashaDir === 1 ? VIRTUAL_W + 120 : -120;
    state.sashaX += (exitVX - state.sashaX) * Math.min(1, 5 * dt);
    if (Math.abs(state.sashaX - exitVX) < 5) {
      state.sashaPhase = 'idle';
      sashaContainerEl.classList.add('hidden');
    }
  }

  const realX = boardRect.left + state.sashaX * scale;
  const realY = boardRect.top  + CART_Y * scale - 55;

  sashaContainerEl.style.left      = realX + 'px';
  sashaContainerEl.style.top       = realY + 'px';
  sashaContainerEl.style.transform = `translate(-50%, -50%) ${state.sashaDir === 1 ? '' : 'scaleX(-1)'}`;
}

/* ══════════════════════════════════════════
   DRAW PRINCIPAL
   ══════════════════════════════════════════ */
function drawGame() {
  const scale = getScale();
  ctx.save();
  ctx.scale(scale, scale);

  if (state.shakeTimer > 0) ctx.translate(state.shakeX, state.shakeY);
  ctx.clearRect(-40, -40, VIRTUAL_W + 80, VIRTUAL_H + 80);

  const sec = SUPERMARKET_SECTIONS[state.sectionIdx];

  // 1. Terra i rajoles de supermercat amb corbes
  drawCurvedFloor(sec);

  // 2. Marques de derrapada
  drawSkidMarks();

  // 3. Prestatgeries laterals corbades amb productes
  drawCurvedShelves(sec);

  // 4. Divisors de carril corbats
  drawCurvedLaneLines();

  // 5. Objectes, power-ups i obstacles
  drawItems();

  // 6. Carros rivals
  drawRivals();

  // 7. Carro del jugador (metàl·lic i realista)
  drawPlayerCart();

  // 8. Partícules i textos flotants
  drawParticles();
  drawFloatTexts();

  // 9. Cartells aeris penjants
  drawBanners();

  ctx.restore();
}

function drawIdleScreen() {
  const scale = getScale();
  ctx.save();
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, VIRTUAL_W, VIRTUAL_H);

  const sec = SUPERMARKET_SECTIONS[0];
  drawCurvedFloor(sec);
  drawCurvedShelves(sec);
  drawCurvedLaneLines();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(255, 248, 235, 0.92)';
  ctx.strokeStyle = 'rgba(212, 160, 23, 0.4)';
  ctx.lineWidth = 2;
  roundRect(ctx, 24, VIRTUAL_H * 0.28, VIRTUAL_W - 48, 150, 18);
  ctx.fill();
  ctx.stroke();

  ctx.font = `bold ${Math.floor(VIRTUAL_W * 0.088)}px var(--font-display, sans-serif)`;
  ctx.fillStyle = '#5C381E';
  ctx.fillText('🛒 Kart Pastisser', VIRTUAL_W / 2, VIRTUAL_H * 0.36);

  ctx.font = `600 ${Math.floor(VIRTUAL_W * 0.042)}px sans-serif`;
  ctx.fillStyle = '#8B5A34';
  ctx.fillText('Corbes Tancades · Carros Rivals', VIRTUAL_W / 2, VIRTUAL_H * 0.44);

  ctx.font = `700 ${Math.floor(VIRTUAL_W * 0.044)}px var(--font-display, sans-serif)`;
  ctx.fillStyle = '#D4A017';
  ctx.fillText(`🏆 Rècord: ${bestScore.toLocaleString()} punts`, VIRTUAL_W / 2, VIRTUAL_H * 0.51);

  ctx.restore();
}

/* ══════════════════════════════════════════
   RENDERITZAT DEL TERRA I PRESTATGERIES (CORBAT)
   ══════════════════════════════════════════ */

function drawCurvedFloor(sec) {
  const tileH = 26;
  const tileW = Math.floor(PLAY_W / 6);
  const startY = -(tileH - (state.trackDistance % tileH));

  // Render per franges horitzontals
  for (let y = startY; y < VIRTUAL_H + tileH; y += tileH) {
    const curve = getCurveOffset(y);
    const leftShelfX  = SHELF_W + curve;
    const rightShelfX = VIRTUAL_W - SHELF_W + curve;
    const playWidth   = rightShelfX - leftShelfX;

    const row = Math.floor((y + state.trackDistance) / tileH);

    // Dibuixar rajoles d'aquesta fila
    for (let x = leftShelfX; x < rightShelfX; x += tileW) {
      const col = Math.floor((x - leftShelfX) / tileW);
      const isAlt = (row + col) % 2 === 0;

      ctx.fillStyle = isAlt ? sec.floorA : sec.floorB;
      ctx.fillRect(x, y, Math.min(tileW + 0.5, rightShelfX - x), tileH + 0.5);

      // Juntes de rajoles
      ctx.strokeStyle = sec.tileBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, Math.min(tileW + 0.5, rightShelfX - x), tileH + 0.5);
    }

    // Reflex de llum fluorescent longitudinal al terra
    const lightGrad = ctx.createLinearGradient(leftShelfX, y, rightShelfX, y);
    lightGrad.addColorStop(0, 'rgba(255,255,255,0)');
    lightGrad.addColorStop(0.3, sec.ambientLight);
    lightGrad.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    lightGrad.addColorStop(0.7, sec.ambientLight);
    lightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(leftShelfX, y, playWidth, tileH);
  }
}

function drawCurvedShelves(sec) {
  const sliceH = 12;
  const prodH  = 44;
  const prodW  = 18;
  const now    = Date.now();

  for (let y = -20; y < VIRTUAL_H + sliceH + 20; y += sliceH) {
    const curve = getCurveOffset(y);
    const leftX  = SHELF_W + curve;
    const rightX = VIRTUAL_W - SHELF_W + curve;

    // Fons prestatgeria esquerra (estès fins a -150px)
    const gLeft = ctx.createLinearGradient(-150, y, leftX, y);
    gLeft.addColorStop(0, sec.shelfEdge);
    gLeft.addColorStop(1, sec.shelfBg);
    ctx.fillStyle = gLeft;
    ctx.fillRect(-150, y, Math.max(0, leftX + 150), sliceH + 0.5);

    // Fons prestatgeria dreta (estès fins a VIRTUAL_W + 150px)
    const gRight = ctx.createLinearGradient(rightX, y, VIRTUAL_W + 150, y);
    gRight.addColorStop(0, sec.shelfBg);
    gRight.addColorStop(1, sec.shelfEdge);
    ctx.fillStyle = gRight;
    ctx.fillRect(rightX, y, Math.max(0, VIRTUAL_W + 150 - rightX), sliceH + 0.5);

    // Vores metàl·liques dels passadissos
    ctx.fillStyle = sec.shelfEdge;
    ctx.fillRect(leftX - 4, y, 4, sliceH + 0.5);
    ctx.fillRect(rightX, y, 4, sliceH + 0.5);

    // Fletxes lluminoses de gir (Chevron arrows) a la vora de la prestatgeria durant corbes tancades
    if (Math.abs(curve) > 28 && (y % 48 < 16)) {
      ctx.fillStyle = curve > 0 ? '#FFA000' : '#E53935';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (curve > 0) {
        ctx.fillText('▶', leftX - 10, y + sliceH/2);
        ctx.fillText('▶', rightX + 10, y + sliceH/2);
      } else {
        ctx.fillText('◀', leftX - 10, y + sliceH/2);
        ctx.fillText('◀', rightX + 10, y + sliceH/2);
      }
    }
  }

  // Prestatges i productes que es desplacen
  const shelfPeriod = 75;
  const shelfOff = state.trackDistance % shelfPeriod;

  for (let y = -shelfOff - shelfPeriod; y < VIRTUAL_H + shelfPeriod; y += shelfPeriod) {
    const curve = getCurveOffset(y);
    const leftX  = SHELF_W + curve;
    const rightX = VIRTUAL_W - SHELF_W + curve;

    // Post de fusta/metall
    ctx.fillStyle = sec.shelfPlank;
    ctx.fillRect(-150, y, Math.max(0, leftX + 150), 6);
    ctx.fillRect(rightX, y, Math.max(0, VIRTUAL_W + 150 - rightX), 6);

    // Productes de la secció (caixes, ampolles, fruita)
    let pIdx = 0;
    for (let px = leftX - prodW - 6; px > -120; px -= prodW + 4) {
      const color = sec.products[(pIdx++) % sec.products.length];
      ctx.fillStyle = color;
      roundRect(ctx, px, y - prodH + 8, prodW, prodH - 10, 3);
      ctx.fill();
    }

    for (let px = rightX + 6; px < VIRTUAL_W + 120; px += prodW + 4) {
      const color = sec.products[(pIdx++) % sec.products.length];
      ctx.fillStyle = color;
      roundRect(ctx, px, y - prodH + 8, prodW, prodH - 10, 3);
      ctx.fill();
    }
  }
}

function drawCurvedLaneLines() {
  const dashLen = 26;
  const gapLen  = 18;
  const period  = dashLen + gapLen;
  const off     = state.trackDistance % period;

  ctx.strokeStyle = 'rgba(212, 160, 23, 0.45)';
  ctx.lineWidth   = 2.5;
  ctx.setLineDash([dashLen, gapLen]);
  ctx.lineDashOffset = -off;

  for (let l = 1; l < LANES; l++) {
    ctx.beginPath();
    for (let y = 0; y <= VIRTUAL_H; y += 25) {
      const curve = getCurveOffset(y);
      const lx = SHELF_W + LANE_W * l + curve;
      if (y === 0) ctx.moveTo(lx, y);
      else ctx.lineTo(lx, y);
    }
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

function drawSkidMarks() {
  state.skidMarks.forEach(s => {
    const alpha = Math.max(0, s.life / s.maxLife) * 0.45;
    ctx.fillStyle = `rgba(50, 40, 30, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, 4.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ══════════════════════════════════════════
   OBJECTES I POWER-UPS
   ══════════════════════════════════════════ */
function drawItems() {
  state.items.forEach(it => {
    const realX = getLaneXAtY(it.lane, it.y) + (it.magnetPullX || 0);
    const realY = it.y;

    if (it.type === 'pastry')       drawPastry(it, realX, realY);
    else if (it.type === 'bomb')    drawBomb(it, realX, realY);
    else if (it.type === 'star')    drawStar(it, realX, realY);
    else if (it.type === 'turbo')   drawTurboPad(it, realX, realY);
    else if (it.type === 'magnet')  drawMagnet(it, realX, realY);
    else if (it.type === 'puddle')  drawPuddle(it, realX, realY);
    else if (it.type === 'banana')  drawBanana(it, realX, realY);
  });
}

function drawPastry(it, x, y) {
  const img = pastryImgs[it.pastryId];
  const r   = ITEM_SZ / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(it.rot * 0.6) * 0.16);

  // Ombra a terra
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(2, r * 0.8, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Aura brillant
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, r + 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 160, 23, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, -r, -r, ITEM_SZ, ITEM_SZ);
    ctx.restore();
  } else {
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBomb(it, x, y) {
  const r = ITEM_SZ * 0.38;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(it.rot * 0.8) * 0.12);

  // Ombra
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(3, r * 0.85, r * 0.75, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cos de la bomba
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Reflex
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.3, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Metxa
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.28, -r * 0.75);
  ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 0.4, -r * 1.6, r * 0.45, -r * 1.8);
  ctx.stroke();

  // Espurna animada
  const sparkAlpha = 0.6 + Math.sin(it.rot * 10) * 0.4;
  ctx.shadowColor = '#FFA500';
  ctx.shadowBlur  = 8 * sparkAlpha;
  ctx.fillStyle   = `rgba(255,200,0,${sparkAlpha})`;
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 1.8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawStar(it, x, y) {
  const r = ITEM_SZ * 0.44;
  const pulse = 0.5 + Math.sin(it.rot * 3) * 0.3;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(it.rot * 0.6);

  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur  = 16 * pulse;

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const oa = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const ia = oa + Math.PI / 5;
    if (i === 0) ctx.moveTo(Math.cos(oa) * r, Math.sin(oa) * r);
    else ctx.lineTo(Math.cos(oa) * r, Math.sin(oa) * r);
    ctx.lineTo(Math.cos(ia) * r * 0.42, Math.sin(ia) * r * 0.42);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawTurboPad(it, x, y) {
  const w = LANE_W * 0.72;
  const h = ITEM_SZ * 0.85;

  ctx.save();
  ctx.translate(x, y);

  // Fletxa de Turbo brillant sobre el terra
  const pulse = 0.8 + Math.sin(it.rot * 5) * 0.2;
  ctx.shadowColor = '#FF5722';
  ctx.shadowBlur = 12 * pulse;

  ctx.fillStyle = 'rgba(255, 87, 34, 0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -h/2);
  ctx.lineTo(w/2, h/2);
  ctx.lineTo(w/4, h/2);
  ctx.lineTo(0, 0);
  ctx.lineTo(-w/4, h/2);
  ctx.lineTo(-w/2, h/2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(0, -h/2 + 8);
  ctx.lineTo(w/3, h/2 - 4);
  ctx.lineTo(0, h/4);
  ctx.lineTo(-w/3, h/2 - 4);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawMagnet(it, x, y) {
  const r = ITEM_SZ * 0.38;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(it.rot * 1.5) * 0.2);

  // Ombra
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(2, r * 0.9, r * 0.8, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Imant en forma d'U
  ctx.lineWidth = 9;
  ctx.lineCap = 'butt';

  // Arc vermell
  ctx.strokeStyle = '#E53935';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.15, Math.PI * 0.85, false);
  ctx.stroke();

  // Pols blaus/grisos
  ctx.strokeStyle = '#3949AB';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.85, Math.PI * 1.15, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.15, Math.PI * 0.15, false);
  ctx.stroke();

  // Espurnes magnètiques
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(-r - 3, -4, 2.5, 0, Math.PI * 2);
  ctx.arc(r + 3, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPuddle(it, x, y) {
  const w = LANE_W * 0.68;
  const h = ITEM_SZ * 0.55;

  ctx.save();
  ctx.translate(x, y);

  // Bassal d'aigua brillant
  ctx.fillStyle = 'rgba(79, 195, 247, 0.55)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, w/2, h/2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Con de "Terra Mullat" ⚠️ al costat
  ctx.fillStyle = '#FFB300';
  ctx.beginPath();
  ctx.moveTo(w * 0.35, -h * 0.3);
  ctx.lineTo(w * 0.48, h * 0.4);
  ctx.lineTo(w * 0.22, h * 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#222';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', w * 0.35, h * 0.2);

  ctx.restore();
}

function drawBanana(it, x, y) {
  const r = ITEM_SZ * 0.32;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(it.rot);

  // Ombra
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(2, 4, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pell de plàtan
  ctx.fillStyle = '#FDD835';
  ctx.strokeStyle = '#F57F17';
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0.2, Math.PI * 0.8);
  ctx.quadraticCurveTo(r * 0.8, r * 0.4, 0, 0);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.8, Math.PI * 1.4);
  ctx.quadraticCurveTo(-r * 0.8, r * 0.4, 0, 0);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/* ══════════════════════════════════════════
   CARROS RIVALS (ALTRES CLIENTS I ABANDONATS)
   ══════════════════════════════════════════ */
function drawRivals() {
  state.rivals.forEach(rv => {
    const rx = getLaneXAtY(rv.lane, rv.y);
    const ry = rv.y;
    drawRivalCart(rv, rx, ry);
  });
}

function drawRivalCart(rv, x, y) {
  const cw = CART_W * 0.95;
  const ch = CART_H * 0.95;

  ctx.save();
  ctx.translate(x, y);

  // Ombra a terra
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(4, ch * 0.36, cw * 0.46, ch * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Xassís metàl·lic de filferro d'acer (trapezi lleuger: més estret davant)
  const frameGrad = ctx.createLinearGradient(-cw/2, -ch/2, cw/2, ch/2);
  frameGrad.addColorStop(0, '#ECEFF1');
  frameGrad.addColorStop(0.5, '#B0BEC5');
  frameGrad.addColorStop(1, '#90A4AE');
  ctx.fillStyle = frameGrad;
  roundRect(ctx, -cw/2, -ch/2, cw, ch, cw * 0.14);
  ctx.fill();

  // Cantoneres protectores de plàstic (color del rival)
  ctx.fillStyle = rv.color;
  ctx.fillRect(-cw/2, -ch/2, 6, 8); // Davant esquerra
  ctx.fillRect(cw/2 - 6, -ch/2, 6, 8); // Davant dreta
  ctx.fillRect(-cw/2, ch/2 - 8, 6, 8); // Darrere esquerra
  ctx.fillRect(cw/2 - 6, ch/2 - 8, 6, 8); // Darrere dreta

  // Reixeta metàl·lica interior
  ctx.strokeStyle = 'rgba(100, 120, 140, 0.6)';
  ctx.lineWidth = 1.2;
  const step = Math.floor(cw / 4);
  for (let gx = -cw/2 + step; gx < cw/2 - 4; gx += step) {
    ctx.beginPath(); ctx.moveTo(gx, -ch/2 + 4); ctx.lineTo(gx, ch/2 - 4); ctx.stroke();
  }
  for (let gy = -ch/2 + step; gy < ch/2 - 4; gy += step) {
    ctx.beginPath(); ctx.moveTo(-cw/2 + 4, gy); ctx.lineTo(cw/2 - 4, gy); ctx.stroke();
  }

  // Rodes (4 rodes pivotants)
  ctx.fillStyle = '#263238';
  for (const [wx, wy] of [[-cw/2 - 2, -ch/2 + 6], [cw/2 + 2, -ch/2 + 6], [-cw/2 - 2, ch/2 - 6], [cw/2 + 2, ch/2 - 6]]) {
    ctx.beginPath();
    ctx.ellipse(wx, wy, 3.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bossa de la compra / objecte dins del cistell davanter
  if (rv.type === 'shopper') {
    ctx.fillStyle = '#FFF';
    roundRect(ctx, -cw * 0.28, -ch * 0.35, cw * 0.56, ch * 0.3, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.stroke();

    // Client empenyent des del darrere (part inferior)
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rv.shopperEmoji, 0, ch * 0.18);
  } else {
    // Carro abandonat amb cartell de perill ⚠️
    ctx.fillStyle = '#FFA000';
    roundRect(ctx, -cw * 0.3, -ch * 0.25, cw * 0.6, ch * 0.4, 4);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️', 0, -ch * 0.05);
  }

  // Manillar AL DARRERE (part inferior del carro)
  ctx.fillStyle = rv.color;
  roundRect(ctx, -cw/2 - 4, ch/2 - 2, cw + 8, 9, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/* ══════════════════════════════════════════
   CARRET DE SUPERMERCAT REALISTA DEL JUGADOR
   ══════════════════════════════════════════ */
function drawPlayerCart() {
  const x   = state.cartX;
  const y   = CART_Y;
  const cw  = CART_W;
  const ch  = CART_H;
  const inv = state.invincible;
  const now = Date.now();

  ctx.save();
  ctx.translate(x, y);

  // Inclinació per gir i balanceig
  ctx.rotate(state.cartTilt + state.cartSpin);

  // Aura d'Invulnerabilitat / Turbo
  if (inv) {
    const pulse = 0.4 + Math.sin(now * 0.015) * 0.3;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = 20;
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.lineWidth   = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, cw * 0.65, ch * 0.58, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (state.turbo) {
    ctx.shadowColor = '#FF5722';
    ctx.shadowBlur  = 18;
    ctx.strokeStyle = 'rgba(255, 87, 34, 0.7)';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, cw * 0.62, ch * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Ombra del carro
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(5, ch * 0.38, cw * 0.46, ch * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Xassís tubular d'acer cromat (lleugerament més estret a la part davantera / superior)
  const chassisGrad = ctx.createLinearGradient(-cw/2, -ch/2, cw/2, ch/2);
  chassisGrad.addColorStop(0, '#FFFFFF');
  chassisGrad.addColorStop(0.3, '#D0D7DE');
  chassisGrad.addColorStop(0.7, '#8C959F');
  chassisGrad.addColorStop(1, '#57606A');
  ctx.fillStyle = chassisGrad;
  roundRect(ctx, -cw/2, -ch/2, cw, ch, cw * 0.16);
  ctx.fill();

  // Bord d'acer brillant
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth   = 2.2;
  ctx.stroke();

  // 2. Cantoneres vermelles de supermercat (protectors a les 4 cantonades)
  ctx.fillStyle = '#E53935';
  ctx.fillRect(-cw/2 - 1, -ch/2 - 1, 7, 10); // Davant esquerra
  ctx.fillRect(cw/2 - 6, -ch/2 - 1, 7, 10); // Davant dreta
  ctx.fillRect(-cw/2 - 1, ch/2 - 9, 7, 10); // Darrere esquerra
  ctx.fillRect(cw/2 - 6, ch/2 - 9, 7, 10); // Darrere dreta

  // 3. Reixeta d'acer metàl·lica (filferro)
  ctx.strokeStyle = '#78909C';
  ctx.lineWidth   = 1.5;
  const stepX = Math.floor(cw / 5);
  for (let gx = -cw/2 + stepX; gx < cw/2 - 4; gx += stepX) {
    ctx.beginPath(); ctx.moveTo(gx, -ch/2 + 5); ctx.lineTo(gx, ch/2 - 5); ctx.stroke();
  }
  const stepY = Math.floor(ch / 6);
  for (let gy = -ch/2 + stepY; gy < ch/2 - 5; gy += stepY) {
    ctx.beginPath(); ctx.moveTo(-cw/2 + 5, gy); ctx.lineTo(cw/2 - 5, gy); ctx.stroke();
  }

  // 4. Cistell davanter (brillantor i espai per a dolços)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  roundRect(ctx, -cw * 0.4, -ch * 0.45, cw * 0.8, ch * 0.4, 4);
  ctx.fill();

  // 5. Rodes pivotants de goma (amb gir dinàmic)
  const wheelAngle = state.cartTilt * 1.5;
  const wW = 4;
  const wH = 8;
  ctx.fillStyle = '#212529';
  for (const [wx, wy] of [[-cw/2 - 3, -ch/2 + 8], [cw/2 + 3, -ch/2 + 8], [-cw/2 - 3, ch/2 - 8], [cw/2 + 3, ch/2 - 8]]) {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(wheelAngle);
    ctx.fillRect(-wW/2, -wH/2, wW, wH);
    ctx.restore();
  }

  // 6. Seient infantil / Avatar del jugador (al darrere del cistell, mirant endavant)
  const aR = Math.floor(cw * 0.28);
  const aY = ch * 0.08; // Situat cap a la part posterior

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, aY, aR, 0, Math.PI * 2);
  ctx.clip();

  if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
    ctx.drawImage(avatarImg, -aR, aY - aR, aR * 2, aR * 2);
  } else {
    ctx.fillStyle = '#FFE0B2';
    ctx.fillRect(-aR, aY - aR, aR * 2, aR * 2);
    ctx.fillStyle = '#333';
    ctx.font = `${aR}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🙂', 0, aY);
  }
  ctx.restore();

  // Vora daurada de l'avatar
  ctx.strokeStyle = '#D4A017';
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  ctx.arc(0, aY, aR, 0, Math.PI * 2);
  ctx.stroke();

  // 7. Manillar vermell ergonòmic AL DARRERE (a la part inferior del carro)
  ctx.fillStyle = '#D32F2F';
  roundRect(ctx, -cw/2 - 6, ch/2 - 2, cw + 12, 11, 5);
  ctx.fill();
  ctx.strokeStyle = '#B71C1C';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 8. Mans de l'avatar agafant el manillar des del darrere
  ctx.fillStyle = '#FFE0B2';
  ctx.beginPath();
  ctx.arc(-cw * 0.28, ch/2 + 3, 4.5, 0, Math.PI * 2);
  ctx.arc(cw * 0.28, ch/2 + 3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D4A017';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/* ══════════════════════════════════════════
   CARTELLS AERIS PENJANTS
   ══════════════════════════════════════════ */
function drawBanners() {
  banners.forEach(b => {
    const y = b.y;
    const curve = getCurveOffset(y);
    const cx = VIRTUAL_W / 2 + curve;
    const bw = PLAY_W * 0.92;
    const bh = 34;

    ctx.save();
    ctx.translate(cx, y);

    // Ombra del cartell
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, -bw/2 + 3, -bh/2 + 4, bw, bh, 8);
    ctx.fill();

    // Fons del cartell aeri
    const grad = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, bh/2);
    grad.addColorStop(0, '#5C381E');
    grad.addColorStop(1, '#8B5A34');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#D4A017';
    ctx.lineWidth = 2;
    roundRect(ctx, -bw/2, -bh/2, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    // Text del cartell
    ctx.font = 'bold 11px var(--font-display, sans-serif)';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, 0, 0);

    ctx.restore();
  });
}

/* ══════════════════════════════════════════
   PARTÍCULES I TEXTOS FLOTANTS
   ══════════════════════════════════════════ */
function drawParticles() {
  state.particles.forEach(p => {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawFloatTexts() {
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(VIRTUAL_W * 0.052)}px var(--font-display, sans-serif)`;

  floatTexts.forEach(ft => {
    const alpha = Math.max(0, ft.life / ft.maxLife);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur  = 5;
    ctx.fillStyle   = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  });

  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;
}

/* ══════════════════════════════════════════
   HUD
   ══════════════════════════════════════════ */
function updateHUD() {
  if (livesEl) {
    const full  = Math.max(0, state.lives);
    const empty = Math.max(0, 3 - state.lives);
    livesEl.textContent = '❤️'.repeat(full) + '🖤'.repeat(empty);
  }
  const sc = Math.floor(state.score);
  if (scoreEl) scoreEl.textContent = sc.toLocaleString();
  if (bestEl)  bestEl.textContent  = Math.max(bestScore, sc).toLocaleString();
  if (levelEl) levelEl.textContent = state.level;

  if (sectionEl) {
    const sec = SUPERMARKET_SECTIONS[state.sectionIdx];
    sectionEl.textContent = sec ? sec.name : '🛒 Forn';
  }

  // Actualitzar Power-up bar
  if (state.turbo) {
    powerupBarEl.classList.remove('hidden');
    powerupIconEl.textContent = '⚡';
    powerupNameEl.textContent = 'TURBO BOOST!';
    powerupFillEl.style.width = `${(state.turboTimer / TURBO_DURATION) * 100}%`;
    powerupFillEl.style.background = 'linear-gradient(90deg, #FF5722, #FF9800)';
  } else if (state.magnet) {
    powerupBarEl.classList.remove('hidden');
    powerupIconEl.textContent = '🧲';
    powerupNameEl.textContent = 'IMANT DOLÇ!';
    powerupFillEl.style.width = `${(state.magnetTimer / MAGNET_DURATION) * 100}%`;
    powerupFillEl.style.background = 'linear-gradient(90deg, #9C27B0, #E91E63)';
  } else if (state.invincible && !state.hitInvincible) {
    powerupBarEl.classList.remove('hidden');
    powerupIconEl.textContent = '⭐';
    powerupNameEl.textContent = 'INVULNERABLE!';
    powerupFillEl.style.width = `${(state.invincibleTimer / INVINCIBLE_DURATION) * 100}%`;
    powerupFillEl.style.background = 'linear-gradient(90deg, #FFD700, #FFA000)';
  } else {
    powerupBarEl.classList.add('hidden');
  }
}

/* ══════════════════════════════════════════
   CONTROLS
   ══════════════════════════════════════════ */
function setupControls() {
  document.addEventListener('keydown', e => {
    if (state.phase !== 'running') return;
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') moveLane(-1);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveLane(1);
  });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    state.touchStartX = e.touches[0].clientX;
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (state.phase !== 'running') return;
    const dx = e.changedTouches[0].clientX - (state.touchStartX ?? 0);
    if (Math.abs(dx) > 26) {
      moveLane(dx > 0 ? 1 : -1);
    } else {
      const rect = canvas.getBoundingClientRect();
      const tapX = e.changedTouches[0].clientX - rect.left;
      moveLane(tapX < rect.width / 2 ? -1 : 1);
    }
  }, { passive: false });

  document.getElementById('kp-btn-left')?.addEventListener('click',  () => { if (state.phase === 'running') moveLane(-1); });
  document.getElementById('kp-btn-right')?.addEventListener('click', () => { if (state.phase === 'running') moveLane(1); });

  document.getElementById('btn-start')?.addEventListener('click', startGame);
  document.getElementById('btn-restart')?.addEventListener('click', () => {
    cancelAnimationFrame(rafId);
    sashaContainerEl.classList.add('hidden');
    startGame();
  });
  document.getElementById('overlay-restart')?.addEventListener('click', startGame);

  document.getElementById('btn-ranking')?.addEventListener('click', async () => {
    const modal = document.getElementById('ranking-modal');
    const body  = document.getElementById('ranking-modal-body');
    body.innerHTML = '<div class="flex-center"><div class="spinner"></div></div>';
    modal.classList.remove('hidden');
    try {
      const entries = await getGameRanking(GAMES.KART_PASTISSER);
      renderRankingTable(entries, 'ranking-modal-body', uid);
    } catch(e) {
      body.innerHTML = '<p class="text-center" style="padding:1rem">Configura Firebase per veure el rànquing</p>';
    }
  });

  document.getElementById('close-ranking')?.addEventListener('click', () => {
    document.getElementById('ranking-modal').classList.add('hidden');
  });
}

function moveLane(dir) {
  const next = Math.max(0, Math.min(LANES - 1, state.playerLane + dir));
  if (next === state.playerLane) return;
  state.playerLane  = next;
  state.cartTargetX = BASE_LANE_X[next];
}

/* ══════════════════════════════════════════
   FI DEL JOC
   ══════════════════════════════════════════ */
async function endGame() {
  state.phase = 'over';
  cancelAnimationFrame(rafId);
  sashaContainerEl.classList.add('hidden');
  turnWarningEl.classList.add('hidden');
  powerupBarEl.classList.add('hidden');

  drawGame();

  const finalScore = Math.floor(state.score);
  const isNewBest  = finalScore > bestScore;
  if (isNewBest) bestScore = finalScore;

  document.getElementById('overlay-emoji').textContent = isNewBest ? '🏆' : '🛒';
  document.getElementById('overlay-title').textContent = isNewBest ? 'Nou Rècord!' : 'Fi de la Cursa!';
  document.getElementById('overlay-score').textContent = finalScore.toLocaleString() + ' punts';
  document.getElementById('overlay-msg').textContent   = isNewBest
    ? 'Increïble! Has superat el teu rècord personal!'
    : `Millor: ${bestScore.toLocaleString()} punts`;

  overlayEl.classList.remove('hidden');
  updateHUD();

  if (uid && profile) {
    try {
      const isRecord = await saveScore(GAMES.KART_PASTISSER, uid, finalScore, profile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.KART_PASTISSER);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(finalScore, myRank);
        await unlockNextGame(GAMES.KART_PASTISSER, uid);
        loadRanking();
      }
    } catch(e) {}
  }
}

/* ══════════════════════════════════════════
   RANKING
   ══════════════════════════════════════════ */
async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.KART_PASTISSER);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch(e) {
    const el = document.getElementById('ranking-container');
    if (el) el.innerHTML = '<p class="text-center" style="color:var(--gray-400);padding:1rem">Configura Firebase per veure el rànquing</p>';
  }
}

/* ══════════════════════════════════════════
   UTILITATS
   ══════════════════════════════════════════ */
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

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
