/**
 * pastis-perfecte.js — El Taller: Munta pastissos a contrarellotge
 * Adaptat de H3L4D0S per a la Pastisseria Guadiana
 * Mecànica: llegir un bucle (valors + operació), calcular la seqüència de capes i muntar el pastís
 */

import { requireAuth, renderNavbarUser, logout, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Estat del joc ── */
let currentUser = null;
let currentProfile = null;
let uid = null;

let currentLevelIndex = 0;
let targetStack   = [];
let playerStack   = [];
let score         = 0;
let bestScore     = 0;
let timeLeft      = 60;
let timerInterval = null;
let isPlaying     = false;
let mistakes      = 0;

/* ── Noms dels sabors en català ── */
const FLAVOR_NAMES = {
  1: '🍫 Xocolata',
  2: '🍓 Maduixa',
  3: '🍋 Llimona',
  4: '🍦 Vainilla',
  5: '🫐 Mirtil',
  6: '🥭 Mango',
};

/* ── DOM refs ── */
const domTime        = document.getElementById('time');
const domScore       = document.getElementById('score');
const domCardValues  = document.getElementById('card-values');
const domCardOps     = document.getElementById('card-operations');
const domStack       = document.getElementById('stack');
const domCakeBuilder = document.getElementById('cake-builder');
const flavorBtns     = document.querySelectorAll('.flavor-btn');
const startScreen    = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn       = document.getElementById('start-btn');
const restartBtn     = document.getElementById('restart-btn');
const finalScoreEl   = document.getElementById('final-score');
const cardEl         = document.getElementById('current-card');
const verifyBtn      = document.getElementById('verify-btn');
const clearBtn       = document.getElementById('clear-btn');
const mistakesCounter = document.getElementById('mistakes-counter');
const solutionScreen = document.getElementById('solution-screen');
const solutionStack  = document.getElementById('solution-stack');
const nextLevelBtn   = document.getElementById('next-level-btn');

/* ── Autenticació ── */
requireAuth('../../login.html')
  .then(async ({ user, profile: p }) => {
    uid            = user.uid;
    currentUser    = user;
    currentProfile = p;
    renderNavbarUser(p, user);
    await loadBestScore(uid);
  })
  .catch(() => {});

document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
  await logout();
  window.location.href = '../../login.html';
});

async function loadBestScore(uid) {
  try {
    const ref  = doc(db, 'scores', GAMES.PASTIS_PERFECTE, 'players', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) bestScore = snap.data().score || 0;
  } catch(e) { /* Firebase no configurat */ }
}

/* ── Inici / Final del joc ── */
function startGame() {
  score             = 0;
  timeLeft          = 60;
  currentLevelIndex = 0;
  isPlaying         = true;

  updateHUD();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  solutionScreen.classList.add('hidden');

  loadLevel(generateRandomLevel());

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateHUD();
    if (timeLeft <= 10) {
      domTime.classList.add('danger');
    } else {
      domTime.classList.remove('danger');
    }
    if (timeLeft <= 0) endGame();
  }, 1000);
}

async function endGame() {
  isPlaying = false;
  clearInterval(timerInterval);
  domTime.classList.remove('danger');
  finalScoreEl.innerText = score;
  gameOverScreen.classList.remove('hidden');

  if (uid && currentProfile && score > 0) {
    try {
      const isRecord = await saveScore(GAMES.PASTIS_PERFECTE, uid, score, currentProfile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.PASTIS_PERFECTE, 10);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.PASTIS_PERFECTE, uid);
      }
    } catch(e) { /* Firebase no configurat */ }
  }
}

function updateHUD() {
  domScore.innerText = score;
  domTime.innerText  = timeLeft;
  mistakesCounter.innerText = `Errors: ${mistakes}/3`;
}

