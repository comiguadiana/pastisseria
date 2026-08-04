// ═══════════════════════════════════════════════════════════
// sasha-go.js — Sasha GO: El Safari de Sants
// Obrador Màgic Guadiana
// ═══════════════════════════════════════════════════════════

import { onAuthReady, renderNavbarUser, logout, showToast, getDiceBearUrl } from '../../assets/js/auth.js';
import { saveScore, recordGamePlay, GAMES } from '../../assets/js/ranking.js';

/* ── CONFIGURACIÓ I CONSTANTS ────────────────────────────── */
const GUADIANA_COORDS = { lat: 41.37445, lng: 2.13920 }; // Carrer Guadiana (entre Sant Crist i Rei Martí), Sants
const INTERACTION_RADIUS_METERS = 35; // Distància d'interacció ajustada (35 metres)
const RADAR_VISION_RADIUS_METERS = 250; // Radi de visió nítida al mapa de Sants
const TARGET_TOTAL_SPAWNS = 14; // Quantitat objectiu d'elements actius a Sants

/* ── XARXA DE CARRERS I PLACES DE SANTS ─────────────────── */
// Totes les coordenades representen eixos de carrers, voreres i places públiques per garantir
// que cap Sasha ni dolç aparegui a l'interior d'un edifici.
const SANTS_STREETS = [
  // ── ZONA GUADIANA (CARRER GUADIANA - ALTA DENSITAT D'OBRADOR) ──────────────
  {
    id: 'guadiana_obrador',
    name: 'Carrer Guadiana (Entre Sant Crist i Rei Martí - Obrador Central)',
    isGuadianaZone: true,
    weight: 9,
    points: [[41.37465, 2.13915], [41.37445, 2.13920], [41.37420, 2.13928]]
  },
  {
    id: 'guadiana_nord',
    name: 'Carrer Guadiana (Tram Superior fins Creu Coberta/Sants)',
    isGuadianaZone: true,
    weight: 6,
    points: [[41.37530, 2.13895], [41.37465, 2.13915]]
  },
  {
    id: 'guadiana_sud',
    name: 'Carrer Guadiana (Tram Sud fins Sant Crist / Bonet i Muixí)',
    isGuadianaZone: true,
    weight: 5,
    points: [[41.37420, 2.13928], [41.37380, 2.13938]]
  },
  {
    id: 'rei_marti',
    name: 'Carrer Rei Martí (Creua Guadiana)',
    isGuadianaZone: true,
    weight: 5,
    points: [[41.37460, 2.13845], [41.37465, 2.13915], [41.37475, 2.13985]]
  },
  {
    id: 'sant_crist_guadiana',
    name: 'Carrer de Sant Crist (Creua Guadiana)',
    isGuadianaZone: true,
    weight: 5,
    points: [[41.37385, 2.13875], [41.37415, 2.13865], [41.37420, 2.13928], [41.37425, 2.13985]]
  },
  {
    id: 'carrer_cros',
    name: 'Carrer de Cros (Carrer a l\'esquerra de Guadiana)',
    isGuadianaZone: true,
    weight: 4,
    points: [[41.37520, 2.13835], [41.37460, 2.13845], [41.37415, 2.13865], [41.37385, 2.13875]]
  },
  {
    id: 'carrer_gayarre',
    name: 'Carrer de Gayarre (Carrer a la dreta de Guadiana)',
    isGuadianaZone: true,
    weight: 4,
    points: [[41.37545, 2.13955], [41.37475, 2.13965], [41.37425, 2.13975]]
  },
  {
    id: 'placa_bonet_muixi',
    name: 'Plaça de Bonet i Muixí (Santa Maria de Sants)',
    isGuadianaZone: true,
    weight: 5,
    points: [[41.37375, 2.13805], [41.37395, 2.13810], [41.37390, 2.13835], [41.37370, 2.13830]]
  },
  {
    id: 'carrer_premia',
    name: 'Carrer de Premià',
    isGuadianaZone: true,
    weight: 4,
    points: [[41.37495, 2.13710], [41.37380, 2.13670], [41.37260, 2.13620]]
  },

  // ── TOT EL BARRI DE SANTS I PUNTS D'INTERÈS ───────────────
  {
    id: 'placa_osca',
    name: 'Plaça d\'Osca',
    isGuadianaZone: false,
    weight: 4,
    points: [[41.37575, 2.13965], [41.37585, 2.13995], [41.37595, 2.13975], [41.37570, 2.13985]]
  },
  {
    id: 'carrer_riego',
    name: 'Carrer de Riego',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37580, 2.13980], [41.37620, 2.14080], [41.37650, 2.14150]]
  },
  {
    id: 'placa_farga',
    name: 'Plaça de la Farga',
    isGuadianaZone: false,
    weight: 4,
    points: [[41.37240, 2.13600], [41.37260, 2.13640], [41.37270, 2.13610], [41.37245, 2.13635]]
  },
  {
    id: 'carrer_sants_est',
    name: 'Carrer de Sants (Creu Coberta - Guadiana)',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37500, 2.14350], [41.37515, 2.14080], [41.37525, 2.13815]]
  },
  {
    id: 'carrer_sants_centre',
    name: 'Carrer de Sants (Guadiana - Pl. Sants)',
    isGuadianaZone: false,
    weight: 4,
    points: [[41.37525, 2.13815], [41.37540, 2.13500], [41.37550, 2.13320]]
  },
  {
    id: 'carrer_sants_oest',
    name: 'Carrer de Sants (Pl. Sants - Badal)',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37550, 2.13320], [41.37450, 2.12850], [41.37350, 2.12400]]
  },
  {
    id: 'placa_sants',
    name: 'Plaça de Sants',
    isGuadianaZone: false,
    weight: 4,
    points: [[41.37535, 2.13300], [41.37565, 2.13350], [41.37550, 2.13320]]
  },
  {
    id: 'mercat_sants',
    name: 'Mercat de Sants (Sant Jordi / Càceres)',
    isGuadianaZone: false,
    weight: 4,
    points: [[41.37440, 2.13220], [41.37420, 2.13260], [41.37400, 2.13300], [41.37430, 2.13330]]
  },
  {
    id: 'cotxeres_sants',
    name: 'Cotxeres de Sants (Ptge. Fructuós Gelabert)',
    isGuadianaZone: false,
    weight: 4,
    points: [[41.37560, 2.13450], [41.37585, 2.13480], [41.37610, 2.13510]]
  },
  {
    id: 'espanya_industrial_nord',
    name: 'Parc de l\'Espanya Industrial (Drac i Estany)',
    isGuadianaZone: false,
    weight: 4,
    points: [[41.37700, 2.14100], [41.37760, 2.14150], [41.37820, 2.14200]]
  },
  {
    id: 'espanya_industrial_oest',
    name: 'Parc de l\'Espanya Industrial (Passarel·la)',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37800, 2.14050], [41.37730, 2.14250]]
  },
  {
    id: 'carrer_alcolea',
    name: 'Carrer d\'Alcolea',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37555, 2.13920], [41.37700, 2.13870], [41.37900, 2.13800]]
  },
  {
    id: 'carrer_vallespir',
    name: 'Carrer del Vallespir',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37550, 2.13700], [41.37750, 2.13650], [41.38000, 2.13580]]
  },
  {
    id: 'carrer_galileu',
    name: 'Carrer de Galileu',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37540, 2.13500], [41.37750, 2.13450], [41.38000, 2.13380]]
  },
  {
    id: 'placa_iberia',
    name: 'Plaça d\'Ibèria',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37310, 2.13670], [41.37330, 2.13690], [41.37320, 2.13680]]
  },
  {
    id: 'carrer_olzinelles',
    name: 'Carrer d\'Olzinelles',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37350, 2.13500], [41.37250, 2.13450], [41.37150, 2.13400]]
  },
  {
    id: 'carrer_tenor_massini',
    name: 'Carrer del Tenor Massini',
    isGuadianaZone: false,
    weight: 3,
    points: [[41.37520, 2.13100], [41.37750, 2.13050], [41.37950, 2.13000]]
  },
  {
    id: 'estacio_sants',
    name: 'Estació de Sants (Països Catalans / Joan Peiró)',
    isGuadianaZone: false,
    weight: 4,
    points: [[41.37900, 2.13950], [41.37950, 2.14050], [41.38000, 2.14150]]
  },
  {
    id: 'carrer_sant_medir',
    name: 'Carrer de Sant Medir',
    isGuadianaZone: false,
    weight: 2,
    points: [[41.37370, 2.13800], [41.37250, 2.13750], [41.37150, 2.13700]]
  }
];

