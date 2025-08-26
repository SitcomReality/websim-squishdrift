export function drawItem(r, state, item) {
  const { ctx } = r, ts = state.world.tileSize;

  // Handle image-based pickups
  if (item.name === 'Pistol' && state.pickupImages?.pistol) {
    const img = state.pickupImages.pistol;
    const itemSize = ts * 0.75; // Make the pickup image about 3/4 of a tile size
    const aspect = img.width / img.height;
    const w = itemSize;
    const h = itemSize / aspect;
    
    ctx.save();
    ctx.translate(item.pos.x * ts, item.pos.y * ts);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  // Fallback to drawing a circle for other items
  ctx.save();
  ctx.translate(item.pos.x * ts, item.pos.y * ts);
  ctx.fillStyle = item.color || '#FFD700';
  ctx.beginPath();
  ctx.arc(0, 0, ts * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}