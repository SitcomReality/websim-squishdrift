export class VehicleSystem {
  update(state, input, dt) {
    if (state.control.inVehicle) {
      this.updatePlayerControls(state, input);
    }
  }

  updatePlayerControls(state, input) {
    const v = state.control.vehicle;
    if (!v) return;
    
    v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
    v.handbrake = v.handbrake || false;
    
    // Forward/reverse with throttle
    v.ctrl.throttle = (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0) +
                      (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? -1 : 0);
    
    // Steering
    v.ctrl.steer = (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? -1 : 0) +
                   (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0);
    
    // Handbrake on spacebar (replaces old brake)
    v.handbrake = input.keys.has('Space');
    
    // Normal brake is now separate from handbrake
    v.ctrl.brake = 0;
  }
}