/* ── ZONES DESTACADES PER AL NAVEGADOR DE SANTS ──────────── */
const SANTS_LANDMARKS = [
  { name: '🎂 Carrer Guadiana (Obrador Central)', lat: 41.37445, lng: 2.13920, isGuadiana: true, desc: 'Obrador al Carrer Guadiana (entre Sant Crist i Rei Martí)' },
  { name: '⛪ Plaça de Bonet i Muixí', lat: 41.37385, lng: 2.13815, isGuadiana: true, desc: 'Tocant a Guadiana davant de Santa Maria de Sants' },
  { name: '🍻 Plaça d\'Osca', lat: 41.37580, lng: 2.13980, isGuadiana: false, desc: 'Plaça viva i animada plena de terrasses i festa' },
  { name: '⚽ Plaça de la Farga', lat: 41.37250, lng: 2.13620, isGuadiana: false, desc: 'Bressol dels esportistes i jocs a l\'aire lliure' },
  { name: '🛒 Mercat de Sants', lat: 41.37420, lng: 2.13250, isGuadiana: false, desc: 'Mercat modernista amb els millors productes frescos' },
  { name: '🏛️ Cotxeres de Sants', lat: 41.37570, lng: 2.13480, isGuadiana: false, desc: 'Epicentre cultural, associatiu i festiu' },
  { name: '🌳 Parc Espanya Industrial', lat: 41.37760, lng: 2.14150, isGuadiana: false, desc: 'L\'estany, les graderies i el drac gegant' },
  { name: '🛍️ Carrer de Sants', lat: 41.37525, lng: 2.13815, isGuadiana: false, desc: 'L\'eix comercial més llarg d\'Europa' },
  { name: '🌺 Plaça d\'Ibèria', lat: 41.37320, lng: 2.13680, isGuadiana: false, desc: 'Raconet tranquil i encantador de Sants' },
  { name: '🚂 Estació de Sants', lat: 41.37950, lng: 2.14050, isGuadiana: false, desc: 'Arribada de viatgers i exploradors còsmics' }
];

/* ── LES 42 VARIETATS D'ALIENÍGENES SASHA ─────────────────── */
const SASHAS_DATABASE = [
  {
    id: "sasha_xef_gourmet",
    name: "Sasha Xef Gourmet",
    profession: "Cap de Cuina a Guadiana",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.35,
    points: 55,
    img: '../../assets/img/sashas/sasha_xef_gourmet.png',
    bio: "Fa rodar la massa de les ensaïmades més ràpid que ningú a tot Sants!"
  },
  {
    id: "sasha_jardiner_flors",
    name: "Sasha Jardiner de Flors",
    profession: "Jardiner de Sucre i Vainilla",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.4,
    points: 60,
    img: '../../assets/img/sashas/sasha_jardiner_flors.png',
    bio: "Cultiva maduixes i flors dolces per decorar els pastissos."
  },
  {
    id: "sasha_mecanic_mono",
    name: "Sasha Mecànic de Taller",
    profession: "Manteniment de Batidores",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.4,
    points: 60,
    img: '../../assets/img/sashas/sasha_mecanic_mono.png',
    bio: "Ajusta els engranatges de totes les pastadores del barri."
  },
  {
    id: "sasha_obrer_martell",
    name: "Sasha Obrer amb Martell",
    profession: "Muntador d'Estructures Dolces",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.4,
    points: 65,
    img: '../../assets/img/sashas/sasha_obrer_martell.png',
    bio: "Prepara els suports de fusta per als pastissos gegants de boda."
  },
  {
    id: "sasha_pages_horta",
    name: "Sasha Pagès de l'Horta",
    profession: "Rei de les Fruites Fresques",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.45,
    points: 65,
    img: '../../assets/img/sashas/sasha_pages_horta.png',
    bio: "Porta les millors taronges i llimones per aromatitzar les cremes."
  },
  {
    id: "sasha_mestre_escola",
    name: "Sasha Mestre de Mates",
    profession: "Professor de Proporcions",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.45,
    points: 70,
    img: '../../assets/img/sashas/sasha_mestre_escola.png',
    bio: "Ensenya la regla de tres per calcular la quantitat exacta de farina."
  },
  {
    id: "sasha_fotograf_camera",
    name: "Sasha Fotògraf Reporter",
    profession: "Capturador de Moments Dolços",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.45,
    points: 70,
    img: '../../assets/img/sashas/sasha_fotograf_camera.png',
    bio: "Fa les millors fotos per a la carta i xarxes socials de l'obrador."
  },
  {
    id: "sasha_reporter_microfon",
    name: "Sasha Periodista de Notícies",
    profession: "Cronista de la Festa Major",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.5,
    points: 75,
    img: '../../assets/img/sashas/sasha_reporter_microfon.png',
    bio: "Transmet en directe el concurs de coques de Sant Joan a Sants."
  },
  {
    id: "sasha_doctor_clinica",
    name: "Sasha Doctor de Família",
    profession: "Especialista en Benestar Dolç",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.5,
    points: 80,
    img: '../../assets/img/sashas/sasha_doctor_clinica.png',
    bio: "Recepta dos croissants calents i una xocolata desfeta per al cor."
  },
  {
    id: "sasha_futbolista_guadiana",
    name: "Sasha Futbolista Guadiana",
    profession: "Davantera de la U.E. Sants",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.5,
    points: 85,
    img: '../../assets/img/sashas/sasha_futbolista_guadiana.png',
    bio: "Xuta bunyols d'or directe a l'escaire a la plaça de la Farga."
  },
  {
    id: "sasha_basquet_cistella",
    name: "Sasha Jugador de Bàsquet",
    profession: "Pivot del Club Sants",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.5,
    points: 85,
    img: '../../assets/img/sashas/sasha_basquet_cistella.png',
    bio: "Encistella brioixos des de mitja pista sense tocar el cèrcol."
  },
  {
    id: "sasha_badminton_raqueta",
    name: "Sasha Jugador de Bàdminton",
    profession: "Àgil com el Volant",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.5,
    points: 85,
    img: '../../assets/img/sashas/sasha_badminton_raqueta.png',
    bio: "Remata les merengues a l'aire amb una precisió increïble."
  },
  {
    id: "sasha_patinador_skate",
    name: "Sasha Patinador amb Skate",
    profession: "Repartidor sobre Rodes",
    rarity: "Comuna",
    rarityClass: "badge-comuna",
    catchDifficulty: 0.55,
    points: 90,
    img: '../../assets/img/sashas/sasha_patinador_skate.png',
    bio: "Porta les comandes pel carrer Guadiana fent salts i trucs."
  },
  {
    id: "sasha_artista_pintora",
    name: "Sasha Pintora d'Art",
    profession: "Decoradora de Xocolata",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.65,
    points: 110,
    img: '../../assets/img/sashas/sasha_artista_pintora.png',
    bio: "Utilitza xocolata negra i gerds per crear quadres comestibles."
  },
  {
    id: "sasha_bomber_extintor",
    name: "Sasha Bomber amb Extintor",
    profession: "Guardià del Forn",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.65,
    points: 115,
    img: '../../assets/img/sashas/sasha_bomber_extintor.png',
    bio: "Sempre a punt per controlar la temperatura dels forns de llenya."
  },
  {
    id: "sasha_detectiu_lupa",
    name: "Sasha Detectiu amb Lupa",
    profession: "Investigadora de Receptes",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.70,
    points: 120,
    img: '../../assets/img/sashas/sasha_detectiu_lupa.png',
    bio: "Descobreix la fórmula secreta dels croissants més cruixents."
  },
  {
    id: "sasha_submarinista_trident",
    name: "Sasha Submarinista Trident",
    profession: "Buscador de Perles de Sucre",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.70,
    points: 125,
    img: '../../assets/img/sashas/sasha_submarinista_trident.png',
    bio: "Submergeix-se en xarop de caramel per rescatar tresors dolços."
  },
  {
    id: "sasha_rocker_guitarra",
    name: "Sasha Guitarrista Rock",
    profession: "Solista de Heavy Pastís",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.72,
    points: 130,
    img: '../../assets/img/sashas/sasha_rocker_guitarra.png',
    bio: "Toca riffs elèctrics per fer vibrar les masses i fermentar més ràpid."
  },
  {
    id: "sasha_dj_auriculars",
    name: "Sasha DJ amb Auriculars",
    profession: "Animadora de Festes de Carrer",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.72,
    points: 135,
    img: '../../assets/img/sashas/sasha_dj_auriculars.png',
    bio: "Posa la millor música a les nits de tapes i revetlles de Sants."
  },
  {
    id: "sasha_flautista_orquestra",
    name: "Sasha Flautista d'Orquestra",
    profession: "Melodies per a la Crema",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.72,
    points: 140,
    img: '../../assets/img/sashas/sasha_flautista_orquestra.png',
    bio: "Toca notes suaus que fan que la nata monti amb textura sedosa."
  },
  {
    id: "sasha_escacs_taula",
    name: "Sasha Jugador d'Escacs",
    profession: "Gran Mestre Estrateg",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.75,
    points: 145,
    img: '../../assets/img/sashas/sasha_escacs_taula.png',
    bio: "Calcula la combinació òptima d'ingredients amb 10 jugades d'antelació."
  },
  {
    id: "sasha_ciclista_parc",
    name: "Sasha Ciclista al Parc",
    profession: "Ruta dels Obradors",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.75,
    points: 150,
    img: '../../assets/img/sashas/sasha_ciclista_parc.png',
    bio: "Recorre tot el districte pedalant per portar pa calent a tothom."
  },
  {
    id: "sasha_cientific_ulleres",
    name: "Sasha Científic amb Matràs",
    profession: "Alquimista de Sabors",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.78,
    points: 155,
    img: '../../assets/img/sashas/sasha_cientific_ulleres.png',
    bio: "Estudia la física de la caramel·lització i el punt de neu perfecte."
  },
  {
    id: "sasha_arquitecte_planols",
    name: "Sasha Arquitecte de Plànols",
    profession: "Dissenyador de Mones Gegants",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.78,
    points: 160,
    img: '../../assets/img/sashas/sasha_arquitecte_planols.png',
    bio: "Dibuixa plànols per aixecar catedrals de xocolata de 5 pisos."
  },
  {
    id: "sasha_explorador_safari",
    name: "Sasha Explorador Safari",
    profession: "Cercador de Cafè i Cacau",
    rarity: "Rara",
    rarityClass: "badge-rara",
    catchDifficulty: 0.78,
    points: 165,
    img: '../../assets/img/sashas/sasha_explorador_safari.png',
    bio: "Viatja per selves tropicals buscant les millors faves de cacau crioll."
  },
  {
    id: "sasha_mariner_vaixell",
    name: "Sasha Mariner de Fragata",
    profession: "Capitana d'Oceans de Crema",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.82,
    points: 210,
    img: '../../assets/img/sashas/sasha_mariner_vaixell.png',
    bio: "Navega en vaixells de bescuit per mars de xarop dolç."
  },
  {
    id: "sasha_miner_casc",
    name: "Sasha Miner amb Pic",
    profession: "Excavador de Mines de Xocolata",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.83,
    points: 220,
    img: '../../assets/img/sashas/sasha_miner_casc.png',
    bio: "Extreu les vetes més pures de cacau pur subterrani."
  },
  {
    id: "sasha_cassador_tresors",
    name: "Sasha Caçador de Tresors",
    profession: "Arqueòleg de Receptes Antigues",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.84,
    points: 230,
    img: '../../assets/img/sashas/sasha_cassador_tresors.png',
    bio: "Desenterra manuscrits medievals amb receptes perdudes de torrons."
  },
  {
    id: "sasha_paleontoleg_fossils",
    name: "Sasha Paleontòleg de Fòssils",
    profession: "Desenterrador de Dolços Ancestrals",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.85,
    points: 240,
    img: '../../assets/img/sashas/sasha_paleontoleg_fossils.png',
    bio: "Troba fòssils de galetes del juràssic perfectament conservades."
  },
  {
    id: "sasha_jutge_toga",
    name: "Sasha Jutge del Tribunal",
    profession: "Àrbitre del Gran Concurs",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.86,
    points: 250,
    img: '../../assets/img/sashas/sasha_jutge_toga.png',
    bio: "Imparteix justícia inapel·lable al concurs del millor croissant."
  },
  {
    id: "sasha_catedratic_toga",
    name: "Sasha Catedràtic d'Universitat",
    profession: "Doctor en Alta Pastisseria",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.87,
    points: 260,
    img: '../../assets/img/sashas/sasha_catedratic_toga.png',
    bio: "Escriu tractats sobre la fermentació lenta i la massa mare."
  },
  {
    id: "sasha_hacker_tauleta",
    name: "Sasha Hacker Informàtic",
    profession: "Xifrador de la Recepta Secreta",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.88,
    points: 270,
    img: '../../assets/img/sashas/sasha_hacker_tauleta.png',
    bio: "Protegeix el codi de la màquina de xurros contra atacs cibernètics."
  },
  {
    id: "sasha_gangster_metralladora",
    name: "Sasha Gàngster Elegant",
    profession: "Cap de la Màfia de la Xocolata",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.88,
    points: 280,
    img: '../../assets/img/sashas/sasha_gangster_metralladora.png',
    bio: "Controla el mercat negre de la millor vainilla de Madagascar."
  },
  {
    id: "sasha_pirata_cofre",
    name: "Sasha Pirata del Cofre",
    profession: "Terror dels Mars de Caramel",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.89,
    points: 290,
    img: '../../assets/img/sashas/sasha_pirata_cofre.png',
    bio: "Guarda un cofre ple de monedes de xocolata d'or pur."
  },
  {
    id: "sasha_pilot_nau",
    name: "Sasha Pilot d'Avioneta",
    profession: "Missatgeria Aèria Dolça",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.89,
    points: 300,
    img: '../../assets/img/sashas/sasha_pilot_nau.png',
    bio: "Sobrevolar Sants llançant caramels i confeti durant la festa."
  },
  {
    id: "sasha_astronauta_bandera",
    name: "Sasha Astronauta de Missió",
    profession: "Ambaixadora Intergalàctica",
    rarity: "Èpica",
    rarityClass: "badge-epica",
    catchDifficulty: 0.90,
    points: 320,
    img: '../../assets/img/sashas/sasha_astronauta_bandera.png',
    bio: "Planta la bandera de Guadiana als confins de la galàxia."
  },
  {
    id: "sasha_viking_destral",
    name: "Sasha Viking amb Destral",
    profession: "Guerrera dels Banquets del Valhalla",
    rarity: "Mítica",
    rarityClass: "badge-mitica",
    catchDifficulty: 0.92,
    points: 400,
    img: '../../assets/img/sashas/sasha_viking_destral.png',
    bio: "Parteix barres de torró dur amb la seva destral llegendària."
  },
  {
    id: "sasha_samurai_katana",
    name: "Sasha Samurai amb Katana",
    profession: "Talla-Pastissos Mestre",
    rarity: "Mítica",
    rarityClass: "badge-mitica",
    catchDifficulty: 0.94,
    points: 420,
    img: '../../assets/img/sashas/sasha_samurai_katana.png',
    bio: "Talla el pastís de noces en 100 porcions idèntiques en un mil·lisegon."
  },
  {
    id: "sasha_ninja_shuriken",
    name: "Sasha Ninja Furtiva",
    profession: "Ombra de la Nit Pastissera",
    rarity: "Mítica",
    rarityClass: "badge-mitica",
    catchDifficulty: 0.95,
    points: 450,
    img: '../../assets/img/sashas/sasha_ninja_shuriken.png',
    bio: "Apareix i desapareix deixant un rastre de sucre de llustre."
  },
  {
    id: "sasha_mag_estrelles",
    name: "Sasha Mag d'Estrelles",
    profession: "Hechicera de la Pols d'Or",
    rarity: "Mítica",
    rarityClass: "badge-mitica",
    catchDifficulty: 0.96,
    points: 480,
    img: '../../assets/img/sashas/sasha_mag_estrelles.png',
    bio: "Fa aparèixer pastissos de nata del no-res amb la seva vareta màgica."
  },
  {
    id: "sasha_surfista_platja",
    name: "Sasha Surfista de Sants",
    profession: "Domadora d'Onades de Crema",
    rarity: "Mítica",
    rarityClass: "badge-mitica",
    catchDifficulty: 0.96,
    points: 490,
    img: '../../assets/img/sashas/sasha_surfista_platja.png',
    bio: "Surfeja les onades de xocolata amb un estil impecable."
  },
  {
    id: "sasha_rei_corona",
    name: "Sasha amb Corona Daurada",
    profession: "Rei dels Pastissos 24K",
    rarity: "Mítica",
    rarityClass: "badge-mitica",
    catchDifficulty: 0.97,
    points: 520,
    img: '../../assets/img/sashas/sasha_rei_corona.png',
    bio: "Porta una corona d'or pur forjada amb sucre cremat!"
  }
];

