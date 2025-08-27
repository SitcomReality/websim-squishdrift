export class CollisionResponseHandler {
  handleVehicleDestruction(state, vehicle) {
    if (!vehicle.health || vehicle.health.isAlive()) return;
    
    if (state.explosionSystem) {
      state.explosionSystem.createExplosion(state, vehicle.pos);
    }
    
    if (state.scoringSystem) {
      state.scoringSystem.addCrime(state, 'destroy_vehicle', vehicle);
    }
    
    const vehicleIndex = state.entities.indexOf(vehicle);
    if (vehicleIndex > -1) {
      state.entities.splice(vehicleIndex, 1);
    }
    
    if (state.control?.vehicle === vehicle) {
      const deathSystem = state._engine?.systems?.death || 
                         state.deathSystem || 
                         state._engine?.deathSystem;
      if (deathSystem && deathSystem.handlePlayerDeath) {
        deathSystem.handlePlayerDeath(state);
      }
    }
  }

  addDamageIndicator(state, pos, damage) {
    if (!state.damageTexts) state.damageTexts = [];
    
    const indicator = {
      type: 'damage_indicator',
      pos: { x: pos.x, y: pos.y },
      text: `-${damage}`,
      color: '#ff3333',
      age: 0,
      lifetime: 1.5,
      size: 14
    };
    
    state.damageTexts.push(indicator);
  }

  applyCollisionDamping(objA, objB) {
    if (typeof objA.angularVelocity === 'number') {
      objA.angularVelocity *= 0.7;
    }
    if (objB && typeof objB.angularVelocity === 'number') {
      objB.angularVelocity *= 0.7;
    }
    
    let dampingFactor = 0.85;
    if (objB && objA?.vel && objB?.vel) {
      const rel = Math.hypot((objA.vel.x||0)-(objB.vel.x||0),(objA.vel.y||0)-(objB.vel.y||0));
      const hDiff = Math.abs(((objA.rot||0)-(objB.rot||0)+Math.PI)%(2*Math.PI)-Math.PI);
      if (rel < 0.6 && hDiff < 0.5) dampingFactor = 0.97;
    }
    
    if (objA.vel) {
      objA.vel.x *= dampingFactor;
      objA.vel.y *= dampingFactor;
    }
    if (objB?.vel) {
      objB.vel.x *= dampingFactor;
      objB.vel.y *= dampingFactor;
    }
  }

  applyBuildingDamping(v) {
    const dampingFactor = 0.5;
    if (v.vel) {
      v.vel.x *= dampingFactor;
      v.vel.y *= dampingFactor;
    }
    if (typeof v.angularVelocity === 'number') {
      v.angularVelocity *= 0.6;
    }
  }
}

