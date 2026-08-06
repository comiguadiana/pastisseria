/**
 * bingo-musical.js — Sasha DJ Bingo Musical
 * Obrador Màgic Guadiana · Carrer Guadiana 2026
 *
 * Joc de trivia musical monojugador basat en llistes de Deezer amb
 * tolerància d'errors (Levenshtein), 20 segons per ronda, modes Cançó/Artista,
 * i integració completa amb el sistema de rànquings de l'Obrador.
 */

import { requireAuth, renderNavbarUser, showToast }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';
import { db } from '../../assets/js/firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─── Catàleg de Fallback en cas de problema de xarxa/CORS ─── */
const FALLBACK_TRACKS = [
  {
    id: 1,
    title: "Boig per tu",
    artist: "Sau",
    preview: "https://cdns-preview-d.dzcdn.net/stream/c-df1b997c6d66e7b1ba27ec6dcadbe6dc-4.mp3",
    cover: "../../assets/img/pasteles/pastis1.png"
  },
  {
    id: 2,
    title: "Despechá",
    artist: "Rosalía",
    preview: "https://cdns-preview-4.dzcdn.net/stream/c-473d09a25b1b46a7ea5779c943df36c0-6.mp3",
    cover: "../../assets/img/pasteles/pastis2.png"
  },
  {
    id: 3,
    title: "Tobogan",
    artist: "ZOO",
    preview: "https://cdns-preview-0.dzcdn.net/stream/c-0e704043b2fba9e64e52579dfd9e27c1-3.mp3",
    cover: "../../assets/img/pasteles/pastis3.png"
  },
  {
    id: 4,
    title: "Nochentera",
    artist: "Vicco",
    preview: "https://cdns-preview-5.dzcdn.net/stream/c-5cf1f39178ad52c084f73809ea64069c-6.mp3",
    cover: "../../assets/img/pasteles/pastis4.png"
  },
  {
    id: 5,
    title: "La Flaca",
    artist: "Jarabe de Palo",
    preview: "https://cdns-preview-b.dzcdn.net/stream/c-b715206ef7f53fec8a2fcdeec50f3fe6-4.mp3",
    cover: "../../assets/img/pasteles/pastis5.png"
  },
  {
    id: 6,
    title: "Coti x Coti",
    artist: "The Tyets",
    preview: "https://cdns-preview-2.dzcdn.net/stream/c-2fe4ea3b118b6e676ff31c4f4a3bfec6-4.mp3",
    cover: "../../assets/img/pasteles/pastis6.png"
  },
  {
    id: 7,
    title: "Bailando",
    artist: "Enrique Iglesias",
    preview: "https://cdns-preview-6.dzcdn.net/stream/c-6e695dca89635b7194f48ff79bb52f20-6.mp3",
    cover: "../../assets/img/pasteles/pastis7.png"
  },
  {
    id: 8,
    title: "Sense Tu",
    artist: "Teràpia de Shock",
    preview: "https://cdns-preview-8.dzcdn.net/stream/c-8a2bf6cb87b1c3132e6b223d6a89ae5c-4.mp3",
    cover: "../../assets/img/pasteles/pastis8.png"
  },
  {
    id: 9,
    title: "Tacones Rojos",
    artist: "Sebastián Yatra",
    preview: "https://cdns-preview-e.dzcdn.net/stream/c-eb9915998a44bbfb1513e9a562629b46-6.mp3",
    cover: "../../assets/img/pasteles/pastis9.png"
  },
  {
    id: 10,
    title: "Supermercat",
    artist: "Lildami",
    preview: "https://cdns-preview-7.dzcdn.net/stream/c-7b44781caee080ad095ce09b9365e6fc-4.mp3",
    cover: "../../assets/img/pasteles/pastis10.png"
  },
  {
    id: 11,
    title: "Vivir Mi Vida",
    artist: "Marc Anthony",
    preview: "https://cdns-preview-3.dzcdn.net/stream/c-3f9fffa3fa1b5eb97ea072d73352dfa7-6.mp3",
    cover: "../../assets/img/pasteles/pastis1.png"
  },
  {
    id: 12,
    title: "Bon Dia",
    artist: "Els Pets",
    preview: "https://cdns-preview-f.dzcdn.net/stream/c-fa315f6244f33161c7754f9a0c644ef8-4.mp3",
    cover: "../../assets/img/pasteles/pastis2.png"
  }
];