/* ── MUNICIÓ I DOLÇOS ────────────────────────────────────── */
const AMMO_TYPES = {
  croissant: {
    id: 'croissant',
    name: 'Croissant',
    icon: '🥐',
    img: '../../assets/img/pasteles/cruasan.png',
    multiplier: 1.0,
    effect: 'none'
  },
  ensaimada: {
    id: 'ensaimada',
    name: 'Ensaimada',
    icon: '🍥',
    img: '../../assets/img/pasteles/ensaimada.png',
    multiplier: 1.45,
    effect: 'none'
  },
  pastis: {
    id: 'pastis',
    name: 'Pastís Guadiana',
    icon: '🎂',
    img: '../../assets/img/pasteles/pastis.png',
    multiplier: 2.4,
    effect: 'none'
  },
  maracuja: {
    id: 'maracuja',
    name: 'Te Maracujà',
    icon: '🫐',
    img: '../../assets/img/pasteles/te_maracuja.png',
    multiplier: 1.35,
    effect: 'calm'
  }
};

/* ── ESTAT DEL JOC ───────────────────────────────────────── */
let currentUser = null;
let currentProfile = null;
let map = null;
let playerMarker = null;
let playerCircle = null;

let playerPos = { lat: GUADIANA_COORDS.lat, lng: GUADIANA_COORDS.lng };
let isSimulatorMode = false;
let gpsWatchId = null;

let score = 0;
let ammoInventory = {
  croissant: 12,
  ensaimada: 6,
  pastis: 2,
  maracuja: 2
};
let selectedAmmo = 'croissant';

// Col·lecció del SashaDex { sasha_id: count }
let caughtSashas = {};

// Elements al mapa en directe
let activeSpawns = []; // { id, type: 'sasha'|'pastry', lat, lng, streetName, data, marker, createdAt, lifespan, isFading }
let spawnLoopTimer = null;
let nextSashaPoolIndex = 0;
let shuffledSashasPool = [];

// Estat de la trobada / captura actual
let currentEncounter = null; 
let ringAnimFrame = null;
let arenaAnimFrame = null;

/* ── INICIALITZACIÓ DE SONS (WEB AUDIO SYNTH) ─────────────── */
class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPop() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playWhoosh() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playCatchSuccess() {
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do agut
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + i * 0.1);
      osc.stop(this.ctx.currentTime + i * 0.1 + 0.25);
    });
  }

  playPickup() {
    this.init();
    if (!this.ctx) return;
    const notes = [659.25, 880.00];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.08 + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + i * 0.08);
      osc.stop(this.ctx.currentTime + i * 0.08 + 0.15);
    });
  }
}
const sounds = new SoundEngine();

