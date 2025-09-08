export class InteractionSystem {
  updateInteractionPrompt(state, player) {
    try {
      const promptEl = document.getElementById('interaction-prompt');
      const actionEl = document.getElementById('interaction-action');
      if (promptEl && actionEl && player.pos && !state.control.inVehicle) {
        const nearbyVehicle = this.findNearbyVehicle(state, player);
        if (nearbyVehicle) {
          actionEl.textContent = 'enter vehicle';
          promptEl.style.display = '';
        } else {
          promptEl.style.display = 'none';
        }
      } else if (promptEl) {
        promptEl.style.display = 'none';
      }
    } catch (e) { /* DOM may be unavailable in some contexts */ }
  }

  handleInteraction(state, player, input) {
    if (!input || !input.pressed || !input.pressed.has) return;
    
    if (input.pressed.has('KeyE')) {
      // Add null check for state.control
      if (!state.control) {
        state.control = { inVehicle: false };
      }
      
      if (state.control.inVehicle) {
        this.exitVehicle(state, player);
      } else {
        this.handleVehicleInteraction(state, player);
        this.pickupItem(state, player);
      }
    }
  }

  handleVehicleInteraction(state, player) {
    if (!state || !player) return;
    
    if (state.control?.inVehicle) {
      this.exitVehicle(state, player);
    } else {
      const nearbyVehicle = this.findNearbyVehicle(state, player);
      if (nearbyVehicle) {
        this.enterVehicle(state, player, nearbyVehicle);
      }
    }
  }

  findNearbyVehicle(state, player) {
    if (!state || !state.entities || !player) return null;
    if (!player.pos) return null;
    
    const interactionDistance = 1.5; // tiles
    return state.entities.find(e => 
      e.type === 'vehicle' && 
      !e.controlled && 
      !e.isEmergency && // NEW: Exclude emergency vehicles
      e.pos && player.pos &&
      Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) < interactionDistance
    );
  }

  enterVehicle(state, player, vehicle) {
    if (!state || !player || !vehicle) return;
    
    state.control = state.control || {};
    state.control.inVehicle = true;
    state.control.vehicle = vehicle;
    player.hidden = true;
    player.inVehicle = true;
    player.lastMoveSpeed = 0; // Stop arm movement when entering vehicle
    player.collisionDisabled = true;
    player.canUseItems = false;
    
    vehicle.controlled = true;
    
    // Reset glow state for this vehicle entry
    if (vehicle._glowState) {
      delete vehicle._glowState;
    }
    
    // Update HUD to show vehicle type
    const vehicleStateEl = document.getElementById('vehicle-state');
    if (vehicleStateEl) {
      const vehicleType = vehicle.vehicleType || 'Vehicle';
      vehicleStateEl.textContent = vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1);
    }
  }

  exitVehicle(state, player) {
    if (!state || !player || !state.control?.inVehicle) return;
    
    const vehicle = state.control.vehicle;
    if (vehicle) {
      vehicle.controlled = false;
      
      // Reset glow state when exiting vehicle
      if (vehicle._glowState) {
        delete vehicle._glowState;
      }
      
      // Spawn player at the BACK of the vehicle instead of front
      const spawnOffset = 0.8;
      const exitPos = {
        x: vehicle.pos.x - Math.cos(vehicle.rot || 0) * spawnOffset,
        y: vehicle.pos.y - Math.sin(vehicle.rot || 0) * spawnOffset
      };
      
      // Check if exit position is outside map
      const map = state.world?.map;
      if (map && (exitPos.x < 0 || exitPos.x >= map.width || 
                  exitPos.y < 0 || exitPos.y >= map.height)) {
        // Find safe exit position inside map
        const safeExitPos = this.findSafeExitPosition(state, vehicle);
        player.pos.x = safeExitPos.x;
        player.pos.y = safeExitPos.y;
      } else if (this.isWalkableTile(state, exitPos.x, exitPos.y)) {
        player.pos.x = exitPos.x;
        player.pos.y = exitPos.y;
      } else {
        // Fallback position if direct exit is blocked
        player.pos.x = vehicle.pos.x - 1;
        player.pos.y = vehicle.pos.y - 1;
      }
      
      player.hidden = false;
      player.inVehicle = false;
      player.lastMoveSpeed = 0; // Stop arm movement when exiting vehicle
      player.collisionDisabled = false;
      player.canUseItems = true;
    }
    
    state.control.inVehicle = false;
    state.control.vehicle = null;

    // Update HUD to show "on foot"
    const vehicleStateEl = document.getElementById('vehicle-state');
    if (vehicleStateEl) {
      vehicleStateEl.textContent = 'on foot';
    }
  }

  findSafeExitPosition(state, vehicle) {
    const map = state.world?.map;
    if (!map) return { x: vehicle.pos.x, y: vehicle.pos.y };
    
    // Try positions around the vehicle, prioritizing the back
    const positions = [
      // Back positions first
      { x: vehicle.pos.x - Math.cos(vehicle.rot || 0) * 0.8, y: vehicle.pos.y - Math.sin(vehicle.rot || 0) * 0.8 },
      { x: vehicle.pos.x - Math.cos(vehicle.rot || 0) * 1.5, y: vehicle.pos.y - Math.sin(vehicle.rot || 0) * 1.5 },
      { x: vehicle.pos.x - Math.cos(vehicle.rot || 0) * 2.0, y: vehicle.pos.y - Math.sin(vehicle.rot || 0) * 2.0 },
      // Side positions as fallback
      { x: vehicle.pos.x + Math.cos((vehicle.rot || 0) + Math.PI/2) * 0.8, y: vehicle.pos.y + Math.sin((vehicle.rot || 0) + Math.PI/2) * 0.8 },
      { x: vehicle.pos.x + Math.cos((vehicle.rot || 0) - Math.PI/2) * 0.8, y: vehicle.pos.y + Math.sin((vehicle.rot || 0) - Math.PI/2) * 0.8 },
      { x: vehicle.pos.x + 1, y: vehicle.pos.y + 1 },
      { x: vehicle.pos.x - 1, y: vehicle.pos.y - 1 },
      { x: vehicle.pos.x + 1, y: vehicle.pos.y - 1 },
      { x: vehicle.pos.x - 1, y: vehicle.pos.y + 1 }
    ];
    
    for (const pos of positions) {
      if (pos.x >= 0 && pos.x < map.width && 
          pos.y >= 0 && pos.y < map.height && 
          this.isWalkableTile(state, pos.x, pos.y)) {
        return pos;
      }
    }
    
    // Fallback to vehicle position if no safe position found
    return { x: vehicle.pos.x, y: vehicle.pos.y };
  }

  pickupItem(state, player) {
    if (!state || !player || !state.entities) return;
    if (!player.pos) return;
    
    const items = state.entities.filter(e => 
      (e.type === 'item' || e.type === 'weapon') && e.pos
    );
    
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (!item || !item.pos || !player.pos) continue;
      
      if (Math.hypot(player.pos.x - item.pos.x, player.pos.y - item.pos.y) < 1) {
        if (item.type === 'item') {
          // Handle regular items
          state.inventory = state.inventory || [];
          state.inventory.push(item);
          
          const itemNameEl = document.getElementById('item-name');
          if (itemNameEl) itemNameEl.textContent = item.name;
          
          // remove from entities and mark spot (if any) as empty so it can respawn
          const idx = state.entities.indexOf(item);
          if (idx > -1) state.entities.splice(idx, 1);
          if (typeof item.spotId === 'number' && state?.pickupSpots?.[item.spotId]) {
            state.pickupSpots[item.spotId].hasItem = false;
          }
        } else if (item.type === 'weapon') {
          // Handle weapon pickup
          try {
            // Use WeaponSystem directly if available
            if (state._engine?.systems?.weapon) {
              state._engine.systems.weapon.handleWeaponPickup(state, player);
            }
          } catch (e) {
            console.warn('Weapon pickup failed:', e);
          } finally {
            const idx2 = state.entities.indexOf(item);
            if (idx2 > -1) state.entities.splice(idx2, 1);
            if (typeof item.spotId === 'number' && state?.pickupSpots?.[item.spotId]) {
              state.pickupSpots[item.spotId].hasItem = false;
            }
          }
        }
      }
    }
  }

  isWalkableTile(state, x, y) {
    if (!state || !state.world || !state.world.map) return false;
    
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= state.world.map.width || ty >= state.world.map.height) return false;
    
    const tile = state.world.map.tiles[ty][tx];

    // If tile is a building tile, check if it's flattened
    if (tile === 8 || tile === 9) { // BuildingFloor or BuildingWall
        const building = this.getBuildingAt(state, tx, ty);
        if (building && (building.currentHeight ?? building.height) < 0.1) {
            return true; // Walkable if flattened
        }
    }
    
    return this.isWalkable(tile);
  }

  getBuildingAt(state, x, y) {
    const map = state.world.map;
    if (!map.buildings) return null;
    return map.buildings.find(b =>
        x >= b.rect.x && x < b.rect.x + b.rect.width &&
        y >= b.rect.y && y < b.rect.y + b.rect.height
    );
  }

  isWalkable(tile) {
    // Import the isWalkable function from TileTypes
    const { isWalkable } = require('../../../map/TileTypes.js');
    return isWalkable(tile);
  }
}
```

src/app/core/systems/DeathSystem.js
```
import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';

