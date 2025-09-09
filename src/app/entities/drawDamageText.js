export function drawDamageText(r, state) {
  const { ctx } = r, ts = state.world.tileSize;
  const texts = state.damageTexts || [];
  
  if (texts.length === 0) return;
  
  ctx.save();
  ctx.textAlign = 'center';
  
  for (const text of texts) {
    ctx.font = `bold ${text.size || 14}px Arial`;
    const alpha = 1 - (text.age / text.lifetime);
    
    // Calculate screen position
    const screenX = text.pos.x * ts;
    const screenY = text.pos.y * ts;

    // Apply animation scale if it exists
    if (text.currentScale && text.currentScale !== 1) {
      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.scale(text.currentScale, text.currentScale);
      
      // Draw shadow
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
      ctx.fillText(text.text, 1, 1);
      
      // Draw text
      ctx.fillStyle = `${text.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      ctx.fillText(text.text, 0, 0);

      ctx.restore();
    } else {
      // Draw shadow
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
      ctx.fillText(text.text, screenX + 1, screenY + 1);
      
      // Draw text
      ctx.fillStyle = `${text.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      ctx.fillText(text.text, screenX, screenY);
    }
  }
  
  ctx.restore();
}