/* ── INICIALITZACIÓ DOM I EVENTS ─────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  loadSavedData();
  initSashaPool();
  setupLeafletMap();
  setupUIEvents();
  setupThrowInteraction();
  startSpawnCycle();

  // Mode de testing: només mostrar el selector de zones i simulador si hi ha '?testing=true' a la URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('testing') === 'true') {
    const btnZones = document.getElementById('btn-open-zones');
    const btnSim = document.getElementById('btn-toggle-sim');
    if (btnZones) btnZones.style.display = 'flex';
    if (btnSim) btnSim.style.display = 'flex';
  }
});

/* ── AUTENTICACIÓ I DADES ────────────────────────────────── */
function setupAuth() {
  onAuthReady((user, profile) => {
    currentUser = user;
    currentProfile = profile;
    renderNavbarUser(profile, user);

    // Actualitzar avatar del jugador al mapa si ja està carregat
    const playerImg = document.querySelector('.player-marker-avatar');
    if (playerImg) {
      playerImg.src = getDiceBearUrl(profile?.avatarStyle || 'adventurer', profile?.avatarSeed || profile?.username || 'guadiana_explorer', 64);
    }
  });

  document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
    await logout();
    window.location.href = '../../index.html';
  });
}

function loadSavedData() {
  try {
    const savedDex = localStorage.getItem('sashago_dex');
    if (savedDex) caughtSashas = JSON.parse(savedDex);

    const savedAmmo = localStorage.getItem('sashago_ammo');
    if (savedAmmo) ammoInventory = JSON.parse(savedAmmo);

    const savedScore = localStorage.getItem('sashago_score');
    if (savedScore) score = parseInt(savedScore, 10) || 0;
  } catch (e) {
    console.warn('Error loading localStorage:', e);
  }
  updateHUD();
}

function saveData() {
  try {
    localStorage.setItem('sashago_dex', JSON.stringify(caughtSashas));
    localStorage.setItem('sashago_ammo', JSON.stringify(ammoInventory));
    localStorage.setItem('sashago_score', score.toString());
  } catch (e) {}

  if (currentUser && currentProfile) {
    try {
      saveScore(GAMES.SASHA_GO, currentUser.uid, score, currentProfile);
      recordGamePlay(GAMES.SASHA_GO, currentUser.uid);
    } catch (err) {
      console.warn('Error saving score to Firebase:', err);
    }
  }
}

/* ── POOL D'ALEATORIETAT EQUILIBRADA DE SASHES ────────────── */
function initSashaPool() {
  // Barregem la llista de les 42 Sashes perquè totes apareguin
  shuffledSashasPool = [...SASHAS_DATABASE].sort(() => Math.random() - 0.5);
  nextSashaPoolIndex = 0;
}

function getNextSasha() {
  if (shuffledSashasPool.length === 0 || nextSashaPoolIndex >= shuffledSashasPool.length) {
    initSashaPool();
  }
  const sasha = shuffledSashasPool[nextSashaPoolIndex];
  nextSashaPoolIndex++;
  return sasha;
}