/* ─── Configuració del Joc ─── */
const ROUNDS_PER_GAME = 10;
const ROUND_TIME = 20; // 20 segons per ronda com demana l'usuari
const BASE_POINTS_CORRECT = 100;
const MAX_SPEED_BONUS = 100; // fins a 100 punts extres per velocitat (5 pts/segon)
const STREAK_BONUS = 25; // punts extres per cada ràtxa acumulada

/* ─── Diàlegs de Sasha DJ ─── */
const SASHA_QUOTES = {
  welcome: [
    "«A punt per a la millor sessió DJ de Sants? Tria el mode i comencem!»",
    "«Hola pastisser! Als plats d'avui tenim autèntics temacles!»",
    "«Posa't els auriculars i demostra la teva cultura musical!»"
  ],
  startRound: [
    "«Escolta amb atenció! Saps quin temacle és aquest?»",
    "«Pista en marxa! Posa a prova la teva oïda!»",
    "«Aquesta és boníssima! Endevines de qui o què es tracta?»",
    "«El vinil gira a 33 revolucions... Què està sonant?»"
  ],
  correctFast: [
    "«¡UAU! ¡Quina velocitat impressionant! +Bonus de temps!»",
    "«¡Increïble! ¡L'has clavat en un tres i no res!»",
    "«¡Oïda d'or! ¡Ni jo mateix hauria estat tan ràpid!»"
  ],
  correctNormal: [
    "«¡Correcte! ¡Molt ben trobat, pastisser!»",
    "«¡Bravíssim! Sumem punts a la teva sessió!»",
    "«¡Exacte! Aquesta no podia faltar a la festa!»"
  ],
  streak: [
    "«¡ESTÀS ON FIRE! 🔥 ¡Ràtxa imparable a la pista!»",
    "«¡Combo pastisser activat! ¡Multiplicant els punts!»",
    "«¡El Carrer Guadiana està vibrant amb els teus encerts!»"
  ],
  wrong: [
    "«¡Uix, no era aquesta! Però no perdis el ritme, som-hi!»",
    "«¡Casi! Era una mica difícil, a la següent ho petes!»",
    "«¡Llàstima! La música continua, ànims!»"
  ],
  timeout: [
    "«¡Temps esgotat! ⏰ Els 20 segons han volat!»",
    "«¡S'ha acabat el temps! Passem al següent tema!»",
    "«¡Ai, el rellotge no perdona! Concentració per a la propera!»"
  ],
  passed: [
    "«¡Passes paraula! Doncs anem directes al següent temacle!»",
    "«¡Següent pista! La festa no s'atura pas!»"
  ],
  finishGreat: [
    "«¡SESSIÓ BRUTAL! 🎉 ¡Quin espectacle has donat a la pista de ball!»",
    "«¡Ets un autèntic DJ de primer nivell! Enhorabona!»"
  ],
  finishGood: [
    "«¡Bona partida! Has fet ballar tot el barri de Sants!»",
    "«¡Molt bon intent! Continua practicant per superar el rècord!»"
  ]
};

function getRandomQuote(category) {
  const quotes = SASHA_QUOTES[category] || SASHA_QUOTES.startRound;
  return quotes[Math.floor(Math.random() * quotes.length)];
}

