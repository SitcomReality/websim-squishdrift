import { createVehicle } from '../vehicles/VehicleTypes.js';
import { Vec2 } from '../../utils/Vec2.js';

export class SpawnManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.respawnCheckInterval = 500; // Check every 500ms
    this.lastRespawnCheck = 0;
  }

  update(dt) {
    const state = this.stateManager.getState();
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    // Update respawn timer
    this.lastRespawnCheck += dt;
    if (this.lastRespawnCheck < this.respawnCheckInterval) return;
    this.lastRespawnCheck = 0;

    // Find all spawn locations
    const spawnLocations = this.findSpawnLocations(state);
    
    // Check which locations player is in range of
    const nearbySpawns = spawnLocations.filter(location => {
      const distance = Vec2.Distance(player.pos, location.pos);
      return distance <= location.spawnRadius;
    });

    // Spawn items at locations player enters
    this.spawnItemsAtLocations(state, nearbySpawns);
  }

  findSpawnLocations(state) {
    const map = state.world.map;
    const locations = [];

    // 1. Building centers (where pickups originally spawn)
    for (let by = 0; by < state.cityLayout.blocksHigh; by++) {
      for (let bx = 0; bx < state.cityLayout.blocksWide; bx++) {
        const origin = state.cityLayout.getBlockOrigin(bx, by);
        const centerX = origin.x + state.cityLayout.W / 2;
        const centerY = origin.y + state.cityLayout.W / 2;
        
        locations.push({
          pos: new Vec2(centerX, centerY),
          spawnRadius: state.cityLayout.W / 2,
          type: 'building'
        });
      }
    }

    // 2. Pedestrian spawn points
    const pedNodes = state.world.map.peds?.list || [];
    for (const node of pedNodes) {
      locations.push({
        pos: new Vec2(node.x + 0.5, node.y + 0.5),
        spawnRadius: 1.5,
        type: 'pedestrian'
      });
    }

    // 3. Road intersection centers
    const roads = state.world.map.roads;
    for (const { cx, cy } of roads.roundabouts || []) {
      locations.push({
        pos: new Vec2(cx, cy),
        spawnRadius: 2,
        type: 'intersection'
      });
    }

    return locations;
  }

  spawnItemsAtLocations(state, locations) {
    // Track which locations have active spawns
    if (!state.activeSpawns) state.activeSpawns = new Map();

    locations.forEach(location => {
      const key = `${location.pos.x},${location.pos.y}`;
      
      // Skip if already active
      if (state.activeSpawns.has(key)) return;

      // Check if location is already occupied
      const occupied = state.entities.some(e => 
        e.type === 'item' && 
        Math.abs(e.pos.x - location.pos.x) < 0.5 && 
        Math.abs(e.pos.y - location.pos.y) < 0.5
      );

      if (!occupied) {
        // Spawn new item
        const item = this.createItemForLocation(state, location);
        state.entities.push(item);
        state.activeSpawns.set(key, item);
      }
    });

    // Clean up spawns player has left
    for (const [key, item] of state.activeSpawns) {
      const [x, y] = key.split(',').map(Number);
      const distance = Vec2.Distance(player.pos, new Vec2(x, y));
      
      if (distance > location.spawnRadius + 1) {
        // Remove item if it exists
        const index = state.entities.indexOf(item);
        if (index > -1) {
          state.entities.splice(index, 1);
        }
        state.activeSpawns.delete(key);
      }
    }
  }

  createItemForLocation(state, location) {
    const items = [
      { type: 'item', name: 'Health Pack', color: '#4CAF50' },
      { type: 'item', name: 'Ammo Crate', color: '#FF9800' },
      { type: 'item', name: 'Armor', color: '#2196F3' },
      { type: 'item', name: 'Grenade', color: '#F44336' }
    ];

    const itemType = items[state.rand() * items.length | 0];
    
    return {
      type: 'item',
      pos: new Vec2(location.pos.x, location.pos.y),
      name: itemType.name,
      color: itemType.color,
      spotId: `${location.type}_${Math.floor(location.pos.x)}_${Math.floor(location.pos.y)}`
    };
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