/* ── CONFIGURACIÓ DEL MAPA LEAFLET ───────────────────────── */
function setupLeafletMap() {
  map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([playerPos.lat, playerPos.lng], 18);

  // CartoDB Positron / Pastel Tiles per un look suau i bonic
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  // Zona Destacada: Epicentre Obrador Guadiana
  L.circle([GUADIANA_COORDS.lat, GUADIANA_COORDS.lng], {
    radius: 115,
    color: '#ff6b8b',
    fillColor: '#ffd166',
    fillOpacity: 0.18,
    weight: 2.5,
    dashArray: '6, 8',
    interactive: false
  }).addTo(map);

  // Marcador fix d'Obrador Guadiana (fons de marcadors, zIndexOffset baix)
  const obradorIcon = L.divIcon({
    className: 'obrador-badge-marker',
    html: `
      <div class="obrador-map-pin">
        <span class="pin-icon">🎂</span>
        <span class="pin-label">Obrador Guadiana</span>
      </div>
    `,
    iconSize: [140, 36],
    iconAnchor: [70, 18]
  });
  L.marker([GUADIANA_COORDS.lat, GUADIANA_COORDS.lng], { icon: obradorIcon, zIndexOffset: -5000 }).addTo(map);

  // Marcador del jugador
  const avatarUrl = getDiceBearUrl(currentProfile?.avatarStyle || 'adventurer', currentProfile?.avatarSeed || 'guadiana_explorer', 64);
  const playerIcon = L.divIcon({
    className: 'custom-player-pin',
    html: `
      <div class="player-marker">
        <div class="player-radar-ring"></div>
        <img class="player-marker-avatar" src="${avatarUrl}" alt="Tu" />
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });

  playerMarker = L.marker([playerPos.lat, playerPos.lng], { icon: playerIcon }).addTo(map);

  // Cercle d'interacció (30m)
  playerCircle = L.circle([playerPos.lat, playerPos.lng], {
    radius: INTERACTION_RADIUS_METERS,
    color: '#ff6b8b',
    fillColor: '#ff8fab',
    fillOpacity: 0.15,
    weight: 2
  }).addTo(map);

  // Esdeveniments de canvi de vista/zoom per sincronitzar la boira de guerra
  map.on('move', updateFogOfWar);
  map.on('zoom', updateFogOfWar);
  map.on('resize', updateFogOfWar);

  setTimeout(updateFogOfWar, 120);

  // Iniciar Geolocation real
  startGeolocationTracking();
}

function startGeolocationTracking() {
  if ('geolocation' in navigator) {
    const gpsDot = document.getElementById('gps-dot');
    const gpsText = document.getElementById('gps-text');

    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (isSimulatorMode) return; // Si està en simulador, no sobreescrivim
        playerPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        updatePlayerPosition();
        gpsDot.className = 'status-dot pulsing';
        gpsText.textContent = '🟢 GPS Actiu (Sants)';
      },
      (err) => {
        console.warn('Geolocation warn:', err.message);
        gpsDot.className = 'status-dot warning';
        gpsText.textContent = '🟡 Mode Simulador (C/ Guadiana)';
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000
      }
    );
  }
}

function updatePlayerPosition() {
  if (!map || !playerMarker) return;
  playerMarker.setLatLng([playerPos.lat, playerPos.lng]);
  playerCircle.setLatLng([playerPos.lat, playerPos.lng]);
  updateFogOfWar();
  checkNearbySpawns();
}

/* ── BOIRA DE GUERRA (FOG OF WAR) I VISIBILITAT PER PROXIMITAT ── */
function updateFogOfWar() {
  const fog = document.getElementById('fog-overlay');
  if (!fog || !map) return;

  // Punt central de l'avatar en píxels sobre la pantalla
  const playerPoint = map.latLngToContainerPoint([playerPos.lat, playerPos.lng]);
  const px = Math.round(playerPoint.x);
  const py = Math.round(playerPoint.y);

  // Radi visual calculat en píxels segons el nivell de zoom actual
  const edgeLatLng = L.latLng(playerPos.lat + (RADAR_VISION_RADIUS_METERS / 111000), playerPos.lng);
  const edgePoint = map.latLngToContainerPoint(edgeLatLng);
  const radiusPx = Math.max(140, Math.abs(edgePoint.y - playerPoint.y));

  // Màscara d'ombra (Fog of War) que amaga el barri però deixa nítid el voltant del jugador
  fog.style.background = `radial-gradient(circle at ${px}px ${py}px, 
    rgba(0, 0, 0, 0) 0px, 
    rgba(0, 0, 0, 0) ${radiusPx * 0.75}px, 
    rgba(16, 12, 28, 0.32) ${radiusPx * 1.05}px, 
    rgba(12, 9, 22, 0.68) ${radiusPx * 1.35}px, 
    rgba(8, 6, 16, 0.88) ${radiusPx * 1.65}px,
    rgba(6, 4, 12, 0.96) ${radiusPx * 1.95}px,
    rgba(6, 4, 12, 0.99) 100%)`;

  // Actualitzar quins marcadors són visibles al mapa
  updateMarkersVisibility();
}

function updateMarkersVisibility() {
  if (!map) return;

  activeSpawns.forEach(spawn => {
    const dist = getDistanceMeters(playerPos.lat, playerPos.lng, spawn.lat, spawn.lng);
    const isObradorArea = spawn.isObradorSpawn || spawn.isGuadiana || 
      (getDistanceMeters(GUADIANA_COORDS.lat, GUADIANA_COORDS.lng, spawn.lat, spawn.lng) <= 120);

    const inRange = isObradorArea || (dist <= RADAR_VISION_RADIUS_METERS);

    if (inRange) {
      if (!spawn.isOnMap) {
        spawn.marker.addTo(map);
        spawn.isOnMap = true;
        const inner = spawn.marker.getElement()?.querySelector('.sasha-pin, .pastry-pin');
        if (inner) inner.classList.add('spawn-appearing');
      }
    } else {
      if (spawn.isOnMap) {
        try {
          map.removeLayer(spawn.marker);
        } catch (e) {}
        spawn.isOnMap = false;
      }
    }
  });
}

/* ── GENERADOR DE COORDENADES EXACTES SOBRE CARRERS ──────── */
function getRandomPointOnStreet(preferGuadiana = false) {
  let candidateStreets;
  if (preferGuadiana) {
    candidateStreets = SANTS_STREETS.filter(s => s.isGuadianaZone);
  } else {
    // Sempre a la resta del barri (lluny de l'obrador) per evitar acumulacions
    candidateStreets = SANTS_STREETS.filter(s => !s.isGuadianaZone);
  }

  // Triar carrer ponderat pel seu pes
  const totalWeight = candidateStreets.reduce((acc, s) => acc + (s.weight || 1), 0);
  let r = Math.random() * totalWeight;
  let chosenStreet = candidateStreets[0];
  for (const st of candidateStreets) {
    r -= (st.weight || 1);
    if (r <= 0) {
      chosenStreet = st;
      break;
    }
  }

  // Interpolació lineal exacta al llarg del traçat del carrer
  const pts = chosenStreet.points;
  const segIdx = Math.floor(Math.random() * (pts.length - 1));
  const pA = pts[segIdx];
  const pB = pts[segIdx + 1];

  const t = Math.random();
  const lat = pA[0] + t * (pB[0] - pA[0]);
  const lng = pA[1] + t * (pB[1] - pA[1]);

  // Desviament d'aparcament/vorera dispers (+- 8-12m)
  const offsetLat = (Math.random() - 0.5) * 0.00018;
  const offsetLng = (Math.random() - 0.5) * 0.00018;

  return {
    lat: lat + offsetLat,
    lng: lng + offsetLng,
    streetName: chosenStreet.name,
    isGuadiana: chosenStreet.isGuadianaZone
  };
}

/* ── GENERADOR DE POSICIÓ EXACTA AL VOLTANT DE L'OBRADOR ─── */
function getObradorPoint() {
  // Dispersió en 360° en radi de 15m a 65m al voltant de l'Obrador per evitar solapaments
  const angle = Math.random() * 2 * Math.PI;
  const distMeters = 15 + Math.random() * 55; // 15m a 70m
  const deltaLat = (distMeters * Math.cos(angle)) / 111000;
  const deltaLng = (distMeters * Math.sin(angle)) / 83000;

  return {
    lat: GUADIANA_COORDS.lat + deltaLat,
    lng: GUADIANA_COORDS.lng + deltaLng,
    streetName: 'Entorn de l\'Obrador Guadiana',
    isGuadiana: true
  };
}

/* ── ASSEGURAR SEMPRE SASHES I DOLÇOS A L'OBRADOR ─────────── */
function ensureObradorSpawns() {
  // Compta quants elements hi ha a menys de 75 metres de l'Obrador (el radi de generació és fins a 70m)
  const obradorSashas = activeSpawns.filter(s => 
    s.type === 'sasha' && getDistanceMeters(GUADIANA_COORDS.lat, GUADIANA_COORDS.lng, s.lat, s.lng) <= 75
  );
  const obradorPastries = activeSpawns.filter(s => 
    s.type === 'pastry' && getDistanceMeters(GUADIANA_COORDS.lat, GUADIANA_COORDS.lng, s.lat, s.lng) <= 75
  );

  // Garantir sempre 5 Sashes per capturar al voltant de l'Obrador
  const neededSashas = Math.max(0, 5 - obradorSashas.length);
  for (let i = 0; i < neededSashas; i++) {
    spawnWildSasha(getObradorPoint());
  }

  // Garantir sempre 2 dolços per recollir al voltant de l'Obrador (menys freqüència)
  const neededPastries = Math.max(0, 2 - obradorPastries.length);
  for (let i = 0; i < neededPastries; i++) {
    spawnWildPastry(getObradorPoint());
  }
}

/* ── GESTIÓ I CICLE DE VIDA DE SPAWNS (APARICIÓ / DESAPARICIÓ) ── */
function startSpawnCycle() {
  // Generar lot inicial de 14 elements a tot Sants
  spawnInitialBatch();

  // Bucle de manteniment dinàmic cada 2.5 segons
  if (spawnLoopTimer) clearInterval(spawnLoopTimer);
  spawnLoopTimer = setInterval(() => {
    updateSpawnsLifecycle();
  }, 2500);
}

function spawnInitialBatch() {
  // 1. Garantir immediatament presència permanent a l'Obrador Guadiana
  ensureObradorSpawns();

  // 2. Generar la resta de Sashes (5) i dolços (2) per la resta del barri (lluny de l'obrador)
  for (let i = 0; i < 5; i++) {
    spawnWildSasha(null, false);
  }
  for (let i = 0; i < 2; i++) {
    spawnWildPastry(null, false);
  }
  updateFogOfWar();
}

function spawnWildSasha(customCoords = null, preferGuadiana = false) {
  const loc = customCoords || getRandomPointOnStreet(preferGuadiana);
  const sasha = getNextSasha();
  const spawnId = 'sasha_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  // Evitar solapament exactament a sobre d'un altre marcador existent
  let spawnLat = loc.lat;
  let spawnLng = loc.lng;
  const overlapsExisting = activeSpawns.some(s => getDistanceMeters(s.lat, s.lng, spawnLat, spawnLng) < 14);
  if (overlapsExisting) {
    const angle = Math.random() * 2 * Math.PI;
    spawnLat += (22 * Math.cos(angle)) / 111000;
    spawnLng += (22 * Math.sin(angle)) / 83000;
  }

  // Temps de vida: MÍNIM 1 HORA (3.600.000 ms) entre 60 i 90 minuts
  const MIN_LIFESPAN_MS = 60 * 60 * 1000; // 1 hora
  const lifespan = MIN_LIFESPAN_MS + Math.floor(Math.random() * 30 * 60 * 1000); // 1h a 1h30m

  const icon = L.divIcon({
    className: 'custom-sasha-pin',
    html: `
      <div class="sasha-pin spawn-appearing" title="${sasha.name} (${sasha.rarity}) al ${loc.streetName}">
        <div class="sasha-pin-aura"></div>
        <img src="${sasha.img}" alt="${sasha.name}" />
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25]
  });

  const marker = L.marker([spawnLat, spawnLng], { icon, zIndexOffset: 1000 });

  const isObradorSpawn = loc.isGuadiana || getDistanceMeters(GUADIANA_COORDS.lat, GUADIANA_COORDS.lng, spawnLat, spawnLng) <= 120;
  const dist = getDistanceMeters(playerPos.lat, playerPos.lng, spawnLat, spawnLng);
  const isOnMap = isObradorSpawn || dist <= RADAR_VISION_RADIUS_METERS;

  if (isOnMap && map) {
    marker.addTo(map);
  }

  const spawnObj = {
    id: spawnId,
    type: 'sasha',
    lat: spawnLat,
    lng: spawnLng,
    streetName: loc.streetName,
    isObradorSpawn,
    data: sasha,
    marker,
    createdAt: Date.now(),
    lifespan,
    isFading: false,
    isOnMap
  };

  marker.on('click', () => {
    handleSpawnClick(spawnObj);
  });

  activeSpawns.push(spawnObj);
}

