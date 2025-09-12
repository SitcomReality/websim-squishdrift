import { VehicleVehicleCollisionHandler } from './handlers/VehicleVehicleCollisionHandler.js';
import { VehicleEnvironmentCollisionHandler } from './handlers/VehicleEnvironmentCollisionHandler.js';
import { VehicleCharacterCollisionHandler } from './handlers/VehicleCharacterCollisionHandler.js';

export class VehicleCollisionSystem {
  constructor() {
    this.collisionDamageThreshold = 0.5;
    this.damageMultiplier = 20.0;
    this.damageCooldown = 1000;

    this.vehicleVehicleHandler = new VehicleVehicleCollisionHandler(this);
    this.vehicleEnvironmentHandler = new VehicleEnvironmentCollisionHandler(this);
    this.vehicleCharacterHandler = new VehicleCharacterCollisionHandler(this);
  }

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      v.hitboxW = v.hitboxW ?? 0.9;
      v.hitboxH = v.hitboxH ?? 0.5;
      v.mass = v.mass || 1200;
      v.vel = v.vel || {x:0,y:0};
      
      if (!v.lastDamageTime) v.lastDamageTime = 0;
      
      this.vehicleVehicleHandler.handle(state, v);
      this.vehicleEnvironmentHandler.handle(state, v);
      this.vehicleCharacterHandler.handle(state, v);
    }
  }
}

