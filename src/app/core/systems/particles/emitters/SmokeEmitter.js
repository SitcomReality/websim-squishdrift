export class SmokeEmitter {
  emitSmoke(state, vehicle, damageLevel) {
    state.particles = state.particles || [];
    const count = 1 + Math.floor(damageLevel * 2);
    for (let i = 0; i < count; i++) {
      const frontOffset = 0.2;
      const offsetX = Math.cos(vehicle.rot) * frontOffset;
      const offsetY = Math.sin(vehicle.rot) * frontOffset;
      const spread = 0.2;
      const x = vehicle.pos.x + offsetX + (Math.random() - 0.5) * spread;
      const y = vehicle.pos.y + offsetY + (Math.random() - 0.5) * spread;
      const baseAlpha = 0.7;
      const alpha = baseAlpha - (damageLevel * 0.3);
      const lightness = 20 + Math.random() * 50;
      const saturation = 0;

      state.particles.push({
        type: 'smoke',
        x, y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.3 - (damageLevel * 0.4),
        life: 2.0 + (damageLevel * 1.5),
        maxLife: 2.0 + (damageLevel * 1.5),
        alpha,
        size: 0.05 + (damageLevel * 0.05),
        color: `hsl(0, ${saturation}%, ${lightness}%)`
      });
    }
  }
}

