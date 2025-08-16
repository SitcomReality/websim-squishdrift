import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';

export class VehicleCollisionSystem {
  constructor() {
    /* @tweakable how bouncy vehicles are when colliding (0 = no bounce, 1 = full bounce) */
    this.bounciness = 0.4;
    /* @tweakable how much velocity is retained after collision (0 = full stop, 1 = no loss) */
    this.velocityRetention = 0.85;
    /* @tweakable how far vehicles can overlap before collision resolution */
    this.collisionTolerance = 0.1;
    /* @tweakable mass multiplier for static objects (effectively infinite mass) */
    this.staticMassMultiplier = 1000;
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
        this.applyCollisionForces(v, other, collision);
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
        
        const t = map.tiles[gy]?.[gx];
        if (t === Tile.BuildingFloor || t === Tile.BuildingWall) {
          const buildingRect = {
            x: gx,
            y: gy,
            width: 1,
            height: 1
          };
          
          const collision = this.checkRectCollision(v, buildingRect, true);
          if (collision) {
            this.resolveRectCollision(v, buildingRect, collision, true);
            this.applyCollisionForces(v, buildingRect, collision, true);
          }
        }
      }
    }
  }

  handlePlayerCollision(state, v) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player || state.control.inVehicle) return;

    const collision = this.checkRectCollision(v, player);
    if (collision) {
      this.resolveRectCollision(v, player, collision);
      this.applyCollisionForces(v, player, collision);
    }
  }

  applyCollisionForces(entityA, entityB, collision, isStatic = false) {
    const massA = entityA.mass || 1200; // Default vehicle mass
    const massB = isStatic ? massA * this.staticMassMultiplier : (entityB.mass || 70);
    
    const totalMass = massA + massB;
    const massRatioA = massB / totalMass;
    const massRatioB = massA / totalMass;
    
    // Calculate relative velocity
    const relVelX = (entityA.vel?.x || 0) - (entityB.vel?.x || 0);
    const relVelY = (entityA.vel?.y || 0) - (entityB.vel?.y || 0);
    
    // Calculate impulse magnitude
    const normalSpeed = relVelX * collision.normal.x + relVelY * collision.normal.y;
    if (normalSpeed >= 0) return; // Separating
    
    const impulse = -(1 + this.bounciness) * normalSpeed / (1/massA + 1/massB);
    
    // Apply forces based on mass ratios
    if (!isStatic || entityB.type === 'player') {
      entityA.vel.x += impulse * collision.normal.x * massRatioA / massA;
      entityA.vel.y += impulse * collision.normal.y * massRatioA / massA;
    }
    
    if (!isStatic) {
      entityB.vel.x -= impulse * collision.normal.x * massRatioB / massB;
      entityB.vel.y -= impulse * collision.normal.y * massRatioB / massB;
    }
    
    // Apply velocity retention
    if (!isStatic) {
      entityA.vel.x *= this.velocityRetention;
      entityA.vel.y *= this.velocityRetention;
      entityB.vel.x *= this.velocityRetention;
      entityB.vel.y *= this.velocityRetention;
    }
  }

  checkRectCollision(rectA, rectB, isStatic = false) {
    const a = this.getHitbox(rectA);
    const b = isStatic ? rectB : this.getHitbox(rectB);

    const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

    if (overlapX <= 0 || overlapY <= 0) return null;

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

  resolveRectCollision(entityA, entityB, collision, isStatic = false) {
    const separationX = collision.normal.x * collision.penetration;
    const separationY = collision.normal.y * collision.penetration;
    
    if (!isStatic || entityB.type === 'player') {
      entityA.pos.x += separationX / 2;
      entityA.pos.y += separationY / 2;
    }
    
    if (!isStatic) {
      entityB.pos.x -= separationX / 2;
      entityB.pos.y -= separationY / 2;
    }
  }

  getHitbox(entity) {
    if (!entity.hitbox) {
      entity.hitbox = {
        x: entity.pos.x - 0.45,
        y: entity.pos.y - 0.25,
        width: 0.9,
        height: 0.5
      };
    } else {
      entity.hitbox.x = entity.pos.x - entity.hitbox.width / 2;
      entity.hitbox.y = entity.pos.y - entity.hitbox.height / 2;
    }
    return entity.hitbox;
  }
}