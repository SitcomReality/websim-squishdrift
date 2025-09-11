export class ParticlesUpdater {
  constructor() { this._smoke = null; }

  setSmokeEmitter(smokeEmitter) { this._smoke = smokeEmitter; }

  update(state, dt) {
    state.particles = state.particles || [];

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) { state.particles.splice(i, 1); continue; }

      if (p.type === 'smoke') {
        p.vy -= 0.5 * dt;
        p.vx += (Math.random() - 0.5) * 0.1 * dt;
        p.alpha = Math.max(0, p.life / p.maxLife);
        p.size += 0.02 * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    if (this._smoke) this.updateVehicleSmoke(state, dt);
  }

  updateVehicleSmoke(state, dt) {
    const vehicles = state.entities.filter(e => e.type === 'vehicle' && e.health && e.health.hp < e.health.maxHp);
    for (const vehicle of vehicles) {
      const healthPercent = vehicle.health.hp / vehicle.health.maxHp;
      if (healthPercent >= 1.0) continue;
      const damageLevel = 1 - healthPercent;
      const emissionRate = 0.02 + (damageLevel * 0.08);
      if (Math.random() < emissionRate) this._smoke.emitSmoke(state, vehicle, damageLevel);
    }
  }
}

