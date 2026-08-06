/**
 * fama.js — Saló de la Fama: estadístiques globals, partides jugades i rankings
 */

import { onAuthReady, renderNavbarUser, logout, getDiceBearUrl }
  from './assets/js/auth.js';
import { getGeneralRanking, getGameRanking, renderRankingTable, getGamesStats, GAMES }
  from './assets/js/ranking.js';

export const GAMES_INFO = {
  [GAMES.PASTEBLOCK]: {
    id: GAMES.PASTEBLOCK,
    tab: 'pasteblock',
    name: 'PasteBlock',
    icon: '🧩',
    htmlLabel: '🧩 PasteBlock',
    desc: 'Encaixa les peces de pastís a la graella',
    url: 'games/pasteblock/index.html',
    color: '#FF8FAB',
  },
  [GAMES.PASTIS_CAIGUT]: {
    id: GAMES.PASTIS_CAIGUT,
    tab: 'pastis-caigut',
    name: 'Pastís Caigut',
    icon: '🧺',
    htmlLabel: '🧺 Pastís Caigut',
    desc: 'Recull els dolços que cauen al teu cistell',
    url: 'games/pastis-caigut/index.html',
    color: '#FFD700',
  },
  [GAMES.LLANCA_ENSAIMADA]: {
    id: GAMES.LLANCA_ENSAIMADA,
    tab: 'llanca-ensaimada',
    name: "Llança l'Ensaïmada",
    icon: '🎯',
    htmlLabel: "🎯 Llança l'Ensaïmada",
    desc: 'Apunta i encistella les ensaïmades',
    url: 'games/llanca-ensaimada/index.html',
    color: '#FF7043',
  },
  [GAMES.MEMORIA_PASTISSERA]: {
    id: GAMES.MEMORIA_PASTISSERA,
    tab: 'memoria-pastissera',
    name: 'Memòria Pastissera',
    icon: '🧠',
    htmlLabel: '🧠 Memòria Pastissera',
    desc: 'Troba les parelles de dolços de la festa',
    url: 'games/memoria-pastissera/index.html',
    color: '#AB47BC',
  },
  [GAMES.PASTIS_PERFECTE]: {
    id: GAMES.PASTIS_PERFECTE,
    tab: 'pastis-perfecte',
    name: 'Pastís Perfecte',
    icon: '🍰',
    htmlLabel: '🍰 Pastís Perfecte',
    desc: 'Apila pisos de pastís amb precisió màxima',
    url: 'games/pastis-perfecte/index.html',
    color: '#26A69A',
  },
  [GAMES.CACA_SASHA]: {
    id: GAMES.CACA_SASHA,
    tab: 'caca-sasha',
    name: 'Caça la Sasha!',
    icon: '🐾',
    htmlLabel: '<img src="assets/img/sasha.png" style="height: 1.2em; vertical-align: middle;"> Caça la Sasha!',
    desc: 'Llança pastissos a la serp alienígena Sasha!',
    url: 'games/caca-sasha/index.html',
    color: '#FFA726',
  },
  [GAMES.RACO_EDURNE]: {
    id: GAMES.RACO_EDURNE,
    tab: 'raco-edurne',
    name: "El Racó de l'Edurne",
    icon: '🎸',
    htmlLabel: "🎸 El Racó de l'Edurne",
    desc: "Salva els planetes amb l'alienígena a l'espai",
    url: 'games/raco-edurne/index.html',
    color: '#EC407A',
  },
  [GAMES.FUSIO_PASTISSERA]: {
    id: GAMES.FUSIO_PASTISSERA,
    tab: 'fusio-pastissera',
    name: 'Fusió Pastissera',
    icon: '🎂',
    htmlLabel: '🎂 Fusió Pastissera',
    desc: 'Fusiona dolços per crear el gran pastís',
    url: 'games/suika-pastis/index.html',
    color: '#7E57C2',
  },
  [GAMES.PASTIS_BLAST]: {
    id: GAMES.PASTIS_BLAST,
    tab: 'pastis-blast',
    name: 'Pastis Blast',
    icon: '🧱',
    htmlLabel: '🧱 Pastis Blast',
    desc: 'Explota blocs dolços amb combos estratègics',
    url: 'games/pastis-blast/index.html',
    color: '#42A5F5',
  },
  [GAMES.KART_PASTISSER]: {
    id: GAMES.KART_PASTISSER,
    tab: 'kart-pastisser',
    name: 'Kart Pastisser',
    icon: '🛒',
    htmlLabel: '🛒 Kart Pastisser',
    desc: 'Cursa de carros esquivant bombes i rivals',
    url: 'games/kart-pastisser/index.html',
    color: '#EF5350',
  },
  [GAMES.SASHA_COMECOCOS]: {
    id: GAMES.SASHA_COMECOCOS,
    tab: 'sasha-comecocos',
    name: 'Sasha Menjamaracujàs',
    icon: '🍹',
    htmlLabel: '🍹 Sasha Menjamaracujàs',
    desc: 'Menja maracujàs i crea la llauna de te de maracujà',
    url: 'games/sasha-comecocos/index.html',
    color: '#FFA000',
  },
  [GAMES.MOTS_PASTISSERS]: {
    id: GAMES.MOTS_PASTISSERS,
    tab: 'mots-pastissers',
    name: 'Mots Pastissers',
    icon: '🔠',
    htmlLabel: '🔠 Mots Pastissers',
    desc: 'Endevina el mot secret de 6 lletres en el Wordle dolç del dia',
    url: 'games/mots-pastissers/index.html',
    color: '#E91E63',
  },
  [GAMES.SASHA_GO]: {
    id: GAMES.SASHA_GO,
    tab: 'sasha-go',
    name: 'Sasha GO: El Safari de Sants',
    icon: '🐾',
    htmlLabel: '<img src="assets/img/sashas/sasha_reial.png" style="height: 1.2em; vertical-align: middle;"> Sasha GO (GPS)',
    desc: 'Explora Sants amb geolocalització, llança pastissos i col·lecciona 16 Sashes alienígenes!',
    url: 'games/sasha-go/index.html',
    color: '#FF4081',
  },
  [GAMES.BINGO_MUSICAL]: {
    id: GAMES.BINGO_MUSICAL,
    tab: 'bingo-musical',
    name: 'Sasha DJ: Bingo Musical',
    icon: '🎧',
    htmlLabel: '<img src="assets/img/sashas/sasha_dj_auriculars.png" style="height: 1.2em; vertical-align: middle;"> Bingo Musical',
    desc: 'Endevina 10 cançons o artistes en 20 segons amb en Sasha DJ i les millors llistes de Deezer!',
    url: 'games/bingo-musical/index.html',
    color: '#9C27B0',
  },
};