/* ─── API Deezer (JSONP) ─── */
const DeezerAPI = {
  extractPlaylistId(urlOrId) {
    if (!urlOrId) return null;
    const str = String(urlOrId).trim();
    if (/^[0-9]+$/.test(str)) return str;
    const match = str.match(/playlist\/([0-9]+)/) || str.match(/\/([0-9]{5,15})(\?|$)/);
    return match ? match[1] : null;
  },

  async fetchPlaylist(playlistId) {
    if (!playlistId) return [];
    const url = `https://api.deezer.com/playlist/${playlistId}&output=jsonp`;

    try {
      const data = await this.jsonp(url, 6000);
      if (!data || !data.tracks || !data.tracks.data) {
        console.warn("Deezer API no ha retornat tracks, usant fallback.");
        return [];
      }
      return data.tracks.data
        .filter(t => t.preview && t.preview.length > 0)
        .map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist.name,
          preview: t.preview,
          cover: t.album && t.album.cover_medium ? t.album.cover_medium : (t.album && t.album.cover_small ? t.album.cover_small : "../../assets/img/pasteles/pastis1.png")
        }));
    } catch (e) {
      console.warn("Error connectant amb Deezer JSONP:", e);
      return [];
    }
  },

  jsonp(url, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      const callbackName = 'deezer_cb_' + Math.floor(Math.random() * 1000000);
      let timer = null;

      window[callbackName] = (data) => {
        if (timer) clearTimeout(timer);
        delete window[callbackName];
        const scriptEl = document.getElementById(callbackName);
        if (scriptEl) scriptEl.remove();
        resolve(data);
      };

      const script = document.createElement('script');
      script.src = `${url}${url.indexOf('?') >= 0 ? '&' : '?'}callback=${callbackName}`;
      script.id = callbackName;

      script.onerror = () => {
        if (timer) clearTimeout(timer);
        delete window[callbackName];
        if (script.parentNode) script.remove();
        reject(new Error("Error carregant script Deezer JSONP"));
      };

      timer = setTimeout(() => {
        delete window[callbackName];
        if (script.parentNode) script.remove();
        reject(new Error("Timeout carregant Deezer JSONP"));
      }, timeoutMs);

      document.body.appendChild(script);
    });
  }
};

/* ─── Lògica de Tolerància i Neteja de Text (Levenshtein & Normalització) ─── */

/**
 * Neteja el títol de la cançó eliminant informació secundària:
 * parèntesis (remaster, feat, live, radio edit...), claudàtors, etc.
 */
