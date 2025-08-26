import { Vec2 } from '../../../utils/Vec2.js';

export class DeathSystem {
  constructor() {
    this.isDead = false;
    this.deathTime = 0;
    this.fadeDuration = 2000; // 2 seconds
    this.blackScreen = false;
  }

  update(state, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player || !player.health) return;

    // Check if player is dead
    if (player.health.hp <= 0 && !this.isDead) {
      this.handlePlayerDeath(state);
    }

    // Check if player is in a vehicle that gets destroyed
    this.checkVehicleDestruction(state);

    // Check if vehicles (including player vehicle) go outside map
    this.checkMapBoundaries(state);

    // Update death screen if player is dead
    if (this.isDead) {
      this.updateDeathScreen(state, dt);
    }
  }

  checkVehicleDestruction(state) {
    if (!state.control?.inVehicle) return;
    
    const vehicle = state.control.vehicle;
    if (!vehicle || !vehicle.health) return;
    
    if (!vehicle.health.isAlive()) {
      // Vehicle destroyed while player is inside - instant death
      this.handlePlayerDeath(state);
    }
  }

  checkMapBoundaries(state) {
    const map = state.world?.map;
    if (!map) return;
    
    // Check all vehicles
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const entity = state.entities[i];
      if (entity.type === 'vehicle') {
        // Check if vehicle is outside map boundaries
        if (entity.pos.x < 0 || entity.pos.x >= map.width || 
            entity.pos.y < 0 || entity.pos.y >= map.height) {
          
          // Special check for player vehicle
          if (state.control?.inVehicle && state.control.vehicle === entity) {
            // Player drove off map - instant death
            this.handlePlayerDeath(state);
          }
          
          // Remove vehicle regardless
          state.entities.splice(i, 1);
        }
      }
    }
  }

  handlePlayerDeath(state) {
    this.isDead = true;
    this.deathTime = Date.now();
    this.createDeathScreen(state);
  }

  createDeathScreen(state) {
    // Create death screen overlay
    const deathOverlay = document.createElement('div');
    deathOverlay.id = 'death-overlay';
    deathOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Noto Sans', system-ui, sans-serif;
      z-index: 1000;
      transition: background 2s ease;
    `;

    deathOverlay.innerHTML = `
      <div id="death-content" style="display: none; text-align: center;">
        <h1 style="font-size: 48px; margin-bottom: 20px;">WASTED</h1>
        <div id="death-stats" style="margin-bottom: 30px; font-size: 18px;">
          <p>Time Alive: <span id="time-alive">0:00</span></p>
          <p>Enemies Eliminated: <span id="enemies-killed">0</span></p>
          <p>Vehicles Destroyed: <span id="vehicles-destroyed">0</span></p>
        </div>
        <button id="restart-button" style="
          padding: 15px 30px;
          font-size: 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid white;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.2)'"
           onmouseout="this.style.background='rgba(255,255,255,0.1)'">
          RESTART
        </button>
      </div>
    `;

    document.body.appendChild(deathOverlay);

    // Start zooming out immediately
    if (state.camera) {
      const defaultZoom = state.camera.defaultZoom || 4;
      const targetZoom = defaultZoom * 0.5; // Zoom out to half the default zoom
      
      // Smooth zoom out over 2 seconds
      const startTime = Date.now();
      const zoomDuration = 2000;
      
      const zoomOut = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / zoomDuration, 1);
        
        // Ease out cubic for smooth zoom
        const easeOut = 1 - Math.pow(1 - progress, 3);
        state.camera.zoom = state.camera.defaultZoom - (state.camera.defaultZoom - targetZoom) * easeOut;
        
        if (progress < 1) {
          requestAnimationFrame(zoomOut);
        }
      };
      
      zoomOut();
    }

    // Use setTimeout to trigger the fade-in animation
    setTimeout(() => {
      deathOverlay.style.background = 'rgba(0, 0, 0, 0.8)';
      
      // After fade completes, show content
      setTimeout(() => {
        const deathContent = document.getElementById('death-content');
        if (deathContent) {
          deathContent.style.display = 'block';
          this.updateDeathStats(state);
        }
      }, 2000);
    }, 100);

    // Add restart button listener using direct assignment to ensure it works
    setTimeout(() => {
      // Query the button inside the overlay to avoid colliding with any other element
      const restartBtn = deathOverlay.querySelector('#restart-button');
      if (restartBtn) {
        console.log('Restart button found in death overlay, adding listener');
        restartBtn.addEventListener('click', () => {
          console.log('Restart button clicked (death overlay)');
          this.restartGame();
        });
      }
    }, 2100); // Wait until after content is shown
  }

  updateDeathScreen(state, dt) {
    // This method is now just for ongoing updates, not for the fade animation
    // The actual fade is handled by CSS transitions and setTimeout
  }

  updateDeathStats(state) {
    // Calculate time alive
    const timeAlive = Math.floor((Date.now() - state.startTime) / 1000);
    const minutes = Math.floor(timeAlive / 60);
    const seconds = timeAlive % 60;
    
    const timeAliveEl = document.getElementById('time-alive');
    if (timeAliveEl) {
      timeAliveEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    const enemiesKilledEl = document.getElementById('enemies-killed');
    if (enemiesKilledEl) {
      enemiesKilledEl.textContent = state.stats?.enemiesKilled || 0;
    }
    
    const vehiclesDestroyedEl = document.getElementById('vehicles-destroyed');
    if (vehiclesDestroyedEl) {
      vehiclesDestroyedEl.textContent = state.stats?.vehiclesDestroyed || 0;
    }
  }

  restartGame() {
    console.log('Restarting game...');
    
    // Remove death overlay
    const deathOverlay = document.getElementById('death-overlay');
    if (deathOverlay) {
      deathOverlay.remove();
    }
    
    // Reset death state
    this.isDead = false;
    this.deathTime = 0;
    this.blackScreen = false;
    
    // Emit restart event
    window.dispatchEvent(new CustomEvent('game-restart'));
  }
}