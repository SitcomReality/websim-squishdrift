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
    v.ctrl.throttle = (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0) +
                      (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? -0.5 : 0);
    v.ctrl.throttle = Math.max(0, v.ctrl.throttle); // no reverse throttle, brake instead
    v.ctrl.steer = (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? -1 : 0) +
                   (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0);
    v.ctrl.steer = Math.max(-1, Math.min(1, v.ctrl.steer));
    v.ctrl.brake = input.keys.has('Space') ? 1 : 0;
  }
}