import { Vec2 } from '../../../utils/Vec2.js';
import { findPath } from '../../../utils/pathfinding.js';
import { createVehicle } from '../../vehicles/VehicleTypes.js';

export class PoliceSystem {
  constructor() {
    this.policeCars = [];
    this.spawnTimers = {};
    this.chaseCooldown = 0;
    this.maxWantedLevel = 3;
  }

  update(state, dt) {
    if (!state || !state.scoringSystem) return;

    const wantedLevel = state.scoringSystem.getWantedLevel();
    if (wantedLevel === 0) {
      this.despawnAllPolice(state);
      return;
    }

    this.updatePoliceSpawning(state, wantedLevel, dt);
    this.updatePoliceBehavior(state, dt);
  }

  updatePoliceSpawning(state, wantedLevel, dt) {
    const targetCount = Math.min(wantedLevel, this.maxWantedLevel);
    const currentCount = this.policeCars.length;
    
    // Handle spawn timing based on wanted level
    let spawnDelay = 0;
    switch (wantedLevel) {
      case 1: spawnDelay = 30; break;
      case 2: spawnDelay = 15; break;
      case 3: spawnDelay = 0; break;
    }

    // Spawn new police cars if needed
    if (currentCount < targetCount) {
      if (!this.spawnTimers[wantedLevel]) {
        this.spawnTimers[wantedLevel] = 0;
      }
      
      this.spawnTimers[wantedLevel] += dt;
      
      if (this.spawnTimers[wantedLevel] >= spawnDelay) {
        this.spawnPoliceCar(state);
        this.spawnTimers[wantedLevel] = 0;
      }
    }
  }

  spawnPoliceCar(state) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    // Find valid spawn points
    const spawnPoint = this.findValidSpawnPoint(state, player.pos);
    if (!spawnPoint) return;

    // Create police car
    const policeCar = createVehicle('emergency', new Vec2(spawnPoint.x, spawnPoint.y), {
      vehicleType: 'police',
      color: '#0000FF',
      rot: 0,
      controlled: false,
      isPolice: true,
      drivingStyle: 'reckless',
      aiTargetSpeed: 4.0,
      isChasing: true,
      targetPlayer: true,
      maxHealth: 120,
      health: { hp: 120, maxHp: 120 }
    });

    state.entities.push(policeCar);
    this.policeCars.push(policeCar);
  }

  findValidSpawnPoint(state, playerPos) {
    const map = state.world?.map;
    if (!map) return null;

    const roads = map.roads;
    const validNodes = roads.nodes.filter(node => {
      const distance = Math.hypot(node.x - playerPos.x, node.y - playerPos.y);
      return distance > 8 && distance < 15; // Spawn within 8-15 tiles of player
    });

    if (validNodes.length === 0) return null;

    const spawnNode = validNodes[Math.floor(state.rand() * validNodes.length)];
    return { x: spawnNode.x + 0.5, y: spawnNode.y + 0.5 };
  }

  updatePoliceBehavior(state, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    for (let i = this.policeCars.length - 1; i >= 0; i--) {
      const policeCar = this.policeCars[i];
      
      if (!policeCar || policeCar.health.hp <= 0) {
        this.policeCars.splice(i, 1);
        continue;
      }

      // Update pathfinding to player
      this.updatePolicePathfinding(state, policeCar, player);

      // Handle ramming behavior
      this.handleRamming(state, policeCar, player);
    }
  }

  updatePolicePathfinding(state, policeCar, player) {
    const map = state.world.map;
    if (!map) return;

    const roads = map.roads;
    const nearestRoad = this.findNearestRoadNode(player.pos, roads);
    
    if (nearestRoad) {
      // Simple direct pathfinding - target player's road position
      policeCar.targetPos = new Vec2(nearestRoad.x + 0.5, nearestRoad.y + 0.5);
      
      // Calculate direction to player
      const dx = player.pos.x - policeCar.pos.x;
      const dy = player.pos.y - policeCar.pos.y;
      const angle = Math.atan2(dy, dx);
      
      // Update vehicle controls
      const distance = Math.hypot(dx, dy);
      
      if (distance > 1) {
        // Chase player
        const steer = Math.sin(angle - policeCar.rot) * 3;
        policeCar.ctrl = {
          throttle: Math.min(1, distance / 10),
          brake: 0,
          steer: Math.max(-1, Math.min(1, steer)),
          handbrake: false
        };
      } else {
        // Close to player - ramming behavior
        policeCar.ctrl = {
          throttle: 1,
          brake: 0,
          steer: Math.max(-1, Math.min(1, Math.sin(angle - policeCar.rot) * 2)),
          handbrake: false
        };
      }
    }
  }

  handleRamming(state, policeCar, player) {
    const distance = Math.hypot(
      policeCar.pos.x - player.pos.x,
      policeCar.pos.y - player.pos.y
    );

    if (distance < 2) {
      // Ramming behavior - increase speed and aim directly at player
      policeCar.ctrl.throttle = 1;
      
      // Calculate ram direction
      const dx = player.pos.x - policeCar.pos.x;
      const dy = player.pos.y - policeCar.pos.y;
      const angle = Math.atan2(dy, dx);
      
      // Aggressive steering
      const steer = Math.sin(angle - policeCar.rot) * 4;
      policeCar.ctrl.steer = Math.max(-1, Math.min(1, steer));
    }
  }

  findNearestRoadNode(pos, roads) {
    let nearest = null;
    let minDist = Infinity;
    
    for (const node of roads.nodes) {
      const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }
    
    return nearest;
  }

  despawnAllPolice(state) {
    for (const policeCar of this.policeCars) {
      const index = state.entities.indexOf(policeCar);
      if (index > -1) {
        state.entities.splice(index, 1);
      }
    }
    this.policeCars = [];
    
    // Clear all spawn timers
    this.spawnTimers = {};
  }

  removePoliceCar(state, policeCar) {
    const index = state.entities.indexOf(policeCar);
    if (index > -1) {
      state.entities.splice(index, 1);
    }
    
    const carIndex = this.policeCars.indexOf(policeCar);
    if (carIndex > -1) {
      this.policeCars.splice(carIndex, 1);
    }
  }
}