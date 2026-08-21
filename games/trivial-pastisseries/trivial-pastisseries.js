/**
 * trivial-pastisseries.js
 * Trivial Pastisseries del Barri — 40 preguntes, 6 a l'atzar per partida.
 * Màxim: 6 × (100 + 50 bonus de temps) = 900 pts
 */

import { onAuthReady, renderNavbarUser }
  from '../../assets/js/auth.js';
import { saveScore, getGameRanking, renderRankingTable,
         showNewRecordModal, unlockNextGame, GAMES }
  from '../../assets/js/ranking.js';

/* ══════════════════════════════════════════════
   40 PREGUNTES (del CSV trivial_pastisseries_sants.csv)
   format: { q, opts: [A,B,C,D], ans: índex 0-based }
   ══════════════════════════════════════════════ */
const ALL_QUESTIONS = [
  {
    q: 'A quin carrer estava situada la Pastisseria Polo?',
    opts: ['C/Constitució 38','C/Sants 119','C/Olzinelles 78','C/Cros 1'],
    ans: 0
  },
  {
    q: 'Quin any va obrir la Pastisseria Polo?',
    opts: ['1950','1960','1963','1934'],
    ans: 2
  },
  {
    q: "On havia après l'ofici el pare de la Trini Polo abans d'obrir el negoci?",
    opts: ['Bomboneria Pons','Casa Vives','Forn Baltà','Forn Esplugues'],
    ans: 1
  },
  {
    q: 'Quins productes de brioixeria destacaven a la Pastisseria Polo?',
    opts: ['Torrons i panellets','Croissants, ensaïmades, xuixos i melindros','Pa de pagès','Bombons i mones'],
    ans: 1
  },
  {
    q: 'Quin any va ser fundada la Bomboneria Pons?',
    opts: ['1919','1960','1895','1950'],
    ans: 1
  },
  {
    q: 'En quin barri va començar originalment la Bomboneria Pons?',
    opts: ['Hostafrancs','La Bordeta','Sants','Les Corts'],
    ans: 2
  },
  {
    q: 'Quantes generacions de la família han passat per la Bomboneria Pons?',
    opts: ['Dues','Tres','Quatre','Cinc'],
    ans: 1
  },
  {
    q: 'A quin carrer es va obrir la primera botiga de la Bomboneria Pons?',
    opts: ['C/Constitució','C/Olzinelles','C/Creu Coberta','C/Vallespir'],
    ans: 1
  },
  {
    q: 'Quin any va néixer Torrons Viar?',
    opts: ['1919','1934','1898','1950'],
    ans: 0
  },
  {
    q: 'Qui van ser els fundadors de Torrons Viar?',
    opts: ['Teresa Kessler i Josep Galimany','Ignasi Vidal i Montserrat Arderiu','La família Polo','Jordi Suñé'],
    ans: 1
  },
  {
    q: 'On es va instal·lar Torrons Viar a mitjan segle XX?',
    opts: ["Mercat d'Hostafrancs","Antiga Lleialtat Santsenca","Antiga Espanya Industrial","Estació de Sants"],
    ans: 1
  },
  {
    q: 'Quant de temps va tenir el taller i botiga Torrons Viar als baixos de l\'antiga Lleialtat Santsenca?',
    opts: ['Deu anys','Vint anys','Prop de cinquanta anys','Cent anys'],
    ans: 2
  },
  {
    q: 'A quin carrer està situat el Forn Baltà?',
    opts: ['c/Sants 119','c/Sants 74','c/Creu Coberta 141','C/Constitució 38'],
    ans: 0
  },
  {
    q: 'Quin any es va fundar el Forn Baltà?',
    opts: ['1919','1898','1963','1934'],
    ans: 3
  },
  {
    q: 'De què és un referent el Forn Baltà al barri de Sants?',
    opts: ['Dels bombons de xocolata','Del comerç artesà (pa i fleca)','Dels torrons de Nadal','De la pastisseria creativa'],
    ans: 1
  },
  {
    q: 'Casa Vives és considerada una pastisseria...',
    opts: ['Centenària (fundada el 1895)','De creació recent (2001)','Especialitzada només en pa','Molt petita, d\'una sola generació'],
    ans: 0
  },
  {
    q: 'Quina generació continua actualment al capdavant de Casa Vives?',
    opts: ['La segona','La tercera','La quarta','La cinquena'],
    ans: 2
  },
  {
    q: 'Quines tradicions combina actualment Casa Vives?',
    opts: ['Només fleca','Pastisseria, fleca i bomboneria','Torrons i xocolata calenta','Servei de càtering salat'],
    ans: 1
  },
  {
    q: 'A quin número del carrer de Sants està situada Casa Vives?',
    opts: ['16','53','74','119'],
    ans: 2
  },
  {
    q: 'Qui va fundar la Pastisseria Kessler Galimany?',
    opts: ['Ignasi Vidal i Montserrat Arderiu','Teresa Kessler i Josep Galimany','La família Suñé','Maria Rosa Giraut'],
    ans: 1
  },
  {
    q: 'Quin any va ser fundada la Pastisseria Kessler Galimany?',
    opts: ['1950','1960','1934','1898'],
    ans: 0
  },
  {
    q: 'Quan va tancar l\'establiment històric de Kessler Galimany del carrer de Sants, 53?',
    opts: ['Gener de 2022','Desembre de 2022','Abril de 2024','Any 2025'],
    ans: 2
  },
  {
    q: 'On manté avui la tradició la família Kessler Galimany (obert el 2001)?',
    opts: ['c/Cros 1','c/Olzinelles 31','c/Creu Coberta 17','c/Vallespir 65'],
    ans: 0
  },
  {
    q: 'Quin any va obrir el Forn Esplugues?',
    opts: ['1895','1898','1919','1934'],
    ans: 1
  },
  {
    q: 'Quants anys d\'activitat va acumular el Forn Esplugues al carrer de Sants?',
    opts: ['50 anys','100 anys','126 anys','140 anys'],
    ans: 2
  },
  {
    q: 'Com es deia el propietari del Forn Esplugues que es va jubilar el 2025?',
    opts: ['Josep Galimany','Ignasi Vidal','Jordi Suñé','Josep Baltà'],
    ans: 2
  },
  {
    q: 'Quantes generacions van formar part del Forn Esplugues?',
    opts: ['Dues','Tres','Quatre','Cinc'],
    ans: 2
  },
  {
    q: 'A prop de quin lloc emblemàtic estava situat el Forn Giraut?',
    opts: ["L'antiga Lleialtat Santsenca","El Mercat d'Hostafrancs","L'Estació de Sants","L'Espanya Industrial"],
    ans: 1
  },
  {
    q: 'Quants anys d\'història tenia aproximadament el Forn Giraut?',
    opts: ['100 anys','126 anys','140 anys','150 anys'],
    ans: 2
  },
  {
    q: 'Quan va tancar definitivament el Forn Giraut?',
    opts: ['Abril de 2024','Desembre de 2025','31 de desembre de 2022','Any 2001'],
    ans: 2
  },
  {
    q: 'Com es deia la propietària del Forn Giraut que es va jubilar?',
    opts: ['Maria Rosa','Trini','Teresa','Montserrat'],
    ans: 0
  },
  {
    q: 'Quina causa va motivar el tancament del Forn Giraut el 2022?',
    opts: ['Trasllat a un altre barri','Manca de relleu generacional','Problemes amb el local','Crisi econòmica'],
    ans: 1
  },
  {
    q: 'A quin carrer està situada la Pastisseria Abril?',
    opts: ['C/Constitució 38','C/Sants 119','C/Creu Coberta 17','C/Olzinelles 78'],
    ans: 2
  },
  {
    q: 'Per quin producte és especialment coneguda la Pastisseria Abril?',
    opts: ['Els panellets','Els melindros','Els xuixos','Les ensaïmades'],
    ans: 3
  },
  {
    q: 'De quin eix comercial és un dels establiments tradicionals la Pastisseria Abril?',
    opts: ['Eix comercial de Sants','Eix comercial de Creu Coberta','Eix de la Bordeta','Eix d\'Olzinelles'],
    ans: 1
  },
  {
    q: 'A prop de quins dos punts importants es troba el Forn Vallespir?',
    opts: ['Mercat de Sants i Casa Vives',"Estació de Sants i l'antiga Espanya Industrial","Lleialtat Santsenca i carrer de la Creu Coberta","Plaça de Sants i carrer Cros"],
    ans: 1
  },
  {
    q: 'Què té el Forn Vallespir que li permet mantenir una elaboració diària de productes?',
    opts: ['Obrador propi','Molts empleats','Dues sucursals','Distribució externa'],
    ans: 0
  },
  {
    q: 'Quins productes elabora diàriament el Forn Vallespir?',
    opts: ['Només pa i begudes','Bombons i mones de pasqua','Pa, brioixeria i productes de pastisseria','Torrons artesans'],
    ans: 2
  },
  {
    q: 'A quin número del carrer Vallespir es troba aquest forn?',
    opts: ['17','31','65','78'],
    ans: 2
  },
  {
    q: 'Quina pastisseria estava situada al carrer Constitució 38 i va obrir el 1963?',
    opts: ['Pastisseria Polo','Forn Baltà','Casa Vives','Kessler Galimany'],
    ans: 0
  },
];

