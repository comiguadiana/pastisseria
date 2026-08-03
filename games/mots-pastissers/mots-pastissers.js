/**
 * mots-pastissers.js — Joc Wordle de 6 lletres en Català (Obrador Guadiana)
 * Temàtica dolça, diccionari complet en català, dates ofuscades,
 * puntuació acumulativa diària, aparicions de la Sasha i integració Firebase.
 */

import { requireAuth, renderNavbarUser, logout, getDiceBearUrl } from '../../assets/js/auth.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { saveScore, recordGamePlay, GAMES } from '../../assets/js/ranking.js';

/* ══════════════════════════════════════════════════════════
   DADES OFUSCADES DE LES PARAULES DIÀRIES
   ══════════════════════════════════════════════════════════ */
const SECRET_PAYLOAD = "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";
const OBFUSCATION_KEY = "PastisseriaObradorGuadiana2026";

function decodePayload(base64Str, key) {
  try {
    const cleanB64 = (base64Str || "").replace(/\s+/g, "");
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    }
    const decoder = new TextDecoder("utf-8");
    return JSON.parse(decoder.decode(bytes));
  } catch (e) {
    console.error("Error descodificant les paraules del joc:", e);
    return [];
  }
}

const ALL_WORDS_DATA = decodePayload(SECRET_PAYLOAD, OBFUSCATION_KEY);

/* ══════════════════════════════════════════════════════════
   ESTAT GLOBAL DEL JOC
   ══════════════════════════════════════════════════════════ */
const WORD_LENGTH = 6;
const MAX_ATTEMPTS = 6;

let currentUser = null;
let currentProfile = null;
let catalanDictionary = new Set();
let dictionaryLoaded = false;

let todayData = null;
let targetWordOriginal = "";
let targetWordNormalized = "";
let todayDateStr = "";

let guesses = [];        // Array de paraules enviades (ex: ["PASTAR", "SUCRES"])
let evaluations = [];    // Array d'avaluacions (ex: [["correct","absent",...]])
let currentGuess = "";   // Lletres teclejades a la fila activa
let currentRow = 0;
let isGameOver = false;
let isAnimating = false;
let cloudDailyProgress = null;

let userStats = {
  totalScore: 0,
  daysPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  history: {}
};

/* ══════════════════════════════════════════════════════════
   SÍNTESI D'ÀUDIO (Web Audio API)
   ══════════════════════════════════════════════════════════ */
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

function playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playKeySound() {
  playTone(480, 'sine', 0.04, 0.08);
}

function playFlipSound(index) {
  const freqs = [350, 400, 450, 520, 600, 700];
  playTone(freqs[index] || 500, 'triangle', 0.12, 0.12);
}

function playErrorSound() {
  playTone(160, 'sawtooth', 0.25, 0.2);
}

function playVictoryFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      playTone(freq, 'triangle', 0.35, 0.25);
    }, idx * 140);
  });
}

/* ══════════════════════════════════════════════════════════
   NORMALITZACIÓ DE TEXT
   ══════════════════════════════════════════════════════════ */