function spawnWildPastry(customCoords = null, preferGuadiana = false) {
  const loc = customCoords || getRandomPointOnStreet(preferGuadiana);
  const types = ['croissant', 'croissant', 'ensaimada', 'ensaimada', 'pastis', 'maracuja'];
  const ammoKey = types[Math.floor(Math.random() * types.length)];
  const ammoObj = AMMO_TYPES[ammoKey];
  const spawnId = 'pastry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  // Evitar solapament exactament a sobre d'un altre marcador existent
  let spawnLat = loc.lat;
  let spawnLng = loc.lng;
  const overlapsExisting = activeSpawns.some(s => getDistanceMeters(s.lat, s.lng, spawnLat, spawnLng) < 14);
  if (overlapsExisting) {
    const angle = Math.random() * 2 * Math.PI;
    spawnLat += (22 * Math.cos(angle)) / 111000;
    spawnLng += (22 * Math.sin(angle)) / 83000;
  }

  // Temps de vida: MÍNIM 1 HORA (3.600.000 ms) entre 60 i 90 minuts
  const MIN_LIFESPAN_MS = 60 * 60 * 1000; // 1 hora
  const lifespan = MIN_LIFESPAN_MS + Math.floor(Math.random() * 30 * 60 * 1000); // 1h a 1h30m

  const icon = L.divIcon({
    className: 'custom-pastry-pin',
    html: `
      <div class="pastry-pin spawn-appearing" title="Recollir ${ammoObj.name} al ${loc.streetName}">
        <span>${ammoObj.icon}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });

  const marker = L.marker([spawnLat, spawnLng], { icon, zIndexOffset: 1000 });

  const isObradorSpawn = loc.isGuadiana || getDistanceMeters(GUADIANA_COORDS.lat, GUADIANA_COORDS.lng, spawnLat, spawnLng) <= 120;
  const dist = getDistanceMeters(playerPos.lat, playerPos.lng, spawnLat, spawnLng);
  const isOnMap = isObradorSpawn || dist <= RADAR_VISION_RADIUS_METERS;

  if (isOnMap && map) {
    marker.addTo(map);
  }

  const spawnObj = {
    id: spawnId,
    type: 'pastry',
    lat: spawnLat,
    lng: spawnLng,
    streetName: loc.streetName,
    isObradorSpawn,
    data: ammoKey,
    marker,
    createdAt: Date.now(),
    lifespan,
    isFading: false,
    isOnMap
  };

  marker.on('click', () => {
    handleSpawnClick(spawnObj);
  });

  activeSpawns.push(spawnObj);
}

function updateSpawnsLifecycle() {
  const now = Date.now();
  const remainingSpawns = [];

  activeSpawns.forEach(spawn => {
    const age = now - spawn.createdAt;
    const timeLeft = spawn.lifespan - age;

    // Si li queden menys de 10 segons, iniciar animació de desaparició (fade-out)
    if (timeLeft < 10000 && !spawn.isFading) {
      spawn.isFading = true;
      if (spawn.isOnMap) {
        const inner = spawn.marker.getElement()?.querySelector('.sasha-pin, .pastry-pin');
        if (inner) inner.classList.add('spawn-fading-out');
      }
    }

    // Si ha expirat el seu temps de vida, eliminar del mapa
    if (timeLeft <= 0) {
      if (spawn.isOnMap && map) {
        try {
          map.removeLayer(spawn.marker);
        } catch (e) {}
      }
    } else {
      remainingSpawns.push(spawn);
    }
  });

  activeSpawns = remainingSpawns;

  // Assegurar sempre la presència d'elements a l'Obrador Guadiana
  ensureObradorSpawns();

  // Si hi ha menys elements del límit, anar fent aparèixer nous (lluny de l'obrador)
  while (activeSpawns.length < TARGET_TOTAL_SPAWNS) {
    const currentSashas = activeSpawns.filter(s => s.type === 'sasha').length;
    if (currentSashas < 10) {
      spawnWildSasha(null, false);
    } else {
      spawnWildPastry(null, false);
    }
  }

  updateMarkersVisibility();
  checkNearbySpawns();
}

/* ── CÀLCUL DE DISTÀNCIA I CLIC A ELEMENTS DEL MAPA ──────── */
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function handleSpawnClick(spawn) {
  const dist = getDistanceMeters(playerPos.lat, playerPos.lng, spawn.lat, spawn.lng);

  if (dist > INTERACTION_RADIUS_METERS) {
    if (isSimulatorMode) {
      // En mode simulador / passeig, apropar el jugador a l'element per poder capturar-lo
      playerPos = { lat: spawn.lat, lng: spawn.lng };
      updatePlayerPosition();
    } else {
      const name = spawn.type === 'sasha' ? spawn.data.name : AMMO_TYPES[spawn.data].name;
      showToast(`📍 ${name} a ${Math.round(dist)}m al ${spawn.streetName}. Apropa't a menys de 35m per interactuar!`);
      return;
    }
  }

  if (spawn.type === 'pastry') {
    // Recollir dolç
    const ammoKey = spawn.data;
    const amount = ammoKey === 'croissant' ? 3 : ammoKey === 'ensaimada' ? 2 : 1;
    ammoInventory[ammoKey] += amount;
    sounds.playPickup();
    showToast(`+${amount} ${AMMO_TYPES[ammoKey].name} recollit al ${spawn.streetName}! ${AMMO_TYPES[ammoKey].icon}`);

    // Eliminar marcador
    if (spawn.isOnMap && map) {
      try {
        map.removeLayer(spawn.marker);
      } catch (e) {}
    }
    activeSpawns = activeSpawns.filter(s => s.id !== spawn.id);
    updateHUD();
    saveData();
  } else if (spawn.type === 'sasha') {
    // Obrir pantalla de captura interactiva
    openEncounter(spawn);
  }
}

function checkNearbySpawns() {
  let closestDist = Infinity;
  let closestName = '';
  let closestStreet = '';

  activeSpawns.forEach(s => {
    const d = getDistanceMeters(playerPos.lat, playerPos.lng, s.lat, s.lng);
    if (d < closestDist) {
      closestDist = d;
      closestName = s.type === 'sasha' ? s.data.name : AMMO_TYPES[s.data].name;
      closestStreet = s.streetName || 'Sants';
    }
  });

  const banner = document.getElementById('proximity-banner');
  const text = document.getElementById('proximity-text');
  if (!banner || !text) return;

  if (closestDist <= INTERACTION_RADIUS_METERS) {
    text.innerHTML = `🎯 <b>${closestName}</b> a l'abast (${Math.round(closestDist)}m)! Toca per interactuar!`;
    banner.style.borderColor = '#4ade80';
  } else if (closestDist < 120) {
    text.innerHTML = `📡 <b>${closestName}</b> a <b>${Math.round(closestDist)}m</b> (${closestStreet}).`;
    banner.style.borderColor = '#ffb703';
  } else {
    text.innerHTML = `🧭 Explora els carrers de Sants per trobar les teves Sashes preferides!`;
    banner.style.borderColor = 'var(--c-primary-light)';
  }
}

/* ══════════════════════════════════════════════════════════
   PANTALLA DE TROBADA, MOVIMENT DINÀMIC I CAPTURA
══════════════════════════════════════════════════════════ */
function openEncounter(spawn) {
  sounds.playPop();
  
  currentEncounter = {
    spawn: spawn,
    sasha: spawn.data,
    isCalmed: false,
    isCatching: false,
    ringScale: 1.0,
    ringDir: -1,
    // Moviment dinàmic de la Sasha a l'arena segons raresa
    posX: 0,
    posY: 0,
    targetPosX: 0,
    targetPosY: 0,
    moveSpeed: getRarityMoveSpeed(spawn.data.rarity),
    lastShiftTime: Date.now(),
    shiftInterval: getRarityShiftInterval(spawn.data.rarity)
  };

  const sasha = spawn.data;
  document.getElementById('encounter-name').textContent = sasha.name;
  document.getElementById('encounter-profession').textContent = sasha.profession;
  const badge = document.getElementById('encounter-rarity');
  badge.textContent = sasha.rarity.toUpperCase();
  badge.className = `encounter-badge ${sasha.rarityClass}`;

  const sashaImg = document.getElementById('encounter-sasha-img');
  sashaImg.src = sasha.img;
  sashaImg.className = 'encounter-sasha-sprite';

  renderCatchAmmoBar();
  updateActivePastryVisual();

  // Mostrar overlay de captura
  document.getElementById('catch-screen').classList.remove('hidden');

  // Iniciar animació de l'anell de captura i moviment de la Sasha
  startCatchRingLoop();
  startSashaMovementLoop();
}

function closeEncounter() {
  if (ringAnimFrame) cancelAnimationFrame(ringAnimFrame);
  if (arenaAnimFrame) cancelAnimationFrame(arenaAnimFrame);
  
  const targetWrap = document.getElementById('sasha-target');
  if (targetWrap) targetWrap.style.transform = '';
  
  document.getElementById('catch-screen').classList.add('hidden');
  currentEncounter = null;
}

/* ── CONFIGURACIÓ DE DIFICULTAT I MOVIMENT PER RARESA ──────── */
function getRarityMoveSpeed(rarity) {
  switch (rarity) {
    case 'Mítica': return 0.08;
    case 'Èpica':  return 0.06;
    case 'Rara':   return 0.04;
    default:       return 0.025; // Comuna
  }
}

function getRarityShiftInterval(rarity) {
  switch (rarity) {
    case 'Mítica': return 1200; // Canvia de direcció molt ràpid
    case 'Èpica':  return 1700;
    case 'Rara':   return 2400;
    default:       return 3500;
  }
}

function getRarityRingSpeed(rarity, ammoMultiplier, isCalmed) {
  if (isCalmed) return 0.012;
  
  let baseSpeed = 0.015;
  if (rarity === 'Rara')   baseSpeed = 0.022;
  if (rarity === 'Èpica')  baseSpeed = 0.030;
  if (rarity === 'Mítica') baseSpeed = 0.040;

  return Math.max(0.010, baseSpeed / (ammoMultiplier * 0.85));
}

/* ── MOVIMENT DINÀMIC DE LA SASHA DURANT LA CAPTURA ──────── */
function startSashaMovementLoop() {
  const targetWrap = document.getElementById('sasha-target');
  if (!targetWrap) return;

  function loop() {
    if (!currentEncounter) return;

    const sasha = currentEncounter.sasha;
    const now = Date.now();

    // Si està calmada amb Te de Maracujà, es queda al centre
    if (currentEncounter.isCalmed) {
      currentEncounter.targetPosX = 0;
      currentEncounter.targetPosY = 0;
    } else if (now - currentEncounter.lastShiftTime > currentEncounter.shiftInterval) {
      currentEncounter.lastShiftTime = now;

      // Amplitud de desplaçament segons raresa
      let maxRangeX = 35;
      let maxRangeY = 15;
      if (sasha.rarity === 'Rara')   { maxRangeX = 75;  maxRangeY = 30; }
      if (sasha.rarity === 'Èpica')  { maxRangeX = 110; maxRangeY = 45; }
      if (sasha.rarity === 'Mítica') { maxRangeX = 140; maxRangeY = 60; }

      // Nova posició objectiu
      currentEncounter.targetPosX = (Math.random() - 0.5) * 2 * maxRangeX;
      currentEncounter.targetPosY = (Math.random() - 0.5) * 2 * maxRangeY;
    }

    // Interpolació suau cap a la posició objectiu (lerp)
    currentEncounter.posX += (currentEncounter.targetPosX - currentEncounter.posX) * currentEncounter.moveSpeed;
    currentEncounter.posY += (currentEncounter.targetPosY - currentEncounter.posY) * currentEncounter.moveSpeed;

    targetWrap.style.transform = `translate(${currentEncounter.posX}px, ${currentEncounter.posY}px)`;

    arenaAnimFrame = requestAnimationFrame(loop);
  }

  arenaAnimFrame = requestAnimationFrame(loop);
}

