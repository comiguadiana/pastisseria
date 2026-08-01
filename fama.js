/**
 * fama.js — Saló de la Fama: rankings general i per joc
 */

import { onAuthReady, renderNavbarUser, logout, getDiceBearUrl }
  from './assets/js/auth.js';
import { getGeneralRanking, getGameRanking, renderRankingTable, GAMES }
  from './assets/js/ranking.js';

const TAB_CONFIG = {
  'general':           { label:'🏆 Rànquing General',        fn: () => getGeneralRanking(20) },
  'pasteblock':        { label:'🧩 PasteBlock',               fn: () => getGameRanking(GAMES.PASTEBLOCK, 20) },
  'pastis-caigut':     { label:'🧺 Pastís Caigut',            fn: () => getGameRanking(GAMES.PASTIS_CAIGUT, 20) },
  'llanca-ensaimada':  { label:'🎯 Llança l\'Ensaïmada',      fn: () => getGameRanking(GAMES.LLANCA_ENSAIMADA, 20) },
  'memoria-pastissera':{ label:'🧠 Memòria Pastissera',       fn: () => getGameRanking(GAMES.MEMORIA_PASTISSERA, 20) },
  'pastis-perfecte':   { label:'🍰 Pastís Perfecte',          fn: () => getGameRanking(GAMES.PASTIS_PERFECTE, 20) },
  'caca-sasha':        { label:'<img src="assets/img/sasha.png" style="height: 1.2em; vertical-align: middle;"> Caça la Sasha!',           fn: () => getGameRanking(GAMES.CACA_SASHA, 20) },
  'raco-edurne':       { label:'🎸 El Racó de l\\'Edurne',    fn: () => getGameRanking(GAMES.RACO_EDURNE, 20) },
  'fusio-pastissera':  { label:'🎂 Fusió Pastissera',         fn: () => getGameRanking(GAMES.FUSIO_PASTISSERA, 20) },
};

let currentTab = 'general';
let myUid = null;

/* ── Auth ── */
onAuthReady((user, profile) => {
  myUid = user?.uid || null;
  renderNavbarUser(profile, user);
});

document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
  await logout();
  window.location.reload();
});

/* ── Pòdium top 3 ── */
async function loadPodium() {
  try {
    const entries = await getGeneralRanking(3);
    const podium  = document.getElementById('podium');

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
      const posIdx = i === 1 ? 0 : i === 0 ? 1 : 2; // posició real
      const medals = ['🥇','🥈','🥉'];
      const cssClass = ['podium-place podium-2','podium-place podium-1','podium-place podium-3'][i];
      const avatarUrl = getDiceBearUrl(e.avatarStyle || 'adventurer', e.avatarSeed || e.uid, 72);
      return `
        <div class="${cssClass}" style="animation: bounce-in 0.5s var(--ease-bounce) ${i*0.15}s both">
          <img class="podium-avatar" src="${avatarUrl}" alt="${e.displayName}" />
          <div class="podium-name">${e.displayName || 'Jugador'}</div>
          <div class="podium-score">${(e.totalScore || 0).toLocaleString()} pts</div>
          <div class="podium-block">${medals[e.rank - 1] || e.rank}</div>
        </div>`;
    }).join('');
  } catch(e) {
    document.getElementById('podium').innerHTML =
      '<p style="color:var(--choco-light);text-align:center;padding:2rem">Configura Firebase per veure el pòdium</p>';
  }
}

/* ── Ranking tabs ── */
async function loadTab(tabId) {
  currentTab = tabId;
  const config  = TAB_CONFIG[tabId];
  const titleEl = document.getElementById('ranking-title-bar');
  const bodyEl  = document.getElementById('ranking-body');

  titleEl.innerHTML = `<h3>${config.label}</h3>`;
  bodyEl.innerHTML  = '<div class="flex-center"><div class="spinner"></div></div>';

  try {
    const entries = await config.fn();
    renderRankingTable(entries, 'ranking-body', myUid);
  } catch(e) {
    bodyEl.innerHTML = '<p style="text-align:center;padding:1.5rem;color:var(--gray-400)">Configura Firebase per veure el rànquing</p>';
  }
}

/* ── Tab buttons ── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadTab(btn.dataset.tab);
  });
});

/* ── Init ── */
loadPodium();
loadTab('general');
