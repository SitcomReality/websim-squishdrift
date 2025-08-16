export function drawPlayer(r, state, player){
  if (player.hidden) return;
  const { ctx } = r, ts = state.world.tileSize, p = player.pos;
  ctx.save(); ctx.fillStyle = '#FF0000';
  const size = ts * 0.8; ctx.translate(p.x*ts, p.y*ts);
  ctx.fillRect(-size/2, -size/2, size, size);
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
  ctx.arc((player.facing.x)*ts*0.3, (player.facing.y)*ts*0.3, 3, 0, Math.PI*2);
  ctx.fill(); ctx.restore();
}