/* ── Generació procedural de nivells (portat de H3L4D0S) ── */
function generateRandomLevel() {
  // La dificultat puja cada 3 nivells, màx nivell 3 (expert)
  const difficulty = Math.min(3, Math.floor(currentLevelIndex / 3));

  // Helpers per generar seqüències segures dins del rang 1-6
  const getAscending = (minVal, maxVal, len) => {
    const maxStart = maxVal - len + 1;
    const start    = Math.floor(Math.random() * (maxStart - minVal + 1)) + minVal;
    return Array.from({length: len}, (_, i) => start + i);
  };

  const getDescending = (minVal, maxVal, len) => {
    const minStart = minVal + len - 1;
    const start    = Math.floor(Math.random() * (maxVal - minStart + 1)) + minStart;
    return Array.from({length: len}, (_, i) => start - i);
  };

  // Nivell Fàcil: bucle curt, 1 operació simple
  const templatesEasy = [
    () => ({ values: getAscending(1, 6, Math.floor(Math.random() * 2) + 2),  ops: ['A'] }),
    () => ({ values: getDescending(1, 6, Math.floor(Math.random() * 2) + 2), ops: ['A'] }),
  ];

  // Nivell Mig: operacions matemàtiques simples, bucles medis
  const templatesMed = [
    () => ({ values: getAscending(1, 6, Math.floor(Math.random() * 2) + 3),  ops: ['A', 'A'] }),
    () => ({ values: getAscending(1, 5, Math.floor(Math.random() * 2) + 3),  ops: ['A+1']    }),
    () => ({ values: getDescending(2, 6, Math.floor(Math.random() * 2) + 3), ops: ['A-1']    }),
  ];

  // Nivell Difícil: A+A, mescla d'operacions
  const templatesHard = [
    () => ({ values: getAscending(1, 3, Math.floor(Math.random() * 2) + 2), ops: ['A', 'A+A'] }),
    () => {
      const c = Math.floor(Math.random() * 6) + 1;
      return { values: getAscending(1, 6, Math.floor(Math.random() * 2) + 3), ops: ['A', c.toString()] };
    },
    () => ({ values: getAscending(2, 5, Math.floor(Math.random() * 2) + 2), ops: ['A-1', 'A+1'] }),
  ];

  // Nivell Expert: bucles llargs, triple operació
  const templatesExpert = [
    () => ({ values: getAscending(1, 3, Math.floor(Math.random() * 2) + 2),  ops: ['A', 'A+1', 'A+A'] }),
    () => ({ values: getDescending(2, 6, Math.floor(Math.random() * 3) + 3), ops: ['A', 'A-1']         }),
  ];

  let pool = templatesEasy;
  if (difficulty === 1) pool = templatesMed;
  if (difficulty === 2) pool = templatesHard;
  if (difficulty >= 3)  pool = templatesExpert;

  return pool[Math.floor(Math.random() * pool.length)]();
}

function calculateTargetStack(level) {
  let stack = [];
  for (let i = level.values.length - 1; i >= 0; i--) {
    const A = level.values[i];
    for (let j = level.ops.length - 1; j >= 0; j--) {
      const op = level.ops[j];
      let flavor = parseOperation(op, A);
      if (flavor > 6) flavor = 6;
      if (flavor < 1) flavor = 1;
      stack.push(flavor);
    }
  }
  return stack;
}

function parseOperation(op, A) {
  if (op === 'A')   return A;
  if (op === 'A+1') return A + 1;
  if (op === 'A-1') return A - 1;
  if (op === 'A+A') return A + A;
  if (!isNaN(parseInt(op))) return parseInt(op);
  return A;
}

/* ── Càrrega d'un nivell ── */
function loadLevel(level) {
  playerStack = [];
  domStack.innerHTML = '';
  mistakes = 0;
  updateHUD();

  // Animació de sortida de la carta anterior
  cardEl.style.transition = 'all 0.25s ease-in';
  cardEl.style.transform  = 'translateY(100%) rotateZ(-10deg)';
  cardEl.style.opacity    = '0';

  setTimeout(() => {
    // Generar valors A a la carta
    domCardValues.innerHTML = '';
    level.values.forEach(v => {
      const div = document.createElement('div');
      div.className = `val val-${v}`;
      div.innerText = v;
      domCardValues.appendChild(div);
    });

    // Generar operacions a la carta
    domCardOps.innerHTML = '';
    level.ops.forEach(op => {
      const div = document.createElement('div');
      div.className = `op-block ${(op.includes('-') || op.includes('+')) ? 'op-red' : ''}`;
      div.innerText = op;
      domCardOps.appendChild(div);
    });

    targetStack = calculateTargetStack(level);

    // Animació d'entrada de la nova carta
    cardEl.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    cardEl.style.transform  = 'translateY(0) rotateY(5deg)';
    cardEl.style.opacity    = '1';
  }, 300);
}

