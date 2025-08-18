export function drawNPC(r, state, npc){
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(npc.pos.x*ts, npc.pos.y*ts);
  
  // Generate random color if not already set
  if (!npc.color) {
    // cooler hues (purple->lime), low saturation
    const hue = 120 + Math.random() * 140; // 120..260
    const sat = 25 + Math.random() * 20;   // 25..45
    const lig = 45 + Math.random() * 20;   // 45..65
    npc.color = `hsl(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(lig)}%)`;
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