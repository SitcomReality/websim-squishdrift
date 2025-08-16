// This file is now deprecated - use VehicleMovementSystem and VehicleCollisionSystem instead
import { VehicleMovementSystem } from '../../vehicles/physics/VehicleMovementSystem.js';
import { VehicleCollisionSystem } from '../../vehicles/physics/VehicleCollisionSystem.js';

export class VehiclePhysicsSystem {
  constructor() {
    this.movementSystem = new VehicleMovementSystem();
    this.collisionSystem = new VehicleCollisionSystem();
  }

  update(state, dt) {
    this.movementSystem.update(state, dt);
    this.collisionSystem.update(state, dt);
  }
}