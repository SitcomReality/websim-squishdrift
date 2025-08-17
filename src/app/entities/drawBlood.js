export function drawBlood(r, state, blood) {
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(blood.pos.x * ts, blood.pos.y * ts);
  ctx.rotate(blood.rotation || 0);
  
  // Create a realistic blood stain shape
  ctx.fillStyle = blood.color || 'hsl(0, 70%, 35%)';
  ctx.beginPath();
  
  // Create an irregular blood stain shape
  const size = ts * (blood.size || 0.5);
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const radius = size * (0.7 + Math.random() * 0.3);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}