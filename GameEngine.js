import { CanvasRenderer } from '../CanvasRenderer.js';
import { InputSystem } from '../InputSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { EmergencyServices } from '../systems/EmergencyServices.js';
import { PlayerSystem } from '../systems/PlayerSystem.js';
import { VehicleSystem } from '../systems/VehicleSystem.js';
import { BulletSystem } from '../systems/BulletSystem.js';
import { NPCSystem } from '../systems/NPCSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { AIDrivingSystem } from '../systems/AIDrivingSystem.js';
import { VehicleMovementSystem } from '../vehicles/physics/VehicleMovementSystem.js';
import { VehicleCollisionSystem } from '../vehicles/physics/VehicleCollisionSystem.js';
import { SkidmarkSystem } from '../systems/SkidmarkSystem.js';
import { createInitialState } from '../state/createInitialState.js';
import { DebugOverlaySystem } from '../systems/DebugOverlaySystem.js';

export class GameEngine {
  constructor(canvas, { debugEl } = {}) {
    this.renderer = new CanvasRenderer(canvas);
    this.input = new InputSystem(canvas);
    this.debugOverlay = new DebugOverlaySystem(debugEl);
    this.collisionSystem = new CollisionSystem();
    
    this.systems = {
      player: new PlayerSystem(),
      vehicle: new VehicleSystem(),
      bullet: new BulletSystem(),
      npc: new NPCSystem(),
      camera: new CameraSystem(),
      render: new RenderSystem(),
      aiDrive: new AIDrivingSystem(),
      vehicleMovement: new VehicleMovementSystem(),
      vehicleCollision: new VehicleCollisionSystem(),
      skidmarks: new SkidmarkSystem()
    };
    
    this.state = createInitialState();
    this.emergencyServices = new EmergencyServices(this.state);
  }

  update(dt) {
    this.systems.player.update(this.state, this.input, dt);
    this.systems.vehicle.update(this.state, this.input, dt);
    this.systems.bullet.update(this.state, dt);
    this.systems.npc.update(this.state, dt);
    this.systems.aiDrive.update(this.state, dt);
    this.systems.vehicleMovement.update(this.state, dt);
    this.systems.vehicleCollision.update(this.state, dt);
    this.systems.camera.update(this.state, this.input);
    this.collisionSystem.update(this.state);
    this.emergencyServices.update(this.state, dt);
    this.systems.skidmarks.update(this.state, dt);
    
    this.debugOverlay.update(this.state);
    this.input.update();
  }

  render(interp) {
    this.renderer.beginFrame(this.state);
    this.systems.render.render(this.state, this.renderer, this.debugOverlay);
    this.renderer.endFrame();
  }
}