/* ── Constants de joc ── */
const NUM_QUESTIONS  = 6;
const TIME_PER_Q     = 12;   // seg per pregunta
const PTS_CORRECT    = 100;
const PTS_TIME_BONUS = 400;  // màxim bonus per temps (proporcional) → màxim 3000 pts

/* ── Colors dels quesits ── */
const QUESIT_COLORS = ['#FF8FAB','#D4A017','#5DBB63','#42A5F5','#CE93D8','#FF7043'];

/* ── Estat ── */
let uid     = null;
let profile = null;
let questions   = [];   // 6 seleccionades i barrejades
let currentQIdx = 0;
let score       = 0;
let quesitsWon  = [];   // array de booleans (6)
let countdown   = null;
let timeLeft    = TIME_PER_Q;
let answered    = false;

/* ── Carregar rànquing i esperar botó d'inici ── */
loadRanking();

/* ── Auth en segon pla (per desar puntuació i mostrar avatar) ── */
onAuthReady((user, p) => {
  uid     = user?.uid || null;
  profile = p || null;
  renderNavbarUser(p, user);
});

/* ══════════════════════════════════════════════
   LÒGICA DEL JOC
   ══════════════════════════════════════════════ */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame() {
  // Seleccionar 6 preguntes a l'atzar
  questions = shuffle(ALL_QUESTIONS).slice(0, NUM_QUESTIONS);
  currentQIdx = 0;
  score = 0;
  quesitsWon = new Array(NUM_QUESTIONS).fill(false);

  // Reset visual quesits
  for (let i = 0; i < NUM_QUESTIONS; i++) {
    const el = document.getElementById('q' + i);
    if (el) {
      el.setAttribute('class', 'quesit');
      el.style.fill = '';
    }
  }

  document.getElementById('end-overlay').classList.add('hidden');
  const introEl = document.getElementById('intro-overlay');
  if (introEl) introEl.classList.add('hidden');
  
  document.getElementById('score').textContent = '0';
  showQuestion();
}

