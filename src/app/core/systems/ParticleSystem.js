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

  emitDriftParticles(state, vehicle) {
    state.particles = state.particles || [];

    const vx = vehicle.vel?.x || 0, vy = vehicle.vel?.y || 0;
    const fwdX = Math.cos(vehicle.rot || 0), fwdY = Math.sin(vehicle.rot || 0);
    const speed = Math.hypot(vx, vy);
    if (speed < 0.05) return;

    // lateral component (absolute sideways speed) is primary driver for 'big drift' effects
    const lateral = Math.abs((vx * fwdY - vy * fwdX)); // magnitude of velocity perpendicular to forward
    const longitudinal = Math.abs((vx * fwdX + vy * fwdY)); // forward/back component
    // If mostly moving forward/back, dramatically reduce drift particles
    const lateralImportance = lateral / (longitudinal + lateral + 1e-6);
    if (lateralImportance < 0.08) return; // effectively no big-drift when almost straight
    const slipDirection = Math.sign((vx * fwdY - vy * fwdX)); // -1 right, 1 left

    // --- NEW: Combo-based intensity scaling ---
    // Only apply combo intensity to the player's vehicle
    const isPlayerVehicle = state.control?.inVehicle && state.control.vehicle === vehicle;
    const comboCount = isPlayerVehicle ? (state.comboCount || 0) : 0;
    const comboForScaling = Math.min(comboCount, 10);

    // This factor scales from ~0.2 (0x combo) up to ~1.26 (10x combo).
    // Reaches 1.0 (current base intensity) at ~7.5x combo.
    const comboIntensity = (comboForScaling + 2) / 9.5;

    // Calculate rear wheel positions - same logic as skidmarks
    const perpX = -fwdY;
    const perpY = fwdX;

    const rearWheelOffset = -0.3; // same as skidmarks
    // Adjust track width based on vehicle type to match skidmark positioning
    let trackHalfWidth = 0.23; // default from skidmarks

    if (vehicle.vehicleType === 'truck') {
      trackHalfWidth = 0.23; // Keep original for trucks
    } else if (vehicle.vehicleType === 'compact' || vehicle.vehicleType === 'sports') {
      trackHalfWidth = 0.23 * 0.6; // 60% width for compact/sports cars
    } else {
      trackHalfWidth = 0.23 * 0.6; // 60% width for other vehicles too
    }

    const rearX = vehicle.pos.x + fwdX * rearWheelOffset;
    const rearY = vehicle.pos.y + fwdY * rearWheelOffset;

    const wheelPositions = {
      left: { x: rearX - perpX * trackHalfWidth, y: rearY - perpY * trackHalfWidth },
      right: { x: rearX + perpX * trackHalfWidth, y: rearY + perpY * trackHalfWidth }
    };

    // Scale counts/speed/life by lateral intensity more strongly than by overall speed
    const baseCount = (1 + Math.ceil(lateral * 0.6)) * comboIntensity; // Reduced particle count by 50% and scaled by combo

    // Bias particle count heavily to the side being slid into
    let leftCount = Math.floor(baseCount * (slipDirection >= 0 ? (1 + lateralImportance * 3.0) : (1 - lateralImportance * 0.5)));
    let rightCount = Math.floor(baseCount * (slipDirection <= 0 ? (1 + lateralImportance * 3.0) : (1 - lateralImportance * 0.5)));
    leftCount = Math.max(0, leftCount); rightCount = Math.max(0, rightCount);

    // emission direction biased opposite to instantaneous movement (creates "being spat out" illusion)
    const oppositeAngle = Math.atan2(-vy, -vx);
    const spread = Math.PI * (0.6 + Math.min(0.9, lateralImportance * 1.5)); // narrower when less sliding, wider when big slide

    const emitFromWheel = (pos, count) => {
        for (let i = 0; i < count; i++) {
            // Generate angle biased towards opposite direction of movement
            const angle = oppositeAngle + (Math.random() - 0.5) * spread;

            // particle speed & lifetime scale with lateral magnitude (sideways speed)
            const particleSpeed = (0.6 + Math.random() * 0.9) * (1 + lateral * 1.6);

            // --- REFINED SUPER SPARK LOGIC ---
            const superSparkChance = 0.02 + 0.1 * (comboForScaling / 10); // 2% at 0x, up to 12% at 10x
            const isSuperSpark = Math.random() < superSparkChance;
            const vibrantColors = [
                'rgba(180, 120, 255, 0.9)', // Purple
                'rgba(0, 255, 255, 0.9)',   // Cyan/Electric Blue
                'rgba(255, 0, 255, 0.9)',   // Magenta
                'rgba(50, 255, 50, 0.9)'    // Vibrant Green
            ];

            let color;
            let size;
            let life;
            let coronaColor = null;

            if (isSuperSpark) {
                color = 'rgba(255, 255, 220, 1.0)'; // Core is brilliant white/yellow
                // Pick a corona color from the vibrant palette, unlocked by combo
                const numColors = 1 + Math.floor((comboForScaling / 10) * (vibrantColors.length - 1));
                coronaColor = vibrantColors[Math.floor(Math.random() * numColors)];

                life = (0.08 + Math.random() * 0.08) * (1 + lateral * 1.5) * comboIntensity; // Shorter, more impactful lifetime
                size = (0.008 + Math.random() * 0.004) * (0.8 + lateralImportance) * comboIntensity; // Significantly smaller size
            } else {
                // --- NEW: Colorfulness scales with combo ---
                const colorfulness = comboForScaling / 10; // 0.0 to 1.0
                const randColor = Math.random();
                
                // Chance of white sparks decreases as combo increases (from 60% to 10%)
                if (randColor < 0.6 * (1 - colorfulness * 0.85)) {
                    color = 'rgba(255, 255, 255, 0.9)'; // White
                } 
                // Orange/Yellow is a constant 20% chance
                else if (randColor < 0.8) {
                    color = 'rgba(255, 220, 100, 0.9)'; // Orange/Yellow
                } 
                // Vibrant color chance increases from 20% to 70%
                else {
                    // Unlock more colors from the vibrant palette as combo increases
                    const numColors = 1 + Math.floor(colorfulness * (vibrantColors.length - 1));
                    color = vibrantColors[Math.floor(Math.random() * numColors)];
                }

                life = (0.03 + Math.random() * 0.07) * (1 + lateral * 1.8) * comboIntensity; // Reduced to 25% of original, scaled by combo
                size = (0.005 + Math.random() * 0.005) * (0.8 + lateralImportance) * comboIntensity; // Reduced to 25% of original, scaled by combo
            }

            const spark = {
              type: 'spark',
              x: pos.x,
              y: pos.y,
              vx: Math.cos(angle) * particleSpeed,
              vy: Math.sin(angle) * particleSpeed,
              life: life,
              maxLife: life,
              size: size,
              // Cap max growth to ~0.6x the base size so particles don't swell excessively
              maxSize: Math.max(size * 0.12, size * 0.6),
              color: color,
              coronaColor: coronaColor, // Store corona color for super sparks
              alpha: 0.9,
              maxAlpha: 0.9,
            };
            state.particles.push(spark);

            // --- NEW: Emit a "ghost" particle for each super spark ---
            if (isSuperSpark) {
                state.particles.push({
                    type: 'ghost',
                    x: pos.x,
                    y: pos.y,
                    vx: spark.vx * 0.8, // Slightly slower
                    vy: spark.vy * 0.8,
                    life: spark.life * 1.2, // Lives a bit longer
                    maxLife: spark.life * 1.2,
                    size: spark.size * 2.5, // Larger but transparent
                    color: coronaColor.replace('0.9', '0.0'), // Fully transparent to start
                    endColor: coronaColor.replace('0.9', '0.3'), // Fades into this color
                });
            }
        }
    };

    emitFromWheel(wheelPositions.left, leftCount);
    emitFromWheel(wheelPositions.right, rightCount);
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

  // Add method to emit sparks at a specific collision point
  emitCollisionSparks(state, vehicle, contactPoint, power = 8) {
    if (!vehicle || !contactPoint) return;

    // Calculate sparks at exact collision point
    this.emitSparks(state, contactPoint, 10, power);
  }

  emitSparks(state, pos, count = 6, power = 4, collisionNormal = null) {
    // Ensure particles array is initialized
    state.particles = state.particles || [];

    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.4 + Math.random());

      // Create smaller sparks - halved the base size
      const sparkSize = 0.01 + Math.random() * 0.015; // Changed from 0.03 to 0.015 (half)

      state.particles.push({
        type: 'spark',
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * s * 0.5,
        vy: Math.sin(a) * s * 0.5,
        life: 0.15 + Math.random() * 0.2,
        maxLife: 0.15 + Math.random() * 0.2,
        size: sparkSize,
        // Cap spark growth so they only reach ~60% larger than base at most
        maxSize: Math.max(sparkSize * 0.08, sparkSize * 0.6),
        color: 'rgba(255,200,50,1)',
        alpha: 1.0
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
    ctx.globalCompositeOperation = 'lighter'; // Additive blending for a brighter, more energetic look

    for (const p of ps) {
      const lifeRatio = Math.max(0, p.life / p.maxLife);

      if (p.type === 'smoke') {
        // ... existing smoke drawing ...
      } else if (p.type === 'spark') {
        // Draw dynamic sparks
        const growth = (p.maxSize - p.size) * (1 - lifeRatio) * 0.15;
        const MAX_PARTICLE_SIZE = 0.025;
        const currentSize = Math.min(p.size + growth, MAX_PARTICLE_SIZE);
        const currentAlpha = p.alpha * lifeRatio;

        const baseColor = p.color || `rgba(255,255,200,${currentAlpha})`;
        let r=255, g=255, b=200;
        const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            r = parseInt(match[1], 10);
            g = parseInt(match[2], 10);
            b = parseInt(match[3], 10);
        }

        const gradient = ctx.createRadialGradient(p.x * ts, p.y * ts, 0, p.x * ts, p.y * ts, currentSize * ts);

        // --- NEW: Super Spark Rendering with Corona ---
        if (p.coronaColor) {
            gradient.addColorStop(0, `rgba(255, 255, 240, ${currentAlpha})`); // Bright core
            gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${currentAlpha * 0.8})`);
            gradient.addColorStop(1, p.coronaColor.replace('0.9', `${currentAlpha * 0.5}`));
        } else {
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentAlpha})`);
            gradient.addColorStop(0.3, `rgba(${Math.round(r*0.9)}, ${Math.round(g*0.8)}, ${Math.round(b*0.5)}, ${currentAlpha * 0.8})`);
            gradient.addColorStop(1, `rgba(${Math.round(r*0.8)}, ${Math.round(g*0.5)}, ${Math.round(b*0.2)}, ${currentAlpha * 0.3})`);
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x * ts, p.y * ts, currentSize * ts, 0, Math.PI * 2);
        ctx.fill();

        // Add small bright center
        if (currentAlpha > 0.5) {
          ctx.fillStyle = `rgba(255,255,255,${currentAlpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(p.x * ts, p.y * ts, currentSize * ts * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.type === 'ghost') {
        // --- NEW: Ghost Particle Rendering ---
        // Fades in to mid-life, then fades out
        const peakTime = 0.5;
        const alphaProgress = lifeRatio > peakTime ? (1 - lifeRatio) / (1 - peakTime) : lifeRatio / peakTime;
        
        const currentSize = p.size * ts;
        const endColorMatch = p.endColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (endColorMatch) {
            const r = endColorMatch[1];
            const g = endColorMatch[2];
            const b = endColorMatch[3];
            const maxAlpha = parseFloat(endColorMatch[4]);
            const currentAlpha = maxAlpha * alphaProgress;
            
            const gradient = ctx.createRadialGradient(p.x * ts, p.y * ts, 0, p.x * ts, p.y * ts, currentSize);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentAlpha * 0.5})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x * ts, p.y * ts, currentSize, 0, Math.PI * 2);
            ctx.fill();
        }
      } else if (p.type === 'blood') {
        // Draw blood particles with fade-out
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