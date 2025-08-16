import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';

export class VehicleCollisionSystem {
  constructor() {}

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      this.handleVehicleCollisions(state, v);
      this.handleBuildingCollisions(state, v);
    }
  }

  handleVehicleCollisions(state, v) {
    const vehicles = state.entities.filter(e => e.type === 'vehicle' && e !== v);
    for (const other of vehicles) {
      const dx = v.pos.x - other.pos.x;
      const dy = v.pos.y - other.pos.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const minDist = (v.radius || VehiclePhysicsConstants.vehicleCollisionRadius) + 
                      (other.radius || VehiclePhysicsConstants.vehicleCollisionRadius);
      
      if (dist < minDist) {
        // Separate
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist, ny = dy / dist;
        v.pos.x += nx * overlap;
        v.pos.y += ny * overlap;
        other.pos.x -= nx * overlap;
        other.pos.y -= ny * overlap;
        
        // Exchange velocities along collision normal with restitution
        const relVel = (v.vel.x - other.vel.x) * nx + (v.vel.y - other.vel.y) * ny;
        const restitution = 0.35; // bounciness
        if (relVel < 0) { // check if moving towards each other
          const impulse = (1 + restitution) * relVel / 
                           (1 / v.mass + 1 / other.mass);
          v.vel.x -= (impulse / v.mass) * nx;
          v.vel.y -= (impulse / v.mass) * ny;
          other.vel.x += (impulse / other.mass) * nx;
          other.vel.y += (impulse / other.mass) * ny;
        }
        
        // Small damping to avoid jitter
        v.vel.x *= 0.9; v.vel.y *= 0.9;
        other.vel.x *= 0.9; other.vel.y *= 0.9;
      }
    }
  }

  handleBuildingCollisions(state, v) {
    const map = state.world?.map;
    if (!map) return;

    const checkRange = Math.ceil((v.radius || VehiclePhysicsConstants.vehicleCollisionRadius) + 1);
    const tx = Math.floor(v.pos.x);
    const ty = Math.floor(v.pos.y);
    
    for (let oy = -checkRange; oy <= checkRange; oy++) {
      for (let ox = -checkRange; ox <= checkRange; ox++) {
        const gx = tx + ox;
        const gy = ty + oy;
        if (gx < 0 || gy < 0 || gx >= map.width || gy >= map.height) continue;
        
        const t = map.tiles[gy][gx];
        if (t === Tile.BuildingFloor || t === Tile.BuildingWall) {
          // treat tile as solid box centered at tile; compute penetration and push out
          const nearestX = Math.max(gx, Math.min(v.pos.x, gx + 1));
          const nearestY = Math.max(gy, Math.min(v.pos.y, gy + 1));
          const dx = v.pos.x - nearestX;
          const dy = v.pos.y - nearestY;
          const distSq = dx * dx + dy * dy;
          const radius = v.radius || VehiclePhysicsConstants.vehicleCollisionRadius;
          
          if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq) || 0.0001;
            const nx = dx / dist;
            const ny = dy / dist;
            const push = radius - dist;
            
            // if inside tile center (dist very small), push away from tile center
            v.pos.x += nx * push;
            v.pos.y += ny * push;
            
            // reflect velocity along normal and damp
            const vn = v.vel.x * nx + v.vel.y * ny;
            v.vel.x -= (1.5 * vn) * nx;
            v.vel.y -= (1.5 * vn) * ny;
            v.vel.x *= 0.6;
            v.vel.y *= 0.6;
          }
        }
      }
    }
  }
}