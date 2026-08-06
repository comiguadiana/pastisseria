/**
 * cartells.js — Lògica i generació dinàmica de cartells imprimibles A4
 * Festes de Sants 2026 · Carrer Guadiana
 */

// Llista dels 10 Cartells Temàtics de Sashes seleccionats (Sense Sasha Rei ni Easter Eggs)
const THEMATIC_SASHAS = [
  {
    id: 'sasha-dj',
    file: 'sasha_dj_auriculars.png',
    name: 'Sasha DJ',
    themeColor: '#7c3aed',
    themeAccent: '#c084fc',
    themeBg: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 40%, #ddd6fe 100%)',
    tag: '🎧 PISTA DE BALL & BINGO MUSICAL',
    title: 'BALLA AL RITME DE SANTS!',
    subtitle: "Posa a prova la teva oïda musical al nou minijoc d'en Sasha DJ!",
    speech: "«Tinc els plats preparats i els millors temacles a punt! Endevinaràs la cançó abans que s'acabin els 20 segons?»",
    ctaTitle: "ESCANEJA I VINE A LA PISTA!",
    ctaDesc: "Juga al Bingo Musical, encadena ràtxes i guanya la copa de millor oïda del carrer.",
    bullets: ["🎵 10 Temacles", "⏱️ 20 Segons", "🏆 Rànquing DJ"],
    navLabel: "🎧 Sasha DJ"
  },
  {
    id: 'sasha-xef',
    file: 'sasha_xef_gourmet.png',
    name: 'Sasha Xef Gourmet',
    themeColor: '#d97706',
    themeAccent: '#fcd34d',
    themeBg: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 40%, #fde68a 100%)',
    tag: '🍰 EL GRAN OBRADOR DOLÇ',
    title: "L'ART DEL PASTÍS PERFECTE",
    subtitle: "Endinsa't a la cuina màgica i fusiona dolços fins crear el gran pastís!",
    speech: "«Amb sucre, farina i una mica de màgia crearem els pastissos més alts de la Festa Major!»",
    ctaTitle: "TENS FUSTA DE PASTISSER?",
    ctaDesc: "Juga a Fusió Pastissera i Pastís Perfecte. Demostra la teva precisió!",
    bullets: ["🎂 Fusió Suika", "🍰 Pastís Perfecte", "🍓 Dolços"],
    navLabel: "🍰 Sasha Xef"
  },
  {
    id: 'sasha-explorador',
    file: 'sasha_explorador_safari.png',
    name: 'Sasha Explorador',
    themeColor: '#059669',
    themeAccent: '#6ee7b7',
    themeBg: 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 40%, #a7f3d0 100%)',
    tag: '🐾 SASHA GO: SAFARI DE SANTS',
    title: "CAÇA LES 42 SASHES!",
    subtitle: "Un safari interactiu amb GPS pels racons del Carrer Guadiana i Sants!",
    speech: "«Prepara el teu radar! Hi ha 42 variants de Sasha alienígena amagades. Les atraparàs totes?»",
    ctaTitle: "ACTIVA EL RADAR AL MÒBIL!",
    ctaDesc: "Camina pel carrer, detecta les Sashes en realitat augmentada i omple el teu àlbum.",
    bullets: ["📍 Geolocalització GPS", "👾 42 Sashes", "🎯 Llança Pastissos"],
    navLabel: "🐾 Sasha GO"
  },
  {
    id: 'sasha-futbolista',
    file: 'sasha_futbolista_guadiana.png',
    name: 'Sasha Futbolista',
    themeColor: '#dc2626',
    themeAccent: '#fca5a5',
    themeBg: 'linear-gradient(180deg, #fef2f2 0%, #fee2e2 40%, #fecaca 100%)',
    tag: '⚽ EL DERBI DE GUADIANA',
    title: "CAMPIONS DE LA FESTA MAJOR",
    subtitle: "Escala al número 1 del Saló de la Fama i aixeca la copa de campió!",
    speech: "«A Guadiana juguem en equip i amb passió! Aconseguiràs el rècord absolut de punts?»",
    ctaTitle: "SALTA AL TERRENY DE JOC!",
    ctaDesc: "Competeix contra tots els veïns i amics. El rànquing s'actualitza en temps real!",
    bullets: ["🏆 Saló de la Fama", "⚡ Rècords en Directe", "🥇 Medalles"],
    navLabel: "⚽ Sasha Futbol"
  },
  {
    id: 'sasha-rocker',
    file: 'sasha_rocker_guitarra.png',
    name: 'Sasha Rockera',
    themeColor: '#db2777',
    themeAccent: '#f472b6',
    themeBg: 'linear-gradient(180deg, #fdf2f8 0%, #fce7f3 40%, #fbcfe8 100%)',
    tag: '🎸 ROCK & RITME AL CARRER',
    title: "GUADIANA ROCK FEST!",
    subtitle: "La música i el millor ritme de la Festa Major sonen a tot volum!",
    speech: "«Endolla la guitarra i sent la vibració! El Carrer Guadiana és la pista més viva de Sants!»",
    ctaTitle: "AFINA EL TEU INSTRUMENT!",
    ctaDesc: "Balla, juga als minijocs musicals i gaudeix de la festa des del teu mòbil.",
    bullets: ["🎵 Hits & Clàssics", "🎸 Ritme Brutal", "🪩 Pista de Ball"],
    navLabel: "🎸 Sasha Rock"
  },
  {
    id: 'sasha-mag',
    file: 'sasha_mag_estrelles.png',
    name: "Sasha Mag d'Estrelles",
    themeColor: '#4f46e5',
    themeAccent: '#818cf8',
    themeBg: 'linear-gradient(180deg, #eef2ff 0%, #e0e7ff 40%, #c7d2fe 100%)',
    tag: '✨ MÀGIA I FANTASIA DOLÇA',
    title: "L'OBRADOR MÀGIC BRILLA",
    subtitle: "Encanteris, combos de pastissos a PasteBlock i sorpreses a cada cantonada!",
    speech: "«Abracadabra! Transforma el Carrer Guadiana en un món de fantasia i dolços màgics!»",
    ctaTitle: "DESCOBREIX ELS TRUCS!",
    ctaDesc: "Juga a PasteBlock i Pastis Blast creant combos màgics que faran explotar el marcador.",
    bullets: ["🧩 PasteBlock", "🧱 Pastis Blast", "✨ Punts Dobles"],
    navLabel: "✨ Sasha Mag"
  },
  {
    id: 'sasha-astronauta',
    file: 'sasha_astronauta_bandera.png',
    name: 'Sasha Astronauta',
    themeColor: '#0284c7',
    themeAccent: '#7dd3fc',
    themeBg: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 40%, #bae6fd 100%)',
    tag: '🚀 MISSIÓ ESPACIAL GUADIANA',
    title: "UNA FESTA D'UN ALTRE MÓN!",
    subtitle: "Els extraterrestres més dolços han aterrat a les Festes de Sants 2026!",
    speech: "«Houston, no tenim cap problema! Només tenim tones de diversió i pastissos!»",
    ctaTitle: "DESPEGA CAP A LA DIVERSIÓ!",
    ctaDesc: "14 minijocs arcade gratuïts per jugar des del teu mòbil sense instal·lar res.",
    bullets: ["📱 Sense Apps", "🌐 100% Web", "🎮 14 Minijocs"],
    navLabel: "🚀 Sasha Astro"
  },
  {
    id: 'sasha-bomber',
    file: 'sasha_bomber_extintor.png',
    name: 'Sasha Bomber',
    themeColor: '#ea580c',
    themeAccent: '#fdba74',
    themeBg: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 40%, #fed7aa 100%)',
    tag: '🚒 LA DIVERSIÓ MÉS FRESCA',
    title: "APAGA LA CALOR AMB JOCS!",
    subtitle: "Refresca't a la Terrassa Tropical i condueix el teu Kart Pastisser a tota velocitat!",
    speech: "«Alerta màxima de diversió! Recull dolços a Pastís Caigut i esquiva tots els obstacles!»",
    ctaTitle: "ACCIÓ FRESCOR A GUADIANA!",
    ctaDesc: "Recull tots els pastissos al teu cistell abans que toquin a terra. Ràpid i addictiu!",
    bullets: ["🧺 Pastís Caigut", "🛒 Kart Pastisser", "🍹 Menjamaracujàs"],
    navLabel: "🚒 Sasha Bomber"
  },
  {
    id: 'sasha-pirata',
    file: 'sasha_pirata_cofre.png',
    name: 'Sasha Pirata',
    themeColor: '#0f766e',
    themeAccent: '#5eead4',
    themeBg: 'linear-gradient(180deg, #f0fdfa 0%, #ccfbf1 40%, #99f6e4 100%)',
    tag: '🏴‍☠️ A LA RECERCA DEL TRESOR',
    title: "ELS SECRETS DE GUADIANA",
    subtitle: "Troba el cofre del tresor, els mots secrets del dia i els camins ocults del mapa!",
    speech: "«A l'abordatge, pastissers! Endevina la paraula del dia a Mots Pastissers i guanya el botí!»",
    ctaTitle: "TROBA EL TRESOR OCULT!",
    ctaDesc: "Posa a prova el teu enginy amb el Wordle català de 6 lletres dedicat a la festa.",
    bullets: ["🔠 Mots Pastissers", "🧠 Memòria Dolça", "🎯 Llança Ensaïmada"],
    navLabel: "🏴‍☠️ Sasha Pirata"
  },
  {
    id: 'sasha-detectiu',
    file: 'sasha_detectiu_lupa.png',
    name: 'Sasha Detectiu',
    themeColor: '#0284c7',
    themeAccent: '#38bdf8',
    themeBg: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 40%, #bae6fd 100%)',
    tag: '🔍 DETECTIU DE DOLÇOS & SECRETS',
    title: "INVESTIGA I GUANYA!",
    subtitle: "Troba totes les pistes, encerts i rànquings amagats als 14 minijocs!",
    speech: "«Amb la meva lupa trobarem tots els punts extres i combinacions secretes de l'Obrador!»",
    ctaTitle: "RESOL EL MISTERI DOLÇ!",
    ctaDesc: "Explora el mapa del Carrer Guadiana i completa tots els reptes del dia.",
    bullets: ["🔍 Pistes Ocultes", "🗺️ Mapa Interactiu", "🏆 Saló de la Fama"],
    navLabel: "🔍 Sasha Detectiu"
  }
];

