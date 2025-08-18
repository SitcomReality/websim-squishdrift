import { Vec2 } from '../../../utils/Vec2.js';

export class PickupManager {
  constructor() {
    this.spawnLocations = [];
    this.activePickups = new Map(); // Map of locationKey -> pickupEntity
    
    // Define pickup types with spawn chances
    this.pickupTypes = {
      pistol: {
        name: 'Pistol',
        type: 'weapon',
        weaponType: 'pistol',
        color: '#8B4513',
        rarity: 1.0 // 100% chance for now
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
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    const referenceEntity = state.control.inVehicle 
      ? state.control.vehicle 
      : player;
    
    // Check each spawn location
    for (const location of this.spawnLocations) {
      const distance = Math.hypot(
        location.position.x - referenceEntity.pos.x,
        location.position.y - referenceEntity.pos.y
      );
      
      // Despawn pickups that are too far
      if (distance > this.pickupManager.despawnRadius) {
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
      
      // Spawn new pickup if in range and none exists
      if (distance <= this.pickupManager.spawnRadius) {
        if (!this.activePickups.has(location.key)) {
          this.spawnPickup(state, location);
        }
      }
    }
  }

  spawnPickup(state, location) {
    const selectedType = this.selectRandomPickup();
    if (!selectedType) return;
    
    const pickup = {
      type: 'weapon',
      pos: new Vec2(location.position.x, location.position.y),
      name: selectedType.name,
      weaponType: selectedType.weaponType,
      color: selectedType.color
    };
    
    state.entities.push(pickup);
    this.activePickups.set(location.key, pickup);
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