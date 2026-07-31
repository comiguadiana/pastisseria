/**
 * suika-pastis.js — Fusió Pastissera (Suika Game)
 *
 * Físiques implementades amb Matter.js
 */

import { requireAuth, renderNavbarUser, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── Configuració de peces ─── */
const PASTRIES = [
  { id: 0, emoji: '🍪', radius: 18,  color: '#8B5E3C', pts: 2 },
  { id: 1, emoji: '🧁', radius: 26,  color: '#CE93D8', pts: 4 },
  { id: 2, emoji: '🥐', radius: 36,  color: '#D4A017', pts: 8 },
  { id: 3, emoji: '🍰', radius: 48,  color: '#FF8FAB', pts: 16 },
  { id: 4, emoji: '🍩', radius: 62,  color: '#FFD6E5', pts: 32 },
  { id: 5, emoji: '🥧', radius: 78,  color: '#B8F0D8', pts: 64 },
  { id: 6, emoji: '🎂', radius: 96,  color: '#FFB6C1', pts: 128 },
  { id: 7, emoji: '🐍', radius: 120, color: '#5DBB63', pts: 256 },
];

/* ─── Estat del joc ─── */
let engine, render, runner;
let score = 0;
let bestScore = 0;
let gameRunning = false;
let dropperReady = true;
let nextPieceType = 0;
let dropperX = 225;
let uid = null, profile = null;

const BOARD_WIDTH = 450;
const BOARD_HEIGHT = 600;
const LIMIT_Y = BOARD_HEIGHT * 0.15; // 15% des de dalt (límit de game over)

const { Engine, Render, Runner, World, Bodies, Composite, Events, Body } = window.Matter;

/* ─── Inicialització i Autenticació ─── */
requireAuth('../../login.html')
  .then(async ({ user, profile: p }) => {
    uid = user.uid; profile = p;
    renderNavbarUser(p, user);
    try {
      const ref = doc(db, 'scores', GAMES.FUSIO_PASTISSERA, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) bestScore = snap.data().score;
    } catch(e) {}
    const bestEl = document.getElementById('best');
    if (bestEl) bestEl.textContent = bestScore.toLocaleString();
    initMatterJS();
    initGame();
    loadRanking();
  }).catch(() => {});

/* ─── Matter.js Setup ─── */
function initMatterJS() {
  const container = document.getElementById('game-container');
  
  engine = Engine.create();
  engine.world.gravity.y = 1.2; // Un pèl més de gravetat
  
  render = Render.create({
    element: container,
    engine: engine,
    options: {
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      wireframes: false,
      background: 'transparent',
    }
  });
  
  // Dibuixat personalitzat per pintar els Emojis a sobre dels cossos rodons
  Events.on(render, 'afterRender', function() {
    const ctx = render.context;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    Composite.allBodies(engine.world).forEach((b) => {
      if (b.customType !== undefined) {
        const p = PASTRIES[b.customType];
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);
        ctx.font = `${p.radius * 1.25}px serif`;
        // Afegir una petita ombra interior/lluentor o només el text
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
      }
    });
  });

  // Events de col·lisió per fusionar peces
  Events.on(engine, 'collisionStart', handleCollisions);

  // Event d'actualització per comprovar Game Over
  Events.on(engine, 'afterUpdate', checkGameOverBounds);

  runner = Runner.create();
  Render.run(render);
  Runner.run(runner, engine);
}

/* ─── Nova partida ─── */
function initGame() {
  score = 0;
  gameRunning = true;
  dropperReady = true;
  updateHUD();
  
  document.getElementById('suika-overlay').classList.add('hidden');
  
  // Netejar món
  World.clear(engine.world, false);
  
  // Crear parets
  const wallOpts = { isStatic: true, render: { fillStyle: '#8B5E3C' }, friction: 0.1 };
  World.add(engine.world, [
    Bodies.rectangle(BOARD_WIDTH/2, BOARD_HEIGHT + 30, BOARD_WIDTH, 60, wallOpts), // Terra
    Bodies.rectangle(-30, BOARD_HEIGHT/2, 60, BOARD_HEIGHT*2, wallOpts), // Paret esquerra
    Bodies.rectangle(BOARD_WIDTH + 30, BOARD_HEIGHT/2, 60, BOARD_HEIGHT*2, wallOpts) // Paret dreta
  ]);

  generateNextPiece();
}

/* ─── Generació de peces i Dropper ─── */
function generateNextPiece() {
  // Només poden aparèixer les 4 primeres peces (0 a 3) a l'atzar
  nextPieceType = Math.floor(Math.random() * 4);
  const p = PASTRIES[nextPieceType];
  
  const dropper = document.getElementById('dropper');
  dropper.textContent = p.emoji;
  dropper.style.fontSize = `${p.radius * 1.2}px`;
  document.getElementById('next-piece').textContent = p.emoji;
  
  dropperReady = true;
  dropper.classList.remove('hidden');
}

/* ─── Moviment del Dropper ─── */
const gameContainer = document.getElementById('game-container');

function updateDropperPos(clientX) {
  if (!gameRunning || !dropperReady) return;
  const rect = gameContainer.getBoundingClientRect();
  const scaleX = BOARD_WIDTH / rect.width;
  
  let x = (clientX - rect.left) * scaleX;
  
  // Limitar dins les parets segons el radi de la peça actual
  const r = PASTRIES[nextPieceType].radius;
  x = Math.max(r, Math.min(BOARD_WIDTH - r, x));
  
  dropperX = x;
  document.getElementById('dropper').style.left = `${(x / BOARD_WIDTH) * 100}%`;
}

