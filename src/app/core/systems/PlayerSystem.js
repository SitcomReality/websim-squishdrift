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
      this.enterVehicle(state, player);
      this.pickupItem(state, player);
    }
  }

  isWalkableTile(state, x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= state.world.map.width || ty >= state.world.map.height) return false;
    return isWalkable(state.world.map.tiles[ty][tx]);
  }
}