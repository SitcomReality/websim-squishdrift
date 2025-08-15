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
    if (input.pressed.has('KeyE') || input.pressed.has('Space')) {
      this.enterVehicle(state, player);
      this.pickupItem(state, player);
    }
  }

  enterVehicle(state, player) {
    if (state.control.inVehicle) {
      // Exit vehicle
      const vehicle = state.control.vehicle;
      if (vehicle) {
        vehicle.controlled = false;
        state.control.inVehicle = false;
        state.control.vehicle = null;
        
        // Spawn player next to vehicle
        player.pos.x = vehicle.pos.x + 1;
        player.pos.y = vehicle.pos.y;
        player.hidden = false;
      }
    } else {
      // Enter vehicle
      const vehicles = state.entities.filter(e => 
        e.type === 'vehicle' && 
        !e.controlled && 
        !e.targetIncident && // Don't enter emergency vehicles
        Math.abs(e.pos.x - player.pos.x) <= 1.5 && 
        Math.abs(e.pos.y - player.pos.y) <= 1.5
      );
      
      if (vehicles.length > 0) {
        const vehicle = vehicles[0]; // Take closest
        vehicle.controlled = true;
        state.control.inVehicle = true;
        state.control.vehicle = vehicle;
        player.hidden = true;
      }
    }
  }

  pickupItem(state, player) {
    const items = state.entities.filter(e => 
      e.type === 'item' && 
      Math.abs(e.pos.x - player.pos.x) <= 0.8 && 
      Math.abs(e.pos.y - player.pos.y) <= 0.8
    );
    
    if (items.length > 0) {
      const item = items[0];
      state.control.equipped = item;
      
      // Remove item from world
      const index = state.entities.indexOf(item);
      if (index > -1) state.entities.splice(index, 1);
    }
  }

  isWalkableTile(state, x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= state.world.map.width || ty >= state.world.map.height) return false;
    return isWalkable(state.world.map.tiles[ty][tx]);
  }
}