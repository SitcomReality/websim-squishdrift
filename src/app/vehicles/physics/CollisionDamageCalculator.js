import { Health } from '../../components/Health.js';

export class CollisionDamageCalculator {
  calculateCollisionDamage(state, vehicleA, vehicleB, damageMultiplier, damageCooldown) {
    const now = Date.now();
    
    const canDamageA = now - (vehicleA.lastDamageTime || 0) >= damageCooldown;
    const canDamageB = now - (vehicleB.lastDamageTime || 0) >= damageCooldown;
    
    if (!canDamageA && !canDamageB) return;

    if (!vehicleA.health) vehicleA.health = new Health(vehicleA.maxHealth || 100);
    if (!vehicleB.health) vehicleB.health = new Health(vehicleB.maxHealth || 100);

    const relativeVel = {
      x: (vehicleA.vel?.x || 0) - (vehicleB.vel?.x || 0),
      y: (vehicleA.vel?.y || 0) - (vehicleB.vel?.y || 0)
    };
    
    const impactSpeed = Math.hypot(relativeVel.x, relativeVel.y);
    if (impactSpeed < 0.5) return;

    const totalMass = vehicleA.mass + vehicleB.mass;
    const damageA = Math.max(1, Math.round((impactSpeed * vehicleB.mass / totalMass) * damageMultiplier));
    const damageB = Math.max(1, Math.round((impactSpeed * vehicleA.mass / totalMass) * damageMultiplier));

    if (canDamageA) {
      vehicleA.health.takeDamage(damageA);
      vehicleA.lastDamageTime = now;
      state.particleSystem?.emitSparks(state, vehicleA.pos, Math.min(12, 4 + Math.floor(damageA / 5)), 4);
    }
    
    if (canDamageB) {
      vehicleB.health.takeDamage(damageB);
      vehicleB.lastDamageTime = now;
      state.particleSystem?.emitSparks(state, vehicleB.pos, Math.min(12, 4 + Math.floor(damageB / 5)), 4);
    }
  }

  calculateTreeImpactDamage(state, vehicle, impactSpeed, damageCooldown) {
    const now = Date.now();
    if (now - (vehicle.lastDamageTime || 0) < damageCooldown) return 0;
    
    if (!vehicle.health) vehicle.health = new Health(vehicle.maxHealth || 100);
    
    const damage = Math.max(1, Math.round(impactSpeed * 5));
    vehicle.health.takeDamage(damage);
    vehicle.lastDamageTime = now;
    
    return damage;
  }

  calculateBuildingImpactDamage(state, vehicle, impactSpeed, damageCooldown) {
    const now = Date.now();
    if (now - (vehicle.lastDamageTime || 0) < damageCooldown) return 0;
    
    if (!vehicle.health) vehicle.health = new Health(vehicle.maxHealth || 100);
    
    const damage = Math.max(1, Math.round(impactSpeed * 8));
    vehicle.health.takeDamage(damage);
    vehicle.lastDamageTime = now;
    
    return damage;
  }
}

