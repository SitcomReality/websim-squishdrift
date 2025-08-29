import { entityOBB, obbOverlap, resolveDynamicDynamic } from '../geom.js';
import { Health } from '../../../components/Health.js';
import { 
    handleVehicleDestruction, 
    addDamageIndicator, 
    smoothCollisionNormal, 
    applyCollisionDamping 
} from './VehicleCollisionUtils.js';

export class VehicleVehicleCollisionHandler {
    constructor(system) {
        this.system = system;
    }

    handle(state, v) {
        const others = state.entities.filter(e => e.type === 'vehicle' && e !== v);
        const obbA = entityOBB(v);
        
        for (const o of others) {
            const contact = obbOverlap(obbA, entityOBB(o));
            if (!contact) continue;
            
            const correctedContact = { ...contact, normal: smoothCollisionNormal(contact.normal, v, o) };
            resolveDynamicDynamic(v, o, correctedContact, 0.6);
            
            this.calculateCollisionDamage(state, v, o);
            
            applyCollisionDamping(v, o);
        }
    }

    calculateCollisionDamage(state, vehicleA, vehicleB) {
        const now = Date.now();
        
        const canDamageA = now - (vehicleA.lastDamageTime || 0) >= this.system.damageCooldown;
        const canDamageB = now - (vehicleB.lastDamageTime || 0) >= this.system.damageCooldown;
        
        if (!canDamageA && !canDamageB) return;

        const collisionPoint = {
            x: (vehicleA.pos.x + vehicleB.pos.x) / 2,
            y: (vehicleA.pos.y + vehicleB.pos.y) / 2
        };
        
        if (!vehicleA.health) {
            vehicleA.health = new Health(vehicleA.maxHealth || 100);
        }
        if (!vehicleB.health) {
            vehicleB.health = new Health(vehicleB.maxHealth || 100);
        }

        const relativeVel = {
            x: (vehicleA.vel?.x || 0) - (vehicleB.vel?.x || 0),
            y: (vehicleA.vel?.y || 0) - (vehicleB.vel?.y || 0)
        };
        
        const impactSpeed = Math.hypot(relativeVel.x, relativeVel.y);
        
        if (impactSpeed < this.system.collisionDamageThreshold) {
            return;
        }
        
        const totalMass = vehicleA.mass + vehicleB.mass;
        const damageA = Math.max(1, Math.round((impactSpeed * vehicleB.mass / totalMass) * this.system.damageMultiplier));
        const damageB = Math.max(1, Math.round((impactSpeed * vehicleA.mass / totalMass) * this.system.damageMultiplier));
        
        if (canDamageA) {
            vehicleA.health.takeDamage(damageA);
            vehicleA.lastDamageTime = now;
            state.particleSystem?.emitSparks(state, collisionPoint, Math.min(12, 4 + Math.floor(damageA / 5)), 4);
            state.particleSystem?.emitCollisionSparks(state, vehicleA, collisionPoint, damageA * 0.5);
            const impactSound = ['impact02', 'impact03'][Math.floor(Math.random() * 2)];
            state.audio?.playSfxAt?.(impactSound, collisionPoint, state, { volume: 0.3 });
        }
        
        if (canDamageB) {
            vehicleB.health.takeDamage(damageB);
            vehicleB.lastDamageTime = now;
            state.particleSystem?.emitSparks(state, collisionPoint, Math.min(12, 4 + Math.floor(damageB / 5)), 4);
            state.particleSystem?.emitCollisionSparks(state, vehicleB, collisionPoint, damageB * 0.5);
            const impactSound = ['impact02', 'impact03'][Math.floor(Math.random() * 2)];
            state.audio?.playSfxAt?.(impactSound, collisionPoint, state, { volume: 0.3 });
        }
        
        handleVehicleDestruction(state, vehicleA);
        handleVehicleDestruction(state, vehicleB);
        
        if (impactSpeed > 3.0 && state.cameraSystem) {
            state.cameraSystem.addShake(Math.min(1, impactSpeed / 8));
        }
    }
}