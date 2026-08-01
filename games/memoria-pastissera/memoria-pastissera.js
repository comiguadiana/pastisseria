/**
 * memoria-pastissera.js — Memory cards amb pastissos
 * 16 cartes = 8 parelles. Contra el temps. Menys errors = més punts.
 */

import { requireAuth, renderNavbarUser, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const CARDS = [
  { emoji:'🥐', label:'Cruasán'   },
  { emoji:'🍩', label:'Donut'     },
  { emoji:'🧁', label:'Magdalena' },
  { emoji:'🎂', label:'Pastís'    },
  { emoji:'🍪', label:'Galeta'    },
  { emoji:'🥧', label:'Tarta'     },
  { emoji:'🍰', label:'Cunya'     },
  { emoji:'<img src="../../assets/img/sasha.png" style="width:80%;height:80%;object-fit:contain">', label:'Sasha' },
];

const GAME_TIME = 60;
const POINTS_PER_PAIR = 100;
const TIME_BONUS = 10;
const ERROR_PENALTY = 15;

let cards = [];
let flipped = [];
let matched = 0;
let errors = 0;
let score = 0;
let bestScore = 0;
let timeLeft = GAME_TIME;
let gameRunning = false;
let countdownTimer = null;
let lockBoard = false;
let uid = null, profile = null;

requireAuth('../../login.html')
  .then(async ({ user, profile: p }) => {
    uid = user.uid; profile = p;
    renderNavbarUser(p, user);
    try {
      const ref = doc(db, 'scores', GAMES.MEMORIA_PASTISSERA, 'players', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) bestScore = snap.data().score;
    } catch(e) {}
    const bestEl = document.getElementById('best');
    if (bestEl) bestEl.textContent = bestScore.toLocaleString();
    initGame();
    loadRanking();
  }).catch(() => {});

function initGame() {
  score = 0; errors = 0; matched = 0; flipped = [];
  timeLeft = GAME_TIME; gameRunning = true; lockBoard = false;
  document.getElementById('mem-overlay').classList.add('hidden');
  document.getElementById('timer').style.color = '';
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;
    if (timeLeft <= 10) document.getElementById('timer').style.color = '#FF8FAB';
    if (timeLeft <= 0) endGame(false);
  }, 1000);
  buildGrid();
  updateHUD();
}

function buildGrid() {
  const pairs = [...CARDS, ...CARDS]
    .sort(() => Math.random() - 0.5)
    .map((c, i) => ({ ...c, id: i, flipped: false, matched: false }));
  cards = pairs;

  const grid = document.getElementById('mem-grid');
  grid.innerHTML = '';
  pairs.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'mem-card';
    el.dataset.idx = i;
    el.innerHTML = `
      <div class="mem-card-inner">
        <div class="mem-card-front">🎂</div>
        <div class="mem-card-back">${card.emoji}</div>
      </div>`;
    el.addEventListener('click', () => flipCard(i, el));
    grid.appendChild(el);
  });
}

function flipCard(idx, el) {
  if (!gameRunning || lockBoard) return;
  if (cards[idx].matched || cards[idx].flipped) return;
  if (flipped.length >= 2) return;

  cards[idx].flipped = true;
  el.classList.add('flipped');
  flipped.push({ idx, el });

  if (flipped.length === 2) {
    lockBoard = true;
    const [a, b] = flipped;
    if (cards[a.idx].emoji === cards[b.idx].emoji) {
      // Parella!
      setTimeout(() => {
        a.el.classList.add('matched');
        b.el.classList.add('matched');
        cards[a.idx].matched = true;
        cards[b.idx].matched = true;
        matched++;
        score += POINTS_PER_PAIR + timeLeft * TIME_BONUS;
        flipped = []; lockBoard = false;
        updateHUD();
        if (matched === CARDS.length) endGame(true);
      }, 400);
    } else {
      // Error
      errors++;
      score = Math.max(0, score - ERROR_PENALTY);
      setTimeout(() => {
        a.el.classList.remove('flipped'); cards[a.idx].flipped = false;
        b.el.classList.remove('flipped'); cards[b.idx].flipped = false;
        flipped = []; lockBoard = false;
        updateHUD();
      }, 900);
    }
  }
}

function updateHUD() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('pairs').textContent = `${matched}/${CARDS.length}`;
  document.getElementById('errors').textContent = errors;
}

async function endGame(won) {
  gameRunning = false;
  clearInterval(countdownTimer);
  const isNew = score > bestScore;
  if (isNew) { bestScore = score; }

  document.getElementById('mem-emoji').textContent  = won ? '🏆' : '⏰';
  document.getElementById('mem-title').textContent  = won ? 'Pastisseria Perfecta!' : 'Temps esgotat!';
  document.getElementById('mem-score').textContent  = score.toLocaleString() + ' punts';
  document.getElementById('mem-msg').textContent    = `${matched} parelles, ${errors} errors`;
  document.getElementById('mem-overlay').classList.remove('hidden');

  if (uid && profile) {
    try {
      const isRecord = await saveScore(GAMES.MEMORIA_PASTISSERA, uid, score, profile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.MEMORIA_PASTISSERA, 10);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.MEMORIA_PASTISSERA, uid);
        
      }
    } catch(e) {}
  }
}

async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.MEMORIA_PASTISSERA, 10);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch(e) {
    document.getElementById('ranking-container').innerHTML =
      '<p style="text-align:center;padding:1rem;color:var(--gray-400)">Configura Firebase per veure el rànquing</p>';
  }
}

document.getElementById('btn-restart').addEventListener('click', () => { clearInterval(countdownTimer); initGame(); });
document.getElementById('btn-play-again').addEventListener('click', () => {
  document.getElementById('mem-overlay').classList.add('hidden');
  initGame();
});
