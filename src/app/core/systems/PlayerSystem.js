import { isWalkable } from '../../../map/TileTypes.js';
import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';

export class PlayerSystem {
  update(state, input, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;
    
    this.ensureHealth(player);
    
    if (!state.control.inVehicle) {
      this.handlePlayerMovement(state, player, input, dt);
      this.handleInteraction(state, player, input);
      this.updateFacingFromMouse(state, player, input);
    }
  }

  ensureHealth(entity) {
    if (!entity.health) {
      entity.health = new Health(100);
    }
  }

  handlePlayerMovement(state, player, input, dt) {
    // Get movement input relative to player facing
    let forward = 0, strafe = 0;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) forward += 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) forward -= 1;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) strafe -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) strafe += 1;
    
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
        
        const nx = player.pos.x + normalizedDx * player.moveSpeed * dt;
        const ny = player.pos.y + normalizedDy * player.moveSpeed * dt;
        
        if (this.isWalkableTile(state, nx, player.pos.y)) player.pos.x = nx;
        if (this.isWalkableTile(state, player.pos.x, ny)) player.pos.y = ny;
      }
    }
  }

  updateFacingFromMouse(state, player, input) {
    // Skip if no canvas or mouse position
    if (!state.canvas || !input.mousePos) return;
    
    const canvas = state.canvas;
    const ts = state.world.tileSize;
    
    // Convert mouse position to world coordinates
    const rect = canvas.getBoundingClientRect();
    const mouseX = input.mousePos.x - rect.left;
    const mouseY = input.mousePos.y - rect.top;
    
    // Apply camera transform to get world coordinates
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    const worldX = (mouseX - cx) / (state.camera.zoom || 1) + state.camera.x * ts;
    const worldY = (mouseY - cy) / (state.camera.zoom || 1) + state.camera.y * ts;
    
    // Calculate angle from player to mouse
    const dx = worldX / ts - player.pos.x;
    const dy = worldY / ts - player.pos.y;
    player.facingAngle = Math.atan2(dy, dx);
    
    // Update facing vector
    player.facing.x = Math.cos(player.facingAngle);
    player.facing.y = Math.sin(player.facingAngle);
  }

  handleInteraction(state, player, input) {
    if (input.pressed.has('KeyE')) {
      this.handleVehicleInteraction(state, player);
      this.pickupItem(state, player);
    }
  }

  handleVehicleInteraction(state, player) {
    if (state.control.inVehicle) {
      // Exit vehicle
      this.exitVehicle(state, player);
    } else {
      // Enter vehicle
      const nearbyVehicle = this.findNearbyVehicle(state, player);
      if (nearbyVehicle) {
        this.enterVehicle(state, player, nearbyVehicle);
      }
    }
  }

  findNearbyVehicle(state, player) {
    const interactionDistance = 1.5; // tiles
    return state.entities.find(e => 
      e.type === 'vehicle' && 
      !e.controlled && 
      Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) < interactionDistance
    );
  }

  enterVehicle(state, player, vehicle) {
    state.control.inVehicle = true;
    state.control.vehicle = vehicle;
    player.hidden = true;
    vehicle.controlled = true;
    
    // Remove AI properties if they exist
    delete vehicle.aiTargetSpeed;
    delete vehicle.node;
    delete vehicle.next;
    delete vehicle.t;
  }

  exitVehicle(state, player) {
    if (!state.control.inVehicle) return;
    
    const vehicle = state.control.vehicle;
    if (vehicle) {
      vehicle.controlled = false;
      
      // Find a safe spot to spawn the player
      const spawnOffset = 0.8;
      const exitPos = new Vec2(
        vehicle.pos.x + Math.cos(vehicle.rot) * spawnOffset,
        vehicle.pos.y + Math.sin(vehicle.rot) * spawnOffset
      );
      
      // Ensure the exit position is walkable
      if (this.isWalkableTile(state, exitPos.x, exitPos.y)) {
        player.pos.copy(exitPos);
      } else {
        // Fallback to vehicle position + small offset
        player.pos.x = vehicle.pos.x + 1;
        player.pos.y = vehicle.pos.y + 1;
      }
      
      player.hidden = false;
    }
    
    state.control.inVehicle = false;
    state.control.vehicle = null;
  }

  pickupItem(state, player) {
    // Existing item pickup logic...
  }

  isWalkableTile(state, x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= state.world.map.width || ty >= state.world.map.height) return false;
    return isWalkable(state.world.map.tiles[ty][tx]);
  }
}