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
const debugEl = document.getElementById('debug');
const toggleBtn = document.getElementById('toggle-debug');

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
    game = new GameEngine(canvas, { debugEl });
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
    console.error('Failed to initialize game:', error);
    // Fallback to basic initialization without loading screen
    game = new GameEngine(canvas, { debugEl });
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

// Update button and event listeners to wait for initialization
toggleBtn.addEventListener('click', () => {
  console.log('Debug button clicked');
  const next = !game?.debugOverlay?.enabled;
  if (game?.debugOverlay) {
    game.debugOverlay.enabled = next;
  }
  if (debugEl) {
    debugEl.toggleAttribute('hidden', !next);
  }
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-pressed', String(next));
  }
  console.log('Debug overlay enabled:', next);
});

// Add a handler for the on-page restart button so it triggers the same 'game-restart' event
const restartBtn = document.getElementById('restart-button');
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    console.log('Restart button clicked (UI)');
    window.dispatchEvent(new CustomEvent('game-restart'));
  });
}

// Add click handling for debug spawning
canvas.addEventListener('click', (e) => {
  if (!game?.debugOverlay?.enabled) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Convert screen coordinates to world coordinates
  const ts = game.stateManager?.getState?.()?.world?.tileSize || 24;
  const cx = Math.floor(canvas.width / 2);
  const cy = Math.floor(canvas.height / 2);
  const state = game.stateManager?.getState?.();
  
  if (!state) return;
  
  const worldX = (x - cx) / ts + state.camera.x;
  const worldY = (y - cy) / ts + state.camera.y;
  
  const tileX = Math.floor(worldX);
  const tileY = Math.floor(worldY);
  
  if (tileX < 0 || tileY < 0 || tileX >= state.world.map.width || tileY >= state.world.map.height) {
    return;
  }
  
  const tile = state.world.map.tiles[tileY][tileX];
  
  // Check tile type and spawn appropriate entity
  if (tile === 7) { // Footpath - spawn pedestrian
    const pedNodes = state.world.map.peds?.list || [];
    if (pedNodes.length > 0) {
      const nearestNode = pedNodes.reduce((nearest, node) => {
        const dist = Math.hypot(node.x - worldX, node.y - worldY);
        const nearestDist = Math.hypot(nearest.x - worldX, nearest.y - worldY);
        return dist < nearestDist ? node : nearest;
      });
      
      const next = (nearestNode.neighbors && nearestNode.neighbors.length) 
        ? nearestNode.neighbors[Math.floor(state.rand() * nearestNode.neighbors.length)]
        : { x: nearestNode.x, y: nearestNode.y };
      
      state.entities.push({
        type: 'npc',
        pos: new Vec2(worldX, worldY),
        from: { x: Math.floor(worldX), y: Math.floor(worldY) },
        to: next,
        t: 0,
        speed: 2 + state.rand() * 1.5
      });
    }
  } else if ([1, 2, 3, 4, 6].includes(tile)) { // Road tiles - spawn vehicle
    const roads = state.world.map.roads;
    const nearestNode = roads.nodes.reduce((nearest, node) => {
      const dist = Math.hypot(node.x - worldX, node.y - worldY);
      const nearestDist = Math.hypot(nearest.x - worldX, nearest.y - worldY);
      return dist < nearestDist ? node : nearest;
    });
    
    if (nearestNode && nearestNode.next && nearestNode.next.length > 0) {
      const next = nearestNode.next[Math.floor(state.rand() * nearestNode.next.length)];
      
      state.entities.push({
        type: 'vehicle',
        pos: new Vec2(worldX, worldY),
        node: nearestNode,
        next,
        t: 0,
        speed: 6,
        rot: 0,
        vel: { x: 0, y: 0 },
        angularVel: 0,
        ctrl: { throttle: 0, brake: 0, steer: 0 },
        mass: 1200, maxSpeed: 4, engineForce: 900, brakeForce: 1600,
        rollingRes: 1.0, drag: 0.25, grip: 6.0, steerRate: 2.5
      });
    }
  }
});

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