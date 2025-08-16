import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';

export class VehicleCollisionSystem {
  constructor() {
    /* @tweakable how bouncy vehicles are when colliding (0 = no bounce, 1 = full bounce) */
    this.bounciness = 0.7;
    /* @tweakable how much velocity is retained after collision (0 = full stop, 1 = no loss) */
    this.velocityRetention = 0.8;
    /* @tweakable how far vehicles can overlap before collision resolution */
    this.collisionTolerance = 0.1;
  }

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      this.handleVehicleCollisions(state, v);
      this.handleBuildingCollisions(state, v);
      this.handlePlayerCollision(state, v);
    }
  }

  handleVehicleCollisions(state, v) {
    const vehicles = state.entities.filter(e => e.type === 'vehicle' && e !== v);
    
    for (const other of vehicles) {
      const collision = this.checkRectCollision(v, other);
      if (collision) {
        this.resolveRectCollision(v, other, collision);
        this.applyBounce(v, other, collision.normal);
      }
    }
  }

  handleBuildingCollisions(state, v) {
    const map = state.world?.map;
    if (!map) return;

    const checkRange = Math.ceil((v.hitbox?.width || 1) + 1);
    const tx = Math.floor(v.pos.x);
    const ty = Math.floor(v.pos.y);
    
    for (let oy = -checkRange; oy <= checkRange; oy++) {
      for (let ox = -checkRange; ox <= checkRange; ox++) {
        const gx = tx + ox;
        const gy = ty + oy;
        if (gx < 0 || gy < 0 || gx >= map.width || gy >= map.height) continue;
        
        const t = map.tiles[gy][gx];
        if (t === Tile.BuildingFloor || t === Tile.BuildingWall) {
          const buildingRect = {
            x: gx,
            y: gy,
            width: 1,
            height: 1
          };
          
          const collision = this.checkRectCollision(v, buildingRect, true);
          if (collision) {
            this.resolveRectCollision(v, buildingRect, collision);
            this.applyBounce(v, buildingRect, collision.normal);
          }
        }
      }
    }
  }

  handlePlayerCollision(state, vehicle) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player || state.control.inVehicle) return;

    const collision = this.checkRectCollision(vehicle, player);
    if (collision) {
      this.resolveRectCollision(vehicle, player, collision);
      this.applyBounce(vehicle, player, collision.normal);
    }
  }

  checkRectCollision(rectA, rectB, isStatic = false) {
    const a = this.getHitbox(rectA);
    const b = isStatic ? rectB : this.getHitbox(rectB);

    const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

    if (overlapX <= 0 || overlapY <= 0) return null;

    // Determine collision normal and penetration
    const centerAX = a.x + a.width / 2;
    const centerAY = a.y + a.height / 2;
    const centerBX = b.x + b.width / 2;
    const centerBY = b.y + b.height / 2;
    
    const dx = centerBX - centerAX;
    const dy = centerBY - centerAY;

    let normal, penetration;
    if (overlapX < overlapY) {
      normal = { x: dx < 0 ? -1 : 1, y: 0 };
      penetration = overlapX;
    } else {
      normal = { x: 0, y: dy < 0 ? -1 : 1 };
      penetration = overlapY;
    }

    return { normal, penetration };
  }

  resolveRectCollision(entityA, entityB, collision) {
    const isStatic = !entityB.type || entityB.type === 'building';
    
    if (isStatic) {
      // Static collision - only move entityA
      const moveX = collision.normal.x * collision.penetration * (1 + this.collisionTolerance);
      const moveY = collision.normal.y * collision.penetration * (1 + this.collisionTolerance);
      entityA.pos.x += moveX;
      entityA.pos.y += moveY;
    } else {
      // Dynamic collision - move both entities
      const totalMass = entityA.mass + entityB.mass;
      const massA = entityA.mass / totalMass;
      const massB = entityB.mass / totalMass;
      
      const moveA = collision.penetration * massB * (1 + this.collisionTolerance);
      const moveB = collision.penetration * massA * (1 + this.collisionTolerance);
      
      entityA.pos.x += collision.normal.x * moveA;
      entityA.pos.y += collision.normal.y * moveA;
      entityB.pos.x -= collision.normal.x * moveB;
      entityB.pos.y -= collision.normal.y * moveB;
    }
  }

  applyBounce(entityA, entityB, normal) {
    const isStatic = !entityB.type || entityB.type === 'building';
    
    if (isStatic) {
      // Static bounce
      const dot = entityA.vel.x * normal.x + entityA.vel.y * normal.y;
      entityA.vel.x = (entityA.vel.x - 2 * dot * normal.x) * this.bounciness * this.velocityRetention;
      entityA.vel.y = (entityA.vel.y - 2 * dot * normal.y) * this.bounciness * this.velocityRetention;
    } else {
      // Dynamic bounce between vehicles
      const relativeVel = {
        x: entityA.vel.x - entityB.vel.x,
        y: entityA.vel.y - entityB.vel.y
      };
      
      const dot = relativeVel.x * normal.x + relativeVel.y * normal.y;
      
      const impulse = 2 * dot / (entityA.mass + entityB.mass);
      
      entityA.vel.x -= impulse * entityB.mass * normal.x * this.bounciness * this.velocityRetention;
      entityA.vel.y -= impulse * entityB.mass * normal.y * this.bounciness * this.velocityRetention;
      
      entityB.vel.x += impulse * entityA.mass * normal.x * this.bounciness * this.velocityRetention;
      entityB.vel.y += impulse * entityA.mass * normal.y * this.bounciness * this.velocityRetention;
    }
  }

  getHitbox(entity) {
    if (!entity.hitbox) {
      // Default hitbox based on sprite dimensions
      entity.hitbox = {
        x: entity.pos.x - 0.45, // Centered on position
        y: entity.pos.y - 0.25,
        width: 0.9,
        height: 0.5
      };
    } else {
      // Update hitbox position to match entity position
      entity.hitbox.x = entity.pos.x - entity.hitbox.width / 2;
      entity.hitbox.y = entity.pos.y - entity.hitbox.height / 2;
    }
    return entity.hitbox;
  }
}