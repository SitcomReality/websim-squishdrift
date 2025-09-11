export class SparkEmitter {
  emitCollisionSparks(state, vehicle, contactPoint, power = 8) {
    if (!vehicle || !contactPoint) return;
    this.emitSparks(state, contactPoint, 10, power);
  }

  emitSparks(state, pos, count = 6, power = 4, collisionNormal = null) {
    state.particles = state.particles || [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.4 + Math.random());
      const sparkSize = 0.01 + Math.random() * 0.015;

      state.particles.push({
        type: 'spark',
        x: pos.x, y: pos.y,
        vx: Math.cos(a) * s * 0.5,
        vy: Math.sin(a) * s * 0.5,
        life: 0.15 + Math.random() * 0.2,
        maxLife: 0.15 + Math.random() * 0.2,
        size: sparkSize,
        maxSize: Math.max(sparkSize * 0.08, sparkSize * 0.6),
        color: 'rgba(255,200,50,1)',
        alpha: 1.0
      });
    }
  }
}

