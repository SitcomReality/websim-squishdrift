import { Vec2 } from '../../../utils/Vec2.js';

export class FacingSystem {
  constructor() {
    this.lastAimingInput = 'mouse'; // 'mouse' or 'gamepad'
    this.lastMousePos = { x: -1, y: -1 };
  }

  updateFacingFromMouse(state, player, input) {
    const isGamepadAiming = input.gamepadAimVector && (input.gamepadAimVector.x !== 0 || input.gamepadAimVector.y !== 0);

    // Check for mouse activity to switch input priority
    const mouseMoved = input.mousePos && (this.lastMousePos.x !== input.mousePos.x || this.lastMousePos.y !== input.mousePos.y);
    const mouseClicked = input.pressed.has('MouseLeft') && !input.firedFromGamepadThisFrame;

    if (isGamepadAiming) {
        this.lastAimingInput = 'gamepad';
    } else if (mouseMoved || mouseClicked) {
        this.lastAimingInput = 'mouse';
    }
    
    // If we fired with gamepad this frame, prefer gamepad aiming/facing
    if (input.firedFromGamepadThisFrame) this.lastAimingInput = 'gamepad';
    
    // Store current mouse position for next frame's comparison
    if (input.mousePos) {
        this.lastMousePos.x = input.mousePos.x;
        this.lastMousePos.y = input.mousePos.y;
    }

    // Handle gamepad right stick for aiming if it's active
    if (isGamepadAiming) {
        player.facingAngle = Math.atan2(input.gamepadAimVector.y, input.gamepadAimVector.x);
        player.facing = player.facing || new Vec2();
        player.facing.x = Math.cos(player.facingAngle);
        player.facing.y = Math.sin(player.facingAngle);
        return;
    }
    
    // Handle joystick facing first if it's active
    if (input.joystickAngle != null) {
      player.facingAngle = input.joystickAngle;
      // Update facing vector
      player.facing = player.facing || new Vec2();
      player.facing.x = Math.cos(player.facingAngle);
      player.facing.y = Math.sin(player.facingAngle);
      return;
    }

    // If gamepad was the last aiming input, hold the character's facing direction
    if (this.lastAimingInput === 'gamepad') {
        // Ensure facing vector is consistent with the last known angle
        player.facing = player.facing || new Vec2();
        player.facing.x = Math.cos(player.facingAngle);
        player.facing.y = Math.sin(player.facingAngle);
        return;
    }

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
}