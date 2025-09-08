import { Vec2 } from '../../../utils/Vec2.js';

export class MovementSystem {
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
    
    // Handle joystick facing direction
    if (input.keys.has('FacingEast')) {
      player.facingAngle = 0;
    } else if (input.keys.has('FacingSouth')) {
      player.facingAngle = Math.PI/2;
    } else if (input.keys.has('FacingNorth')) {
      player.facingAngle = -Math.PI/2;
    } else if (input.keys.has('FacingWest')) {
      player.facingAngle = Math.PI;
    }
    
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
    
    return state.world.map.tiles[ty][tx] !== 8 && state.world.map.tiles[ty][tx] !== 9;
  }

  getBuildingAt(state, x, y) {
    const map = state.world.map;
    if (!map.buildings) return null;
    return map.buildings.find(b =>
        x >= b.rect.x && x < b.rect.x + b.rect.width &&
        y >= b.rect.y && y < b.rect.y + b.rect.height
    );
  }
}