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