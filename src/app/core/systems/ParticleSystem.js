import { ParticleTypes } from './particles/ParticleTypes.js';
import { emitVehicleSmoke, emitCollisionSparks, emitBlood, emitDriftParticles } from './particles/ParticleEmitters.js';
import { drawParticles } from './particles/ParticleRenderer.js';

export class ParticleSystem {
  constructor() {
    this.pool = [];
    this.smokeParticles = [];
  }

  update(state, dt) {
    if (!state.particles) state.particles = [];

    // Update existing particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      // Update smoke particles
      if (p.type === ParticleTypes.SMOKE) {
        p.vy -= 0.5 * dt;
        p.vx += (Math.random() - 0.5) * 0.1 * dt;
        p.alpha = Math.max(0, p.life / p.maxLife);
        p.size += 0.02 * dt;
      }

      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Update vehicle smoke emission
    this.updateVehicleSmoke(state, dt);
  }

  updateVehicleSmoke(state, dt) {
    const vehicles = state.entities.filter(e => e.type === 'vehicle' && e.health && e.health.hp < e.health.maxHp);

    for (const vehicle of vehicles) {
      const healthPercent = vehicle.health.hp / vehicle.health.maxHp;
      
      if (healthPercent < 1.0) {
        const damageLevel = 1 - healthPercent;
        const emissionRate = 0.02 + (damageLevel * 0.08);
        
        if (Math.random() < emissionRate) {
          emitVehicleSmoke(state, vehicle, damageLevel);
        }
      }
    }
  }

  // Public API methods
  emitDriftParticles(state, vehicle) {
    emitDriftParticles(state, vehicle);
  }

  emitSparks(state, pos, count = 6, power = 4, collisionNormal = null) {
    emitCollisionSparks(state, pos, count, power, collisionNormal);
  }

  emitBlood(state, pos, count = 8, power = 3) {
    emitBlood(state, pos, count, power);
  }

  emitCollisionSparks(state, vehicle, contactPoint, power = 8) {
    if (!vehicle || !contactPoint) return;
    emitCollisionSparks(state, contactPoint, 10, power);
  }

  drawParticles(state, renderer) {
    drawParticles(state, renderer);
  }
}