function startCatchRingLoop() {
  const ring = document.getElementById('catch-ring');
  if (!ring) return;

  function loop() {
    if (!currentEncounter) return;

    const sasha = currentEncounter.sasha;
    const ammo = AMMO_TYPES[selectedAmmo];
    const difficulty = (sasha ? sasha.catchDifficulty : 0.5) / (ammo.multiplier * (currentEncounter.isCalmed ? 1.4 : 1.0));

    // Color de l'anell segons dificultat actual
    if (difficulty < 0.40) {
      ring.style.borderColor = '#4ade80'; // Fàcil (Verd)
    } else if (difficulty < 0.70) {
      ring.style.borderColor = '#fbbf24'; // Mitjà (Groc/Taronja)
    } else {
      ring.style.borderColor = '#f87171'; // Difícil (Vermell)
    }

    const ringSpeed = getRarityRingSpeed(sasha.rarity, ammo.multiplier, currentEncounter.isCalmed);
    currentEncounter.ringScale += currentEncounter.ringDir * ringSpeed;

    const minScale = sasha.rarity === 'Mítica' ? 0.25 : sasha.rarity === 'Èpica' ? 0.32 : 0.40;
    if (currentEncounter.ringScale <= minScale) currentEncounter.ringDir = 1;
    if (currentEncounter.ringScale >= 1.25) currentEncounter.ringDir = -1;

    ring.style.transform = `scale(${currentEncounter.ringScale})`;
    ringAnimFrame = requestAnimationFrame(loop);
  }
  ringAnimFrame = requestAnimationFrame(loop);
}

function renderCatchAmmoBar() {
  const bar = document.getElementById('catch-ammo-bar');
  if (!bar) return;
  bar.innerHTML = '';

  Object.values(AMMO_TYPES).forEach(ammo => {
    const count = ammoInventory[ammo.id] || 0;
    const btn = document.createElement('button');
    btn.className = `catch-ammo-btn ${selectedAmmo === ammo.id ? 'active' : ''}`;
    btn.innerHTML = `<span>${ammo.icon}</span> <span>${ammo.name} (${count})</span>`;
    btn.addEventListener('click', () => {
      selectedAmmo = ammo.id;
      renderCatchAmmoBar();
      updateActivePastryVisual();
      updateHUD();
    });
    bar.appendChild(btn);
  });
}

function updateActivePastryVisual() {
  const img = document.getElementById('throwable-img');
  const ammo = AMMO_TYPES[selectedAmmo];
  if (img && ammo) {
    img.src = ammo.img;
  }
}

/* ── FÍSICA I INTERACCIÓ DE LLANÇAMENT ───────────────────── */
function setupThrowInteraction() {
  const pastry = document.getElementById('active-pastry');
  if (!pastry) return;

  let isDragging = false;
  let startY = 0;
  let startX = 0;

  // Touch & Pointer events
  pastry.addEventListener('pointerdown', (e) => {
    if (currentEncounter?.isCatching) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    pastry.setPointerCapture(e.pointerId);
  });

  pastry.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    const deltaX = e.clientX - startX;
    if (deltaY < 0) { // Només amunt
      pastry.style.transform = `translate(calc(-50% + ${deltaX * 0.5}px), ${deltaY * 0.5}px) scale(0.95)`;
    }
  });

  const onRelease = (e) => {
    if (!isDragging) return;
    isDragging = false;
    const deltaY = e.clientY - startY;
    const deltaX = e.clientX - startX;

    if (deltaY < -35) {
      // Llançament executat amb swipe
      executeThrow(deltaX, deltaY);
    } else {
      // Retorn a posició d'espera
      pastry.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      pastry.style.transform = 'translateX(-50%)';
      setTimeout(() => { pastry.style.transition = ''; }, 200);
    }
  };

  pastry.addEventListener('pointerup', onRelease);
  pastry.addEventListener('pointercancel', onRelease);

  // Clic simple directe
  pastry.addEventListener('click', () => {
    if (!currentEncounter?.isCatching && !isDragging) {
      executeThrow(0, -150);
    }
  });
}

function executeThrow(dx, dy) {
  if (!currentEncounter || currentEncounter.isCatching) return;

  // Comprovar munició
  if ((ammoInventory[selectedAmmo] || 0) <= 0) {
    showToast(`No et queden ${AMMO_TYPES[selectedAmmo].name}! Recull-ne més als carrers de Sants.`);
    return;
  }

  // Descomptar munició
  ammoInventory[selectedAmmo]--;
  updateHUD();
  renderCatchAmmoBar();
  saveData();

  currentEncounter.isCatching = true;
  sounds.playWhoosh();

  const pastry = document.getElementById('active-pastry');
  const targetWrap = document.getElementById('sasha-target');
  const sashaImg = document.getElementById('encounter-sasha-img');

  // Posició de la Sasha al moment del tir
  const targetCurrentX = currentEncounter.posX || 0;

  // Animació de vol del pastís cap a la posició de la Sasha
  pastry.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  pastry.style.transform = `translate(calc(-50% + ${targetCurrentX * 0.85}px), -320px) scale(0.4) rotate(${dx * 2}deg)`;
  pastry.style.opacity = '0.9';

  setTimeout(() => {
    pastry.style.transition = '';
    pastry.style.transform = 'translateX(-50%)';
    pastry.style.opacity = '1';

    const sasha = currentEncounter.sasha;
    const ammo = AMMO_TYPES[selectedAmmo];

    // Efecte de Te de Maracujà (calma la Sasha)
    if (ammo.effect === 'calm') {
      currentEncounter.isCalmed = true;
      showToast('🫐 La Sasha s\'ha calmat amb el Te de Maracujà!');
    }

    // Probabilitat de salt/esquiva depenent de la raresa i si està calmada
    let dodgeBaseChance = sasha.catchDifficulty * 0.75;
    if (sasha.rarity === 'Mítica') dodgeBaseChance = 0.88;
    if (sasha.rarity === 'Èpica')  dodgeBaseChance = 0.75;
    if (currentEncounter.isCalmed) dodgeBaseChance = 0.15;

    if (Math.random() < dodgeBaseChance) {
      // Esquiva àgil!
      targetWrap.classList.add('sasha-jump');
      showToast(`🐾 La ${sasha.name} ha esquivat el pastís d'un salt!`);
      setTimeout(() => {
        targetWrap.classList.remove('sasha-jump');
        if (currentEncounter) currentEncounter.isCatching = false;
      }, 700);
      return;
    }

    // La Sasha s'engoleix el pastís!
    sashaImg.classList.add('sasha-eat');
    sounds.playPop();

    // Càlcul de captura reeixida MÉS DIFÍCIL
    const ringPrecisionBonus = (1.25 - (currentEncounter.ringScale || 1.0)) * 0.15;
    const baseCatchRate = Math.max(0.01, 1.0 - (sasha.catchDifficulty * 1.25));
    const totalCatchProbability = Math.min(0.92, (baseCatchRate * ammo.multiplier) + ringPrecisionBonus + (currentEncounter.isCalmed ? 0.1 : 0));

    const isCaught = Math.random() < totalCatchProbability;

    setTimeout(() => {
      sashaImg.classList.remove('sasha-eat');

      if (isCaught) {
        // Captura completada!
        handleCatchSuccess(sasha);
      } else {
        // Encara té gana
        showToast(`😋 A la ${sasha.name} li ha encantat el dolç, però encara en vol més!`);
        if (currentEncounter) currentEncounter.isCatching = false;
      }
    }, 750);

  }, 600);
}

function handleCatchSuccess(sasha) {
  sounds.playCatchSuccess();

  // Guardar captura
  caughtSashas[sasha.id] = (caughtSashas[sasha.id] || 0) + 1;
  score += sasha.points;

  updateHUD();
  saveData();

  // Eliminar spawn del mapa
  if (currentEncounter?.spawn) {
    try {
      map.removeLayer(currentEncounter.spawn.marker);
    } catch (e) {}
    activeSpawns = activeSpawns.filter(s => s.id !== currentEncounter.spawn.id);
  }

  // Tancar pantalla de trobada i obrir celebració
  closeEncounter();
  showCelebrationModal(sasha);
}

