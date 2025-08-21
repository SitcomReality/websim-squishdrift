import { createVehicle } from '../vehicles/VehicleTypes.js';
import { Vec2 } from '../../utils/Vec2.js';

export class SpawnManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.spawnedPowerUps = new Set();
    
    // Weighted pickup types
    this.powerUpTypes = [
      { name: 'Pistol',        color: '#FFD700', weight: 40 },
      { name: 'Health Pack',   color: '#4CAF50', weight: 25 },
      { name: 'Police Bribes', color: '#8A2BE2', weight: 15 },
      { name: 'Machine Gun',   color: '#FF4500', weight: 12 },
      { name: 'Rocket Launcher',color: '#FF1493', weight: 8 }
    ];
    
    // Pre-compute total weight
    this.totalWeight = this.powerUpTypes.reduce((sum, p) => sum + p.weight, 0);
  }

  update(dt) {
    const state = this.stateManager.getState();
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    this.updateSpawning(player);
    this.updatePowerUpRespawns(state, player);
  }

  updateSpawning(player) {
    const state = this.stateManager.getState();
    const innerSpawnRadius = 8;
    const outerSpawnRadius = 10;
    const despawnRadius = 12;

    // Despawn entities outside despawn radius
    this.despawnEntities(state, player, despawnRadius);

    // Spawn new entities within spawn radius but outside inner radius
    const referenceEntity = state.control.inVehicle 
      ? state.control.vehicle 
      : player;
    
    this.spawnEntitiesNearPlayer(state, referenceEntity, innerSpawnRadius, outerSpawnRadius);
  }

  updatePowerUpRespawns(state, player) {
    // Check if player is near any pickup spots that need respawning
    const referencePos = state.control.inVehicle 
      ? state.control.vehicle.pos 
      : player.pos;

    for (const spot of state.pickupSpots || []) {
      const distance = Math.hypot(spot.x - referencePos.x, spot.y - referencePos.y);
      
      // Respawn power-up if player is within range and spot is empty
      if (distance <= 8 && !spot.hasItem) {
        this.respawnPowerUp(state, spot);
      }
    }
  }

  respawnPowerUp(state, spot) {
    // Weighted random selection
    let random = state.rand() * this.totalWeight;
    let selected = this.powerUpTypes[this.powerUpTypes.length - 1]; // fallback
    
    for (const pu of this.powerUpTypes) {
      if (random < pu.weight) {
        selected = pu;
        break;
      }
      random -= pu.weight;
    }
    
    const item = {
      type: 'item',
      pos: new Vec2(spot.x, spot.y),
      name: selected.name,
      color: selected.color,
      spotId: state.pickupSpots.indexOf(spot)
    };
    
    state.entities.push(item);
    spot.hasItem = true;
  }

  despawnEntities(state, player, despawnRadius) {
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const entity = state.entities[i];
      if (entity.type === 'player') continue;
      
      const referencePos = state.control.inVehicle 
        ? state.control.vehicle.pos 
        : player.pos;
      
      const distance = Math.hypot(entity.pos.x - referencePos.x, entity.pos.y - referencePos.y);
      
      if (distance > despawnRadius) {
        // If this entity is tied to a pickup spot, mark that spot empty
        if (entity.type === 'item' && typeof entity.spotId === 'number' && state?.pickupSpots?.[entity.spotId]) {
          state.pickupSpots[entity.spotId].hasItem = false;
        }
        state.entities.splice(i, 1);
      }
    }
  }

  spawnEntitiesNearPlayer(state, referencePos, innerSpawnRadius, outerSpawnRadius) {
    const existingNPCs = state.entities.filter(e => e.type === 'npc').length;
    const existingVehicles = state.entities.filter(e => e.type === 'vehicle').length;
    
    const maxNPCs = 20;
    const maxVehicles = 10;

    // Spawn NPCs
    if (existingNPCs < maxNPCs) {
      const pedNodes = state.world.map.peds?.list || [];
      const validSpawns = pedNodes.filter(node => {
        // Skip median strips for spawning
        if (state.world.map.tiles[Math.floor(node.y)][Math.floor(node.x)] === 5) {
          return false;
        }
        const distance = Math.hypot(node.x - referencePos.x, node.y - referencePos.y);
        return distance <= outerSpawnRadius && distance >= innerSpawnRadius;
      });

      if (validSpawns.length > 0) {
        const spawnNode = validSpawns[Math.floor(state.rand() * validSpawns.length)];
        const next = (spawnNode.neighbors && spawnNode.neighbors.length) 
          ? spawnNode.neighbors[Math.floor(state.rand() * spawnNode.neighbors.length)]
          : { x: spawnNode.x, y: spawnNode.y };
        
        state.entities.push({
          type: 'npc',
          pos: { x: spawnNode.x + 0.5, y: spawnNode.y + 0.5 },
          from: { x: spawnNode.x, y: spawnNode.y },
          to: next,
          t: 0,
          speed: 0.2 + state.rand() * 0.15
        });
      }
    }

    // Spawn vehicles with random types
    if (existingVehicles < maxVehicles) {
      const roads = state.world.map.roads;
      const vehicleTypes = ['compact', 'sedan', 'truck', 'sports'];
      
      const validSpawns = roads.nodes.filter(node => {
        // Check distance to existing vehicles
        const tooCloseToVehicle = state.entities.some(e => 
          e.type === 'vehicle' && 
          Math.hypot(e.pos.x - (node.x + 0.5), e.pos.y - (node.y + 0.5)) < 1.5
        );
        
        if (tooCloseToVehicle) return false;
        
        const distance = Math.hypot(node.x - referencePos.x, node.y - referencePos.y);
        return distance <= outerSpawnRadius && distance >= innerSpawnRadius && node.next && node.next.length > 0;
      });

      if (validSpawns.length > 0) {
        const spawnNode = validSpawns[Math.floor(state.rand() * validSpawns.length)];
        const next = spawnNode.next[Math.floor(state.rand() * spawnNode.next.length)];
        
        // Randomly select vehicle type
        const selectedType = vehicleTypes[Math.floor(state.rand() * vehicleTypes.length)];
        
        // Determine direction based on road direction
        let rot = 0;
        switch(spawnNode.dir) {
          case 'N': rot = -Math.PI/2; break;
          case 'E': rot = 0; break;
          case 'S': rot = Math.PI/2; break;
          case 'W': rot = Math.PI; break;
        }
        
        // Create vehicle using the vehicle type system
        const vehicle = createVehicle(selectedType, {
          x: spawnNode.x + 0.5,
          y: spawnNode.y + 0.5
        }, {
          node: spawnNode,
          next,
          rot,
          speed: 0.25 * 1.5,
          vel: { x: 0, y: 0 },
          angularVel: 0,
          ctrl: { throttle: 0, brake: 0, steer: 0 }
        });
        
        state.entities.push(vehicle);
      }
    }
  }
}