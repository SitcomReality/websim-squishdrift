import { isWalkable } from '../../../map/TileTypes.js';
import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';

export class PlayerSystem {
  update(state, input, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;
    
    this.ensureHealth(player);
    
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
      this.handlePlayerMovement(state, player, input, dt);
    } else {
      // Keep player "attached" to vehicle while inside
      const v = state.control.vehicle;
      if (v && v.pos) {
        player.pos.x = v.pos.x;
        player.pos.y = v.pos.y;
        player.hidden = true;
      }
    }
  }

  ensureHealth(entity) {
    if (!entity.health) {
      entity.health = new Health(100);
    }
  }

  handlePlayerMovement(state, player, input, dt) {
    if (!state || !player || !input || !dt) return;
    
    // Get movement input relative to player facing
    let forward = 0, strafe = 0;
    if (input.keys && input.keys.has('KeyW')) forward += 1;
    if (input.keys && input.keys.has('ArrowUp')) forward += 1;
    if (input.keys && input.keys.has('KeyS')) forward -= 0.75; // 75% speed for backward
    if (input.keys && input.keys.has('ArrowDown')) forward -= 0.75;
    if (input.keys && input.keys.has('KeyA')) strafe -= 0.75; // 75% speed for strafing
    if (input.keys && input.keys.has('ArrowLeft')) strafe -= 0.75;
    if (input.keys && input.keys.has('KeyD')) strafe += 0.75; // 75% speed for strafing
    if (input.keys && input.keys.has('ArrowRight')) strafe += 0.75;
    
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
        
        const moveSpeed = player.moveSpeed || 6;
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
    
    const worldX = (mouseX - cx) / zoom + camX * ts;
    const worldY = (mouseY - cy) / zoom + camY * ts;
    
    // Calculate angle from player to mouse
    const dx = worldX / ts - player.pos.x;
    const dy = worldY / ts - player.pos.y;
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
    
    player.collisionDisabled = true;
    player.canUseItems = false;
    
    vehicle.controlled = true;
    
    delete vehicle.aiTargetSpeed;
    delete vehicle.node;
    delete vehicle.next;
    delete vehicle.t;

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
      
      const spawnOffset = 0.8;
      const exitPos = {
        x: vehicle.pos.x + Math.cos(vehicle.rot || 0) * spawnOffset,
        y: vehicle.pos.y + Math.sin(vehicle.rot || 0) * spawnOffset
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
        player.pos.x = vehicle.pos.x + 1;
        player.pos.y = vehicle.pos.y + 1;
      }
      
      player.hidden = false;
      player.inVehicle = false;
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
    
    // Try positions around the vehicle
    const positions = [
      { x: vehicle.pos.x + 1, y: vehicle.pos.y },
      { x: vehicle.pos.x - 1, y: vehicle.pos.y },
      { x: vehicle.pos.x, y: vehicle.pos.y + 1 },
      { x: vehicle.pos.x, y: vehicle.pos.y - 1 },
      { x: vehicle.pos.x + 1, y: vehicle.pos.y + 1 },
      { x: vehicle.pos.x + 1, y: vehicle.pos.y - 1 },
      { x: vehicle.pos.x - 1, y: vehicle.pos.y + 1 },
      { x: vehicle.pos.x - 1, y: vehicle.pos.y - 1 }
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
}