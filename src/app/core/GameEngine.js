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
import { VehiclePhysicsSystem } from './systems/VehiclePhysicsSystem.js';
import { AIDrivingSystem } from './systems/AIDrivingSystem.js';

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
      physics: new VehiclePhysicsSystem(),
      aiDrive: new AIDrivingSystem(),
    };
    
    this.state = createInitialState();
    this.state.control = { inVehicle: false, vehicle: null, equipped: null };
    
    // Initialize EmergencyServices after state is created
    this.emergencyServices = new EmergencyServices(this.state);
    
    // Start with debug overlay disabled by default
    this.debugOverlay.enabled = false;
    
    this.updateHUD();
  }

  updateHUD() {
    const wantedRow = document.createElement('div');
    wantedRow.className = 'row';
    wantedRow.innerHTML = '<span class="label">Wanted</span><span id="wanted-level">0</span>';
    document.getElementById('hud').appendChild(wantedRow);
    
    // Add interaction prompt
    const interactionRow = document.createElement('div');
    interactionRow.className = 'row';
    interactionRow.id = 'interaction-prompt';
    interactionRow.style.display = 'none';
    interactionRow.innerHTML = '<span class="label">Press E to</span><span id="interaction-action">enter vehicle</span>';
    document.getElementById('hud').appendChild(interactionRow);
    
    // Add debug info row
    const debugRow = document.createElement('div');
    debugRow.className = 'row';
    debugRow.id = 'debug-info';
    debugRow.style.display = 'none';
    debugRow.innerHTML = '<span class="label">Debug</span><span id="debug-text">-</span>';
    document.getElementById('hud').appendChild(debugRow);
    
    this.hud = {
      vehicleStateEl: document.getElementById('vehicle-state'),
      itemNameEl: document.getElementById('item-name'),
      hpBarEl: document.getElementById('hp-bar'),
      wantedLevelEl: document.getElementById('wanted-level'),
      interactionPromptEl: document.getElementById('interaction-prompt'),
      interactionActionEl: document.getElementById('interaction-action'),
      debugInfoEl: document.getElementById('debug-info'),
      debugTextEl: document.getElementById('debug-text')
    };
  }

  update(dt) {
    // this.input.update() moved to end so 'pressed' keys are available this frame
    this.systems.player.update(this.state, this.input, dt);
    this.systems.vehicle.update(this.state, this.input, dt);
    this.systems.bullet.update(this.state, dt);
    this.systems.npc.update(this.state, dt);
    this.systems.aiDrive.update(this.state, dt);
    this.systems.physics.update(this.state, dt);
    this.systems.camera.update(this.state, this.input);
    this.collisionSystem.update(this.state);
    this.emergencyServices.update(this.state, dt);
    
    // Update spawn/despawn system
    this.updateSpawning(dt);
    this.updateDebugHUD();
    
    // Now clear one-shot inputs (pressed) after systems consumed them
    this.input.update();
  }

  updateSpawning(dt) {
    const player = this.state.entities.find(e => e.type === 'player');
    if (!player) return;

    // Update interaction prompt
    if (!this.state.control.inVehicle) {
      const nearbyVehicle = this.findNearbyVehicle(player);
      if (nearbyVehicle) {
        this.hud.interactionPromptEl.style.display = 'flex';
        this.hud.interactionActionEl.textContent = 'enter vehicle';
      } else {
        this.hud.interactionPromptEl.style.display = 'none';
      }
    } else {
      this.hud.interactionPromptEl.style.display = 'flex';
      this.hud.interactionActionEl.textContent = 'exit vehicle';
    }

    const innerSpawnRadius = 8;  // New inner radius
    const outerSpawnRadius = 10;   // Changed from spawnRadius
    const despawnRadius = 15;      // Reduced from 20

    // Despawn entities outside despawn radius
    for (let i = this.state.entities.length - 1; i >= 0; i--) {
      const entity = this.state.entities[i];
      if (entity.type === 'player') continue;
      
      const distance = Math.hypot(entity.pos.x - player.pos.x, entity.pos.y - player.pos.y);
      if (distance > despawnRadius) {
        this.state.entities.splice(i, 1);
      }
    }

    // Spawn new entities within spawn radius but outside inner radius
    this.spawnEntitiesNearPlayer(player, innerSpawnRadius, outerSpawnRadius);
  }

  findNearbyVehicle(player) {
    const interactionDistance = 1.5;
    return this.state.entities.find(e => 
      e.type === 'vehicle' && 
      !e.controlled && 
      Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) < interactionDistance
    );
  }

  spawnEntitiesNearPlayer(player, innerRadius, outerRadius) {
    const existingNPCs = this.state.entities.filter(e => e.type === 'npc').length;
    const existingVehicles = this.state.entities.filter(e => e.type === 'vehicle').length;
    
    const maxNPCs = 20;
    const maxVehicles = 10;

    // Spawn NPCs
    if (existingNPCs < maxNPCs) {
      const pedNodes = this.state.world.map.peds?.list || [];
      const validSpawns = pedNodes.filter(node => {
        const distance = Math.hypot(node.x - player.pos.x, node.y - player.pos.y);
        return distance <= outerRadius && distance >= innerRadius;
      });

      if (validSpawns.length > 0) {
        const spawnNode = validSpawns[Math.floor(this.state.rand() * validSpawns.length)];
        const next = (spawnNode.neighbors && spawnNode.neighbors.length) 
          ? spawnNode.neighbors[Math.floor(this.state.rand() * spawnNode.neighbors.length)]
          : { x: spawnNode.x, y: spawnNode.y };
        
        this.state.entities.push({
          type: 'npc',
          pos: { x: spawnNode.x + 0.5, y: spawnNode.y + 0.5 },
          from: { x: spawnNode.x, y: spawnNode.y },
          to: next,
          t: 0,
          speed: 0.2 + this.state.rand() * 0.15
        });
      }
    }

    // Spawn vehicles
    if (existingVehicles < maxVehicles) {
      const roads = this.state.world.map.roads;
      const validSpawns = roads.nodes.filter(node => {
        const distance = Math.hypot(node.x - player.pos.x, node.y - player.pos.y);
        return distance <= outerRadius && distance >= innerRadius && node.next && node.next.length > 0;
      });

      if (validSpawns.length > 0) {
        const spawnNode = validSpawns[Math.floor(this.state.rand() * validSpawns.length)];
        const next = spawnNode.next[Math.floor(this.state.rand() * spawnNode.next.length)];
        
        // Determine direction based on road direction
        let rot = 0;
        switch(spawnNode.dir) {
          case 'N': rot = -Math.PI/2; break;
          case 'E': rot = 0; break;
          case 'S': rot = Math.PI/2; break;
          case 'W': rot = Math.PI; break;
        }
        
        this.state.entities.push({
          type: 'vehicle',
          pos: { x: spawnNode.x + 0.5, y: spawnNode.y + 0.5 },
          node: spawnNode,
          next,
          t: 0,
          speed: 0.25 * 1.5, // 25% of original speed
          rot,
          vel: { x: 0, y: 0 },
          angularVel: 0,
          ctrl: { throttle: 0, brake: 0, steer: 0 },
          mass: 1200, maxSpeed: 4, engineForce: 900, brakeForce: 1600,
          rollingRes: 1.0, drag: 0.25, grip: 6.0, steerRate: 2.5
        });
      }
    }
  }

  render(interp) {
    this.renderer.beginFrame(this.state);
    this.systems.render.render(this.state, this.renderer, this.debugOverlay);
    this.renderer.endFrame();
  }

  updateDebugHUD() {
    const player = this.state.entities.find(e => e.type === 'player');
    const debugData = {
      fps: this.renderer.fps,
      player: { x: player?.pos.x.toFixed(2), y: player?.pos.y.toFixed(2) },
      camera: { x: this.state.camera.x.toFixed(2), y: this.state.camera.y.toFixed(2) },
      npcs: this.state.entities.filter(e=>e.type==='npc').length,
      vehicles: this.state.entities.filter(e=>e.type==='vehicle').length,
      wantedLevel: this.emergencyServices.wantedLevel,
      activeIncidents: this.emergencyServices.activeIncidents.length,
      emergencyVehicles: this.emergencyServices.emergencyVehicles.length
    };
    
    this.debugOverlay.update(debugData);
    
    // Update HUD debug info
    if (this.debugOverlay.enabled) {
      this.hud.debugInfoEl.style.display = 'flex';
      this.hud.debugTextEl.textContent = `FPS:${debugData.fps} NPCs:${debugData.npcs} Vehicles:${debugData.vehicles}`;
    } else {
      this.hud.debugInfoEl.style.display = 'none';
    }
  }
}