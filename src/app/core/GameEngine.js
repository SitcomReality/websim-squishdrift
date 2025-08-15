import { CanvasRenderer } from '../CanvasRenderer.js';
import { InputSystem } from '../InputSystem.js';
import { DebugOverlaySystem } from '../DebugOverlaySystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { EmergencyServices } from '../systems/EmergencyServices.js';
import { PlayerSystem } from './systems/PlayerSystem.js';
import { VehicleSystem } from './systems/VehicleSystem.js';
import { BulletSystem } from './systems/BulletSystem.js';
import { NPCSystem } from './systems/NPCSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { createInitialState } from '../state/createInitialState.js';

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
      render: new RenderSystem()
    };
    
    this.state = createInitialState();
    this.state.control = { inVehicle: false, vehicle: null, equipped: null };
    
    // Initialize EmergencyServices after state is created
    this.emergencyServices = new EmergencyServices(this.state);
    
    this.setupHUD();
  }

  setupHUD() {
    const wantedRow = document.createElement('div');
    wantedRow.className = 'row';
    wantedRow.innerHTML = '<span class="label">Wanted</span><span id="wanted-level">0</span>';
    document.getElementById('hud').appendChild(wantedRow);
    
    this.hud = {
      vehicleStateEl: document.getElementById('vehicle-state'),
      itemNameEl: document.getElementById('item-name'),
      hpBarEl: document.getElementById('hp-bar'),
      wantedLevelEl: document.getElementById('wanted-level')
    };
  }

  update(dt) {
    this.input.update();
    this.systems.player.update(this.state, this.input, dt);
    this.systems.vehicle.update(this.state, this.input, dt);
    this.systems.bullet.update(this.state, dt);
    this.systems.npc.update(this.state, dt);
    this.systems.camera.update(this.state);
    this.collisionSystem.update(this.state);
    this.emergencyServices.update(this.state, dt);
    this.updateDebugHUD();
  }

  render(interp) {
    this.renderer.beginFrame(this.state);
    this.systems.render.render(this.state, this.renderer, this.debugOverlay);
    this.renderer.endFrame();
  }

  updateDebugHUD() {
    const player = this.state.entities.find(e => e.type === 'player');
    this.debugOverlay.update({
      fps: this.renderer.fps,
      dt: 0,
      player: { x: player?.pos.x.toFixed(2), y: player?.pos.y.toFixed(2) },
      camera: { x: this.state.camera.x.toFixed(2), y: this.state.camera.y.toFixed(2) },
      roads: {
        nodes: this.state.world.map.roads.nodes.length,
        links: this.state.world.map.roads.nodes.reduce((a,n)=>a+n.next.length,0)
      },
      npcs: this.state.entities.filter(e=>e.type==='npc').length,
      wantedLevel: this.emergencyServices.wantedLevel,
      activeIncidents: this.emergencyServices.activeIncidents.length,
      emergencyVehicles: this.emergencyServices.emergencyVehicles.length
    });
  }
}