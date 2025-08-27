import { entityOBB, aabbForTile, aabbForTrunk, obbOverlap, resolveDynamicStatic } from './geom.js';
import { CollisionDamageCalculator } from './CollisionDamageCalculator.js';
import { CollisionAudioHandler } from './CollisionAudioHandler.js';

export class BuildingCollisionHandler {
  constructor() {
    this.damageCalculator = new CollisionDamageCalculator();
    this.audioHandler = new CollisionAudioHandler();
  }

  handleCollisions(state, vehicle) {
    const map = state.world?.map;
    if (!map) return;
    
    const r = Math.ceil(Math.max(vehicle.hitboxW||0.9, vehicle.hitboxH||0.5)) + 1;
    const tx = Math.floor(vehicle.pos.x);
    const ty = Math.floor(vehicle.pos.y);
    const obb = entityOBB(vehicle);
    
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        const gx = tx + ox;
        const gy = ty + oy;
        
        if (gx < 0 || gy < 0 || gx >= map.width || gy >= map.height) continue;
        
        const tile = map.tiles[gy][gx];
        
        if (this.isTreeTrunk(gx, gy, map)) {
          this.handleTreeCollision(state, vehicle, gx, gy, obb);
        } else if (tile === 8 || tile === 9) {
          this.handleBuildingCollision(state, vehicle, gx, gy, obb);
        }
      }
    }
  }

  handleTreeCollision(state, vehicle, gx, gy, obb) {
    const contact = obbOverlap(obb, aabbForTrunk(gx, gy));
    if (!contact) return;
    
    resolveDynamicStatic(vehicle, { ...contact, normal: contact.normal }, 0.6);
    this.applyBounce(vehicle, contact.normal);
    
    const now = Date.now();
    const canDamage = now - (vehicle.lastDamageTime || 0) >= 1000;
    
    if (canDamage) {
      const impactSpeed = Math.hypot(vehicle.vel?.x || 0, vehicle.vel?.y || 0);
      if (impactSpeed > 0.5) {
        const damage = this.damageCalculator.calculateTreeImpactDamage(state, vehicle, impactSpeed, 1000);
        this.audioHandler.playImpactSound(state, vehicle.pos);
        
        if (vehicle.health && !vehicle.health.isAlive()) {
          // removed - handled by CollisionResponseHandler
        }
        
        // removed - damage indicator handled elsewhere
      }
    }
  }

  handleBuildingCollision(state, vehicle, gx, gy, obb) {
    const contact = obbOverlap(obb, aabbForTile(gx, gy));
    if (!contact) return;
    
    const correctedContact = { ...contact, normal: contact.normal };
    resolveDynamicStatic(vehicle, correctedContact, 0.6);
    this.applyBounce(vehicle, contact.normal);
    
    const now = Date.now();
    const canDamage = now - (vehicle.lastDamageTime || 0) >= 1000;
    
    if (canDamage) {
      const impactSpeed = Math.hypot(vehicle.vel?.x || 0, vehicle.vel?.y || 0);
      if (impactSpeed > 0.5) {
        const damage = this.damageCalculator.calculateBuildingImpactDamage(state, vehicle, impactSpeed, 1000);
        this.audioHandler.playImpactSound(state, vehicle.pos);
        
        if (vehicle.health && !vehicle.health.isAlive()) {
          // removed - handled by CollisionResponseHandler
        }
        
        // removed - damage indicator handled elsewhere
      }
    }
  }

  applyBounce(vehicle, normal) {
    const restitution = 0.6;
    const speed = Math.hypot(vehicle.vel.x || 0, vehicle.vel.y || 0);
    const velDir = {
      x: vehicle.vel.x / speed || 0,
      y: vehicle.vel.y / speed || 0
    };
    const reflect = this.calculateBounceNormal(velDir, normal);
    const bounceFactor = Math.max(0.25, restitution * 0.8);
    
    vehicle.vel.x = reflect.x * speed * bounceFactor;
    vehicle.vel.y = reflect.y * speed * bounceFactor;
  }

  calculateBounceNormal(velocityDir, contactNormal) {
    if (velocityDir.x === 0 && velocityDir.y === 0) return contactNormal;
    
    const dot = velocityDir.x * contactNormal.x + velocityDir.y * contactNormal.y;
    const reflected = {
      x: velocityDir.x - 2 * dot * contactNormal.x,
      y: velocityDir.y - 2 * dot * contactNormal.y
    };
    
    const length = Math.hypot(reflected.x, reflected.y);
    if (length < 0.01) return contactNormal;
    
    return { x: reflected.x / length, y: reflected.y / length };
  }

  isTreeTrunk(x, y, map) {
    if (!map.trees) return false;
    return map.trees.some(tree => 
      Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
    );
  }
}
