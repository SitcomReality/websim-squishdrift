  handleVehicleDestruction(state, vehicle) {
    // Create explosion with screen shake
    if (state.explosionSystem) {
      state.explosionSystem.createExplosion(state, vehicle.pos, 'vehicle');
    }
    
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

  handleVehicleDestruction(state, vehicle) {
    // Create explosion with screen shake
    if (state.explosionSystem) {
      state.explosionSystem.createExplosion(state, vehicle.pos, 'vehicle');
    }
    
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

