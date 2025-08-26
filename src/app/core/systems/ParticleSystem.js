export class ParticleSystem {
  constructor() {
    this.pool = [];
  }

  update(state, dt) {
    state.particles = state.particles || [];
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) { state.particles.splice(i, 1); continue; }
      // integrate
      p.vy += (p.type === 'blood' ? 4.5 : 0) * dt; // tiny gravity for blood
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // slight drag
      p.vx *= 0.98; p.vy *= 0.98;
    }
  }

  emitSparks(state, pos, count = 6, power = 4) {
    state.particles = state.particles || [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.5 + Math.random());
      state.particles.push({
        type: 'spark',
        x: pos.x, y: pos.y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5,
        life: 0.25 + Math.random() * 0.25,
        size: 0.06 + Math.random() * 0.04,
        color: 'rgba(255,200,50,1)'
      });
    }
  }

  emitBlood(state, pos, count = 8, power = 3) {
    state.particles = state.particles || [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.4 + Math.random());
      state.particles.push({
        type: 'blood',
        x: pos.x, y: pos.y,
        vx: Math.cos(a) * s * 0.6, vy: Math.sin(a) * s * 0.6,
        life: 0.4 + Math.random() * 0.6,
        size: 0.07 + Math.random() * 0.05,
        color: 'rgba(139,0,0,1)'
      });
    }
  }
}