function cleanSongTitle(str) {
  if (!str) return "";
  return str
    .replace(/\s*\([^)]*\)/gi, ' ')  // Elimina (feat. ...), (Remastered), etc.
    .replace(/\s*\[[^\]]*\]/gi, ' ') // Elimina [Live], [Radio Edit], etc.
    .replace(/feat\..*$/gi, ' ')      // Elimina feat. fins al final
    .replace(/ft\..*$/gi, ' ')
    .replace(/-\s*remaster.*$/gi, ' ')
    .replace(/-\s*radio edit.*$/gi, ' ')
    .replace(/-\s*live.*$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalitza una cadena: minúscules, treu diacrítics/accents, treu signes de puntuació
 */
function normalizeString(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Treu accents
    .replace(/[^a-z0-9\s]/g, " ")     // Canvia puntuació per espai
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Algorisme de distància de Levenshtein
 */
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Comprovació flexible amb tolerància d'errors (Fuzzy Match)
 */
function isAnswerCorrect(userText, targetText, isTitleMode = true) {
  if (!userText || !targetText) return false;

  const targetCleaned = isTitleMode ? cleanSongTitle(targetText) : targetText;
  const s1 = normalizeString(userText);
  const s2 = normalizeString(targetCleaned);

  if (!s1 || !s2) return false;

  // 1. Coincidència exacta o subcadena directa
  if (s1 === s2) return true;
  if (s1.length >= 3 && (s2.includes(s1) || s1.includes(s2))) return true;

  // 2. Coincidència per paraules clau (tokens)
  const words1 = s1.split(" ").filter(w => w.length > 2);
  const words2 = s2.split(" ").filter(w => w.length > 2);

  if (words1.length > 0 && words2.length > 0) {
    const commonWords = words1.filter(w => words2.includes(w));
    // Si ha encertat la majoria de paraules principals de la cançó/grup
    if (commonWords.length >= Math.ceil(words2.length * 0.7)) {
      return true;
    }
  }

  // 3. Distància de Levenshtein amb marge del 25% (mínim 1 error)
  const maxLen = Math.max(s1.length, s2.length);
  const threshold = Math.max(1, Math.floor(maxLen * 0.25));
  const dist = levenshtein(s1, s2);

  return dist <= threshold;
}

/* ─── Estat Global del Joc ─── */
let currentUser = null;
let currentProfile = null;
let bestScore = 0;

let gameState = {
  mode: 'title', // 'title' | 'artist'
  playlistId: '1116190041',
  playlistTracks: [],
  currentTracks: [],
  currentIndex: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  correctCount: 0,
  speedBonusTotal: 0,
  roundResults: [],
  timeLeft: ROUND_TIME,
  timerInterval: null,
  isPlaying: false,
  roundAnswered: false
};

/* ─── Elements del DOM ─── */
const lobbySection = document.getElementById('lobby-section');
const gameSection = document.getElementById('game-section');
const gameOverlay = document.getElementById('game-overlay');
const modalHelp = document.getElementById('modal-help');

const lobbySpeech = document.getElementById('lobby-speech');
const stageSpeech = document.getElementById('stage-speech');
const lobbyBestScore = document.getElementById('lobby-best-score');

const btnModeTitle = document.getElementById('btn-mode-title');
const btnModeArtist = document.getElementById('btn-mode-artist');
const playlistSelect = document.getElementById('playlist-preset-select');
const customPlaylistBox = document.getElementById('custom-playlist-box');
const customPlaylistInput = document.getElementById('custom-playlist-input');
const btnApplyCustom = document.getElementById('btn-apply-custom-playlist');

const hudRound = document.getElementById('hud-round');
const hudMode = document.getElementById('hud-mode');
const hudTimer = document.getElementById('hud-timer');
const hudStreak = document.getElementById('hud-streak');
const hudScore = document.getElementById('hud-score');
const timerProgressBar = document.getElementById('timer-progress-bar');
const btnExitGame = document.getElementById('btn-exit-game');

const audioPlayer = document.getElementById('audio-player');
const vinylRecord = document.getElementById('vinyl-record');
const equalizer = document.getElementById('equalizer');

const questionIcon = document.getElementById('question-icon');
const questionText = document.getElementById('question-text');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const btnClearInput = document.getElementById('btn-clear-input');
const btnSubmitAnswer = document.getElementById('btn-submit-answer');
const btnPass = document.getElementById('btn-pass');

const feedbackCard = document.getElementById('feedback-card');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackCover = document.getElementById('feedback-cover');
const feedbackSongName = document.getElementById('feedback-song-name');
const feedbackArtistName = document.getElementById('feedback-artist-name');
const btnNextTrack = document.getElementById('btn-next-track');

const overlayFinalScore = document.getElementById('overlay-final-score');
const pillCorrect = document.getElementById('pill-correct');
const pillSpeed = document.getElementById('pill-speed');
const pillStreak = document.getElementById('pill-streak');
const playedTracksList = document.getElementById('played-tracks-list');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnChangeMode = document.getElementById('btn-change-mode');

/* ─── Inicialització i Autenticació ─── */
requireAuth('../../login.html')
  .then(async ({ user, profile }) => {
    currentUser = user;
    currentProfile = profile;
    renderNavbarUser(profile, user);

    // Obtenir millor puntuació de Firebase
    try {
      const ref = doc(db, 'scores', GAMES.BINGO_MUSICAL, 'players', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().score > 0) {
        bestScore = snap.data().score;
      }
    } catch (e) {
      const localBest = parseInt(localStorage.getItem('obrador_best_bingo_musical') || '0', 10);
      bestScore = localBest;
    }

    if (lobbyBestScore) {
      lobbyBestScore.innerHTML = `Rècord personal: <strong>${bestScore.toLocaleString()} pts</strong>`;
    }

    // Carregar rànquing
    loadRanking();
    
    // Precàrrega de la llista per defecte
    preloadPlaylist(gameState.playlistId);
  })
  .catch(() => {});

/* ─── Precàrrega de Playlist ─── */
async function preloadPlaylist(playlistId) {
  try {
    const tracks = await DeezerAPI.fetchPlaylist(playlistId);
    if (tracks && tracks.length >= 5) {
      gameState.playlistTracks = tracks;
    } else {
      gameState.playlistTracks = [...FALLBACK_TRACKS];
    }
  } catch (e) {
    gameState.playlistTracks = [...FALLBACK_TRACKS];
  }
}

/* ─── Gestió de la Selecció de Playlist ─── */
playlistSelect.addEventListener('change', async (e) => {
  const val = e.target.value;
  if (val === 'custom') {
    customPlaylistBox.classList.remove('hidden');
    customPlaylistInput.focus();
  } else {
    customPlaylistBox.classList.add('hidden');
    gameState.playlistId = val;
    showToast("Carregant llista de Deezer...", "info");
    await preloadPlaylist(val);
    showToast("Llista carregada amb èxit!", "success");
  }
});

btnApplyCustom.addEventListener('click', async () => {
  const raw = customPlaylistInput.value.trim();
  const pId = DeezerAPI.extractPlaylistId(raw);
  if (!pId) {
    showToast("URL o ID de Deezer no vàlida", "error");
    return;
  }
  gameState.playlistId = pId;
  showToast("Carregant llista personalitzada...", "info");
  await preloadPlaylist(pId);
  showToast("Llista preparada per jugar!", "success");
});

/* ─── Començar Partida ─── */
btnModeTitle.addEventListener('click', () => startGame('title'));
btnModeArtist.addEventListener('click', () => startGame('artist'));

async function startGame(mode) {
  gameState.mode = mode;
  gameState.score = 0;
  gameState.streak = 0;
  gameState.maxStreak = 0;
  gameState.correctCount = 0;
  gameState.speedBonusTotal = 0;
  gameState.roundResults = [];
  gameState.currentIndex = 0;
  gameState.isPlaying = true;

  showToast("Preparant la sessió d'en Sasha DJ... 🎧", "info");

  // Assegurar que tenim pistes
  if (!gameState.playlistTracks || gameState.playlistTracks.length < 5) {
    await preloadPlaylist(gameState.playlistId);
  }

  // Barrejar i triar 10 cançons aleatòries
  const pool = [...gameState.playlistTracks].sort(() => Math.random() - 0.5);
  gameState.currentTracks = pool.slice(0, ROUNDS_PER_GAME);

  // Si no n'hi ha prou, duplicar / omplir amb fallback
  if (gameState.currentTracks.length < ROUNDS_PER_GAME) {
    const extra = [...FALLBACK_TRACKS].sort(() => Math.random() - 0.5);
    while (gameState.currentTracks.length < ROUNDS_PER_GAME && extra.length > 0) {
      gameState.currentTracks.push(extra.pop());
    }
  }

  // Canviar a pantalla de joc
  lobbySection.classList.add('hidden');
  gameOverlay.classList.add('hidden');
  gameSection.classList.remove('hidden');

  updateHUD();
  loadRound();
}

/* ─── Carregar Ronda ─── */
function loadRound() {
  if (gameState.currentIndex >= gameState.currentTracks.length) {
    endGame();
    return;
  }

  gameState.roundAnswered = false;
  gameState.timeLeft = ROUND_TIME;

  const track = gameState.currentTracks[gameState.currentIndex];

  // Actualitzar HUD
  updateHUD();

  // Reset Formulari & UI
  answerInput.value = "";
  answerInput.disabled = false;
  btnClearInput.classList.add('hidden');
  answerForm.classList.remove('hidden');
  feedbackCard.classList.add('hidden');
  
  // Text de la pregunta segons el mode
  if (gameState.mode === 'title') {
    hudMode.textContent = "🎵 CANÇÓ";
    questionIcon.textContent = "🎵";
    questionText.textContent = "Quin és el títol d'aquesta cançó?";
    answerInput.placeholder = "Escriu el nom de la cançó...";
  } else {
    hudMode.textContent = "🎤 ARTISTA";
    questionIcon.textContent = "🎤";
    questionText.textContent = "Qui canta o toca aquest tema?";
    answerInput.placeholder = "Escriu el nom del cantant o grup...";
  }

  // Bafarada de Sasha DJ
  stageSpeech.textContent = getRandomQuote('startRound');

  // Preparar àudio Deezer
  audioPlayer.src = track.preview;
  audioPlayer.currentTime = 0;

  // Gestió d'errors d'àudio (ex: preview caducada o bloqueig)
  audioPlayer.onerror = () => {
    console.warn("No s'ha pogut reproduir l'àudio de:", track.title);
    showToast("Àudio no disponible, passant cançó...", "info");
    if (!gameState.roundAnswered) {
      processAnswer("", true); // auto-pass
    }
  };

  // Reproduir
  const playPromise = audioPlayer.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      startVisualizers();
    }).catch(err => {
      console.warn("Autoplay impedit pel navegador:", err);
      stageSpeech.textContent = "«Clica a la pantalla si no sents la música!»";
    });
  }

  // Iniciar compte enrere de 20 segons
  startTimer();

  // Focus ràpid a l'input
  setTimeout(() => {
    answerInput.focus();
  }, 100);
}