// Estat
let currentActiveTab = 'general';
let defaultQrUrl = 'https://comiguadiana.github.io/pastisseria/';

// Elements DOM
const navContainer = document.getElementById('poster-tabs-nav');
const viewport = document.getElementById('posters-viewport');
const urlInput = document.getElementById('qr-target-url');
const btnPrintCurrent = document.getElementById('btn-print-current');
const btnPrintAll = document.getElementById('btn-print-all');

// Inicialitzar URL input
urlInput.value = defaultQrUrl;

/* ─── Renderitzar pestanyes de navegació ─── */
function renderNavTabs() {
  navContainer.innerHTML = '';

  // Tab 1: General
  const btnGeneral = document.createElement('button');
  btnGeneral.className = `poster-tab-btn ${currentActiveTab === 'general' ? 'active' : ''}`;
  btnGeneral.innerHTML = `🎂 Cartell General (14 Jocs)`;
  btnGeneral.addEventListener('click', () => switchTab('general'));
  navContainer.appendChild(btnGeneral);

  // Tab 2: 4 Minicartells Bingo Musical
  const btnMinicards = document.createElement('button');
  btnMinicards.className = `poster-tab-btn ${currentActiveTab === 'minicards-bingo' ? 'active' : ''}`;
  btnMinicards.innerHTML = `📇 4 Minicartells Bingo (Taules/Barra)`;
  btnMinicards.addEventListener('click', () => switchTab('minicards-bingo'));
  navContainer.appendChild(btnMinicards);

  // Tab 3: Cartell Especial Bingo Musical A4
  const btnBingoSpecial = document.createElement('button');
  btnBingoSpecial.className = `poster-tab-btn ${currentActiveTab === 'bingo-special' ? 'active' : ''}`;
  btnBingoSpecial.innerHTML = `🪩 Cartell Bingo Pista de Ball`;
  btnBingoSpecial.addEventListener('click', () => switchTab('bingo-special'));
  navContainer.appendChild(btnBingoSpecial);

  // Tabs Temàtics Sashes
  THEMATIC_SASHAS.forEach(item => {
    const btn = document.createElement('button');
    btn.className = `poster-tab-btn ${currentActiveTab === item.id ? 'active' : ''}`;
    btn.innerHTML = item.navLabel;
    btn.addEventListener('click', () => switchTab(item.id));
    navContainer.appendChild(btn);
  });
}

