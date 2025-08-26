export function drawItem(r, state, item) {
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(item.pos.x * ts, item.pos.y * ts);
  ctx.fillStyle = item.color || '#FFD700';
  ctx.beginPath();
  ctx.arc(0, 0, ts * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

