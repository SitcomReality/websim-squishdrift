export class FlattenSystem {
  update(state, input) {
    const player = state.entities.find(e => e.type === 'player');
    const gamepadFlatten = input?.gamepadAimVector?.x === 0 && input?.gamepadAimVector?.y === 0 && (input?.pressed?.has('KeyQ'));

    // Handle Q key or gamepad equivalent for flatten ability
    if (input?.pressed?.has('KeyQ') || gamepadFlatten) {
      const wasFlattened = state.isFlattened;
      state.isFlattened = !state.isFlattened;

      // Play sound effect for toggle
      if (state.isFlattened) {
        state.audio?.playSfx('flatten_down');
      } else {
        state.audio?.playSfx('flatten_up');
      }
      
      // Trigger animations
      this.triggerFlattenAnimations(state);

      // Trigger shockwave effect
      if (player) {
        this.triggerShockwave(state, player);
      }
    }
  }

  triggerShockwave(state, player) {
    if (!state.effects) state.effects = [];
    
    const wave = {
      type: 'shockwave',
      pos: { ...player.pos },
      startTime: performance.now(),
      duration: 500, // ms
      color: state.isFlattened ? [255, 165, 0] : [0, 150, 255] // Orange for flatten, Blue for raise
    };

    state.effects.push(wave);
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