function normalizeLetter(ch) {
  if (!ch) return "";
  const upper = ch.toUpperCase();
  if (upper === "Ç") return "Ç";
  return upper.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeWord(word) {
  if (!word) return "";
  let result = "";
  for (const ch of word) {
    const n = normalizeLetter(ch);
    if (/^[A-ZÇ]$/.test(n)) {
      result += n;
    }
  }
  return result;
}

/* ══════════════════════════════════════════════════════════
   DATA I SELECCIÓ DE LA PARAULA DEL DIA
   ══════════════════════════════════════════════════════════ */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateReadable(dateStr) {
  const months = [
    'de gener', 'de febrer', 'de març', 'd’abril', 'de maig', 'de juny',
    'de juliol', 'd’agost', 'de setembre', 'd’octubre', 'de novembre', 'de desembre'
  ];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${day} ${months[monthIdx] || ''}`;
  }
  return dateStr;
}

function selectTodayWord() {
  todayDateStr = getTodayDateString();

  // Buscar la paraula de la data actual
  let found = ALL_WORDS_DATA.find(item => item.data === todayDateStr);

  // Si avui és abans de la primera data o posterior, fer servir la primera o la del dia
  if (!found) {
    if (ALL_WORDS_DATA.length > 0) {
      found = ALL_WORDS_DATA[0]; // Paraula d'escalfament / prova
    }
  }

  todayData = found || {
    data: todayDateStr,
    paraula: "PASTAR",
    pista: "La primera acció de qualsevol obrador"
  };

  targetWordOriginal = todayData.paraula.toUpperCase();
  targetWordNormalized = normalizeWord(targetWordOriginal);

  // Actualitzar el label de data
  const dateLabel = document.getElementById('daily-date-label');
  if (dateLabel) {
    dateLabel.textContent = `Paraula dolça del ${formatDateReadable(todayData.data)}`;
  }

  // Actualitzar la pista de la Sasha
  const hintText = document.getElementById('sasha-hint-text');
  if (hintText) {
    hintText.textContent = todayData.pista;
  }
}

/* ══════════════════════════════════════════════════════════
   CÀRREGA DEL DICCIONARI DE 6 LLETRES
   ══════════════════════════════════════════════════════════ */
async function loadDictionary() {
  try {
    const response = await fetch('catalan-words-6.json');
    if (response.ok) {
      const list = await response.json();
      catalanDictionary = new Set(list.map(w => normalizeWord(w)));
    }
  } catch (e) {
    console.warn("No s'ha pogut carregar catalan-words-6.json, utilitzant conjunt base:", e);
  }

  // Assegurar que totes les paraules secretes del calendari són al diccionari
  ALL_WORDS_DATA.forEach(item => {
    if (item.paraula) {
      catalanDictionary.add(normalizeWord(item.paraula));
    }
  });

  dictionaryLoaded = true;
}

/* ══════════════════════════════════════════════════════════
   INICIALITZACIÓ VISUAL DE LA GRAELLA I EL TECLAT
   ══════════════════════════════════════════════════════════ */
function buildBoard() {
  const board = document.getElementById('wordle-board');
  if (!board) return;
  board.innerHTML = '';

  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-row';
    rowEl.id = `row-${r}`;
    rowEl.setAttribute('role', 'row');

    for (let c = 0; c < WORD_LENGTH; c++) {
      const tileEl = document.createElement('div');
      tileEl.className = 'wordle-tile';
      tileEl.id = `tile-${r}-${c}`;
      tileEl.setAttribute('role', 'gridcell');
      tileEl.setAttribute('aria-label', `Fila ${r+1}, lletra ${c+1}`);
      rowEl.appendChild(tileEl);
    }
    board.appendChild(rowEl);
  }
}

function buildKeyboard() {
  const keyboard = document.getElementById('wordle-keyboard');
  if (!keyboard) return;
  keyboard.innerHTML = '';

  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
  ];

  rows.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'keyboard-row';

    row.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'key-btn';
      btn.dataset.key = key;
      btn.textContent = key;

      if (key === 'ENTER' || key === '⌫') {
        btn.classList.add('key-wide');
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        handleKeyPress(key);
      });

      rowEl.appendChild(btn);
    });

    keyboard.appendChild(rowEl);
  });
}

/* ══════════════════════════════════════════════════════════
   GESTIÓ DE TECLAT I ENTRADA D'USUARI
   ══════════════════════════════════════════════════════════ */
function handleKeyPress(key) {
  if (isGameOver || isAnimating) return;

  const normKey = normalizeLetter(key);

  if (key === 'ENTER' || key === 'Enter') {
    submitGuess();
  } else if (key === '⌫' || key === 'BACKSPACE' || key === 'Backspace') {
    deleteLetter();
  } else if (/^[A-ZÇ]$/.test(normKey)) {
    insertLetter(normKey);
  }
}

function insertLetter(letter) {
  if (currentGuess.length < WORD_LENGTH) {
    currentGuess += letter;
    playKeySound();
    updateActiveRowDisplay();
  }
}

function deleteLetter() {
  if (currentGuess.length > 0) {
    currentGuess = currentGuess.slice(0, -1);
    playKeySound();
    updateActiveRowDisplay();
  }
}

function updateActiveRowDisplay() {
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = document.getElementById(`tile-${currentRow}-${c}`);
    if (!tile) continue;

    const char = currentGuess[c] || '';
    tile.textContent = char;

    if (char) {
      tile.classList.add('tbd');
    } else {
      tile.classList.remove('tbd');
    }
  }
}

/* ══════════════════════════════════════════════════════════
   AVALUACIÓ DEL WORDLE (6 LLETRES)
   ══════════════════════════════════════════════════════════ */
function evaluateGuess(guess, target) {
  const result = Array(WORD_LENGTH).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.split('');
  const letterCounts = {};

  // Freqüències de les lletres a la paraula objectiu
  for (const ch of targetChars) {
    letterCounts[ch] = (letterCounts[ch] || 0) + 1;
  }

  // Pas 1: Verds (Lletra i posició correcta)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct';
      letterCounts[guessChars[i]]--;
    }
  }

  // Pas 2: Grocs (Lletra present en una altra posició)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] !== 'correct') {
      const ch = guessChars[i];
      if (letterCounts[ch] > 0) {
        result[i] = 'present';
        letterCounts[ch]--;
      } else {
        result[i] = 'absent';
      }
    }
  }

  return result;
}

function shakeCurrentRow() {
  const row = document.getElementById(`row-${currentRow}`);
  if (row) {
    row.classList.remove('shake');
    void row.offsetWidth; // Trigger reflow
    row.classList.add('shake');
    playErrorSound();
  }
}

function showToast(message, duration = 2500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'wordle-toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ══════════════════════════════════════════════════════════
   ENVIAMENT DE L'INTENT
   ══════════════════════════════════════════════════════════ */
async function submitGuess() {
  if (currentGuess.length < WORD_LENGTH) {
    shakeCurrentRow();
    showToast('Falten lletres (en calen 6)!');
    return;
  }

  const normalizedGuess = normalizeWord(currentGuess);

  // Validació de diccionari
  if (dictionaryLoaded && !catalanDictionary.has(normalizedGuess)) {
    shakeCurrentRow();
    showToast('Aquesta paraula no és al diccionari en català!');
    return;
  }

  isAnimating = true;
  const guess = normalizedGuess;
  const evaluation = evaluateGuess(guess, targetWordNormalized);

  guesses.push(guess);
  evaluations.push(evaluation);

  const rowIdx = currentRow;

  // Animació de gir fitxa a fitxa
  for (let c = 0; c < WORD_LENGTH; c++) {
    await new Promise(resolve => setTimeout(resolve, 180));
    const tile = document.getElementById(`tile-${rowIdx}-${c}`);
    if (tile) {
      tile.classList.add('flip');
      playFlipSound(c);
      setTimeout(() => {
        tile.classList.remove('tbd');
        tile.classList.add(evaluation[c]);
      }, 250);
    }
  }

  await new Promise(resolve => setTimeout(resolve, 350));

  // Actualitzar el teclat amb els nous estats
  updateKeyboardStates();

  // Reaccions de la Sasha segons els encerts
  updateSashaReaction(evaluation);

  const isWin = guess === targetWordNormalized;
  const isLoss = !isWin && guesses.length >= MAX_ATTEMPTS;

  if (isWin) {
    handleGameFinished(true);
  } else if (isLoss) {
    handleGameFinished(false);
  } else {
    currentRow++;
    currentGuess = "";
    isAnimating = false;
    saveDailyProgress();
  }
}

function updateKeyboardStates() {
  const keyStatus = {};

  evaluations.forEach((evalRow, rIdx) => {
    const guessRow = guesses[rIdx];
    for (let c = 0; c < WORD_LENGTH; c++) {
      const letter = guessRow[c];
      const state = evalRow[c];
      const current = keyStatus[letter];

      if (state === 'correct') {
        keyStatus[letter] = 'correct';
      } else if (state === 'present' && current !== 'correct') {
        keyStatus[letter] = 'present';
      } else if (state === 'absent' && !current) {
        keyStatus[letter] = 'absent';
      }
    }
  });

  document.querySelectorAll('.key-btn').forEach(btn => {
    const key = btn.dataset.key;
    if (keyStatus[key]) {
      btn.classList.remove('correct', 'present', 'absent');
      btn.classList.add(keyStatus[key]);
    }
  });
}

/* ══════════════════════════════════════════════════════════
   APARICIONS I REACCIONS DE LA SASHA
   ══════════════════════════════════════════════════════════ */
function updateSashaReaction(evaluation) {
  const speech = document.getElementById('sasha-speech');
  if (!speech) return;

  const correctCount = evaluation.filter(s => s === 'correct').length;
  const presentCount = evaluation.filter(s => s === 'present').length;

  if (correctCount === WORD_LENGTH) {
    speech.textContent = "🏆 BRUTAL! Has descobert el mot secret! Ets un/a geni!";
  } else if (correctCount >= 4) {
    speech.textContent = "🔥 Ho tens gairebé fet! Només et falten un parell de tocs de nata!";
  } else if (correctCount >= 2 || presentCount >= 3) {
    speech.textContent = "✨ Vas per boníssim camí! L'olor del forn és irresistible!";
  } else if (presentCount >= 1) {
    speech.textContent = "💡 Tens ingredients que sonen bé, però cal canviar-los de lloc!";
  } else {
    speech.textContent = "🧁 Cap problema! Prova una altra combinació dolça d'ingredients!";
  }
}

/* ══════════════════════════════════════════════════════════
   FINAL DE PARTIDA I PUNTUACIÓ ACUMULATIVA
   ══════════════════════════════════════════════════════════ */
function calculatePoints(attempts, won) {
  if (!won) return 30; // Punts de consolació per participar
  const basePoints = {
    1: 1000,
    2: 800,
    3: 600,
    4: 400,
    5: 250,
    6: 150
  };
  return basePoints[attempts] || 100;
}

async function handleGameFinished(won) {
  isGameOver = true;
  isAnimating = false;

  const attemptsUsed = guesses.length;
  const baseEarned = calculatePoints(attemptsUsed, won);

  // Càlcul de la ràtxa (streak)
  let currentStreak = userStats.currentStreak || 0;
  if (won) {
    currentStreak += 1;
  } else {
    currentStreak = 0;
  }
  const streakBonus = won ? (currentStreak * 50) : 0;
  const todayTotalEarned = baseEarned + streakBonus;

  // Actualitzar estadístiques globals acumulatives
  userStats.daysPlayed = (userStats.daysPlayed || 0) + 1;
  if (won) {
    userStats.gamesWon = (userStats.gamesWon || 0) + 1;
    userStats.guessDistribution[attemptsUsed] = (userStats.guessDistribution[attemptsUsed] || 0) + 1;
  }
  userStats.currentStreak = currentStreak;
  userStats.maxStreak = Math.max(userStats.maxStreak || 0, currentStreak);
  userStats.totalScore = (userStats.totalScore || 0) + todayTotalEarned;

  userStats.history[todayData.data] = {
    won,
    attempts: attemptsUsed,
    points: todayTotalEarned,
    word: targetWordOriginal,
    date: todayData.data
  };

  // Guardar estat diari
  saveDailyProgress(true, won, todayTotalEarned);
  saveUserStats();

  // Animació de victòria si s'ha encertat
  if (won) {
    playVictoryFanfare();
    launchConfetti();
    const winningRow = document.getElementById(`row-${currentRow}`);
    if (winningRow) {
      winningRow.querySelectorAll('.wordle-tile').forEach((tile, idx) => {
        setTimeout(() => tile.classList.add('win-bounce'), idx * 80);
      });
    }
  }

  // Guardar a Firebase
  await persistScoreToFirebase(userStats.totalScore, todayTotalEarned, won);

  // Actualitzar HUD
  updateHudDisplay();

  // Mostrar modal de resultats després d'un breu retard
  setTimeout(() => {
    showResultModal(won, attemptsUsed, todayTotalEarned, streakBonus);
  }, 1400);
}

async function persistScoreToFirebase(totalScore, todayEarned, won) {
  if (!currentUser) return;
  try {
    // Desa al rànquing oficial de Firestore
    await saveScore(GAMES.MOTS_PASTISSERS, currentUser.uid, totalScore, currentProfile);

    // Metadades complementàries de Mots Pastissers
    const playerRef = doc(db, 'scores', GAMES.MOTS_PASTISSERS, 'players', currentUser.uid);
    await setDoc(playerRef, {
      streak: userStats.currentStreak || 0,
      daysPlayed: userStats.daysPlayed || 0,
      lastPlayedDate: todayData.data,
      history: userStats.history || {}
    }, { merge: true });
  } catch (e) {
    console.warn("Error guardant a Firebase:", e);
  }
}

/* ══════════════════════════════════════════════════════════
   ESTAT LOCALSTORAGE I SINCRONITZACIÓ
   ══════════════════════════════════════════════════════════ */
function getDailyStorageKey() {
  return `mots_pastissers_daily_${todayData.data}`;
}

function saveDailyProgress(isFinished = false, won = false, points = 0) {
  const payload = {
    date: todayData.data,
    guesses,
    evaluations,
    isGameOver: isFinished || isGameOver,
    won,
    points,
    targetWord: targetWordOriginal
  };
  try {
    localStorage.setItem(getDailyStorageKey(), JSON.stringify(payload));
  } catch (e) {}

  // Sincronitzar immediatament a Firestore perquè cap altre dispositiu pugui repetir
  if (currentUser) {
    try {
      const playerRef = doc(db, 'scores', GAMES.MOTS_PASTISSERS, 'players', currentUser.uid);
      setDoc(playerRef, {
        lastPlayedDate: todayData.data,
        todayProgress: payload
      }, { merge: true }).catch(err => {
        console.warn("Avís guardant progrés al núvol:", err);
      });
    } catch (e) {}
  }
}

function loadDailyProgress() {
  try {
    let localData = null;
    const raw = localStorage.getItem(getDailyStorageKey());
    if (raw) {
      try { localData = JSON.parse(raw); } catch (e) {}
    }

    // Comprovar si tenim progrés al núvol (Firestore) o a localStorage
    let data = null;
    if (cloudDailyProgress && cloudDailyProgress.date === todayData.data) {
      if (!localData || (cloudDailyProgress.isGameOver && !localData.isGameOver) || (cloudDailyProgress.guesses?.length || 0) >= (localData.guesses?.length || 0)) {
        data = cloudDailyProgress;
      } else {
        data = localData;
      }
    } else if (localData && localData.date === todayData.data) {
      data = localData;
    }

    if (data && data.date === todayData.data) {
      guesses = data.guesses || [];
      evaluations = data.evaluations || [];
      isGameOver = !!data.isGameOver;

      // Reconstruir l'estat a la graella
      evaluations.forEach((evalRow, rIdx) => {
        const guess = guesses[rIdx] || "";
        for (let c = 0; c < WORD_LENGTH; c++) {
          const tile = document.getElementById(`tile-${rIdx}-${c}`);
          if (tile) {
            tile.textContent = guess[c] || "";
            tile.classList.add(evalRow[c]);
          }
        }
      });

      updateKeyboardStates();

      if (isGameOver) {
        currentRow = guesses.length;
        const won = !!data.won;
        const points = data.points || 0;
        setTimeout(() => {
          showResultModal(won, guesses.length, points, 0, false);
        }, 500);
      } else {
        currentRow = guesses.length;
      }

      // Guardar a localStorage per mantenir el dispositiu actual actualitzat
      try {
        localStorage.setItem(getDailyStorageKey(), JSON.stringify(data));
      } catch (e) {}
      return true;
    }
  } catch (e) {}
  return false;
}

function loadUserStats() {
  try {
    const raw = localStorage.getItem('mots_pastissers_user_stats_v1');
    if (raw) {
      userStats = Object.assign(userStats, JSON.parse(raw));
    }
  } catch (e) {}
}

function saveUserStats() {
  try {
    localStorage.setItem('mots_pastissers_user_stats_v1', JSON.stringify(userStats));
  } catch (e) {}
}

function updateHudDisplay() {
  const streakEl = document.getElementById('hud-streak');
  const scoreEl = document.getElementById('hud-total-score');
  const daysEl = document.getElementById('hud-days-solved');

  if (streakEl) streakEl.textContent = `${userStats.currentStreak || 0} dies`;
  if (scoreEl) scoreEl.textContent = `${(userStats.totalScore || 0).toLocaleString()} pts`;
  if (daysEl) daysEl.textContent = `${userStats.gamesWon || 0}/28`;
}

/* ══════════════════════════════════════════════════════════
   MODALS: AJUDA I RESULTATS
   ══════════════════════════════════════════════════════════ */
function showResultModal(won, attempts, todayPoints, streakBonus, animate = true) {
  const modal = document.getElementById('modal-result');
  if (!modal) return;

  const titleEl = document.getElementById('result-title');
  const subtitleEl = document.getElementById('result-subtitle');
  const badgeEl = document.getElementById('result-badge');
  const wordEl = document.getElementById('result-word');
  const clueEl = document.getElementById('result-clue');
  const pointsEl = document.getElementById('result-today-points');
  const pointsCardEl = document.getElementById('points-earned-card');
  const streakBonusEl = document.getElementById('result-streak-bonus');
  const revealedBoxEl = document.querySelector('.revealed-word-box');
  const btnShare = document.getElementById('btn-share');

  if (isGameOver) {
    if (won) {
      if (titleEl) titleEl.textContent = "ENHORABONA! 🎉";
      if (subtitleEl) subtitleEl.textContent = `Has resolt el mot en ${attempts} ${attempts === 1 ? 'intent' : 'intents'}!`;
      if (badgeEl) badgeEl.textContent = "🏆";
    } else {
      if (titleEl) titleEl.textContent = "ÀNIMS! 🧁";
      if (subtitleEl) subtitleEl.textContent = "Avui no ha pogut ser, però demà tindràs una nova oportunitat!";
      if (badgeEl) badgeEl.textContent = "🍪";
    }

    if (revealedBoxEl) revealedBoxEl.style.display = 'block';
    if (wordEl) wordEl.textContent = targetWordOriginal;
    if (clueEl) clueEl.textContent = `"${todayData.pista}"`;

    if (pointsCardEl) pointsCardEl.style.display = 'block';
    if (pointsEl) pointsEl.textContent = `+${todayPoints.toLocaleString()} pts`;
    if (streakBonusEl) {
      if (streakBonus > 0) {
        streakBonusEl.textContent = `Bonus de ràtxa activa: +${streakBonus} pts 🔥`;
        streakBonusEl.style.display = 'block';
      } else {
        streakBonusEl.style.display = 'none';
      }
    }
    if (btnShare) btnShare.style.display = 'block';
  } else {
    // Si la partida encara està en curs (obert des del botó 📊 d'estadístiques)
    if (titleEl) titleEl.textContent = "ESTADÍSTIQUES 📊";
    if (subtitleEl) subtitleEl.textContent = "Partida en curs. Endevina el mot per veure la solució!";
    if (badgeEl) badgeEl.textContent = "🔠";

    // Ocultar completament la solució i els punts d'avui
    if (revealedBoxEl) revealedBoxEl.style.display = 'none';
    if (pointsCardEl) pointsCardEl.style.display = 'none';
    if (btnShare) btnShare.style.display = 'none';
  }

  // Actualitzar taula d'estadístiques
  const playedEl = document.getElementById('stat-played');
  const winPctEl = document.getElementById('stat-win-pct');
  const currStreakEl = document.getElementById('stat-curr-streak');
  const maxStreakEl = document.getElementById('stat-max-streak');

  const played = userStats.daysPlayed || 0;
  const wonCount = userStats.gamesWon || 0;
  const pct = played > 0 ? Math.round((wonCount / played) * 100) : 0;

  if (playedEl) playedEl.textContent = played;
  if (winPctEl) winPctEl.textContent = `${pct}%`;
  if (currStreakEl) currStreakEl.textContent = userStats.currentStreak || 0;
  if (maxStreakEl) maxStreakEl.textContent = userStats.maxStreak || 0;

  // Renderitzar distribució d'intents
  renderGuessDistribution(attempts, won);

  modal.classList.remove('hidden');
}

function renderGuessDistribution(highlightAttempt, won) {
  const container = document.getElementById('dist-bars');
  if (!container) return;
  container.innerHTML = '';

  const maxVal = Math.max(1, ...Object.values(userStats.guessDistribution || {}));

  for (let i = 1; i <= 6; i++) {
    const count = userStats.guessDistribution[i] || 0;
    const pct = Math.max(8, Math.round((count / maxVal) * 100));
    const isCurrent = won && highlightAttempt === i;

    const row = document.createElement('div');
    row.className = 'dist-bar-row';
    row.innerHTML = `
      <span class="dist-bar-num">${i}</span>
      <div class="dist-bar-fill ${isCurrent ? 'highlight' : ''}" style="width: ${pct}%">${count}</div>
    `;
    container.appendChild(row);
  }
}

/* ══════════════════════════════════════════════════════════
   COMPTE ENRERE FINS AL DIA SEGÜENT
   ══════════════════════════════════════════════════════════ */
function startCountdown() {
  const timerEl = document.getElementById('countdown-timer');
  if (!timerEl) return;

  function update() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const diff = tomorrow - now;

    if (diff <= 0) {
      timerEl.textContent = "00:00:00";
      return;
    }

    const hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
    const minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
    const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

    timerEl.textContent = `${hours}:${minutes}:${seconds}`;
  }

  update();
  setInterval(update, 1000);
}

/* ══════════════════════════════════════════════════════════
   COMPARTIR RESULTAT (EMOJIS)
   ══════════════════════════════════════════════════════════ */
function copyShareResult() {
  const emojiMap = {
    correct: '🟩',
    present: '🟨',
    absent:  '⬛'
  };

  const dayIndex = ALL_WORDS_DATA.findIndex(item => item.data === todayData.data);
  const puzzleNum = dayIndex >= 0 ? dayIndex + 1 : 1;
  const attemptsStr = isGameOver && evaluations.length > 0 && guesses[guesses.length-1] === targetWordNormalized 
    ? `${guesses.length}/6` 
    : 'X/6';

  let text = `🎂 Mots Pastissers #${puzzleNum} (${formatDateReadable(todayData.data)})\n`;
  text += `🏆 ${userStats.totalScore.toLocaleString()} pts | ${attemptsStr} intents\n`;
  text += `🔥 Ràtxa: ${userStats.currentStreak} dies\n\n`;

  evaluations.forEach(row => {
    text += row.map(st => emojiMap[st] || '⬛').join('') + '\n';
  });

  text += `\n🍰 Juga a l'Obrador Guadiana!`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Resultat copiat al porta-retalls!');
    }).catch(() => {
      showToast('No s’ha pogut copiar automàticament.');
    });
  } else {
    showToast('Còpia no suportada en aquest navegador.');
  }
}

