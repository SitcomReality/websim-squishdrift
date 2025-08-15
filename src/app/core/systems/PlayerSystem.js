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
    }
  }

  ensureHealth(entity) {
    if (!entity.health) {
      entity.health = new Health(100);
    }
  }

  handlePlayerMovement(state, player, input, dt) {
    let dx = 0, dy = 0;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) dy -= 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) dy += 1;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) dx -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) dx += 1;
    
    if (dx || dy) {
      const inv = 1 / Math.hypot(dx, dy);
      dx *= inv; dy *= inv;
      
      const nx = player.pos.x + dx * player.moveSpeed * dt;
      const ny = player.pos.y + dy * player.moveSpeed * dt;
      
      if (this.isWalkableTile(state, nx, player.pos.y)) player.pos.x = nx;
      if (this.isWalkableTile(state, player.pos.x, ny)) player.pos.y = ny;
      
      player.facing.x = dx; player.facing.y = dy;
    }
  }

  handleInteraction(state, player, input) {
    if (input.pressed.has('KeyE')) {
      console.log('E key pressed - checking interaction');
      this.handleVehicleInteraction(state, player, input);
      this.pickupItem(state, player);
    }
  }

  handleVehicleInteraction(state, player, input) {
    console.log('handleVehicleInteraction called');
    if (state.control.inVehicle) {
      console.log('Currently in vehicle, attempting to exit');
      // Exit vehicle
      this.exitVehicle(state, player);
    } else {
      // Enter vehicle
      const nearbyVehicle = this.findNearbyVehicle(state, player);
      console.log('Looking for nearby vehicle... found:', nearbyVehicle);
      if (nearbyVehicle) {
        console.log('Entering vehicle:', nearbyVehicle);
        this.enterVehicle(state, player, nearbyVehicle);
      } else {
        console.log('No nearby vehicle found');
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
    console.log('enterVehicle called with:', vehicle);
    state.control.inVehicle = true;
    state.control.vehicle = vehicle;
    player.hidden = true;
    vehicle.controlled = true;
    
    // Remove AI properties if they exist
    delete vehicle.aiTargetSpeed;
    delete vehicle.node;
    delete vehicle.next;
    delete vehicle.t;
    
    console.log('Successfully entered vehicle:', vehicle);
  }

  exitVehicle(state, player) {
    console.log('exitVehicle called');
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
    console.log('Successfully exited vehicle');
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