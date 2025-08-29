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
    // Ensure particles array is initialized
    state.particles = state.particles || [];
    
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
      
      // Random color between light grey and black
      const lightness = 20 + Math.random() * 50; // 20% to 70% lightness
      const saturation = 0; // Greyscale
      
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
        color: `hsl(0, ${saturation}%, ${lightness}%)`
      });
    }
  }

  emitSparks(state, pos, count = 6, power = 4) {
    // Ensure particles array is initialized
    state.particles = state.particles || [];
    
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.4 + Math.random());
      
      // Create smaller, more dynamic sparks
      const sparkSize = 0.02 + Math.random() * 0.03; // Much smaller base size
          
      state.particles.push({
        type: 'spark',
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * s * 0.5, // Reduced distance by 50%
        vy: Math.sin(a) * s * 0.5, // Reduced distance by 50%
        life: 0.15 + Math.random() * 0.2, // Shorter life for quick spark effect
        maxLife: 0.15 + Math.random() * 0.2,
        size: sparkSize,
        maxSize: sparkSize * 1.25, // Max size reduced to 1.25x instead of 2.5x
        color: 'rgba(255, 150, 50, 1)', // More orange hue
        alpha: 1.0,
        maxAlpha: 1.0
      });
    }
  }

  emitBlood(state, pos, count = 8, power = 3) {
    // Ensure particles array is initialized
    state.particles = state.particles || [];
    
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.4 + Math.random());
      state.particles.push({
        type: 'blood',
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * s * 0.5, // Reduced distance by 50%
        vy: Math.sin(a) * s * 0.5, // Reduced distance by 50%
        life: 0.4 + Math.random() * 0.6,
        maxLife: 0.4 + Math.random() * 0.6,
        size: 0.02 + Math.random() * 0.03, 
        color: 'rgba(139,0,0,1)',
        alpha: 1.0
      });
    }
  }

  drawParticles(state, renderer) {
    const ps = state.particles || [];
    if (!ps.length) return;
    
    const { ctx } = renderer;
    const ts = state.world.tileSize;
    
    ctx.save();
    
    for (const p of ps) {
      if (p.type === 'smoke') {
        // ... existing smoke drawing ...
      } else if (p.type === 'spark') {
        // Draw dynamic sparks
        const lifeRatio = Math.max(0, p.life / p.maxLife);
        
        // Sparks start small and expand briefly before fading
        const currentSize = p.size + (p.maxSize - p.size) * (1 - lifeRatio) * 0.3;
        const currentAlpha = p.alpha * lifeRatio;
        
        // Create gradient for spark effect
        const gradient = ctx.createRadialGradient(
          p.x * ts, p.y * ts, 0,
          p.x * ts, p.y * ts, currentSize * ts
        );
        
        // Bright orange center fading to lighter orange edges
        gradient.addColorStop(0, `rgba(255,180,50,${currentAlpha})`);
        gradient.addColorStop(0.3, `rgba(255,150,30,${currentAlpha * 0.8})`);
        gradient.addColorStop(1, `rgba(255,120,20,${currentAlpha * 0.3})`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x * ts, p.y * ts, currentSize * ts, 0, Math.PI * 2);
        ctx.fill();
        
        // Add small bright center
        if (currentAlpha > 0.5) {
          ctx.fillStyle = `rgba(255,255,200,${currentAlpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(p.x * ts, p.y * ts, currentSize * ts * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.type === 'blood') {
        // Draw blood particles with fade-out
        const lifeRatio = Math.max(0, p.life / p.maxLife);
        const currentAlpha = p.alpha * lifeRatio;
        const currentSize = p.size * ts;
        
        // Create gradient for fade effect
        const gradient = ctx.createRadialGradient(
          p.x * ts, p.y * ts, 0,
          p.x * ts, p.y * ts, currentSize
        );
        
        // Dark red with fade-out
        gradient.addColorStop(0, `rgba(139,0,0,${currentAlpha})`);
        gradient.addColorStop(1, `rgba(139,0,0,0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x * ts, p.y * ts, currentSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Existing particle drawing
        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife || 1));
        ctx.globalAlpha = alpha * p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x * ts, p.y * ts, p.size * ts, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    
    ctx.restore();
  }
}