/* ── Afegir una capa al pastís ── */
function addLayer(flavor) {
  const layerEl = document.createElement('div');
  layerEl.className = `cake-layer flavor-${flavor}`;

  const label = document.createElement('span');
  label.className   = 'layer-label';
  label.textContent = FLAVOR_NAMES[flavor];
  layerEl.appendChild(label);

  domStack.appendChild(layerEl);
  playerStack.push(flavor);
}

/* ── Botons de sabors ── */
flavorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!isPlaying) return;
    const flavor = parseInt(btn.getAttribute('data-flavor'));
    addLayer(flavor);

    // Micro-animació del botó premut
    btn.classList.add('btn-pressed');
    setTimeout(() => btn.classList.remove('btn-pressed'), 150);
  });
});

// Atajos de teclat 1-6
document.addEventListener('keydown', (e) => {
  if (!isPlaying) return;
  const num = parseInt(e.key);
  if (num >= 1 && num <= 6) addLayer(num);
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); verifyBtn.click(); }
  if (e.key === 'Backspace' || e.key === 'Delete') clearBtn.click();
});

/* ── Netejar ── */
clearBtn.addEventListener('click', () => {
  if (!isPlaying) return;
  playerStack = [];
  domStack.innerHTML = '';
});

/* ── Verificar ── */
verifyBtn.addEventListener('click', () => {
  if (!isPlaying) return;

  // Comparar les piles
  let isCorrect = playerStack.length === targetStack.length;
  if (isCorrect) {
    for (let i = 0; i < playerStack.length; i++) {
      if (playerStack[i] !== targetStack[i]) { isCorrect = false; break; }
    }
  }

  if (isCorrect) {
    levelComplete();
  } else {
    // Error: animació de tremolor
    domCakeBuilder.classList.add('shake');
    setTimeout(() => domCakeBuilder.classList.remove('shake'), 400);

    mistakes++;
    score    = Math.max(0, score - 5);
    timeLeft = Math.max(0, timeLeft - 3);
    updateHUD();

    showToast(`❌ Error! -5pts -3s (${mistakes}/3)`, 'error', 1500);

    if (mistakes >= 3) showSolution();
  }
});

/* ── Nivell completat ── */
function levelComplete() {
  score    += targetStack.length * 10;
  timeLeft += 3;
  updateHUD();

  showToast(`✅ Pastís completat! +${targetStack.length * 10}pts +3s`, 'success', 1500);

  // Animació "poof" de les capes
  Array.from(domStack.children).forEach(child => child.classList.add('poof'));

  setTimeout(() => {
    currentLevelIndex++;
    loadLevel(generateRandomLevel());
  }, 600);
}

/* ── Mostrar solució (3 errors) ── */
function showSolution() {
  isPlaying = false;
  solutionStack.innerHTML = '';

  // Mostrar les capes de la solució (de baix a dalt)
  // Com que el stack usa column-reverse, afegim en l'ordre natural
  [...targetStack].forEach(flavor => {
    const layerEl = document.createElement('div');
    layerEl.className = `cake-layer flavor-${flavor}`;
    const label = document.createElement('span');
    label.className   = 'layer-label';
    label.textContent = FLAVOR_NAMES[flavor];
    layerEl.appendChild(label);
    solutionStack.appendChild(layerEl);
  });

  // Plat a baix
  const plate = document.createElement('div');
  plate.className = 'plate';
  plate.innerHTML = '<div class="plate-inner"></div>';
  solutionStack.appendChild(plate);

  solutionScreen.classList.remove('hidden');
}

/* ── Botons d'overlay ── */
nextLevelBtn.addEventListener('click', () => {
  solutionScreen.classList.add('hidden');
  isPlaying = true;
  currentLevelIndex++;
  loadLevel(generateRandomLevel());
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
