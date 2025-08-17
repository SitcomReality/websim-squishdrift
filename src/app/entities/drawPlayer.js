export function drawPlayer(r, state, player){
  if (player.hidden) return;
  const { ctx } = r, ts = state.world.tileSize, p = player.pos;
  ctx.save(); ctx.fillStyle = '#FF0000';
  const size = ts * 0.15; // Reduced from 0.8 to 0.15 to match NPC size
  const halfSize = size / 2;
  ctx.translate(p.x*ts, p.y*ts);
  ctx.fillRect(-halfSize, -halfSize, size, size);
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
  ctx.arc((player.facing.x)*ts*0.15, (player.facing.y)*ts*0.15, 2, 0, Math.PI*2);
  ctx.fill(); ctx.restore();
}