function showQuestion() {
  answered = false;
  timeLeft  = TIME_PER_Q;

  const q = questions[currentQIdx];
  document.getElementById('q-counter').textContent = `${currentQIdx + 1}/${NUM_QUESTIONS}`;
  document.getElementById('question-text').textContent = q.q;
  document.getElementById('timer').textContent = timeLeft;
  document.getElementById('timer').classList.remove('urgent');

  // Amagar feedback
  const fb = document.getElementById('feedback');
  fb.classList.add('hidden');

  // Construir respostes en ordre aleatori
  const indices = shuffle([0, 1, 2, 3]);
  const grid    = document.getElementById('answers-grid');
  grid.innerHTML = '';
  const labels  = ['A', 'B', 'C', 'D'];
  indices.forEach((origIdx, pos) => {
    const btn = document.createElement('button');
    btn.className = 'trivial-answer-btn';
    btn.textContent = `${labels[pos]}. ${q.opts[origIdx]}`;
    btn.dataset.orig = origIdx;
    btn.addEventListener('click', () => handleAnswer(origIdx, btn));
    grid.appendChild(btn);
  });

  // Temporitzador
  clearInterval(countdown);
  countdown = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;
    if (timeLeft <= 4) document.getElementById('timer').classList.add('urgent');
    if (timeLeft <= 0) {
      clearInterval(countdown);
      if (!answered) handleAnswer(-1, null); // temps esgotat
    }
  }, 1000);
}

