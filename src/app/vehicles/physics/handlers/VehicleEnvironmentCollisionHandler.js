import { entityOBB, aabbForTile, aabbForTrunk, obbOverlap, resolveDynamicStatic } from '../geom.js';
import { Health } from '../../../components/Health.js';
import { 
    handleVehicleDestruction, 
    addDamageIndicator,
    getVelocityDirection,
    calculateBounceNormal
} from './VehicleCollisionUtils.js';

export class VehicleEnvironmentCollisionHandler {
    constructor(system) {
        this.system = system;
    }

    handle(state, v) {
        const map = state.world?.map; if (!map) return;
        const r = Math.ceil(Math.max(v.hitboxW||0.9, v.hitboxH||0.5)) + 1;
        const tx = Math.floor(v.pos.x);
        const ty = Math.floor(v.pos.y);
        const obb = entityOBB(v);
        
        for (let oy=-r; oy<=r; oy++) for (let ox=-r; ox<=r; ox++) {
            const gx=tx+ox, gy=ty+oy;
            if (gx<0||gy<0||gx>=map.width||gy>=map.height) continue;
            
            const t = map.tiles[gy][gx];
            
            if (this.isTreeTrunk(gx, gy, map)) {
                this.handleTreeCollision(state, v, gx, gy, obb);
            } else if (t === 8 || t === 9) { // BuildingFloor/Wall
                this.handleBuildingCollision(state, v, gx, gy, obb);
            }
        }
    }

    handleTreeCollision(state, v, gx, gy, obb) {
        const contact = obbOverlap(obb, aabbForTrunk(gx, gy));
        if (!contact) return;

        // Use contact point from collision, not tree center
        const collisionPoint = {
          x: v.pos.x + contact.normal.x * 0.1,
          y: v.pos.y + contact.normal.y * 0.1
        };

        resolveDynamicStatic(v, contact, 0.6); // Increased restitution
        this.applyBounce(v, contact.normal, 0.6);
        this.applyBuildingDamping(v);
        this.applyImpactDamage(state, v, 5, collisionPoint);
        
        // Emit sparks at collision point
        const impactSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
        if (impactSpeed > 0.5) {
          state.particleSystem?.emitSparks(state, collisionPoint, 8, 5);
          state.particleSystem?.emitCollisionSparks(state, v, collisionPoint, 5);
        }
    }

    handleBuildingCollision(state, v, gx, gy, obb) {
        const contact = obbOverlap(obb, aabbForTile(gx, gy));
        if (!contact) return;

        // Use contact point from collision, not building center
        const collisionPoint = {
          x: v.pos.x + contact.normal.x * 0.1,
          y: v.pos.y + contact.normal.y * 0.1
        };

        resolveDynamicStatic(v, contact, 0.6); // Increased restitution
        this.applyBounce(v, contact.normal, 0.6);
        this.applyBuildingDamping(v);
        this.applyImpactDamage(state, v, 8, collisionPoint);
        
        // Emit sparks at collision point
        const impactSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
        if (impactSpeed > 0.5) {
          state.particleSystem?.emitSparks(state, collisionPoint, 10, 6);
          state.particleSystem?.emitCollisionSparks(state, v, collisionPoint, 6);
        }
    }

    applyBounce(v, normal, restitution) {
        const speed = Math.hypot(v.vel.x || 0, v.vel.y || 0);
        const velDir = getVelocityDirection(v);
        const reflect = calculateBounceNormal(velDir, normal);
        const bounceFactor = Math.max(0.25, restitution * 0.8);
        v.vel.x = reflect.x * speed * bounceFactor;
        v.vel.y = reflect.y * speed * bounceFactor;
    }

    applyBuildingDamping(v) {
        const dampingFactor = 0.5;
        if (v.vel) {
            v.vel.x *= dampingFactor;
            v.vel.y *= dampingFactor;
        }
        if (typeof v.angularVelocity === 'number') {
            v.angularVelocity *= 0.6;
        }
    }

    applyImpactDamage(state, v, damageMultiplier, collisionPoint = null) {
        const now = Date.now();
        const canDamage = now - (v.lastDamageTime || 0) >= this.system.damageCooldown;

        if (canDamage) {
          const impactSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
          if (impactSpeed > this.system.collisionDamageThreshold) {
            if (!v.health) v.health = new Health(v.maxHealth || 100);
            const damage = Math.max(1, Math.round(impactSpeed * damageMultiplier));
            v.health.takeDamage(damage);
            v.lastDamageTime = now;
            
            // Use collision point if provided, otherwise use vehicle center
            const sparkPoint = collisionPoint || v.pos;
            
            const impactSound = ['impact02', 'impact03'][Math.floor(Math.random() * 2)];
            state.audio?.playSfxAt?.(impactSound, sparkPoint, state);
            
            handleVehicleDestruction(state, v);
            addDamageIndicator(state, sparkPoint, damage);
          }
        }
    }

    isTreeTrunk(x, y, map) {
        if (!map.trees) return false;
        return map.trees.some(tree => 
            Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
        );
    }
}