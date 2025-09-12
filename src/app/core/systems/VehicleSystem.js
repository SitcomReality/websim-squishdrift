export class VehicleSystem {
  update(state, input, dt) {
    if (state.control.inVehicle) {
      this.updatePlayerControls(state, input);
    }
  }

  updatePlayerControls(state, input) {
    const v = state.control.vehicle;
    if (!v) return;
    
    v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0, handbrake: false };
    
    // Throttle: W/Up = forward, S/Down = reverse
    // Gamepad right trigger for throttle, left for brake/reverse
    const gp = navigator.getGamepads()[input.gamepadIndex ?? 0];
    let throttle = 0, brake = 0;

    if (gp) {
        throttle = gp.buttons[7]?.value || 0; // RT
        brake = gp.buttons[6]?.value || 0; // LT
    }

    throttle = Math.max(throttle, (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0));
    brake = Math.max(brake, (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? 1 : 0));
    
    v.ctrl.throttle = throttle > brake ? throttle : -brake;

    // Steering
    const keySteer = (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? -1 : 0) +
                     (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0);
    const stickSteer = gp ? (gp.axes[0] || 0) : 0;
    
    v.ctrl.steer = Math.abs(keySteer) > Math.abs(stickSteer) ? keySteer : stickSteer;

    // Handbrake (space or gamepad A button): apply strong brakes but never cause reversal when engaged
    v.ctrl.handbrake = input.keys.has('Space') || gp?.buttons[0]?.pressed;
    v.ctrl.brake = v.ctrl.handbrake ? 1 : (v.ctrl.throttle < 0 ? Math.abs(v.ctrl.throttle) : 0);
  }
}