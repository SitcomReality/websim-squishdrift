import { VehicleVehicleCollision } from './vehicleVehicle.js';
import { BuildingCollision } from './buildingCollisions.js';
import { PlayerPedCollision } from './playerPedCollisions.js';

export class VehicleCollisionSystem {
  constructor() {
    this.vv = new VehicleVehicleCollision();
    this.bc = new BuildingCollision();
    this.pp = new PlayerPedCollision();
  }
  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      this.vv.handleVehicleCollisions(state, v);
      this.bc.handleBuildingCollisions(state, v);
      this.pp.handlePlayerCollision(state, v);
      this.pp.handlePedestrianCollision(state, v);
      this.bc.handleMapBoundaries(state, v);
    }
  }
}