/* ─── Control del Temporitzador (20s) ─── */
function startTimer() {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);

  updateTimerUI();

  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft--;
    updateTimerUI();

    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.timerInterval);
      if (!gameState.roundAnswered) {
        // Temps esgotat
        processAnswer("", false, true);
      }
    }
  }, 1000);
}

function updateTimerUI() {
  hudTimer.textContent = `${gameState.timeLeft}s`;
  const pct = (gameState.timeLeft / ROUND_TIME) * 100;
  timerProgressBar.style.width = `${pct}%`;

  if (gameState.timeLeft <= 5) {
    hudTimer.classList.add('warning');
    timerProgressBar.style.background = '#f44336';
  } else if (gameState.timeLeft <= 10) {
    hudTimer.classList.remove('warning');
    timerProgressBar.style.background = '#ff9800';
  } else {
    hudTimer.classList.remove('warning');
    timerProgressBar.style.background = 'linear-gradient(90deg, #4caf50 0%, #ffeb3b 60%, #f44336 100%)';
  }
}

/* ─── Visualitzadors (Vinil i Equalitzador) ─── */
function startVisualizers() {
  if (vinylRecord) vinylRecord.classList.add('spinning');
  if (equalizer) equalizer.classList.add('active');
}

function stopVisualizers() {
  if (vinylRecord) vinylRecord.classList.remove('spinning');
  if (equalizer) equalizer.classList.remove('active');
}

