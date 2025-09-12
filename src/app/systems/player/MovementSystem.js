import { Vec2 } from '../../../utils/Vec2.js';

export class MovementSystem {
  handlePlayerMovement(state, player, input, dt) {
    if (!state || !player || !input || !dt) return;
    
    let moveVec = { x: 0, y: 0 };
    let isMoving = false;
    let magnitude = 1;

    if (input.joystickVector) {
      // Use joystick vector for movement
      const angle = Math.atan2(input.joystickVector.y, input.joystickVector.x);
      magnitude = Math.hypot(input.joystickVector.x, input.joystickVector.y);
      moveVec.x = Math.cos(angle); // Use normalized vector for direction
      moveVec.y = Math.sin(angle);
      isMoving = true;
    } else if (input.gamepadMoveVector && (input.gamepadMoveVector.x !== 0 || input.gamepadMoveVector.y !== 0)) {
        const fwd = input.gamepadMoveVector.y * -1; // Y is inverted on gamepad
        const strafe = input.gamepadMoveVector.x;
        magnitude = Math.hypot(fwd, strafe);

        const facingAngle = player.facingAngle || 0;
        const cos = Math.cos(facingAngle);
        const sin = Math.sin(facingAngle);

        moveVec.x = fwd * cos - strafe * sin;
        moveVec.y = fwd * sin + strafe * cos;
        isMoving = true;
    } else {
      // Use keyboard input
      let forward = 0, strafe = 0;
      if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) forward += 1;
      if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) forward -= 0.75;
      if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) strafe -= 1;
      if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) strafe += 1;

      if (forward !== 0 || strafe !== 0) {
        // Calculate movement in world space based on player facing for keyboard
        const facingAngle = player.facingAngle || 0;
        const cos = Math.cos(facingAngle);
        const sin = Math.sin(facingAngle);
        
        moveVec.x = forward * cos - strafe * sin;
        moveVec.y = forward * sin + strafe * cos;
        isMoving = true;
      }
    }
    
    player.lastMoveSpeed = 0;
    if (isMoving) {
      // Normalize direction vector
      const len = Math.hypot(moveVec.x, moveVec.y);
      if (len > 0) {
        const normalizedDx = moveVec.x / len;
        const normalizedDy = moveVec.y / len;
        
        // Check if player can run based on stamina
        const gp = navigator.getGamepads()[input.gamepadIndex ?? 0];
        // Right trigger (buttons[7]) should sprint when on foot; remove A (buttons[0]) from sprint.
        const gamepadSprint = (gp?.buttons[7]?.pressed && !state?.control?.inVehicle);
        const isRunning = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || gamepadSprint;
        let moveSpeed = player.moveSpeed || 1.5;
        
        // Only allow running if player has stamina
        if (isRunning && player.canRun !== false) {
          moveSpeed *= 1.8; // 80% faster when running
        }
        
        player.lastMoveSpeed = moveSpeed * magnitude;
        
        const nx = player.pos.x + normalizedDx * moveSpeed * magnitude * dt;
        const ny = player.pos.y + normalizedDy * moveSpeed * magnitude * dt;
        
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