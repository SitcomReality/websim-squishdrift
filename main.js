import { GameEngine } from './src/app/core/GameEngine.js';
import { createLoop } from './src/app/loop.js';
import { LoadingSystem } from './loading.js';
import { Vec2 } from './src/utils/Vec2.js';

// Create global loading system
const loadingSystem = new LoadingSystem();

// Make game globally accessible for title screen reset
window.game = null;

// Game elements - initialize game first
const canvas = document.getElementById('game');

let game = null; // defer creation until initializeWithLoading()
window.game = null;
let gameStarted = false;
let gameLoop = null;

// Modify GameEngine to use loading system
async function initializeWithLoading() {
  try {
    // Show loading screen and load assets
    const loadedAssets = await loadingSystem.loadAssets();
    
    // Initialize game with loaded assets (single authoritative instance)
    game = new GameEngine(canvas);
    window.game = game; // Make globally accessible
    
    // Pass loaded assets to game state
    if (game.stateManager && game.stateManager.state) {
      Object.assign(game.stateManager.state, loadedAssets);
    }
    
    // Setup audio controls after game is initialized
    setupAudioControls();
    
    // Create paused game loop
    gameLoop = createLoop({
      update: (dt) => {
        // Always update the input manager to detect gamepad presses on title/death screens
        if (game && game.inputManager) {
          game.inputManager.update();
        }
        if (gameStarted) {
          game.update(dt);
        }
      },
      render: (interp) => {
        if (gameStarted) {
          game.render(interp);
        }
      },
    });
    // expose loop + unified starter for TitleScreen/mobile
    window.gameLoop = gameLoop;
    window.__startGame = () => {
      if (gameStarted) return;
      gameStarted = true;
      loadingSystem.hideTitleScreen();
      // The loop is already running, so we don't need to start it here.
    };
    
    // Start the loop immediately so input is processed on title screen.
    gameLoop.start();
    
    // Show title screen
    loadingSystem.showTitleScreen();
    
    // Add start button listener with music
    const startButton = document.getElementById('start-button');
    if (startButton) {
      startButton.addEventListener('click', () => {
        window.__startGame(); // use unified starter
      });
    }
    
  } catch (error) {
    console.error('Failed to initialize a game:', error);
    // Fallback to basic initialization without loading screen
    game = new GameEngine(canvas);
    window.game = game; // Make globally accessible
    
    // Setup audio controls even in fallback
    setupAudioControls();
    
    gameLoop = createLoop({
      update: (dt) => game.update(dt),
      render: (interp) => game.render(interp),
    });
    gameStarted = true;
    gameLoop.start();
  }
}

// Add audio control setup after game initialization
function setupAudioControls() {
  const sfxVolume = document.getElementById('volume-sfx');
  const musicVolume = document.getElementById('volume-music');
  const muteSfx = document.getElementById('mute-sfx');
  const muteMusic = document.getElementById('mute-music');

  if (!game || !game.audioManager) return;

  // Set initial values
  sfxVolume.value = Math.round(game.audioManager.sfxVolume * 100);
  musicVolume.value = Math.round(game.audioManager.musicVolume * 100);

  // Event listeners
  sfxVolume.addEventListener('input', (e) => {
    game.audioManager.setSfxVolume(e.target.value / 100);
  });

  musicVolume.addEventListener('input', (e) => {
    game.audioManager.setMusicVolume(e.target.value / 100);
  });

  muteSfx.addEventListener('click', () => {
    const isMuted = game.audioManager.toggleSfxMute();
    muteSfx.textContent = isMuted ? '🔇 SFX' : '🔊 SFX';
    muteSfx.setAttribute('aria-pressed', isMuted);
  });

  muteMusic.addEventListener('click', () => {
    const isMuted = game.audioManager.toggleMusicMute();
    muteMusic.textContent = isMuted ? '🔇 Music' : '🎵 Music';
    muteMusic.setAttribute('aria-pressed', isMuted);
  });
}

// Replace direct initialization with loading system
initializeWithLoading();

// Add a handler for the on-page restart button so it triggers the same 'game-restart' event
const restartBtn = document.getElementById('restart-button');
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    console.log('Restart button clicked (UI)');
    window.dispatchEvent(new CustomEvent('game-restart'));
  });
}

// Show zoom indicator (optional unobtrusive)
function updateZoomUI(){
  const zoomEl = document.getElementById('zoom-indicator');
  if (!zoomEl || !game || !game.stateManager) return;
  
  const state = game.stateManager.getState?.();
  if (state?.camera) {
    zoomEl.textContent = `Zoom: ${(state.camera.zoom || 1).toFixed(1)}x`;
  }
}

setInterval(updateZoomUI, 200);

window.addEventListener('resize', () => {
  if (game && game.renderer && game.renderer.resizeToDisplay) {
    game.renderer.resizeToDisplay();
  }
});

// Defer initial resize until game exists; guard access
if (game && game.renderer && game.renderer.resizeToDisplay) {
  game.renderer.resizeToDisplay();
}