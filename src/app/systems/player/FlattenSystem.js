export class FlattenSystem {
  constructor() {
    this._prevCombo = 0;
  }

  update(state, input, dt) {
    // Manual flattening removed: flattening is now controlled automatically by combo-based auto-flatten.
    
    // Auto-flatten when combo hits multiples of 10 for 10s; reset timer on new multiple
    const combo = state.comboCount || state.scoringSystem?.comboCount || 0;
    state.flattenAuto = state.flattenAuto || { active:false, expiresAt:0, lastHandledMultiple:0 };
    const now = Date.now(), multiple = Math.floor(combo / 10);
    // Trigger only when combo *just changed* to a multiple of 10.
    // This allows retriggering the auto-flatten if the combo drops and later reaches the same multiple again.
    if (combo > 0 && combo % 10 === 0 && multiple > 0 && combo !== this._prevCombo) {
      state.flattenAuto.active = true;
      state.flattenAuto.expiresAt = now + 10000;
      state.flattenAuto.lastHandledMultiple = multiple;
      if (!state.isFlattened) { state.isFlattened = true; state.audio?.playSfx('flatten_down'); this._spawnPulse(state, true); this.triggerFlattenAnimations(state); }
    } else if (state.flattenAuto.active && now >= state.flattenAuto.expiresAt) {
      state.flattenAuto.active = false; if (state.isFlattened) { state.isFlattened = false; state.audio?.playSfx('flatten_up'); this._spawnPulse(state, false); this.triggerFlattenAnimations(state); }
    }

    // Advance pulse timer
    if (state.flattenFX?.active && typeof dt === 'number') {
      state.flattenFX.t += dt;
      if (state.flattenFX.t >= state.flattenFX.duration) state.flattenFX.active = false;
    }
    // remember last seen combo for next update
    this._prevCombo = combo;
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
  
  _spawnPulse(state, down=true){
    const ref = state.control?.inVehicle ? state.control.vehicle?.pos : state.entities.find(e=>e.type==='player')?.pos;
    state.flattenFX = { active: true, t: 0, duration: 0.7, mode: down ? 'down' : 'up', origin: { x: ref?.x || 0, y: ref?.y || 0 } };
  }
}