export class BloodEmitter {
  emitBlood(state, pos, count = 8, power = 3) {
    state.particles = state.particles || [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.4 + Math.random());
      state.particles.push({
        type: 'blood',
        x: pos.x, y: pos.y,
        vx: Math.cos(a) * s * 0.5,
        vy: Math.sin(a) * s * 0.5,
        life: 0.4 + Math.random() * 0.6,
        maxLife: 0.4 + Math.random() * 0.6,
        size: 0.02 + Math.random() * 0.03,
        color: 'rgba(139,0,0,1)',
        alpha: 1.0
      });
    }
  }
}