gameContainer.addEventListener('mousemove', (e) => updateDropperPos(e.clientX));
gameContainer.addEventListener('touchmove', (e) => {
  e.preventDefault();
  updateDropperPos(e.touches[0].clientX);
}, { passive: false });

/* ─── Llançament (Drop) ─── */
function dropPiece() {
  if (!gameRunning || !dropperReady) return;
  
  dropperReady = false;
  document.getElementById('dropper').classList.add('hidden');
  
  const p = PASTRIES[nextPieceType];
  
  // Crear el cos a Matter.js
  const body = Bodies.circle(dropperX, 40, p.radius, {
    restitution: 0.3,     // Rebot lleuger
    friction: 0.1,        // Fricció
    density: 0.001 * (p.id + 1), // Les peces grans pesen més
    render: { fillStyle: p.color }, // Color de fons
    customType: p.id,
    isMerging: false      // Flag propi per evitar fusions dobles
  });
  
  World.add(engine.world, body);
  
  // Esperar una mica abans de preparar la següent peça
  setTimeout(() => {
    if (gameRunning) generateNextPiece();
  }, 1000);
}

gameContainer.addEventListener('click', dropPiece);
gameContainer.addEventListener('touchend', (e) => {
  e.preventDefault();
  dropPiece();
}, { passive: false });

/* ─── Fusions (Col·lisions) ─── */
function handleCollisions(event) {
  if (!gameRunning) return;
  
  const pairs = event.pairs;
  const bodiesToRemove = [];
  const bodiesToAdd = [];
  
  for (let i = 0; i < pairs.length; i++) {
    const bodyA = pairs[i].bodyA;
    const bodyB = pairs[i].bodyB;
    
    // Comprovar si són del mateix tipus
    if (bodyA.customType !== undefined && bodyB.customType !== undefined &&
        bodyA.customType === bodyB.customType) {
        
      // Evitar que una mateixa peça es fusioni dos cops al mateix temps
      if (bodyA.isMerging || bodyB.isMerging) continue;
      
      const tipusIdx = bodyA.customType;
      
      // Si no és l'última evolució
      if (tipusIdx < PASTRIES.length - 1) {
        bodyA.isMerging = true;
        bodyB.isMerging = true;
        
        const nextTipus = PASTRIES[tipusIdx + 1];
        
        // Calcular el punt mitjà per spawnear la nova peça
        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;
        
        bodiesToRemove.push(bodyA, bodyB);
        
        const nouBody = Bodies.circle(midX, midY, nextTipus.radius, {
          restitution: 0.2,
          friction: 0.1,
          density: 0.001 * (nextTipus.id + 1),
          render: { fillStyle: nextTipus.color },
          customType: nextTipus.id,
          isMerging: false
        });
        
        bodiesToAdd.push(nouBody);
        
        // Sumar punts
        score += nextTipus.pts;
      }
    }
  }
  
  if (bodiesToRemove.length > 0) {
    Composite.remove(engine.world, bodiesToRemove);
    Composite.add(engine.world, bodiesToAdd);
    updateHUD();
    
    // Efecte visual/so de fusió podria anar aquí
  }
}

/* ─── Comprovar Game Over ─── */
function checkGameOverBounds() {
  if (!gameRunning) return;
  
  const bodies = Composite.allBodies(engine.world);
  
  for (const b of bodies) {
    // Només comprovem peces (que tenen customType) i que estiguin gairebé quietes
    if (b.customType !== undefined && b.position.y < LIMIT_Y && !b.isStatic) {
      if (Math.abs(b.velocity.y) < 0.1 && Math.abs(b.velocity.x) < 0.1) {
        // Ha sobrepassat el límit i s'ha parat
        endGame();
        break;
      }
    }
  }
}

/* ─── Final del Joc ─── */
async function endGame() {
  gameRunning = false;
  dropperReady = false;
  document.getElementById('dropper').classList.add('hidden');
  
  const isNew = score > bestScore;
  if (isNew) { bestScore = score; }

  document.getElementById('suika-title').textContent = isNew ? 'Nou Rècord!' : 'El Pot s\'ha omplert!';
  document.getElementById('suika-score').textContent = score.toLocaleString() + ' punts';
  document.getElementById('suika-overlay').classList.remove('hidden');

  if (uid && profile) {
    try {
      // Nota: asumeixo que la variable FUSIO_PASTISSERA existeix al ranking.js que he modificat per separat
      const isRecord = await saveScore('fusio-pastissera', uid, score, profile);
      if (isRecord) {
        const ranking = await getGameRanking('fusio-pastissera', 10);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.FUSIO_PASTISSERA, uid);
        
      }
    } catch(e) { console.error("Error desant puntuació", e); }
  }
}

/* ─── Interfície ─── */
function updateHUD() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('best').textContent  = bestScore.toLocaleString();
}

/* ─── Rànquing ─── */
async function loadRanking() {
  try {
    const entries = await getGameRanking('fusio-pastissera', 10);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch(e) {
    document.getElementById('ranking-container').innerHTML =
      '<p style="text-align:center;padding:1rem;color:var(--gray-400)">Configura Firebase per veure el rànquing</p>';
  }
}

/* ─── Botons ─── */
document.getElementById('btn-restart').addEventListener('click', initGame);
document.getElementById('btn-play-again').addEventListener('click', initGame);
