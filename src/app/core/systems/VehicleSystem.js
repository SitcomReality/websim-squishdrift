export class VehicleSystem {
  update(state, input, dt) {
    if (state.control?.inVehicle) {
      this.updatePlayerControls(state, input);
    }
  }

  updatePlayerControls(state, input) {
    const v = state.control.vehicle;
    if (!v) return;
    
    v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0, handbrake: false };
    
    // Prioritize gamepad input if available
    const gamepad = input.gamepad;
    
    if (gamepad?.connected) {
      // Gamepad controls
      const leftStick = gamepad.axes.leftStick;
      const rightStick = gamepad.axes.rightStick;
      
      // Steering with right stick
      v.ctrl.steer = rightStick.x;
      
      // Throttle with left stick Y (inverted)
      v.ctrl.throttle = -leftStick.y;
      
      // Handbrake with A button
      v.ctrl.handbrake = gamepad.buttons.A;
      
      // Braking with left trigger
      v.ctrl.brake = gamepad.buttons.LT ? 1 : 0;
      
      // Reverse with B button
      if (gamepad.buttons.B) {
        v.ctrl.throttle = Math.max(v.ctrl.throttle, 0.5);
      }
    } else {
      // Keyboard controls
      // Throttle: W/Up = forward, S/Down = reverse
      v.ctrl.throttle = (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0) +
                        (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? -1 : 0);
      
      // Steering
      v.ctrl.steer = (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? -1 : 0) +
                   (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0);
      
      // Handbrake (space): apply strong brakes but never cause reversal when engaged
      v.ctrl.handbrake = input.keys.has('Space');
      v.ctrl.brake = v.ctrl.handbrake ? 1 : 0;
    }
  }
}