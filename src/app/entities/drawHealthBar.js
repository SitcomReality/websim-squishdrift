export function drawHealthBar(r, entity, offsetY = -0.8) {
  if (!entity.health) return;
  
  const { ctx } = r;
  const ts = r.ts || 24;
  const healthPercent = entity.health.getPercent();
  
  ctx.save();
  ctx.translate(entity.pos.x * ts, (entity.pos.y + offsetY) * ts);
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(-ts * 0.3, -ts * 0.1, ts * 0.6, ts * 0.08);
  
  // Health bar
  const healthColor = healthPercent > 0.6 ? '#4CAF50' : 
                     healthPercent > 0.3 ? '#FF9800' : '#F44336';
  ctx.fillStyle = healthColor;
  ctx.fillRect(-ts * 0.3, -ts * 0.1, ts * 0.6 * healthPercent, ts * 0.08);
  
  ctx.restore();
}