function showCelebrationModal(sasha) {
  const modal = document.getElementById('catch-celebration-modal');
  document.getElementById('caught-modal-img').src = sasha.img;
  document.getElementById('caught-modal-name').textContent = sasha.name;
  document.getElementById('caught-modal-bio').textContent = sasha.bio;
  document.getElementById('caught-modal-points').textContent = `+${sasha.points} Punts Afegits!`;
  
  const rarityPill = document.getElementById('caught-modal-rarity');
  rarityPill.textContent = sasha.rarity.toUpperCase();
  rarityPill.className = `caught-rarity-pill ${sasha.rarityClass}`;

  modal.classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════
   SASHADEX (ÀLBUM DE COL·LECCIÓ)
══════════════════════════════════════════════════════════ */
function renderSashaDex() {
  const grid = document.getElementById('dex-grid');
  if (!grid) return;
  grid.innerHTML = '';

  let discoveredCount = 0;
  let totalCaughtSum = 0;

  SASHAS_DATABASE.forEach(sasha => {
    const count = caughtSashas[sasha.id] || 0;
    const isDiscovered = count > 0;
    if (isDiscovered) {
      discoveredCount++;
      totalCaughtSum += count;
    }

    const card = document.createElement('div');
    card.className = `dex-item ${isDiscovered ? 'discovered' : 'locked'}`;
    card.innerHTML = `
      <span class="dex-item-badge ${sasha.rarityClass}">${sasha.rarity}</span>
      <img src="${sasha.img}" alt="${isDiscovered ? sasha.name : '???'}" class="dex-item-img" />
      <span class="dex-item-name">${isDiscovered ? sasha.name : '???'}</span>
      <span class="dex-item-count">${isDiscovered ? `Capturades: ${count}` : 'No trobada'}</span>
    `;

    if (isDiscovered) {
      card.addEventListener('click', () => showSashaDetail(sasha, count));
    } else {
      card.addEventListener('click', () => {
        showToast(`🔍 Troba la ${sasha.name} passejant pels carrers de Sants!`);
      });
    }

    grid.appendChild(card);
  });

  document.getElementById('dex-discovered-num').textContent = `${discoveredCount}/${SASHAS_DATABASE.length}`;
  document.getElementById('dex-total-caught-num').textContent = totalCaughtSum;
  document.getElementById('dex-completion-pct').textContent = `${Math.round((discoveredCount / SASHAS_DATABASE.length) * 100)}%`;
}

function showSashaDetail(sasha, count) {
  const modal = document.getElementById('sasha-detail-modal');
  const content = document.getElementById('sasha-detail-content');

  content.innerHTML = `
    <button class="dex-close-btn" style="position:absolute;top:16px;right:16px;background:#eee;color:#333;" id="close-detail-btn">✕</button>
    <div class="caught-rarity-pill ${sasha.rarityClass}">${sasha.rarity.toUpperCase()}</div>
    <h2>${sasha.name}</h2>
    <div style="font-weight:700;color:var(--c-primary);margin-bottom:12px;">${sasha.profession}</div>
    <img src="${sasha.img}" alt="${sasha.name}" class="sasha-detail-img" />
    <p style="font-size:0.9rem;color:#555;margin:12px 0;">${sasha.bio}</p>
    <div style="background:#f8f9fa;border-radius:14px;padding:8px 14px;font-size:0.85rem;font-weight:800;color:#666;margin-bottom:14px;">
      🎯 Total capturades: <span style="color:var(--c-primary-dark);font-size:1.1rem;">${count}</span>
    </div>
    <button id="btn-share-sticker" class="dex-close-btn" style="background:#25D366; color:white; width:100%; border-radius:12px; margin-top:8px;">
      💬 Enviar com a Sticker a WhatsApp
    </button>
  `;

  modal.classList.remove('hidden');
  
  document.getElementById('close-detail-btn')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('btn-share-sticker')?.addEventListener('click', async () => {
    try {
      const response = await fetch(sasha.img);
      const blob = await response.blob();
      const file = new File([blob], `sasha_${sasha.name.replace(/\s+/g, '_')}.png`, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Sticker de la ${sasha.name}`,
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sasha_${sasha.name.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('💾 Imatge descarregada. Ara la pots enviar pel WhatsApp com a sticker!');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ No s\'ha pogut preparar l\'sticker.');
    }
  });
}

/* ══════════════════════════════════════════════════════════
   EXPLORADOR DE ZONES DE SANTS
══════════════════════════════════════════════════════════ */
function renderZonesModal() {
  const list = document.getElementById('zones-list');
  if (!list) return;
  list.innerHTML = '';

  SANTS_LANDMARKS.forEach(zone => {
    const btn = document.createElement('button');
    btn.className = `zone-item-btn ${zone.isGuadiana ? 'guadiana-zone' : ''}`;
    btn.innerHTML = `
      <span class="zone-item-name">${zone.name}</span>
      <span class="zone-item-desc">${zone.desc}</span>
    `;

    btn.addEventListener('click', () => {
      travelToZone(zone);
      document.getElementById('zones-modal')?.classList.add('hidden');
    });

    list.appendChild(btn);
  });
}

function travelToZone(zone) {
  // Moure mapa i avatar cap a la zona
  playerPos.lat = zone.lat;
  playerPos.lng = zone.lng;
  isSimulatorMode = true;

  document.getElementById('sim-joystick')?.classList.remove('hidden');
  document.getElementById('gps-text').textContent = '🕹️ Mode Simulador Sants';

  updatePlayerPosition();
  map.setView([zone.lat, zone.lng], 18, { animate: true });
  showToast(`🚶 Has viatjat a ${zone.name}!`);
}

/* ── EVENTS DE LA UI I SIMULADOR ─────────────────────────── */
function setupUIEvents() {
  // Modal Benvinguda
  document.getElementById('start-game-btn')?.addEventListener('click', () => {
    document.getElementById('welcome-modal').classList.add('hidden');
  });

  // Modal Celebració
  document.getElementById('celebration-continue-btn')?.addEventListener('click', () => {
    document.getElementById('catch-celebration-modal').classList.add('hidden');
  });

  // Botó SashaDex
  document.getElementById('open-dex-btn')?.addEventListener('click', () => {
    renderSashaDex();
    document.getElementById('sashadex-modal').classList.remove('hidden');
  });

  document.getElementById('close-dex-btn')?.addEventListener('click', () => {
    document.getElementById('sashadex-modal').classList.add('hidden');
  });

  // Botó Zones de Sants
  document.getElementById('btn-open-zones')?.addEventListener('click', () => {
    renderZonesModal();
    document.getElementById('zones-modal').classList.remove('hidden');
  });

  document.getElementById('close-zones-btn')?.addEventListener('click', () => {
    document.getElementById('zones-modal').classList.add('hidden');
  });

  // Botó fugir de captura
  document.getElementById('catch-escape-btn')?.addEventListener('click', () => {
    closeEncounter();
  });

  // Botó recentrar mapa
  document.getElementById('btn-recenter')?.addEventListener('click', () => {
    if (map) map.setView([playerPos.lat, playerPos.lng], 18, { animate: true });
  });

  // Botó ajuda
  document.getElementById('btn-help')?.addEventListener('click', () => {
    document.getElementById('welcome-modal').classList.remove('hidden');
  });

  // Botó activar/desactivar simulador
  document.getElementById('btn-toggle-sim')?.addEventListener('click', () => {
    isSimulatorMode = !isSimulatorMode;
    const joystick = document.getElementById('sim-joystick');
    if (isSimulatorMode) {
      joystick.classList.remove('hidden');
      document.getElementById('gps-text').textContent = '🕹️ Mode Simulador Sants';
      showToast('🕹️ Mode Simulador activat! Fes servir el D-Pad o les tecles WASD/Fletxes.');
    } else {
      joystick.classList.add('hidden');
      startGeolocationTracking();
      showToast('📍 Mode GPS Real reactivat.');
    }
  });

  // Controls del D-Pad
  const STEP = 0.00015; // ~15 metres per pas
  document.getElementById('btn-move-up')?.addEventListener('click', () => movePlayer(STEP, 0));
  document.getElementById('btn-move-down')?.addEventListener('click', () => movePlayer(-STEP, 0));
  document.getElementById('btn-move-left')?.addEventListener('click', () => movePlayer(0, -STEP));
  document.getElementById('btn-move-right')?.addEventListener('click', () => movePlayer(0, STEP));
  document.getElementById('btn-spawn-nearby')?.addEventListener('click', () => {
    spawnWildSasha();
    spawnWildPastry();
    showToast('✨ Nova Sasha i dolços apareguts als carrers propers!');
  });

  // Controls de Teclat (WASD / Fletxes) limitats al mode testing
  window.addEventListener('keydown', (e) => {
    const isTestingMode = new URLSearchParams(window.location.search).get('testing') === 'true';
    if (!isTestingMode) return;

    if (!isSimulatorMode && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)) {
      isSimulatorMode = true;
      document.getElementById('sim-joystick')?.classList.remove('hidden');
      const gpsText = document.getElementById('gps-text');
      if (gpsText) gpsText.textContent = '🕹️ Mode Simulador Sants';
    }

    if (isSimulatorMode) {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') movePlayer(STEP, 0);
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') movePlayer(-STEP, 0);
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') movePlayer(0, -STEP);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') movePlayer(0, STEP);
    }
  });

  // Selector d'inventari inferior
  document.querySelectorAll('.ammo-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-ammo');
      if (type) {
        selectedAmmo = type;
        updateHUD();
      }
    });
  });
}

function movePlayer(dLat, dLng) {
  playerPos.lat += dLat;
  playerPos.lng += dLng;
  updatePlayerPosition();
  map.panTo([playerPos.lat, playerPos.lng], { animate: true, duration: 0.2 });
}

/* ── ACTUALITZACIÓ HUD ───────────────────────────────────── */
function updateHUD() {
  document.getElementById('hud-score').textContent = score;
  
  const caughtCount = Object.keys(caughtSashas).length;
  document.getElementById('hud-caught-count').textContent = caughtCount;
  const totalEl = document.getElementById('hud-total-sashas');
  if (totalEl) totalEl.textContent = SASHAS_DATABASE.length;

  // Actualitzar comptadors d'inventari
  Object.keys(ammoInventory).forEach(k => {
    const el = document.getElementById(`count-${k}`);
    if (el) el.textContent = ammoInventory[k] || 0;
  });

  // Classe activa a l'inventari inferior
  document.querySelectorAll('.ammo-item').forEach(item => {
    const type = item.getAttribute('data-ammo');
    if (type === selectedAmmo) item.classList.add('active');
    else item.classList.remove('active');
  });
}
