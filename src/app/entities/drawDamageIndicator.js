export function drawDamageIndicator(r, state, indicator) {
  const { ctx } = r, ts = state.world.tileSize;
  
  ctx.save();
  ctx.translate(indicator.pos.x * ts, indicator.pos.y * ts);
  
  const alpha = 1 - (indicator.age / indicator.lifetime);
  const yOffset = (indicator.age / indicator.lifetime) * -20;
  
  ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`-${indicator.damage}`, 0, yOffset);
  
  ctx.restore();
}