export class DeathSystem {
  constructor() {
    this.isDead = false;
    this.deathTime = 0;
    this.blackScreen = false;
    this.freezeRequested = false;
    this.deathUIShown = false;
    this.lastIncident = Date.now();
  }

  update(state, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player || !player.health) return;

    // Check if player is dead
    if (player.health.hp <= 0 && !this.isDead) {
      this.handlePlayerDeath(state);
    }

    // Check if vehicles (including player vehicle) go outside map
    this.checkMapBoundaries(state);

    // Update death screen if player is dead
    if (this.isDead) {
      this.updateDeathScreen(state, dt);
    }
  }

  checkPlayerDeath(state) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player || !player.health) return;

    // Check if player health is depleted
    if (player.health.hp <= 0) {
      return true;
    }
    return false;
  }

  checkMapBoundaries(state) {
    const map = state.world?.map;
    if (!map) return;

    // Check all vehicles
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      if (!v.pos) continue;
      
      // Check if vehicle is outside map boundaries
      if (v.pos.x < 0 || v.pos.x >= map.width || 
          v.pos.y < 0 || v.pos.y >= map.height) {
        // Remove vehicle from entities
        const idx = state.entities.indexOf(v);
        if (idx > -1) state.entities.splice(idx, 1);
      }
    }
  }

  handlePlayerDeath(state) {
    this.isDead = true;
    this.deathTime = Date.now();
    
    // Fade out all audio including main theme
    if (state.audio && state.audio.stopAll) {
      state.audio.stopAll();
    }

    // Create death screen overlay
    this.createDeathScreen(state);
  }

  createDeathScreen(state) {
    const overlay = document.createElement('div');
    overlay.id = 'death-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
    `;

    overlay.innerHTML = `
      <div id="death-content" style="text-align: center; width: 100%; max-width: 600px;">
        <div id="wasted-image" style="width: 90vw; max-width: 512px; height: auto; aspect-ratio: 4/1; background-image: url('/uisprites.png'); background-size: auto 128px; background-position: 0; background-repeat: no-repeat; margin: 0 auto 20px;"></div>
        <div id="death-stats" style="margin-bottom: 30px; font-size: 18px;">
          <p>Time Alive: <span id="time-alive">0:00</span></p>
          <p>Enemies Eliminated: <span id="enemies-killed">0</span></p>
          <p> Vehicles Destroyed: <span id="vehicles-destroyed">0</span></p>
        </div>
        <div id="restart-button-sprite" style="width: 256px; height: 128px; margin: 0 auto; background-image: url('/uisprites.png'); background-size: 512px 384px; background-position: -256px -256px; background-repeat: no-repeat; cursor: pointer; transition: transform 0.1s ease;"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Use setTimeout to trigger the fade-in animation
    setTimeout(() => {
      overlay.style.background = 'rgba(0, 0, 0, 0.8)';
    }, 100);

    // After fade completes, show content
    setTimeout(() => {
      const deathContent = document.getElementById('death-content');
      deathContent.style.display = 'block';
      this.freezeRequested = true;
      if (state) state.gamePaused = true;
    }, 2100); // Wait until after content is shown
  }

  updateDeathScreen(state, dt) {
    const now = Date.now();
    const timeAlive = Math.floor((now - state.startTime) / 1000);
    document.getElementById('time-alive').textContent = `0:${timeAlive.toString().padStart(2, '0')}`;
    
    // Calculate stats
    const enemiesKilled = state.stats?.enemiesKilled || 0;
    const vehiclesDestroyed = state.stats?.vehiclesDestroyed || 0;
    
    document.getElementById('enemies-killed').textContent = enemiesKilled;
    document.getElementById('vehicles-destroyed').textContent = vehiclesDestroyed;
    
    // Add restart button listener using direct assignment to ensure it works
    const restartBtn = document.getElementById('restart-button-sprite');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        console.log('Restart button clicked (death overlay)');
        this.restart();
      });
    }
    
    // Add a check for restart button listener in the death screen
    if (document.getElementById('death-overlay')) {
      const overlay = document.getElementById('death-overlay');
      const restartBtn = overlay.querySelector('#restart-button-sprite');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => {
          console.log('Restart button clicked (death overlay)');
          this.restart();
        });
      }
    }

    // Play death music when restart button appears
    this.playDeathMusic();
  }

  playDeathMusic() {
    if (!state.audio) return;
    if (this.deathMusic && !this.deathMusic.paused) return;
    
    this.deathMusic = new Audio('/music/damocles.mp3');
    this.deathMusic.volume = state.audio.musicMuted ? 0 : state.audio.musicVolume;
    this.deathMusic.muted = state.audio.musicMuted;
    
    this.deathMusic.play().catch(e => console.warn('Could not play death music:', e));
    
    // Update volume when music volume changes
    if (state.audio.setMusicVolume) {
      this.deathMusic.volume = state.audio.musicMuted ? 0 : state.audio.musicVolume;
    }
    
    if (state.audio.toggleMusicMute) {
      this.deathMusic.muted = state.audio.musicMuted;
    }
  }

  stopDeathMusic() {
    if (this.deathMusic) {
      const fadeOut = () => {
        const currentVolume = this.deathMusic.volume;
        this.deathMusic.volume = Math.max(0, currentVolume - 0.1);
        if (this.deathMusic.volume > 0) {
          setTimeout(fadeOut, 50);
        } else {
          this.deathMusic.pause();
          this.deathMusic.currentTime = 0;
          this.deathMusic = null;
        }
      };
      fadeOut();
    }
  }

  restart() {
    console.log('Restarting game...');
    
    // Stop death music
    this.stopDeathMusic();
    
    // Remove death overlay
    const deathOverlay = document.getElementById('death-overlay');
    if (deathOverlay) {
      deathOverlay.remove();
    }
    
    // Reset death state
    this.isDead = false;
    this.deathTime = 0;
    this.blackScreen = false;
    this.freezeRequested = false;
    this.deathUIShown = false;
    
    // Emit restart event
    window.dispatchEvent(new CustomEvent('game-restart'));
  }
}
```

src/app/core/systems/ScoringSystem.js
```
export class ScoringSystem {
  constructor() {
    this.score = 0;
    this.wantedPoints = 0;
    this.wantedLevel = 0;
  }

  addCrime(state, crimeType,