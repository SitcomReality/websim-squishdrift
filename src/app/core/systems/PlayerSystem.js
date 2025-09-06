import { isWalkable } from '../../../map/TileTypes.js';
import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';

export class PlayerSystem {
  constructor() {
    this.maxStamina = 100;
    this.staminaDepletionRate = 20; // per second
    this.staminaRechargeRate = 40; // per second (2x depletion)
  }

  update(state, input, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;
    
    this.ensureHealth(player);
    this.ensureStamina(player);
    
    // Handle Q key for flatten ability
    if (input?.pressed?.has('KeyQ')) {
      const wasFlattened = state.isFlattened;
      state.isFlattened = !state.isFlattened;

      // Play sound effect for toggle
      if (state.isFlattened) {
        state.audio?.playSfx('flatten_down');
      } else {
        state.audio?.playSfx('flatten_up');
      }
      
      // Trigger animations
      this.triggerFlattenAnimations(state);
    }
    
    // Play ouch when player's health decreases
    try {
      const prevHp = (player.health && typeof player.health._prevHp === 'number') ? player.health._prevHp : player.health.hp;
      if (player.health.hp < prevHp) {
        state.audio?.playSfx?.('ouch');
      }
      player.health._prevHp = player.health.hp;
    } catch (e) { /* swallow audio errors */ }
    
    // Always update facing from mouse (even in vehicle for aiming)
    this.updateFacingFromMouse(state, player, input);
    
    // Always handle interaction so E can exit vehicles
    this.handleInteraction(state, player, input);
    
    // Ensure control object exists
    if (!state.control) {
      state.control = { inVehicle: false };
    }
    
    // Update HUD interaction prompt: show when near an unoccupied vehicle and not in a vehicle
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
    
    if (!state.control.inVehicle) {
      // Track movement speed for arm animation
      const prevPos = { x: player.pos.x, y: player.pos.y };
      this.handlePlayerMovement(state, player, input, dt);
      
      // Calculate movement speed for animation
      const dx = player.pos.x - prevPos.x;
      const dy = player.pos.y - prevPos.y;
      player.lastMoveSpeed = Math.hypot(dx, dy) / dt;
      
      // Only advance animation when moving - no idle arm swinging
      if (player.lastMoveSpeed > 0.01) {
        player.t = (player.t || 0) + (player.lastMoveSpeed * 0.6) * dt;
      } else {
        // Reset to stationary position when not moving
        player.t = 0;
      }
      
      this.updateStamina(state, player, input, dt);
    } else {
      // Keep player "attached" to vehicle while inside
      const v = state.control.vehicle;
      if (v && v.pos) {
        player.pos.x = v.pos.x;
        player.pos.y = v.pos.y;
        player.hidden = true;
        player.inVehicle = true;
        player.lastMoveSpeed = 0; // No arm movement when in vehicle
        player.t = 0; // Reset animation when in vehicle
      }
    }
  }

  ensureHealth(entity) {
    if (!entity.health) {
      entity.health = new Health(100);
    }
  }

  ensureStamina(entity) {
    // Only initialize stamina when it's missing (null/undefined), not when it's 0.
    if (typeof entity.stamina !== 'number') {
      entity.stamina = this.maxStamina;
      entity.maxStamina = this.maxStamina;
    }
  }

  updateStamina(state, player, input, dt) {
    const isRunning = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
    const isMoving = input.keys.has('KeyW') || input.keys.has('KeyS') || 
                    input.keys.has('KeyA') || input.keys.has('KeyD') ||
                    input.keys.has('ArrowUp') || input.keys.has('ArrowDown') ||
                    input.keys.has('ArrowLeft') || input.keys.has('ArrowRight');
    
    // Deplete stamina when running and moving, but only if there's stamina
    if (isRunning && isMoving && player.stamina > 0) {
      // actively depleting while running and moving
      player.stamina = Math.max(0, player.stamina - this.staminaDepletionRate * dt);
    } else if (!(isRunning && isMoving)) {
      // only recharge when the player is NOT holding run+movement
      player.stamina = Math.min(player.maxStamina, player.stamina + this.staminaRechargeRate * dt);
    }
    
    // If stamina is zero and player is trying to run, don't allow running
    // This prevents the instant reset issue
    player.canRun = player.stamina > 0;
    
    // Only update HUD visibility - we'll handle the canvas rendering separately
    // The stamina bar will now be drawn near the player instead of in HUD
  }