/* ─── Processar Resposta (Comprovació / Passar / Timeout) ─── */
function processAnswer(userAnswer, isPassed = false, isTimeout = false) {
  if (gameState.roundAnswered) return;
  gameState.roundAnswered = true;

  clearInterval(gameState.timerInterval);
  audioPlayer.pause();
  stopVisualizers();

  const track = gameState.currentTracks[gameState.currentIndex];
  const target = gameState.mode === 'title' ? track.title : track.artist;

  let isCorrect = false;
  let pointsEarned = 0;

  if (!isPassed && !isTimeout && userAnswer) {
    isCorrect = isAnswerCorrect(userAnswer, target, gameState.mode === 'title');
  }

  if (isCorrect) {
    // Càlcul de punts: Base (100) + Velocitat (5 pts per segon restant fins a 100) + Ràtxa
    const speedBonus = Math.max(0, Math.floor(gameState.timeLeft * 5));
    gameState.streak++;
    if (gameState.streak > gameState.maxStreak) {
      gameState.maxStreak = gameState.streak;
    }
    const streakBonus = Math.max(0, (gameState.streak - 1) * STREAK_BONUS);

    pointsEarned = BASE_POINTS_CORRECT + speedBonus + streakBonus;
    gameState.score += pointsEarned;
    gameState.correctCount++;
    gameState.speedBonusTotal += speedBonus;

    // Feedback de Sasha DJ
    if (gameState.streak >= 3) {
      stageSpeech.textContent = getRandomQuote('streak');
    } else if (gameState.timeLeft >= 15) {
      stageSpeech.textContent = getRandomQuote('correctFast');
    } else {
      stageSpeech.textContent = getRandomQuote('correctNormal');
    }

    showFeedbackUI(true, pointsEarned, track);
  } else {
    gameState.streak = 0;

    if (isTimeout) {
      stageSpeech.textContent = getRandomQuote('timeout');
    } else if (isPassed) {
      stageSpeech.textContent = getRandomQuote('passed');
    } else {
      stageSpeech.textContent = getRandomQuote('wrong');
    }

    showFeedbackUI(false, 0, track, isTimeout, isPassed);
  }

  // Guardar resultat de la ronda
  gameState.roundResults.push({
    track,
    userAnswer,
    isCorrect,
    pointsEarned
  });

  updateHUD();
}