/* ══════════════════════════════════════════════════════════
   CANVAS DE CONFETI
   ══════════════════════════════════════════════════════════ */
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#FFD700', '#FF8FAB', '#C94070', '#4CAF50', '#2196F3', '#FF9800'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      alpha: 1
    });
  }

  let animId;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4; // Gravetat
      p.rotation += p.vRot;
      p.alpha -= 0.012;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive) {
      animId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animId);
    }
  }

  render();
}

/* ══════════════════════════════════════════════════════════
   INICIALITZACIÓ PRINCIPAL I EVENTS
   ══════════════════════════════════════════════════════════ */
// Exposar funció de reinici per a proves
window.resetMotsPastissers = async function(resetAll = true) {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('mots_pastissers')) localStorage.removeItem(k);
  });
  if (currentUser) {
    try {
      const playerRef = doc(db, 'scores', GAMES.MOTS_PASTISSERS, 'players', currentUser.uid);
      await setDoc(playerRef, { todayProgress: null }, { merge: true });
    } catch (e) {}
  }
  window.location.href = window.location.pathname;
};

async function init() {
  selectTodayWord();

  // Suport per a reinici ràpid via paràmetre URL ?reset=1
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('reset')) {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('mots_pastissers')) localStorage.removeItem(k);
    });
    if (currentUser) {
      try {
        const playerRef = doc(db, 'scores', GAMES.MOTS_PASTISSERS, 'players', currentUser.uid);
        await setDoc(playerRef, { todayProgress: null }, { merge: true });
      } catch (e) {}
    }
    window.location.replace(window.location.pathname);
    return;
  }

  loadUserStats();
  buildBoard();
  buildKeyboard();
  updateHudDisplay();
  startCountdown();

  // Carregar diccionari en segon pla
  loadDictionary();

  // Carregar progrés diari si existeix (local o núvol)
  loadDailyProgress();

  // Teclat físic
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Enter') handleKeyPress('ENTER');
    else if (e.key === 'Backspace') handleKeyPress('BACKSPACE');
    else if (/^[a-zA-ZçÇàèéíòóúüïÀÈÉÍÒÓÚÜÏ]$/.test(e.key)) {
      handleKeyPress(e.key);
    }
  });

  // Botons modals i ajudes
  document.getElementById('btn-help')?.addEventListener('click', () => {
    document.getElementById('modal-help')?.classList.remove('hidden');
  });
  document.getElementById('btn-close-help')?.addEventListener('click', () => {
    document.getElementById('modal-help')?.classList.add('hidden');
  });
  document.getElementById('btn-help-ok')?.addEventListener('click', () => {
    document.getElementById('modal-help')?.classList.add('hidden');
  });

  document.getElementById('btn-stats')?.addEventListener('click', () => {
    showResultModal(isGameOver && guesses[guesses.length-1] === targetWordNormalized, guesses.length, 0, 0, false);
  });
  document.getElementById('btn-close-result')?.addEventListener('click', () => {
    document.getElementById('modal-result')?.classList.add('hidden');
  });

  document.getElementById('btn-share')?.addEventListener('click', copyShareResult);

  // Botó Pista Sasha
  document.getElementById('btn-hint-toggle')?.addEventListener('click', () => {
    const hintBox = document.getElementById('sasha-hint-box');
    if (hintBox) {
      hintBox.classList.toggle('hidden');
      playTone(550, 'sine', 0.15, 0.1);
    }
  });
}

