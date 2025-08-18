import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';
import { entityOBB, aabbForTile, aabbForTrunk, obbOverlap, resolveDynamicDynamic, resolveDynamicStatic } from './geom.js';

export class VehicleCollisionSystem {
  constructor() {}

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      v.hitboxW = v.hitboxW ?? 0.9; v.hitboxH = v.hitboxH ?? 0.5; v.mass = v.mass || 1200; v.vel = v.vel || {x:0,y:0};
      this.handleVehicleCollisions(state, v);
      this.handleBuildingCollisions(state, v);
      this.handlePlayerCollision(state, v);
      this.handlePedestrianCollision(state, v);
    }
  }

  handleVehicleCollisions(state, v) {
    const others = state.entities.filter(e => e.type === 'vehicle' && e !== v);
    const obbA = entityOBB(v);
    for (const o of others) {
      const contact = obbOverlap(obbA, entityOBB(o)); if (!contact) continue;
      
      // Use contact normal for more predictable collision response
      const correctedContact = { ...contact, normal: this.smoothCollisionNormal(contact.normal, v, o) };
      resolveDynamicDynamic(v, o, correctedContact, 0.4); // Reduced restitution for smoother bounce
      
      // Apply damping to reduce flickering
      this.applyCollisionDamping(v, o);
    }
  }

  handleBuildingCollisions(state, v) {
    const map = state.world?.map; if (!map) return;
    const r = Math.ceil(Math.max(v.hitboxW||0.9, v.hitboxH||0.5)) + 1, tx=Math.floor(v.pos.x), ty=Math.floor(v.pos.y);
    const obb = entityOBB(v);
    
    for (let oy=-r; oy<=r; oy++) for (let ox=-r; ox<=r; ox++) {
      const gx=tx+ox, gy=ty+oy; if (gx<0||gy<0||gx>=map.width||gy>=map.height) continue;
      const t = map.tiles[gy][gx]; 
      
      // Check for tree trunk collision (use tight trunk AABB, not whole tile)
      if (this.isTreeTrunk(gx, gy, map)) {
        const contact = obbOverlap(obb, aabbForTrunk(gx, gy)); if (!contact) continue;
        const correctedContact = { ...contact, normal: contact.normal };
        resolveDynamicStatic(v, correctedContact, 0.2);
        this.applyBuildingDamping(v);
        continue;
      }
      
      // Original building collision
      if (t !== 8 && t !== 9) continue; // BuildingFloor/Wall as solid
      
      const contact = obbOverlap(obb, aabbForTile(gx,gy)); if (!contact) continue;
      const correctedContact = { ...contact, normal: contact.normal };
      resolveDynamicStatic(v, correctedContact, 0.2);
      this.applyBuildingDamping(v);
    }
  }

  isTreeTrunk(x, y, map) {
    if (!map.trees) return false;
    return map.trees.some(tree => 
      Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
    );
  }

  handlePedestrianCollision(state, v) {
    const peds = state.entities.filter(e => e.type === 'npc');
    const vehicleOBB = entityOBB(v);

    for (let i = peds.length - 1; i >= 0; i--) {
        const ped = peds[i];
        ped.hitboxW = ped.hitboxW ?? 0.2;
        ped.hitboxH = ped.hitboxH ?? 0.2;
        ped.rot = 0;

        const pedOBB = entityOBB(ped, {w: ped.hitboxW, h: ped.hitboxH});
        const contact = obbOverlap(vehicleOBB, pedOBB);

        if (contact) {
            state.entities.push({
                type: 'blood',
                pos: { x: ped.pos.x, y: ped.pos.y },
                size: 0.6 + (state.rand ? state.rand() * 0.4 : Math.random() * 0.4),
                color: `hsl(0, 70%, ${30 + (state.rand ? state.rand() * 20 : Math.random() * 20)}%)`,
                rotation: (state.rand ? state.rand() * Math.PI * 2 : Math.random() * Math.PI * 2)
            });

            const pedIndex = state.entities.indexOf(ped);
            if (pedIndex > -1) {
                state.entities.splice(pedIndex, 1);
            }
        }
    }
  }

  handlePlayerCollision(state, v) {
    const player = state.entities.find(e=>e.type==='player'); if (!player) return;
    player.mass = player.mass || 80; player.vel = player.vel || {x:0,y:0}; player.hitboxW = player.hitboxW ?? 0.6; player.hitboxH = player.hitboxH ?? 0.6; player.rot = 0;
    
    // Add collisionDisabled check here
    if (player.collisionDisabled) return;
    
    const contact = obbOverlap(entityOBB(v), entityOBB(player,{w:player.hitboxW,h:player.hitboxH}));
    if (!contact) return;
    
    const correctedContact = { ...contact, normal: this.smoothCollisionNormal(contact.normal, v, player) };
    resolveDynamicDynamic(v, player, correctedContact, 0.5);
    
    // Apply damping
    this.applyCollisionDamping(v, player);
  }

  smoothCollisionNormal(normal, objA, objB) {
    // Ensure consistent collision normals for smoother response
    const centerToCenter = {
      x: objB.pos.x - objA.pos.x,
      y: objB.pos.y - objA.pos.y
    };
    
    // Normalize center-to-center vector
    const len = Math.hypot(centerToCenter.x, centerToCenter.y);
    if (len > 0) {
      centerToCenter.x /= len;
      centerToCenter.y /= len;
    }
    
    // Use contact normal but bias slightly toward center-to-center for stability
    const blendFactor = 0.8; // 80% contact normal, 20% center-to-center
    return {
      x: normal.x * blendFactor + centerToCenter.x * (1 - blendFactor),
      y: normal.y * blendFactor + centerToCenter.y * (1 - blendFactor)
    };
  }

  applyCollisionDamping(objA, objB) {
    // Reduce angular velocity to prevent spinning
    if (typeof objA.angularVelocity === 'number') {
      objA.angularVelocity *= 0.7;
    }
    if (typeof objB.angularVelocity === 'number') {
      objB.angularVelocity *= 0.7;
    }
    
    // Reduce linear velocity slightly for stability
    const dampingFactor = 0.85;
    if (objA.vel) {
      objA.vel.x *= dampingFactor;
      objA.vel.y *= dampingFactor;
    }
    if (objB.vel) {
      objB.vel.x *= dampingFactor;
      objB.vel.y *= dampingFactor;
    }
  }

  applyBuildingDamping(v) {
    // Reduce damping for buildings to allow more bounce
    const dampingFactor = 0.5; // Changed from 0.3 to 0.5
    if (v.vel) {
      v.vel.x *= dampingFactor;
      v.vel.y *= dampingFactor;
    }
    if (typeof v.angularVelocity === 'number') {
      v.angularVelocity *= 0.6; // Reduced from 0.5 to 0.6
    }
  }

  getVelocityDirection(entity) {
    const speed = Math.hypot(entity.vel.x, entity.vel.y);
    if (speed < 0.01) return { x: 0, y: 0 };
    return { x: entity.vel.x / speed, y: entity.vel.y / speed };
  }

  calculateBounceNormal(velocityDir, contactNormal) {
    if (velocityDir.x === 0 && velocityDir.y === 0) {
      return contactNormal;
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