function handleAnswer(origIdx, clickedBtn) {
  if (answered) return;
  answered = true;
  clearInterval(countdown);

  const q       = questions[currentQIdx];
  const correct = (origIdx === q.ans);

  // Destacar resposta correcta i (si escau) la incorrecta
  const allBtns = document.querySelectorAll('.trivial-answer-btn');
  allBtns.forEach(btn => {
    btn.disabled = true;
    if (parseInt(btn.dataset.orig) === q.ans) btn.classList.add('correct');
  });
  if (!correct && clickedBtn) clickedBtn.classList.add('wrong');

  // Feedback
  const fb     = document.getElementById('feedback');
  const fbIcon = document.getElementById('feedback-icon');
  const fbText = document.getElementById('feedback-text');

  if (correct) {
    const bonus = Math.round((timeLeft / TIME_PER_Q) * PTS_TIME_BONUS);
    const pts   = PTS_CORRECT + bonus;
    score += pts;
    quesitsWon[currentQIdx] = true;

    // Pintar quesit
    const qEl = document.getElementById('q' + currentQIdx);
    if (qEl) {
      qEl.style.fill = QUESIT_COLORS[currentQIdx];
      qEl.setAttribute('class', 'quesit pop');
      setTimeout(() => qEl.setAttribute('class', 'quesit'), 500);
    }

    fbIcon.textContent = '✅';
    fbText.textContent = `Correcte! +${pts} pts`;
    fb.style.background = '#B8F0D8';
  } else {
    fbIcon.textContent = origIdx === -1 ? '⏰' : '❌';
    fbText.textContent = origIdx === -1
      ? `Temps! Era: ${q.opts[q.ans]}`
      : `Incorrecte! Era: ${q.opts[q.ans]}`;
    fb.style.background = '#FFD6D6';
  }
  fb.classList.remove('hidden');

  document.getElementById('score').textContent = score.toLocaleString();

  // Avançar a la següent pregunta (o acabar)
  setTimeout(() => {
    currentQIdx++;
    if (currentQIdx < NUM_QUESTIONS) {
      showQuestion();
    } else {
      endGame();
    }
  }, 1800);
}

async function endGame() {
  const correct = quesitsWon.filter(Boolean).length;
  const emoji   = correct === NUM_QUESTIONS ? '🏆' : correct >= 4 ? '🧀' : correct >= 2 ? '🧁' : '🍪';
  const title   = correct === NUM_QUESTIONS
    ? 'Mestre Pastisser!'
    : correct >= 4 ? 'Gran coneixedor!'
    : correct >= 2 ? 'Bon intent!'
    : 'Estudia els plafons!';

  const subtitle = title === 'Estudia els plafons!' ? 'Aprenem sobre les pastisseries i forns històrics de Sants' : '';
  const subtitleEl = document.getElementById('end-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = subtitle;
    subtitleEl.style.display = subtitle ? 'block' : 'none';
  }

  document.getElementById('end-emoji').textContent = emoji;
  document.getElementById('end-title').textContent  = title;
  document.getElementById('end-score').textContent  = score.toLocaleString() + ' punts';
  document.getElementById('end-detail').textContent = `${correct} de ${NUM_QUESTIONS} respostes correctes`;

  // Punts quesits visuals al overlay
  const endQEl = document.getElementById('end-quesits');
  endQEl.innerHTML = quesitsWon.map((won, i) =>
    `<span class="end-quesit-dot ${won ? 'won' : 'lost'}" style="${won ? 'background:' + QUESIT_COLORS[i] : ''}"></span>`
  ).join('');

  document.getElementById('end-overlay').classList.remove('hidden');
  document.getElementById('feedback').classList.add('hidden');

  // Desar puntuació
  if (uid && profile && score > 0) {
    try {
      const isRecord = await saveScore(GAMES.TRIVIAL_PASTISSERIES, uid, score, profile);
      if (isRecord) {
        const ranking = await getGameRanking(GAMES.TRIVIAL_PASTISSERIES);
        const myRank  = ranking.findIndex(r => r.uid === uid) + 1;
        showNewRecordModal(score, myRank);
        await unlockNextGame(GAMES.TRIVIAL_PASTISSERIES, uid);
      }
    } catch (e) {}
  }
}

async function loadRanking() {
  try {
    const entries = await getGameRanking(GAMES.TRIVIAL_PASTISSERIES);
    renderRankingTable(entries, 'ranking-container', uid);
  } catch (e) {
    document.getElementById('ranking-container').innerHTML =
      '<p style="text-align:center;padding:1rem;color:var(--gray-400)">Configura Firebase per veure el rànquing</p>';
  }
}

/* ── Botons ── */
const btnStartGame = document.getElementById('btn-start-game');
if (btnStartGame) {
  btnStartGame.addEventListener('click', () => {
    startGame();
  });
}

document.getElementById('btn-restart').addEventListener('click', () => {
  clearInterval(countdown);
  startGame();
});
document.getElementById('btn-play-again').addEventListener('click', () => {
  clearInterval(countdown);
  startGame();
});
