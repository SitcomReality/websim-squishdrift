import { CollisionSystem } from '../systems/CollisionSystem.js';
import { PlayerSystem } from './systems/PlayerSystem.js';
import { VehicleSystem } from './systems/VehicleSystem.js';
import { BulletSystem } from './systems/BulletSystem.js';
import { NPCSystem } from './systems/NPCSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { AIDrivingSystem } from './systems/AIDrivingSystem.js';
import { VehicleMovementSystem } from '../vehicles/physics/VehicleMovementSystem.js';
import { VehicleCollisionSystem } from '../vehicles/physics/VehicleCollisionSystem.js';
import { SkidmarkSystem } from './systems/SkidmarkSystem.js';
import { WeaponSystem } from './systems/WeaponSystem.js';

export class SystemManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.systems = {
      player: new PlayerSystem(),
      vehicle: new VehicleSystem(),
      bullet: new BulletSystem(),
      npc: new NPCSystem(),
      camera: new CameraSystem(),
      aiDrive: new AIDrivingSystem(),
      vehicleMovement: new VehicleMovementSystem(),
      vehicleCollision: new VehicleCollisionSystem(),
      skidmarks: new SkidmarkSystem(),
      weapon: new WeaponSystem(),
      collision: new CollisionSystem()
    };
  }

  update(dt) {
    const state = this.stateManager.getState();
    const input = this.stateManager.inputManager?.getInput();
    
    this.systems.player.update(state, input, dt);
    this.systems.vehicle.update(state, input, dt);
    this.systems.bullet.update(state, dt);
    this.systems.npc.update(state, dt);
    this.systems.aiDrive.update(state, dt);
    this.systems.vehicleMovement.update(state, dt);
    this.systems.vehicleCollision.update(state, dt);
    this.systems.camera.update(state, input);
    this.systems.collision.update(state);
    this.stateManager.emergencyServices.update(state, dt);
    this.systems.skidmarks.update(state, dt);
    this.systems.weapon.update(state, input, dt);
  }

  getSystems() {
    return this.systems;
  }
}

