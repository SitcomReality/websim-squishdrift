import { createVehicle } from '../vehicles/VehicleTypes.js';
import { Vec2 } from '../../utils/Vec2.js';

export class SpawnManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.spawnPoints = [];
    this.powerUps = [];
    this.spawnRadius = 1.5; // tiles
    this.respawnCooldown = 5000; // 5 seconds
    this.lastRespawnTime = 0;
  }

  update(state, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    this.updateSpawnPoints(state);
    this.checkRespawns(state, player);
    this.updatePowerUps(state, dt);
  }

  updateSpawnPoints(state) {
    const map = state.world?.map;
    if (!map) return;

    // Find all valid spawn locations (road tiles adjacent to median strip)
    this.spawnPoints = [];
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (tile === 7 || tile === 10) { // Footpath or Park
          // Check if adjacent to road
          const adjacentRoad = this.isAdjacentToRoad(map, x, y);
          if (adjacentRoad) {
            this.spawnPoints.push({ x: x + 0.5, y: y + 0.5 });
          }
        }
      }
    }
  }

  checkRespawns(state, player) {
    const now = Date.now();
    if (now - this.lastRespawnTime < this.respawnCooldown) return;

    for (const spawn of this.spawnPoints) {
      const distance = Math.hypot(player.pos.x - spawn.x, player.pos.y - spawn.y);
      if (distance <= this.spawnRadius) {
        this.spawnPowerUp(state, spawn);
        this.lastRespawnTime = now;
      }
    }
  }

  spawnPowerUp(state, spawnPos) {
    const powerUp = {
      type: 'powerup',
      pos: new Vec2(spawnPos.x, spawnPos.y),
      powerupType: this.getRandomPowerUpType(),
      lifetime: 30000, // 30 seconds
      age: 0
    };
    
    state.entities.push(powerUp);
    this.powerUps.push(powerUp);
  }

  getRandomPowerUpType() {
    const types = ['health', 'ammo', 'armor', 'speed'];
    return types[Math.floor(Math.state.rand() * types.length)];
  }

  updatePowerUps(state, dt) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      powerUp.age += dt * 1000;
      
      if (powerUp.age >= powerUp.lifetime) {
        const index = state.entities.indexOf(powerUp);
        if (index > -1) state.entities.splice(index, 1);
        this.powerUps.splice(i, 1);
      }
    }
  }

  isAdjacentToRoad(map, x, y) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
        const tile = map.tiles[ny][nx];
        if (tile >= 1 && tile <= 4) return true; // Road tiles
      }
    }
    return false;
  }
}