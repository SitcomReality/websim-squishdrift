export class ParticleSystem {
  constructor() {
    this.pool = [];
    this.smokeParticles = [];
  }

  update(state, dt) {
    state.particles = state.particles || [];
    
    // Update existing particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      
      // Update smoke particles
      if (p.type === 'smoke') {
        // Smoke rises and drifts
        p.vy -= 0.5 * dt; // Slight upward drift
        p.vx += (Math.random() - 0.5) * 0.1 * dt; // Random horizontal drift
        p.alpha = Math.max(0, p.life / p.maxLife); // Fade out
        p.size += 0.02 * dt; // Expand slowly
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
      
      // Only emit smoke if damaged
      if (healthPercent < 1.0) {
        // Calculate emission rate based on damage
        const damageLevel = 1 - healthPercent;
        const emissionRate = 0.02 + (damageLevel * 0.08); // 2-10% chance per frame
        
        // Higher damage = more frequent emission
        if (Math.random() < emissionRate) {
          this.emitSmoke(state, vehicle, damageLevel);
        }
      }
    }
  }

  emitSmoke(state, vehicle, damageLevel) {
    const count = 1 + Math.floor(damageLevel * 2); // More particles when heavily damaged
    
    for (let i = 0; i < count; i++) {
      // Calculate front position based on vehicle rotation
      const frontOffset = 0.2; // Reduced from 0.6 to 0.2 to move smoke closer to center
      const offsetX = Math.cos(vehicle.rot) * frontOffset;
      const offsetY = Math.sin(vehicle.rot) * frontOffset;
      
      // Add some randomness to position
      const spread = 0.2;
      const x = vehicle.pos.x + offsetX + (Math.random() - 0.5) * spread;
      const y = vehicle.pos.y + offsetY + (Math.random() - 0.5) * spread;
      
      // Darker smoke for more damaged vehicles
      const baseAlpha = 0.7;
      const alpha = baseAlpha - (damageLevel * 0.3); // More transparent with damage
      
      // Darker colors for more damage
      const hue = 0; // Greyscale
      const saturation = 0;
      const lightness = Math.max(10, 30 - (damageLevel * 20)); // 30% to 10% (darker)
      
      state.particles.push({
        type: 'smoke',
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.5, // Slight horizontal movement
        vy: -0.3 - (damageLevel * 0.4), // Upward movement, stronger with damage
        life: 2.0 + (damageLevel * 1.5), // Longer life with damage
        maxLife: 2.0 + (damageLevel * 1.5),
        alpha: alpha,
        size: 0.05 + (damageLevel * 0.05), // Larger with damage
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`
      });
    }
  }

  emitSparks(state, pos, count = 6, power = 4) {
    state.particles = state.particles || [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.5 + Math.random());
      state.particles.push({
        type: 'spark',
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.5,
        life: 0.25 + Math.random() * 0.25,
        size: 0.06 + Math.random() * 0.04,
        color: 'rgba(255,200,50,1)',
        alpha: 1.0
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
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * s * 0.6,
        vy: Math.sin(a) * s * 0.6,
        life: 0.4 + Math.random() * 0.6,
        size: 0.07 + Math.random() * 0.05,
        color: 'rgba(139,0,0,1)',
        alpha: 1.0
      });
    }
  }
}