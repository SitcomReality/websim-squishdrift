export function drawDamageText(r, state) {
  const { ctx } = r, ts = state.world.tileSize;
  const texts = state.damageTexts || [];
  
  if (texts.length === 0) return;
  
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle'; // Vertically center the text
  
  for (const text of texts) {
    ctx.font = `bold ${text.size || 14}px "Noto Sans", Arial, sans-serif`;
    const alpha = 1 - (text.age / text.lifetime);
    
    // Calculate screen position
    const screenX = text.pos.x * ts;
    const screenY = text.pos.y * ts;

    // Apply animation scale if it exists
    const scale = text.currentScale || 1;
    
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(scale, scale);
    
    const finalAlpha = Math.floor(alpha * 255).toString(16).padStart(2, '0');
    
    // Draw text with an outline for better readability
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.9})`;
    ctx.lineWidth = 2;
    ctx.strokeText(text.text, 0, 0);

    // Draw main text fill
    ctx.fillStyle = `${text.color}${finalAlpha}`;
    ctx.fillText(text.text, 0, 0);

    ctx.restore();
  }
  
  ctx.restore();
}