const TAB_CONFIG = {
  'general':           { label:'🏆 Rànquing General',        fn: () => getGeneralRanking(200), isGeneral: true },
  'pasteblock':        { label:'🧩 PasteBlock',               fn: () => getGameRanking(GAMES.PASTEBLOCK, 200), gameId: GAMES.PASTEBLOCK },
  'pastis-caigut':     { label:'🧺 Pastís Caigut',            fn: () => getGameRanking(GAMES.PASTIS_CAIGUT, 200), gameId: GAMES.PASTIS_CAIGUT },
  'llanca-ensaimada':  { label:'🎯 Llança l\'Ensaïmada',      fn: () => getGameRanking(GAMES.LLANCA_ENSAIMADA, 200), gameId: GAMES.LLANCA_ENSAIMADA },
  'memoria-pastissera':{ label:'🧠 Memòria Pastissera',       fn: () => getGameRanking(GAMES.MEMORIA_PASTISSERA, 200), gameId: GAMES.MEMORIA_PASTISSERA },
  'pastis-perfecte':   { label:'🍰 Pastís Perfecte',          fn: () => getGameRanking(GAMES.PASTIS_PERFECTE, 200), gameId: GAMES.PASTIS_PERFECTE },
  'caca-sasha':        { label:'<img src="assets/img/sasha.png" style="height: 1.2em; vertical-align: middle;"> Caça la Sasha!', fn: () => getGameRanking(GAMES.CACA_SASHA, 200), gameId: GAMES.CACA_SASHA },
  'raco-edurne':       { label: "🎸 El Racó de l'Edurne",     fn: () => getGameRanking(GAMES.RACO_EDURNE, 200), gameId: GAMES.RACO_EDURNE },
  'fusio-pastissera':  { label:'🎂 Fusió Pastissera',         fn: () => getGameRanking(GAMES.FUSIO_PASTISSERA, 200), gameId: GAMES.FUSIO_PASTISSERA },
  'pastis-blast':      { label:'🧱 Pastis Blast',             fn: () => getGameRanking(GAMES.PASTIS_BLAST, 200), gameId: GAMES.PASTIS_BLAST },
  'kart-pastisser':    { label:'🛒 Kart Pastisser',           fn: () => getGameRanking(GAMES.KART_PASTISSER, 200), gameId: GAMES.KART_PASTISSER },
  'sasha-comecocos':   { label:'🍹 Sasha Menjamaracujàs',     fn: () => getGameRanking(GAMES.SASHA_COMECOCOS, 200), gameId: GAMES.SASHA_COMECOCOS },
  'mots-pastissers':   { label:'🔠 Mots Pastissers',          fn: () => getGameRanking(GAMES.MOTS_PASTISSERS, 200), gameId: GAMES.MOTS_PASTISSERS },
  'sasha-go':          { label:'🐾 Sasha GO: Safari de Sants', fn: () => getGameRanking(GAMES.SASHA_GO, 200), gameId: GAMES.SASHA_GO },
  'bingo-musical':     { label:'🎧 Sasha DJ: Bingo Musical',  fn: () => getGameRanking(GAMES.BINGO_MUSICAL, 200), gameId: GAMES.BINGO_MUSICAL },
};