  updateStaminaBar(player) {
    // Remove HUD stamina bar - now drawn near player on canvas
    const staminaBar = document.getElementById('stamina-container');
    if (staminaBar) {
      staminaBar.style.display = 'none';
    }
  }

  handlePlayerMovement(state, player, input, dt) {
    if (!state || !player || !input || !dt) return;
    
    // Get movement input relative to player facing
    let forward = 0, strafe = 0;
    if (input.keys.has('KeyW')) forward += 1;
    if (input.keys.has('ArrowUp')) forward += 1;
    if (input.keys.has('KeyS')) forward -= 0.75; // 75% speed for backward
    if (input.keys.has('ArrowDown')) forward -= 0.75;
    if (input.keys.has('KeyA')) strafe -= 0.75; // 75% speed for strafing
    if (input.keys.has('ArrowLeft')) strafe -= 0.75;
    if (input.keys.has('KeyD')) strafe += 0.75; // 75% speed for strafing
    if (input.keys.has('ArrowRight')) strafe += 0.75;
    
    if (forward || strafe) {
      // Calculate movement in world space based on player facing
      const facingAngle = player.facingAngle || 0;
      const cos = Math.cos(facingAngle);
      const sin = Math.sin(facingAngle);
      
      // Forward/backward movement
      const dx = forward * cos + strafe * -sin;
      const dy = forward * sin + strafe * cos;
      
      // Normalize diagonal movement
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const normalizedDx = dx / len;
        const normalizedDy = dy / len;
        
        // Check if player can run based on stamina
        const isRunning = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
        let moveSpeed = player.moveSpeed || 1.5;
        
        // Only allow running if player has stamina
        if (isRunning && player.canRun !== false) {
          moveSpeed *= 1.8; // 80% faster when running
        }
        
        const nx = player.pos.x + normalizedDx * moveSpeed * dt;
        const ny = player.pos.y + normalizedDy * moveSpeed * dt;
        
        if (this.isWalkableTile(state, nx, player.pos.y)) player.pos.x = nx;
        if (this.isWalkableTile(state, player.pos.x, ny)) player.pos.y = ny;
      }
    }
  }

  updateFacingFromMouse(state, player, input) {
    // Skip if no canvas or mouse position
    if (!state.canvas || !input || !input.mousePos) return;
    
    const canvas = state.canvas;
    const ts = state.world.tileSize || 24;
    
    // Convert mouse position to world coordinates
    const rect = canvas.getBoundingClientRect();
    const mouseX = input.mousePos.x - rect.left;
    const mouseY = input.mousePos.y - rect.top;
    
    // Apply camera transform to get world coordinates
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    const zoom = state.camera?.zoom || 1;
    const camX = state.camera?.x || 0;
    const camY = state.camera?.y || 0;
    
    const worldX = (mouseX - cx) / zoom + camX;
    const worldY = (mouseY - cy) / zoom + camY;
    
    // Calculate angle from player to mouse
    const dx = worldX - player.pos.x;
    const dy = worldY - player.pos.y;
    player.facingAngle = Math.atan2(dy, dx);
    
    // Update facing vector
    player.facing = player.facing || new Vec2();
    player.facing.x = Math.cos(player.facingAngle);
    player.facing.y = Math.sin(player.facingAngle);
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
    return isWalkable(state.world.map.tiles[ty][tx]);
  }

  triggerFlattenAnimations(state) {
    const map = state.world.map;
    const isFlattening = state.isFlattened;
    const now = performance.now();

    if (map.buildings) {
      for (const building of map.buildings) {
        building.animationState = {
          type: isFlattening ? 'shrink' : 'grow',
          startTime: now,
          duration: isFlattening ? 300 : 600
        };
      }
    }

    if (map.trees) {
      for (const tree of map.trees) {
        tree.animationState = {
          type: isFlattening ? 'shrink' : 'grow',
          startTime: now,
          duration: isFlattening ? 300 : 600
        };
      }
    }
  }
}