import { Vec2 } from '../../../utils/Vec2.js';
import { Tile } from '../../../map/TileTypes.js';

export class PickupManager {
  constructor() {
    this.spawnLocations = [];
    this.activePickups = new Map(); // Map of locationKey -> pickupEntity
    this.despawnRadius = 15;
    this.spawnRadius = 10;
    this.respawnDelay = 5; // seconds
    this.lastUpdate = 0;
    
    // Define pickup types with spawn chances
    this.pickupTypes = {
      pistol: {
        name: 'Pistol',
        type: 'weapon',
        weaponType: 'pistol',
        color: '#8B4513',
        rarity: 1.0, // 100% chance until we add more items
        itemType: 'pistol'
      }
    };
  }

  addSpawnLocation(position) {
    const locationKey = `${Math.floor(position.x)},${Math.floor(position.y)}`;
    this.spawnLocations.push({
      position: new Vec2(position.x, position.y),
      key: locationKey,
      lastSpawnTime: 0
    });
  }

  update(state, dt) {
    this.lastUpdate += dt;
    
    // Only check every 2 seconds to avoid performance issues
    if (this.lastUpdate < 2) return;
    this.lastUpdate = 0;
    
    const referenceEntity = state.control.inVehicle 
      ? state.control.vehicle 
      : state.entities.find(e => e.type === 'player');
    
    if (!referenceEntity) return;
    
    for (const location of this.spawnLocations) {
      const distance = Math.hypot(
        location.position.x - referenceEntity.pos.x,
        location.position.y - referenceEntity.pos.y
      );
      
      // Despawn pickups that are too far
      if (distance > this.despawnRadius) {
        const existingPickup = this.activePickups.get(location.key);
        if (existingPickup) {
          const index = state.entities.indexOf(existingPickup);
          if (index > -1) {
            state.entities.splice(index, 1);
          }
          this.activePickups.delete(location.key);
        }
        continue;
      }
      
      // Spawn new pickups if within range and no active pickup
      if (distance <= this.spawnRadius) {
        if (!this.activePickups.has(location.key) && 
            (Date.now() - location.lastSpawnTime) / 1000 > this.respawnDelay) {
          this.spawnPickup(state, location);
        }
      }
    }
  }

  spawnPickup(state, location) {
    // Select random pickup based on rarity
    const selectedType = this.selectRandomPickup();
    if (!selectedType) return;
    
    const pickup = {
      type: 'weapon',
      pos: new Vec2(location.position.x, location.position.y),
      name: selectedType.name,
      weaponType: selectedType.weaponType,
      color: selectedType.color,
      itemType: selectedType.itemType
    };
    
    state.entities.push(pickup);
    this.activePickups.set(location.key, pickup);
    location.lastSpawnTime = Date.now();
  }

  selectRandomPickup() {
    const types = Object.values(this.pickupTypes);
    const totalRarity = types.reduce((sum, type) => sum + type.rarity, 0);
    
    let random = Math.random() * totalRarity;
    
    for (const type of types) {
      random -= type.rarity;
      if (random <= 0) {
        return type;
      }
    }
    
    return types[0]; // Fallback
  }
}