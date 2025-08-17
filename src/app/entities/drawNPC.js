export function drawNPC(r, state, npc){
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(npc.pos.x*ts, npc.pos.y*ts);
  
  // Generate random color if not already set
  if (!npc.color) {
    npc.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
  }
  
  ctx.fillStyle = npc.color;
  const size = ts * 0.15; // Reduced from 0.6 to 0.15 (1/4 of original)
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI*2);
  ctx.fill();
  
  // Simple shadow - also scaled down
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, size*0.35, size, size*0.2, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}