/* ══════════════════════════════════════════════════════════
   AUTENTICACIÓ
   ══════════════════════════════════════════════════════════ */
selectTodayWord();

requireAuth('../../login.html?next=games/mots-pastissers/index.html')
  .then(async ({ user, profile }) => {
    currentUser = user;
    currentProfile = profile;
    renderNavbarUser(profile, user);

    // Sincronitzar amb Firebase si hi ha dades prèvies
    try {
      const scoreRef = doc(db, 'scores', GAMES.MOTS_PASTISSERS, 'players', user.uid);
      const snap = await getDoc(scoreRef);
      if (snap.exists()) {
        const remoteData = snap.data();
        if (remoteData.score > (userStats.totalScore || 0)) {
          userStats.totalScore = remoteData.score;
        }
        if (remoteData.streak > (userStats.currentStreak || 0)) {
          userStats.currentStreak = remoteData.streak;
        }
        if (remoteData.history) {
          userStats.history = Object.assign(userStats.history || {}, remoteData.history);
        }

        // Recuperar progrés o estat bloquejat d'avui des de Firestore
        if (remoteData.todayProgress && remoteData.todayProgress.date === todayData.data) {
          cloudDailyProgress = remoteData.todayProgress;
        } else if (remoteData.history && remoteData.history[todayData.data]) {
          const h = remoteData.history[todayData.data];
          cloudDailyProgress = {
            date: todayData.data,
            guesses: h.guesses || [],
            evaluations: h.evaluations || [],
            isGameOver: true,
            won: !!h.won,
            points: h.points || 0
          };
        }

        saveUserStats();
        updateHudDisplay();
      }
    } catch (e) {
      console.warn("Avís recuperant dades del núvol:", e);
    }

    init();
  })
  .catch(() => {
    init();
  });
