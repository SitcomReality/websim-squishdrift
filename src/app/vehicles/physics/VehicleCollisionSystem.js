import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';
import { entityOBB, aabbForTile, obbOverlap, resolveDynamicDynamic, resolveDynamicStatic } from './geom.js';

export class VehicleCollisionSystem {
  constructor() {}

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      v.hitboxW = v.hitboxW ?? 0.9; v.hitboxH = v.hitboxH ?? 0.5; v.mass = v.mass || 1200; v.vel = v.vel || {x:0,y:0};
      this.handleVehicleCollisions(state, v);
      this.handleBuildingCollisions(state, v);
      this.handlePlayerCollision(state, v);
    }
  }

  handleVehicleCollisions(state, v) {
    const others = state.entities.filter(e => e.type === 'vehicle' && e !== v);
    const obbA = entityOBB(v);
    for (const o of others) {
      const contact = obbOverlap(obbA, entityOBB(o)); if (!contact) continue;
      
      // Use velocity-based bounce direction instead of contact normal
      const velocityDir = this.getVelocityDirection(v);
      const bounceNormal = this.calculateBounceNormal(velocityDir, contact.normal);
      
      // Create new contact with corrected normal
      const correctedContact = { ...contact, normal: bounceNormal };
      resolveDynamicDynamic(v, o, correctedContact, 0.85);
    }
  }

  handleBuildingCollisions(state, v) {
    const map = state.world?.map; if (!map) return;
    const r = Math.ceil(Math.max(v.hitboxW||0.9, v.hitboxH||0.5)) + 1, tx=Math.floor(v.pos.x), ty=Math.floor(v.pos.y);
    const obb = entityOBB(v);
    
    for (let oy=-r; oy<=r; oy++) for (let ox=-r; ox<=r; ox++) {
      const gx=tx+ox, gy=ty+oy; if (gx<0||gy<0||gx>=map.width||gy>=map.height) continue;
      const t = map.tiles[gy][gx]; if (t !== 8 && t !== 9) continue; // BuildingFloor/Wall as solid
      
      const contact = obbOverlap(obb, aabbForTile(gx,gy)); if (!contact) continue;
      
      // For buildings, use velocity direction for bounce
      const velocityDir = this.getVelocityDirection(v);
      const bounceNormal = this.calculateBounceNormal(velocityDir, contact.normal);
      
      // Create corrected contact
      const correctedContact = { ...contact, normal: bounceNormal };
      // Use a low restitution for building impacts and heavily damp linear/angular velocity
      resolveDynamicStatic(v, correctedContact, 0.2);
      // Immediately bleed off most of the vehicle's inertia to avoid excessive bouncing
      if (v.vel) {
        v.vel.x *= 0.25;
        v.vel.y *= 0.25;
      }
      if (typeof v.angularVelocity === 'number') v.angularVelocity *= 0.3;
    }
  }

  handlePlayerCollision(state, v) {
    const player = state.entities.find(e=>e.type==='player'); if (!player) return;
    player.mass = player.mass || 80; player.vel = player.vel || {x:0,y:0}; player.hitboxW = player.hitboxW ?? 0.6; player.hitboxH = player.hitboxH ?? 0.6; player.rot = 0;
    const contact = obbOverlap(entityOBB(v), entityOBB(player,{w:player.hitboxW,h:player.hitboxH}));
    if (!contact) return;
    
    const velocityDir = this.getVelocityDirection(v);
    const bounceNormal = this.calculateBounceNormal(velocityDir, contact.normal);
    const correctedContact = { ...contact, normal: bounceNormal };
    resolveDynamicDynamic(v, player, correctedContact, 0.85);
  }

  getVelocityDirection(entity) {
    const speed = Math.hypot(entity.vel.x, entity.vel.y);
    if (speed < 0.01) return { x: 0, y: 0 };
    return { x: entity.vel.x / speed, y: entity.vel.y / speed };
  }

  calculateBounceNormal(velocityDir, contactNormal) {
    if (velocityDir.x === 0 && velocityDir.y === 0) {
      return contactNormal; // Fallback if no velocity
    }

    // Calculate reflection vector: r = d - 2(d·n)n
    const dot = velocityDir.x * contactNormal.x + velocityDir.y * contactNormal.y;
    const reflected = {
      x: velocityDir.x - 2 * dot * contactNormal.x,
      y: velocityDir.y - 2 * dot * contactNormal.y
    };

    // Normalize the reflected vector
    const length = Math.hypot(reflected.x, reflected.y);
    if (length < 0.01) return contactNormal;

    return { x: reflected.x / length, y: reflected.y / length };
  }
}