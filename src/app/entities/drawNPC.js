export function drawNPC(r, state, npc){
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(npc.pos.x*ts, npc.pos.y*ts);
  ctx.fillStyle = '#FFA500'; // orange-yellow
  const size = ts * 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, size*0.5, 0, Math.PI*2);
  ctx.fill();
  // simple shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, size*0.35, size*0.5, size*0.2, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