/* ─── UI de Feedback ─── */
function showFeedbackUI(correct, points, track, isTimeout = false, isPassed = false) {
  answerForm.classList.add('hidden');
  feedbackCard.classList.remove('hidden');

  feedbackCover.src = track.cover || "../../assets/img/pasteles/pastis1.png";
  feedbackSongName.textContent = track.title;
  feedbackArtistName.textContent = `🎤 ${track.artist}`;

  if (correct) {
    feedbackCard.className = "feedback-card correct";
    feedbackIcon.textContent = "✅";
    feedbackTitle.textContent = `¡CORRECTE! +${points} punts`;
  } else {
    feedbackCard.className = "feedback-card wrong";
    feedbackIcon.textContent = isTimeout ? "⏰" : (isPassed ? "⏩" : "❌");
    feedbackTitle.textContent = isTimeout ? "¡TEMPS ESGOTAT!" : (isPassed ? "CANÇÓ PASSADA" : "¡INCORRECTE!");
  }

  if (gameState.currentIndex === gameState.currentTracks.length - 1) {
    btnNextTrack.textContent = "Veure Resultats Finals 🏆";
  } else {
    btnNextTrack.textContent = "Següent Cançó ▶";
  }

  btnNextTrack.focus();
}

/* ─── Esdeveniments d'Input i Formularis ─── */
answerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = answerInput.value.trim();
  if (val && !gameState.roundAnswered) {
    processAnswer(val);
  }
});

btnSubmitAnswer.addEventListener('click', () => {
  const val = answerInput.value.trim();
  if (val && !gameState.roundAnswered) {
    processAnswer(val);
  }
});

btnPass.addEventListener('click', () => {
  if (!gameState.roundAnswered) {
    processAnswer("", true);
  }
});

answerInput.addEventListener('input', () => {
  btnClearInput.classList.toggle('hidden', answerInput.value.length === 0);
});

btnClearInput.addEventListener('click', () => {
  answerInput.value = "";
  btnClearInput.classList.add('hidden');
  answerInput.focus();
});

btnNextTrack.addEventListener('click', () => {
  if (gameState.currentIndex < gameState.currentTracks.length - 1) {
    gameState.currentIndex++;
    loadRound();
  } else {
    endGame();
  }
});

/* ─── Actualitzar HUD ─── */
function updateHUD() {
  hudRound.textContent = `${gameState.currentIndex + 1}/${ROUNDS_PER_GAME}`;
  hudScore.textContent = gameState.score.toLocaleString();
  hudStreak.textContent = `🔥 x${gameState.streak}`;
}

