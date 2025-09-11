src/app/core/systems/particles/ParticleRenderer.js
``` 
export function drawParticles(state, renderer) {
  const { ctx } = renderer;
  const ts = state.world.tileSize;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const ps = state.particles || [];
  if (!ps.length) return;

  for (const p of ps) {
    const lifeRatio = Math.max(0, p.life / p.maxLife);

    if (p.type === 'smoke') {
      drawSmokeParticle(ctx, p, ts, lifeRatio);
    } else if (p.type === 'spark') {
      drawSparkParticle(ctx, p, ts, lifeRatio);
    } else if (p.type === 'ghost') {
      drawGhostParticle(ctx, p, ts, lifeRatio);
    } else if (p.type === 'blood') {
      drawBloodParticle(ctx, p, ts, lifeRatio);
    } else {
      drawDefaultParticle(ctx, p, ts, lifeRatio);
    }
  }

  ctx.restore();
}

function drawSmokeParticle(ctx, p, ts, lifeRatio) {
  const radius = p.size * ts;
  const gradient = ctx.createRadialGradient(p.x * ts, p.y * ts, 0, p.x * ts, p.y * ts, radius);
  const color = p.color || 'hsl(0, 0%, 30%)';
  
  gradient.addColorStop(0, color.replace('%)', `%,${p.alpha})`));
  gradient.addColorStop(0.7, color.replace('%)', `%,${p.alpha * 0.5})`));
  gradient.addColorStop(1, color.replace('%)', `%,0%)`));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(p.x * ts, p.y * ts, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawSparkParticle(ctx, p, ts, lifeRatio) {
  const growth = (p.maxSize - p.size) * (1 - lifeRatio) * 0.15;
  const MAX_PARTICLE_SIZE = 0.025;
  const currentSize = Math.min(p.size + growth, MAX_PARTICLE_SIZE);
  const currentAlpha = p.alpha * lifeRatio;

  const baseColor = p.color || `rgba(255,255,200,${currentAlpha})`;
  let r = 255, g = 255, b = 200;
  const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    r = parseInt(match[1], 10);
    g = parseInt(match[2], 10);
    b = parseInt(match[3], 10);
  }

  const gradient = ctx.createRadialGradient(p.x * ts, p.y * ts, 0, p.x * ts, p.y * ts, currentSize * ts);

  if (p.coronaColor) {
    gradient.addColorStop(0, `rgba(255, 255, 240,${currentAlpha})`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b},${currentAlpha * 0.8})`);
    gradient.addColorStop(1, p.coronaColor.replace('0.9', `${currentAlpha * 0.5}`));
  } else {
    gradient.addColorStop(0, `rgba(${r}, ${g},${b},${currentAlpha})`);
    gradient.addColorStop(0.3, `rgba(${Math.round(r*0.9)},${Math.round(g*0.8)},${Math.round(b*0.5)},${currentAlpha * 0.8})`);
    gradient.addColorStop(1, `rgba(${Math.round(r*0.8)},${Math.round(g*0.5)},${Math.round(b*0.2)},${currentAlpha * 0.3})`);
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(p.x * ts, p.y * ts, currentSize * ts, 0, Math.PI * 2);
  ctx.fill();

  if (currentAlpha > 0.5) {
    ctx.fillStyle = `rgba(255,255,255,${currentAlpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(p.x * ts, p.y * ts, currentSize * ts * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGhostParticle(ctx, p, ts, lifeRatio) {
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
    gradient.addColorStop(0, `rgba(${r}, ${g},${b},${currentAlpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x * ts, p.y * ts, currentSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBloodParticle(ctx, p, ts, lifeRatio) {
  const currentAlpha = p.alpha * lifeRatio;
  const currentSize = p.size * ts;

  const gradient = ctx.createRadialGradient(
    p.x * ts, p.y * ts, 0,
    p.x * ts, p.y * ts, currentSize
  );

  gradient.addColorStop(0, `rgba(139,0,0,${currentAlpha})`);
  gradient.addColorStop(1, `rgba(139,0,0,0)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(p.x * ts, p.y * ts, currentSize, 0, Math.PI * 2);
  ctx.fill();
}

function drawDefaultParticle(ctx, p, ts, lifeRatio) {
  const alpha = Math.max(0, Math.min(1, p.life / p.maxLife || 1));
  ctx.globalAlpha = alpha * p.alpha;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x * ts, p.y * ts, p.size * ts, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}