export class FlattenSystem {
  update(state, input, dt) {
    // Handle Q key for flatten ability
    if (input?.pressed?.has('KeyQ')) {
      const wasFlattened = state.isFlattened;
      state.isFlattened = !state.isFlattened;

      // Play sound effect for toggle
      if (state.isFlattened) {
        state.audio?.playSfx('flatten_down');
      } else {
        state.audio?.playSfx('flatten_up');
      }
      
      // Spawn a visual pulse originating from player/vehicle
      const ref = state.control?.inVehicle ? state.control.vehicle?.pos : state.entities.find(e=>e.type==='player')?.pos;
      state.flattenFX = { active: true, t: 0, duration: 0.7, mode: state.isFlattened ? 'down' : 'up', origin: { x: ref?.x || 0, y: ref?.y || 0 } };
      // Trigger animations
      this.triggerFlattenAnimations(state);
    }
    // Advance pulse timer
    if (state.flattenFX?.active && typeof dt === 'number') {
      state.flattenFX.t += dt;
      if (state.flattenFX.t >= state.flattenFX.duration) state.flattenFX.active = false;
    }
  }

  triggerFlattenAnimations(state) {
    const map = state.world.map;
    const isFlattening = state.isFlattened;
    const now = performance.now();

    if (map.buildings) {
      for (const building of map.buildings) {
        building.animationState = {
          type: isFlattening ? 'shrink' : 'grow',
          startTime: now,
          duration: isFlattening ? 300 : 600
        };
      }
    }

    if (map.trees) {
      for (const tree of map.trees) {
        tree.animationState = {
          type: isFlattening ? 'shrink' : 'grow',
          startTime: now,
          duration: isFlattening ? 300 : 600
        };
      }
    }
  }
}