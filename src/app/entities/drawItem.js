export function drawItem(r, state, item) {
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(item.pos.x * ts, item.pos.y * ts);
  const pistolImg = state.vehicleImages?.pistol;
  if (item.name === 'Pistol' && pistolImg) {
    const scale = (ts * 0.8) / Math.max(pistolImg.width, pistolImg.height);
    const w = pistolImg.width * scale;
    const h = pistolImg.height * scale;
    ctx.drawImage(pistolImg, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }
  ctx.fillStyle = item.color || '#FFD700';
  ctx.beginPath();
  ctx.arc(0, 0, ts * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}