let currentTab = 'general';
let myUid = null;
let cachedStats = null;

/* ── Auth ── */
onAuthReady((user, profile) => {
  myUid = user?.uid || null;
  renderNavbarUser(profile, user);
});

document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
  await logout();
  window.location.reload();
});

/* ── Estadístiques Globals i de Minijocs ── */
async function loadStats() {
  try {
    cachedStats = await getGamesStats();
    renderStatsBar(cachedStats);
    renderGameStatsGrid(cachedStats);
    updateActiveTabPlaysBadge();
  } catch (err) {
    console.warn('Error carregant estadístiques:', err);
    renderStatsBar({ totalPlays: 0, byGame: {} });
  }
}

function updateActiveTabPlaysBadge() {
  const badgeEl = document.querySelector('.tab-plays-badge');
  if (!badgeEl) return;

  if (currentTab === 'general') {
    const total = cachedStats?.totalPlays || 0;
    badgeEl.innerHTML = `🎮 <strong>${total.toLocaleString()}</strong> partides en total`;
  } else {
    const config = TAB_CONFIG[currentTab];
    if (config?.gameId) {
      const plays = cachedStats?.byGame?.[config.gameId] || 0;
      badgeEl.innerHTML = `🎮 <strong>${plays.toLocaleString()}</strong> ${plays === 1 ? 'partida' : 'partides'}`;
    }
  }
}

function renderStatsBar(stats) {
  const totalPlaysEl    = document.getElementById('stat-total-plays');
  const topGameEl       = document.getElementById('stat-top-game');
  const totalMinigamesEl = document.getElementById('stat-total-minigames');

  if (totalMinigamesEl) {
    totalMinigamesEl.textContent = Object.keys(GAMES_INFO).length;
  }

  const total = stats.totalPlays || 0;
  if (totalPlaysEl) {
    totalPlaysEl.textContent = total.toLocaleString();
  }

  // Trobar el joc més jugat
  let maxPlays = -1;
  let topGameName = 'Cap encara';
  let topGameIcon = '🎮';

  for (const [gId, info] of Object.entries(GAMES_INFO)) {
    const plays = stats.byGame[gId] || 0;
    if (plays > maxPlays && plays > 0) {
      maxPlays = plays;
      topGameName = info.name;
      topGameIcon = info.icon;
    }
  }

  if (topGameEl) {
    if (maxPlays > 0) {
      topGameEl.innerHTML = `
        <span class="top-game-name">${topGameIcon} ${escapeHtml(topGameName)}</span>
        <span class="top-game-badge">${maxPlays} ${maxPlays === 1 ? 'partida' : 'partides'}</span>
      `;
    } else {
      topGameEl.textContent = 'En joc! 🚀';
    }
  }
}

function renderGameStatsGrid(stats) {
  const grid = document.getElementById('game-stats-grid');
  if (!grid) return;

  const gamesList = Object.values(GAMES_INFO);
  
  grid.innerHTML = gamesList.map(info => {
    const plays = (stats?.byGame && stats.byGame[info.id]) ? stats.byGame[info.id] : 0;
    return `
      <div class="game-stat-item" data-tab="${info.tab}">
        <div class="game-stat-top">
          <span class="game-stat-badge-icon">${info.icon}</span>
          <span class="game-stat-plays-pill">🎮 <strong>${plays.toLocaleString()}</strong> ${plays === 1 ? 'partida' : 'partides'}</span>
        </div>
        <h4 class="game-stat-title">${info.name}</h4>
        <p class="game-stat-desc">${info.desc}</p>
        <div class="game-stat-actions">
          <button class="btn btn-ghost btn-sm select-tab-btn" data-tab="${info.tab}">🏆 Rànquing</button>
          <a href="${info.url}" class="btn btn-secondary btn-sm">▶ Jugar</a>
        </div>
      </div>
    `;
  }).join('');

  // Enllaçar clics als botons de rànquing
  grid.querySelectorAll('.select-tab-btn, .game-stat-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return; // Si clica a 'Jugar', deixa que navegui
      const tab = el.dataset.tab || el.closest('.game-stat-item')?.dataset.tab;
      if (tab) switchTab(tab);
    });
  });
}

