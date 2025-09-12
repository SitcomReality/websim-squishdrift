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
import { ParticleSystem } from './systems/particles/index.js';
import { EngineAudioSystem } from './systems/EngineAudioSystem.js';
import { AnimationSystem } from './systems/AnimationSystem.js';

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
      collision: new CollisionSystem(),
      particles: new ParticleSystem(),
      engineAudio: new EngineAudioSystem(),
      animation: new AnimationSystem()
    };
    // Connect camera system to collision system for screen shake
    this.systems.collision.cameraSystem = this.systems.camera;
    /* attach camera system to state for global access */
    const s = this.stateManager.getState?.();
    if (s) {
      s.cameraSystem = this.systems.camera;
      s.particleSystem = this.systems.particles; // ensure emitters accessible via state
    }
  }

  update(dt) {
    const state = this.stateManager.getState();
    const input = this.stateManager.inputManager?.getInput();
    if (state && !state.cameraSystem) state.cameraSystem = this.systems.camera;
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
    this.systems.particles.update(state, dt);
    this.systems.engineAudio.update(state, dt);
    this.systems.animation.update(state);
  }

  getSystems() {
    return this.systems;
  }
}