/* ─── Fi de Partida ─── */
async function endGame() {
  gameState.isPlaying = false;
  clearInterval(gameState.timerInterval);
  audioPlayer.pause();
  stopVisualizers();

  // Calcular rècord
  const isNewRecord = gameState.score > bestScore;
  if (isNewRecord) {
    bestScore = gameState.score;
    try {
      localStorage.setItem('obrador_best_bingo_musical', String(bestScore));
    } catch (e) {}
  }

  // Renderitzar estadístiques al modal
  overlayFinalScore.textContent = `${gameState.score.toLocaleString()} pts`;
  pillCorrect.textContent = `🎯 ${gameState.correctCount}/${ROUNDS_PER_GAME} Encerts`;
  pillSpeed.textContent = `⚡ +${gameState.speedBonusTotal} pts velocitat`;
  pillStreak.textContent = `🔥 Màx ràtxa: ${gameState.maxStreak}`;

  // Desglossament de cançons jugades
  playedTracksList.innerHTML = "";
  gameState.roundResults.forEach(r => {
    const item = document.createElement('div');
    item.className = `played-track-item ${r.isCorrect ? 'correct-item' : 'wrong-item'}`;
    item.innerHTML = `
      <div class="played-track-info">
        <img src="${r.track.cover || '../../assets/img/pasteles/pastis1.png'}" class="played-track-cover" alt="Cover" />
        <div class="played-track-texts">
          <div class="played-track-title">${r.track.title}</div>
          <div class="played-track-artist">${r.track.artist}</div>
        </div>
      </div>
      <div class="played-track-badge">${r.isCorrect ? '✅ +' + r.pointsEarned : '❌'}</div>
    `;
    playedTracksList.appendChild(item);
  });

  gameOverlay.classList.remove('hidden');

  // Guardar puntuació a Firebase Firestore
  if (currentUser && currentProfile) {
    try {
      const isRecord = await saveScore(GAMES.BINGO_MUSICAL, currentUser.uid, gameState.score, currentProfile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.BINGO_MUSICAL);
        const myRank = ranking.findIndex(r => r.uid === currentUser.uid) + 1;
        showNewRecordModal(gameState.score, myRank);
        await unlockNextGame(GAMES.BINGO_MUSICAL, currentUser.uid);
      }
    } catch (e) {
      console.warn("Error desant puntuació de Bingo Musical:", e);
    }
  }

  // Recarregar rànquing
  loadRanking();
}

/* ─── Botons de Fi de Partida ─── */
btnPlayAgain.addEventListener('click', () => {
  gameOverlay.classList.add('hidden');
  startGame(gameState.mode);
});

btnChangeMode.addEventListener('click', () => {
  gameOverlay.classList.add('hidden');
  gameSection.classList.add('hidden');
  lobbySection.classList.remove('hidden');
  if (lobbyBestScore) {
    lobbyBestScore.innerHTML = `Rècord personal: <strong>${bestScore.toLocaleString()} pts</strong>`;
  }
});

btnExitGame.addEventListener('click', () => {
  if (confirm("Vols sortir de la partida actual?")) {
    clearInterval(gameState.timerInterval);
    audioPlayer.pause();
    stopVisualizers();
    gameSection.classList.add('hidden');
    lobbySection.classList.remove('hidden');
  }
});

/* ─── Modal d'Ajuda ─── */
document.getElementById('btn-open-help')?.addEventListener('click', () => {
  modalHelp.classList.remove('hidden');
});

document.getElementById('btn-close-help')?.addEventListener('click', () => {
  modalHelp.classList.add('hidden');
});

document.getElementById('btn-help-ok')?.addEventListener('click', () => {
  modalHelp.classList.add('hidden');
});

modalHelp?.addEventListener('click', (e) => {
  if (e.target === modalHelp) modalHelp.classList.add('hidden');
});

/* ─── Càrrega del Rànquing ─── */
async function loadRanking() {
  const container = document.getElementById('ranking-container');
  if (!container) return;

  try {
    const entries = await getGameRanking(GAMES.BINGO_MUSICAL);
    renderRankingTable(entries, 'ranking-container', currentUser?.uid || null);
  } catch (e) {
    container.innerHTML = '<p class="text-center" style="padding:1.5rem;color:var(--choco-light)">Configura Firebase per veure el rànquing.</p>';
  }
}
