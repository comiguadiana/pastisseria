import { requireAuth, renderNavbarUser, getDiceBearUrl } from '../../assets/js/auth.js';
import { GAMES, saveScore, getGameRanking, renderRankingTable, showNewRecordModal } from '../../assets/js/ranking.js';

let currentUser = null;
let currentProfile = null;

// Espera a que DOM i Auth estiguin llestos
document.addEventListener('DOMContentLoaded', () => {
  requireAuth('../../login.html?next=games/raco-edurne/index.html')
    .then(({ user, profile }) => {
      currentUser = user;
      currentProfile = profile;
      renderNavbarUser(profile, user);
      initGame();
    })
    .catch(() => {}); // Si no està loguejat, redirigeix
});

function initGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const livesElement = document.getElementById('lives');
  const scoreElement = document.getElementById('score');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const overlay = document.getElementById('game-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-msg');
  const startBtn = document.getElementById('start-btn');

  // Configuración del juego
  const config = {
    width: canvas.parentElement.clientWidth,
    height: canvas.parentElement.clientHeight,
    lives: 3,
    score: 0,
    player: {
      width: 80,
      height: 80,
      x: 0,
      y: 0,
      speed: 8,
    },
    balls: [],
    ballSpeed: 2,
    ballSize: 50,
    ballImages: ['planeta1.png', 'planeta2.png', 'planeta3.png', 'planeta4.png', 'planeta5.png', 'planeta6.png', 'planeta7.png', 'planeta8.png'],
    playerImages: ['alien1.png', 'alien2.png', 'alien3.png', 'alien4.png', 'alien5.png', 'alien6.png', 'alien7.png', 'alien8.png', 'alien9.png', 'alien10.png', 'alien11.png', 'alien12.png', 'alien13.png', 'alien14.png', 'alien15.png'],
    currentPlayerImage: null,
    gameRunning: false,
    keys: { left: false, right: false },
    lastFrameTime: 0,
    spawnRate: 0.02,
  };

  // Cargar imágenes
  const ballImages = {};
  config.ballImages.forEach(src => {
    ballImages[src] = new Image();
    ballImages[src].src = `img/${src}`;
  });

  const playerImages = {};
  config.playerImages.forEach(src => {
    playerImages[src] = new Image();
    playerImages[src].src = `img/${src}`;
  });

  const backgroundImage = new Image();
  backgroundImage.src = 'img/fondo.jpg';

  function resizeCanvas() {
    config.width = canvas.parentElement.clientWidth;
    canvas.width = config.width;
    canvas.height = canvas.clientHeight || 340;
    config.height = canvas.height;
    
    config.player.width = Math.min(80, Math.max(50, config.width * 0.18));
    config.player.height = config.player.width;
    config.player.y = config.height - config.player.height - 15;
    
    if (!config.gameRunning && (config.player.x === 0 || config.player.x > config.width)) {
      config.player.x = config.width / 2 - config.player.width / 2;
    }
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas(); // Inicialitzem
  
  // Renderitzem un frame només carregar fons per si de cas
  backgroundImage.onload = () => {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  };

  function selectRandomPlayer() {
    const randomPlayer = config.playerImages[Math.floor(Math.random() * config.playerImages.length)];
    config.currentPlayerImage = playerImages[randomPlayer];
  }

  function drawBackground() {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  }

  function drawPlayer() {
    if (!config.currentPlayerImage) return;
    ctx.drawImage(
      config.currentPlayerImage,
      config.player.x,
      config.player.y,
      config.player.width,
      config.player.height
    );
  }

  function createBall() {
    const randomBall = config.ballImages[Math.floor(Math.random() * config.ballImages.length)];
    config.balls.push({
      x: Math.random() * (canvas.width - config.ballSize),
      y: -config.ballSize,
      speed: config.ballSpeed + (Math.random() * 2) + (config.score * 0.05), // Aumenta dificultad
      image: ballImages[randomBall],
    });
  }

  function drawBalls() {
    config.balls.forEach((ball, index) => {
      ctx.drawImage(ball.image, ball.x, ball.y, config.ballSize, config.ballSize);
      ball.y += ball.speed;

      // Colisión con el jugador
      if (
        ball.y + config.ballSize > config.player.y &&
        ball.x + config.ballSize > config.player.x &&
        ball.x < config.player.x + config.player.width
      ) {
        config.balls.splice(index, 1);
        config.score++;
        scoreElement.textContent = config.score;
        
        // Cada 10 punts puja el ritme de caiguda
        if (config.score % 10 === 0) {
          config.spawnRate += 0.005;
        }
      }

      // Pelota fuera de la pantalla
      if (ball.y > canvas.height) {
        config.balls.splice(index, 1);
        config.lives--;
        livesElement.textContent = config.lives;
        if (config.lives <= 0) {
          endGame();
        }
      }
    });
  }

  function movePlayer() {
    if (!config.gameRunning) return;
    if (config.keys.left && config.player.x > 0) {
      config.player.x -= config.player.speed;
    }
    if (config.keys.right && config.player.x < canvas.width - config.player.width) {
      config.player.x += config.player.speed;
    }
  }

  async function endGame() {
    config.gameRunning = false;
    
    // Desa al firebase del 2026
    const isRecord = await saveScore(GAMES.RACO_EDURNE, currentUser.uid, config.score, currentProfile);
    
    overlayTitle.textContent = "Has Perdut!";
    overlayMsg.textContent = `Has salvat ${config.score} planetes.`;
    startBtn.textContent = "TORNA A JUGAR";
    overlay.classList.remove('hidden');

    if (isRecord) {
      setTimeout(() => {
        showNewRecordModal(config.score);
      }, 500);
    }
  }

  function startGame() {
    config.lives = 3;
    config.score = 0;
    config.balls = [];
    config.spawnRate = 0.02;
    livesElement.textContent = config.lives;
    scoreElement.textContent = config.score;
    config.gameRunning = true;
    overlay.classList.add('hidden');
    selectRandomPlayer();
    resizeCanvas();
    requestAnimationFrame(gameLoop);
  }

  function gameLoop(timestamp) {
    if (!config.gameRunning) return;
    
    // Controlar framerate independent
    const dt = timestamp - config.lastFrameTime;
    config.lastFrameTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawPlayer();
    drawBalls();
    movePlayer();

    // Crear pelotas aleatoriamente
    if (Math.random() < config.spawnRate) {
      createBall();
    }

    requestAnimationFrame(gameLoop);
  }

  startBtn.addEventListener('click', startGame);

  // Controls tàctils / ratolí (Botons de sota)
  const pressLeft = (e) => { e.preventDefault(); config.keys.left = true; };
  const releaseLeft = (e) => { e.preventDefault(); config.keys.left = false; };
  const pressRight = (e) => { e.preventDefault(); config.keys.right = true; };
  const releaseRight = (e) => { e.preventDefault(); config.keys.right = false; };

  leftBtn.addEventListener('mousedown', pressLeft);
  leftBtn.addEventListener('touchstart', pressLeft);
  window.addEventListener('mouseup', releaseLeft);
  leftBtn.addEventListener('touchend', releaseLeft);

  rightBtn.addEventListener('mousedown', pressRight);
  rightBtn.addEventListener('touchstart', pressRight);
  window.addEventListener('mouseup', releaseRight);
  rightBtn.addEventListener('touchend', releaseRight);

  // Teclat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') config.keys.left = true;
    if (e.key === 'ArrowRight') config.keys.right = true;
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') config.keys.left = false;
    if (e.key === 'ArrowRight') config.keys.right = false;
  });
  
  // Tàctil directe al canvas
  canvas.addEventListener('touchmove', (e) => {
    if (!config.gameRunning) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    config.player.x = Math.max(0, Math.min(canvas.width - config.player.width, touchX - config.player.width/2));
  }, { passive: false });
}