/* ─── Canviar de Pestanya ─── */
function switchTab(tabId) {
  currentActiveTab = tabId;
  renderNavTabs();

  // Actualitzar visibilitat basada en classes CSS
  const sheets = document.querySelectorAll('.poster-sheet');
  sheets.forEach(sheet => {
    if (sheet.dataset.id === tabId) {
      sheet.classList.add('active-sheet', 'active-print');
    } else {
      sheet.classList.remove('active-sheet', 'active-print');
    }
  });

  const activeSheet = document.querySelector(`.poster-sheet[data-id="${tabId}"]`);
  if (activeSheet) {
    activeSheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ─── Renderitzar Tots els Cartells a la Pantalla ─── */
function renderAllPosters() {
  viewport.innerHTML = '';

  // 1. CARTELL GENERAL OFICIAL (AMB QR GEGANT)
  const generalSheet = document.createElement('div');
  generalSheet.className = 'poster-sheet poster-general';
  generalSheet.dataset.id = 'general';
  generalSheet.innerHTML = `
    <div class="poster-frame"></div>
    <div class="poster-map-bg"></div>

    <!-- Capçalera -->
    <div class="general-header">
      <div class="poster-badge-top">★ FESTES DE SANTS 2026 · CARRER GUADIANA ★</div>
      <h1 class="general-main-title">OBRADOR MÀGIC<br/>GUADIANA</h1>
      <div class="general-subtitle">🎮 La Gran Plataforma de Minijocs del Nostre Carrer! 🍰</div>
    </div>

    <!-- Imatge Hero amb Portalada Pixelada i Sasha -->
    <div class="general-hero-section">
      <div class="general-hero-wrapper">
        <img src="assets/img/login_pixel_bg.png" alt="Portalada Guadiana" class="general-hero-bg" />
        <img src="assets/img/sasha.png" alt="Sasha" class="general-sasha-overlay" />
        <div class="general-hero-ribbon">
          ✨ VINE AL CARRER GUADIANA I JUGA DES DEL TEU MÒBIL!
        </div>
      </div>
    </div>

    <!-- Grid Central: Minijocs + Codi QR GEGANT -->
    <div class="general-middle-grid">
      
      <!-- Caixa de Característiques -->
      <div class="features-box">
        <div class="feature-item">
          <div class="feature-icon">🎮</div>
          <div class="feature-text">
            <h4>14 MINIJOCS ARCADE</h4>
            <p>Bingo Musical, PasteBlock, Pastís Caigut, Mots...</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🐾</div>
          <div class="feature-text">
            <h4>SASHA GO (GPS SAFARI)</h4>
            <p>Atrapa les 42 Sashes amagades pel barri!</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🏆</div>
          <div class="feature-text">
            <h4>SALÓ DE LA FAMA</h4>
            <p>Guanya punts i puja al podi de la Festa Major!</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📱</div>
          <div class="feature-text">
            <h4>100% GRATUÏT I SENSE APP</h4>
            <p>Només has d'escanejar el codi i jugar a l'instant.</p>
          </div>
        </div>
      </div>

      <!-- Codi QR Card GEGANT -->
      <div class="qr-card-box">
        <div class="qr-callout-top">⚡ ESCANEJA I JUGA ARA! ⚡</div>
        <div class="qr-canvas-holder" id="qr-general"></div>
        <div class="qr-url-text" id="qr-url-display-general">comiguadiana.github.io/pastisseria</div>
        <div class="qr-free-tag">★ TOTALMENT GRATUÏT ★</div>
      </div>

    </div>

    <!-- Ticker de jocs disponibles -->
    <div class="general-games-ticker">
      <span class="ticker-title">🎂 14 MINIJOCS DISPONIBLES:</span>
      <div class="ticker-badges">
        <span class="ticker-pill">🎧 Bingo Musical</span>
        <span class="ticker-pill">🧩 PasteBlock</span>
        <span class="ticker-pill">🧺 Pastís Caigut</span>
        <span class="ticker-pill">🛒 Kart</span>
        <span class="ticker-pill">🔠 Mots</span>
      </div>
    </div>

    <!-- Peu del Cartell Oficial -->
    <div class="poster-footer">
      <span>Comissió de Festes del Carrer Guadiana</span>
      <span>🍰 Festes de Sants 2026 🍰</span>
      <span>Joc Web Oficial</span>
    </div>
  `;
  viewport.appendChild(generalSheet);

  // 2. FULL DE 4 MINICARTELLS / FLYERS (2x2 amb línies de tall)
  const minicardsSheet = document.createElement('div');
  minicardsSheet.className = 'poster-sheet poster-minicards';
  minicardsSheet.dataset.id = 'minicards-bingo';
  //minicardsSheet.style.display = 'none';
  minicardsSheet.innerHTML = `
    <div class="cut-line-v"></div>
    <div class="cut-line-h"></div>
    <div class="cut-badge-center">✂️</div>

    <!-- Card 1 -->
    <div class="minicard-box">
      <div class="minicard-map-bg"></div>
      <div class="minicard-header">
        <span class="minicard-badge">★ FESTES DE SANTS 2026 ★</span>
        <div class="minicard-title">🎧 BINGO MUSICAL</div>
        <div class="minicard-subtitle">Carrer Guadiana · Pista de Ball</div>
      </div>
      <div class="minicard-body">
        <img src="assets/img/sashas/sasha_dj_auriculars.png" alt="Sasha DJ" class="minicard-sasha-img" />
        <div class="minicard-qr-wrap">
          <div class="qr-canvas-box" id="qr-mini-1"></div>
          <span class="minicard-qr-label">ESCANEJA</span>
        </div>
      </div>
      <div class="minicard-footer">
        <div class="minicard-rules">⏱️ 20 segons per encertar la cançó! 🎵</div>
        <div class="minicard-url" id="qr-mini-url-1">comiguadiana.github.io/pastisseria</div>
      </div>
    </div>

    <!-- Card 2 -->
    <div class="minicard-box">
      <div class="minicard-map-bg"></div>
      <div class="minicard-header">
        <span class="minicard-badge">★ FESTES DE SANTS 2026 ★</span>
        <div class="minicard-title">🎧 BINGO MUSICAL</div>
        <div class="minicard-subtitle">Carrer Guadiana · Pista de Ball</div>
      </div>
      <div class="minicard-body">
        <img src="assets/img/sashas/sasha_dj_auriculars.png" alt="Sasha DJ" class="minicard-sasha-img" />
        <div class="minicard-qr-wrap">
          <div class="qr-canvas-box" id="qr-mini-2"></div>
          <span class="minicard-qr-label">ESCANEJA</span>
        </div>
      </div>
      <div class="minicard-footer">
        <div class="minicard-rules">⏱️ 20 segons per encertar la cançó! 🎵</div>
        <div class="minicard-url" id="qr-mini-url-2">comiguadiana.github.io/pastisseria</div>
      </div>
    </div>

    <!-- Card 3 -->
    <div class="minicard-box">
      <div class="minicard-map-bg"></div>
      <div class="minicard-header">
        <span class="minicard-badge">★ FESTES DE SANTS 2026 ★</span>
        <div class="minicard-title">🎧 BINGO MUSICAL</div>
        <div class="minicard-subtitle">Carrer Guadiana · Pista de Ball</div>
      </div>
      <div class="minicard-body">
        <img src="assets/img/sashas/sasha_dj_auriculars.png" alt="Sasha DJ" class="minicard-sasha-img" />
        <div class="minicard-qr-wrap">
          <div class="qr-canvas-box" id="qr-mini-3"></div>
          <span class="minicard-qr-label">ESCANEJA</span>
        </div>
      </div>
      <div class="minicard-footer">
        <div class="minicard-rules">⏱️ 20 segons per encertar la cançó! 🎵</div>
        <div class="minicard-url" id="qr-mini-url-3">comiguadiana.github.io/pastisseria</div>
      </div>
    </div>

    <!-- Card 4 -->
    <div class="minicard-box">
      <div class="minicard-map-bg"></div>
      <div class="minicard-header">
        <span class="minicard-badge">★ FESTES DE SANTS 2026 ★</span>
        <div class="minicard-title">🎧 BINGO MUSICAL</div>
        <div class="minicard-subtitle">Carrer Guadiana · Pista de Ball</div>
      </div>
      <div class="minicard-body">
        <img src="assets/img/sashas/sasha_dj_auriculars.png" alt="Sasha DJ" class="minicard-sasha-img" />
        <div class="minicard-qr-wrap">
          <div class="qr-canvas-box" id="qr-mini-4"></div>
          <span class="minicard-qr-label">ESCANEJA</span>
        </div>
      </div>
      <div class="minicard-footer">
        <div class="minicard-rules">⏱️ 20 segons per encertar la cançó! 🎵</div>
        <div class="minicard-url" id="qr-mini-url-4">comiguadiana.github.io/pastisseria</div>
      </div>
    </div>
  `;
  viewport.appendChild(minicardsSheet);

  // 3. CARTELL ESPECIAL BINGO MUSICAL A4 (PISTA DE BALL)
  const bingoSpecialSheet = document.createElement('div');
  bingoSpecialSheet.className = 'poster-sheet poster-bingo-special';
  bingoSpecialSheet.dataset.id = 'bingo-special';
 // bingoSpecialSheet.style.display = 'none';
  bingoSpecialSheet.innerHTML = `
    <div class="poster-frame"></div>
    <div class="poster-map-bg"></div>

    <!-- Capçalera Especial -->
    <div class="thematic-header">
      <div class="poster-badge-top" style="background:#7c3aed; color:#fff; border-color:#f59e0b;">★ PISTA DE BALL · CARRER GUADIANA ★</div>
      <h1 class="thematic-title" style="color:#fbbf24; font-size: 1.8rem; text-shadow: 3px 3px 0px #ec4899;">🎧 BINGO MUSICAL</h1>
      <div class="thematic-subtitle" style="color:#e9d5ff;">Posa a prova la teva oïda musical al ritme de la Festa Major!</div>
    </div>

    <!-- Sasha DJ Stage Gran -->
    <div class="thematic-character-stage" style="height: 330px;">
      <div class="character-sunburst" style="background: radial-gradient(circle, #ec4899 0%, rgba(255,255,255,0) 70%);"></div>
      <div class="character-sunburst-rays" style="background: repeating-conic-gradient(from 0deg, #ec4899 0deg 15deg, transparent 15deg 30deg);"></div>
      <img src="assets/img/sashas/sasha_dj_auriculars.png" alt="Sasha DJ" class="thematic-sasha-img" style="height: 290px;" />
      <div class="character-name-plate" style="border-color:#fbbf24; background:#1e1035;">Sasha DJ Presentador</div>
    </div>

    <!-- Bafarada DJ -->
    <div class="thematic-speech-bubble" style="border-color:#fbbf24; background:#2e1065; color:#fff; box-shadow: 4px 4px 0px #ec4899;">
      «Tinc 10 temacles a punt! Endevina el títol o l'artista en menys de 20 segons!»
    </div>

    <!-- Bloc d'Acció & QR GEGANT -->
    <div class="thematic-bottom-box" style="border-color:#fbbf24; background: rgba(30, 16, 53, 0.95); color: #fff;">
      <div class="thematic-cta-text">
        <h3 style="color:#fbbf24; font-size: 0.95rem;">⚡ ESCANEJA I JUGA ARA!</h3>
        <p style="color:#e9d5ff; font-size: 0.92rem;">Partides ràpides de 10 cançons. Puja al podi dels millors oïdors de Sants!</p>
        <div class="thematic-bullets" style="color:#fbcfe8;">
          <span>⏱️ 20 Segons</span>
          <span>🎵 Hits & Clàssics</span>
          <span>🏆 Saló de la Fama</span>
        </div>
      </div>

      <div class="thematic-qr-holder" style="border-color:#fbbf24; box-shadow: 4px 4px 0px #ec4899;">
        <div class="qr-canvas-box" id="qr-bingo-special"></div>
        <span style="font-size:0.5rem; color:#2e1065;">ESCANEJA I JUGA</span>
        <div class="thematic-url-text" id="qr-url-bingo-special">comiguadiana.github.io/pastisseria</div>
      </div>
    </div>

    <!-- Peu -->
    <div class="poster-footer">
      <span>Carrer Guadiana · Obrador Màgic</span>
      <span>Festes de Sants 2026</span>
      <span>Accés lliure i gratuït</span>
    </div>
  `;
  viewport.appendChild(bingoSpecialSheet);

  // 4. ELS 10 CARTELLS TEMÀTICS DE SASHAS (AMB QR GRAN I MAPA DE FONS)
  THEMATIC_SASHAS.forEach(item => {
    const thematicSheet = document.createElement('div');
    thematicSheet.className = 'poster-sheet poster-thematic';
    thematicSheet.dataset.id = item.id;
    thematicSheet.style.setProperty('--theme-color', item.themeColor);
    thematicSheet.style.setProperty('--theme-accent', item.themeAccent);
    thematicSheet.style.setProperty('--theme-bg', item.themeBg);
    //thematicSheet.style.display = 'none';

    thematicSheet.innerHTML = `
      <div class="poster-frame"></div>
      <div class="poster-map-bg"></div>

      <!-- Capçalera Temàtica -->
      <div class="thematic-header">
        <div class="thematic-tag" style="background:${item.themeColor}">★ FESTES DE SANTS 2026 · CARRER GUADIANA ★</div>
        <h1 class="thematic-title" style="color:${item.themeColor}">${item.title}</h1>
        <div class="thematic-subtitle">${item.subtitle}</div>
      </div>

      <!-- Sasha Showcase Central -->
      <div class="thematic-character-stage">
        <div class="character-sunburst" style="background: radial-gradient(circle, ${item.themeAccent} 0%, rgba(255,255,255,0) 70%);"></div>
        <div class="character-sunburst-rays" style="background: repeating-conic-gradient(from 0deg, ${item.themeAccent} 0deg 15deg, transparent 15deg 30deg);"></div>
        <img src="assets/img/sashas/${item.file}" alt="${item.name}" class="thematic-sasha-img" />
        <div class="character-name-plate" style="border-color:${item.themeAccent}">${item.name}</div>
      </div>

      <!-- Bafarada de Diàleg Sasha -->
      <div class="thematic-speech-bubble" style="border-color:${item.themeColor}; box-shadow: 4px 4px 0px ${item.themeAccent}">
        ${item.speech}
      </div>

      <!-- Bloc d'Acció & QR Code GRAN -->
      <div class="thematic-bottom-box" style="border-color:${item.themeColor}">
        <div class="thematic-cta-text">
          <h3 style="color:${item.themeColor}">${item.ctaTitle}</h3>
          <p>${item.ctaDesc}</p>
          <div class="thematic-bullets">
            ${item.bullets.map(b => `<span>✨ ${b}</span>`).join('')}
          </div>
        </div>

        <div class="thematic-qr-holder" style="border-color:${item.themeColor}; box-shadow: 4px 4px 0px ${item.themeAccent}">
          <div class="qr-canvas-box" id="qr-${item.id}"></div>
          <span>ESCANEJA I JUGA</span>
          <div class="thematic-url-text" id="qr-url-thematic-${item.id}">comiguadiana.github.io/pastisseria</div>
        </div>
      </div>

      <!-- Peu Oficial -->
      <div class="poster-footer">
        <span>Carrer Guadiana · Obrador Màgic</span>
        <span>Festes de Sants 2026</span>
        <span>Accés lliure i gratuït</span>
      </div>
    `;
    viewport.appendChild(thematicSheet);
  });

  // Generar tots els codis QR
  generateAllQRCodes(urlInput.value.trim() || defaultQrUrl);
}

/* ─── Generació de Codis QR d'Alta Resolució i Gran Format ─── */
function generateAllQRCodes(targetUrl) {
  const cleanUrl = targetUrl.replace(/^https?:\/\//, '');

  // 1. QR General (GEGANT 210px)
  const generalQrContainer = document.getElementById('qr-general');
  if (generalQrContainer) {
    generalQrContainer.innerHTML = '';
    new QRCode(generalQrContainer, {
      text: targetUrl,
      width: 210,
      height: 210,
      colorDark: "#1e1b4b",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  const urlDisplay = document.getElementById('qr-url-display-general');
  if (urlDisplay) {
    urlDisplay.textContent = cleanUrl;
  }

  // 2. QRs Minicards Bingo Musical (4 unitats 120px)
  for (let i = 1; i <= 4; i++) {
    const miniContainer = document.getElementById(`qr-mini-${i}`);
    if (miniContainer) {
      miniContainer.innerHTML = '';
      new QRCode(miniContainer, {
        text: targetUrl,
        width: 120,
        height: 120,
        colorDark: "#1e1035",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }

    const miniUrlEl = document.getElementById(`qr-mini-url-${i}`);
    if (miniUrlEl) {
      miniUrlEl.textContent = cleanUrl;
    }
  }

  // 3. QR Cartell Especial Bingo Musical (200px)
  const bingoSpecialContainer = document.getElementById('qr-bingo-special');
  if (bingoSpecialContainer) {
    bingoSpecialContainer.innerHTML = '';
    new QRCode(bingoSpecialContainer, {
      text: targetUrl,
      width: 200,
      height: 200,
      colorDark: "#1e1035",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
  const bingoSpecialUrl = document.getElementById('qr-url-bingo-special');
  if (bingoSpecialUrl) {
    bingoSpecialUrl.textContent = cleanUrl;
  }

  // 4. QRs Temàtics (140px)
  THEMATIC_SASHAS.forEach(item => {
    const container = document.getElementById(`qr-${item.id}`);
    if (container) {
      container.innerHTML = '';
      new QRCode(container, {
        text: targetUrl,
        width: 140,
        height: 140,
        colorDark: "#1e1b4b",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }

    const thematicUrlEl = document.getElementById(`qr-url-thematic-${item.id}`);
    if (thematicUrlEl) {
      thematicUrlEl.textContent = cleanUrl;
    }
  });
}

/* ─── Esdeveniments d'Actualització de la URL ─── */
urlInput.addEventListener('input', (e) => {
  const newUrl = e.target.value.trim();
  if (newUrl) {
    generateAllQRCodes(newUrl);
  }
});

/* ─── Funcions d'Impressió ─── */

// Imprimir només el cartell actiu actual
btnPrintCurrent.addEventListener('click', () => {
  document.body.classList.add('print-single');
  const activeSheet = document.querySelector(`.poster-sheet[data-id="${currentActiveTab}"]`);
  if (activeSheet) {
    document.querySelectorAll('.poster-sheet').forEach(s => s.classList.remove('active-print'));
    activeSheet.classList.add('active-print');
    activeSheet.style.display = 'flex';
  }
  window.print();
});

// Imprimir tots els cartells consecutivament en A4
btnPrintAll.addEventListener('click', () => {
  document.body.classList.remove('print-single');
  // Mostrar tots els cartells temporalment per a la impressió
  document.querySelectorAll('.poster-sheet').forEach(s => {
    s.style.display = 'flex';
  });

  window.print();

  // Restaurar estat de visualització de pestanya
  switchTab(currentActiveTab);
});

/* ─── Inicialització ─── */
renderNavTabs();
renderAllPosters();
