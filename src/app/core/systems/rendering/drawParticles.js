export function drawParticles(state, renderer) {
  const ps = state.particles || [];
  if (!ps.length) return;

  const { ctx } = renderer;
  const ts = state.world.tileSize;

  ctx.save();

  for (const p of ps) {
    if (p.type === 'smoke') {
      // Draw smoke particles with soft edges
      const radius = p.size * ts;
      const gradient = ctx.createRadialGradient(p.x * ts, p.y * ts, 0, p.x * ts, p.y * ts, radius);

      // Create greyscale gradient for smoke
      const color = p.color || 'hsl(0, 0%, 30%)';
      gradient.addColorStop(0, color.replace('%)', `%, ${p.alpha})`));
      gradient.addColorStop(0.7, color.replace('%)', `%, ${p.alpha * 0.5})`));
      gradient.addColorStop(1, color.replace('%)', `%, 0%)`));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x * ts, p.y * ts, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Existing particle drawing
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife || 1));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color; // use original color and globalAlpha instead of string replace
      ctx.beginPath();
      ctx.arc(p.x * ts, p.y * ts, p.size * ts, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  
  ctx.restore();
}