/* ── Pòdium top 3 ── */
async function loadPodium() {
  const podium = document.getElementById('podium');
  if (!podium) return;

  try {
    const entries = await getGeneralRanking(3);

    if (!entries.length) {
      podium.innerHTML = '<p style="color:var(--choco-light);text-align:center;padding:2rem">Encara no hi ha jugadors al rànquing!</p>';
      return;
    }

    // Ordena: 2n, 1r, 3r (visual pòdium)
    const display = [entries[1], entries[0], entries[2]].filter(Boolean);
    const classes = entries.length > 1
      ? (entries[1] ? ['podium-place podium-2','podium-place podium-1','podium-place podium-3'] : ['','podium-place podium-1',''])
      : ['','podium-place podium-1',''];

    podium.innerHTML = display.map((e, i) => {
      if (!e) return '';
      const medals = ['🥇','🥈','🥉'];
      const cssClass = ['podium-place podium-2','podium-place podium-1','podium-place podium-3'][i];
      const avatarUrl = getDiceBearUrl(e.avatarStyle || 'adventurer', e.avatarSeed || e.uid, 72);
      return `
        <div class="${cssClass}" style="animation: bounce-in 0.5s var(--ease-bounce) ${i*0.15}s both">
          <img class="podium-avatar" src="${avatarUrl}" alt="${escapeHtml(e.displayName || 'Jugador')}" />
          <div class="podium-name">${escapeHtml(e.displayName || 'Jugador')}</div>
          <div class="podium-score">${(e.totalScore || 0).toLocaleString()} pts</div>
          <div class="podium-plays">${(e.gamesPlayed || 0).toLocaleString()} partides</div>
          <div class="podium-block">${medals[e.rank - 1] || e.rank}</div>
        </div>`;
    }).join('');
  } catch(e) {
    podium.innerHTML =
      '<p style="color:var(--choco-light);text-align:center;padding:2rem">Configura Firebase per veure el pòdium</p>';
  }
}

/* ── Ranking tabs ── */
async function loadTab(tabId) {
  currentTab = tabId;
  const config    = TAB_CONFIG[tabId];
  const titleEl   = document.getElementById('ranking-title-bar');
  const bodyEl    = document.getElementById('ranking-body');
  const statsSec  = document.getElementById('game-stats-section');
  const podiumSec = document.getElementById('podium-section');

  if (config.isGeneral) {
    if (statsSec)  statsSec.style.display = 'block';
    if (podiumSec) podiumSec.style.display = 'block';

    const totalPlays = cachedStats?.totalPlays || 0;
    titleEl.innerHTML = `
      <div class="flex flex-center gap-1">
        <h3>🏆 Rànquing General</h3>
      </div>
      <div class="tab-plays-badge">
        🎮 <strong>${totalPlays.toLocaleString()}</strong> partides en total
      </div>
    `;
  } else {
    if (statsSec)  statsSec.style.display = 'none';
    if (podiumSec) podiumSec.style.display = 'none';

    const gameInfo = GAMES_INFO[config.gameId];
    const gamePlays = (cachedStats?.byGame && cachedStats.byGame[config.gameId]) || 0;

    titleEl.innerHTML = `
      <div class="flex flex-center gap-1">
        <h3>${gameInfo ? gameInfo.htmlLabel : config.label}</h3>
      </div>
      <div class="flex flex-center gap-1 flex-wrap">
        <span class="tab-plays-badge">
          🎮 <strong>${gamePlays.toLocaleString()}</strong> ${gamePlays === 1 ? 'partida' : 'partides'}
        </span>
        ${gameInfo ? `<a href="${gameInfo.url}" class="btn btn-secondary btn-sm" style="padding:0.35rem 0.9rem">▶ Juga</a>` : ''}
      </div>
    `;
  }

  bodyEl.innerHTML = '<div class="flex-center"><div class="spinner"></div></div>';

  try {
    const entries = await config.fn();
    renderRankingTable(entries, 'ranking-body', myUid, { pageSize: 10, resetPage: true });
  } catch(e) {
    bodyEl.innerHTML = '<p style="text-align:center;padding:1.5rem;color:var(--gray-400)">Configura Firebase per veure el rànquing</p>';
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  loadTab(tabId);
  
  // Desplaçar suaument cap al rànquing si cliquem des de baix
  const content = document.querySelector('.ranking-content');
  if (content && window.scrollY > content.offsetTop) {
    content.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ── Tab buttons ── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Init ── */
async function init() {
  await Promise.all([loadStats(), loadPodium(), loadTab('general')]);
}
init();
