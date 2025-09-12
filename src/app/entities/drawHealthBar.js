export function drawHealthBar(r, entity, offsetY = -0.3) {
  if (!entity.health) return;
  if (entity.hidden || entity.inVehicle) return;
  
  const { ctx } = r;
  const ts = r.ts || 24;
  const healthPercent = entity.health.getPercent();
  
  ctx.save();
  ctx.translate(entity.pos.x * ts, (entity.pos.y + offsetY) * ts);
  
  // Background with black outline
  const barWidth = ts * 0.6;
  const barHeight = ts * 0.08;
  const outlineThickness = Math.max(1, Math.round(ts * 0.01)); // ~2-3px equivalent
  
  // Draw black outline
  ctx.fillStyle = '#000000';
  ctx.fillRect(-ts * 0.3 - outlineThickness, 
               -ts * 0.1 - outlineThickness, 
               barWidth + 2 * outlineThickness, 
               barHeight + 2 * outlineThickness);
  
  // Background inside outline
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(-ts * 0.3, -ts * 0.1, barWidth, barHeight);
  
  // Health bar
  const healthColor = healthPercent > 0.6 ? '#4CAF50' : 
                     healthPercent > 0.3 ? '#FF9800' : '#F44336';
  ctx.fillStyle = healthColor;
  ctx.fillRect(-ts * 0.3, -ts * 0.1, barWidth * healthPercent, barHeight);
  
  ctx.restore();
}