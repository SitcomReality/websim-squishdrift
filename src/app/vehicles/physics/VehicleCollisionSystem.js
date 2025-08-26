  handleVehicleDestruction(state, vehicle) {
    // Create explosion
    if (state.explosionSystem) {
      state.explosionSystem.createExplosion(state, vehicle.pos);
    }
    
    // Play random explosion sound
    const explosionSound = Math.random() < 0.5 ? 'explosion01' : 'explosion02';
    state.audio?.playSfx?.(explosionSound);
    
    // Register crimes
    if (state.scoringSystem) {
      state.scoringSystem.addCrime(state, 'destroy_vehicle', vehicle);
    }
    
    // Remove vehicle from entities
    const vehicleIndex = state.entities.indexOf(vehicle);
    if (vehicleIndex > -1) {
      state.entities.splice(vehicleIndex, 1);
    }
    
    // If this was the player's vehicle, handle death
    if (state.control?.vehicle === vehicle) {
      const deathSystem = state._engine?.systems?.death || 
                         state.deathSystem || 
                         state._engine?.deathSystem;
      if (deathSystem && deathSystem.handlePlayerDeath) {
        deathSystem.handlePlayerDeath(state);
      }
    }
  }

