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
    
    // Fade out all audio
    this.fadeOutAllAudio(state);
    
    this.createDeathScreen(state);
  }

  fadeOutAllAudio(state) {
    if (!state.audio) return;
    
    // Stop all loops with fade out
    if (state.audio.loops && state.audio.loops.size) {
      for (const [id] of state.audio.loops) {
        state.audio.stopLoop(id, { fadeOut: 1.0 });
      }
    }
    
    // Stop engine audio system
    if (state.engineAudioSystem) {
      state.engineAudioSystem.stopAll();
    }
    
    // Stop any other playing sounds
    if (state.audio.stopAll) {
      state.audio.stopAll();
    }
  }

  createDeathScreen(state) {
    const overlay = document.getElementById('wasted-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
    
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
  }

  updateDeathScreen(state, dt) {
    // This method is now just for ongoing updates, not for the fade animation
    // The actual fade is handled by CSS transitions and setTimeout
  }

  restartGame() {
    console.log('Restarting game...');
    
    // Hide death overlay
    const overlay = document.getElementById('wasted-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // Reset death state
    this.isDead = false;
    this.deathTime = 0;
    this.blackScreen = false;
    
    // Emit restart event
    window.dispatchEvent(new CustomEvent('game-restart'));
  }
}