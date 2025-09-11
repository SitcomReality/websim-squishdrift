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

    // Auto-flatten when combo hits multiples of 10 for 10s; reset timer on new multiple
    const combo = state.comboCount || state.scoringSystem?.comboCount || 0;
    state.flattenAuto = state.flattenAuto || { active:false, expiresAt:0, lastHandledMultiple:0 };
    const now = Date.now(), multiple = Math.floor(combo / 10);
    if (combo > 0 && combo % 10 === 0 && multiple > 0 && multiple !== state.flattenAuto.lastHandledMultiple) {
      state.flattenAuto.active = true; state.flattenAuto.expiresAt = now + 10000; state.flattenAuto.lastHandledMultiple = multiple;
      if (!state.isFlattened) { state.isFlattened = true; state.audio?.playSfx('flatten_down'); this._spawnPulse(state, true); this.triggerFlattenAnimations(state); }
    } else if (state.flattenAuto.active && now >= state.flattenAuto.expiresAt) {
      state.flattenAuto.active = false; if (state.isFlattened) { state.isFlattened = false; state.audio?.playSfx('flatten_up'); this._spawnPulse(state, false); this.triggerFlattenAnimations(state); }
    }

    // Advance pulse timer
    if (state.flattenFX?.active && typeof dt === 'number') {
      state.flattenFX.t += dt;
      if (state.flattenFX.t >= state.flattenFX.duration) state.flattenFX.active = false;
    }

    // NEW: Handle flatten warning effect
    this.updateFlattenWarning(state);
  }

  updateFlattenWarning(state) {
    const combo = state.comboCount || state.scoringSystem?.comboCount || 0;
    const flattenAuto = state.flattenAuto || {};
    
    // Only show warning when flatten is active and about to expire
    if (!flattenAuto.active || !state.isFlattened) return;
    
    const now = Date.now();
    const timeLeft = flattenAuto.expiresAt - now;
    const warningStart = 3000; // 3 seconds before expiration
    
    if (timeLeft <= warningStart && timeLeft > 0) {
      // Calculate warning intensity (0 to 1)
      const warningProgress = 1 - (timeLeft / warningStart);
      const intensity = Math.pow(warningProgress, 2); // Quadratic increase
      
      // Get reference position (player or vehicle)
      const ref = state.control?.inVehicle ? state.control.vehicle?.pos : state.entities.find(e=>e.type==='player')?.pos;
      if (!ref) return;
      
      // Calculate animation speed based on intensity
      const baseSpeed = 2.0;
      const maxSpeed = 8.0;
      const currentSpeed = baseSpeed + (maxSpeed - baseSpeed) * intensity;
      
      // Calculate effect size based on intensity
      const baseSize = 0.3;
      const maxSize = 0.8;
      const currentSize = baseSize + (maxSize - baseSize) * intensity;
      
      // Initialize warning effect if not exists
      if (!state.flattenWarningFX) {
        state.flattenWarningFX = {
          active: true,
          startTime: now,
          warningStart: warningStart,
          origin: { x: ref.x, y: ref.y }
        };
      }
      
      // Update effect parameters
      state.flattenWarningFX.intensity = intensity;
      state.flattenWarningFX.speed = currentSpeed;
      state.flattenWarningFX.size = currentSize;
      state.flattenWarningFX.timeLeft = timeLeft;
      
    } else {
      // Clear warning effect when not in warning period
      if (state.flattenWarningFX) {
        state.flattenWarningFX = null;
      }
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
  
  _spawnPulse(state, down=true){
    const ref = state.control?.inVehicle ? state.control.vehicle?.pos : state.entities.find(e=>e.type==='player')?.pos;
    state.flattenFX = { active: true, t: 0, duration: 0.7, mode: down ? 'down' : 'up', origin: { x: ref?.x || 0, y: ref?.y || 0 } };
  }
}