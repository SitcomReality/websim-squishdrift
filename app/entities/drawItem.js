export function drawItem(r, state, item) {
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(item.pos.x * ts, item.pos.y * ts);
  
  if (item.name === 'Pistol' && state.vehicleImages?.pistol) {
    // Draw pistol sprite
    const img = state.vehicleImages.pistol;
    const scale = 0.5 * ts / 50; // Scale to fit tile
    const width = img.width * scale;
    const height = img.height * scale;
    
    ctx.drawImage(
      img,
      -width / 2,
      -height / 2,
      width,
      height
    );
  } else {
    // Fallback to colored circle
    ctx.fillStyle = item.color || '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, ts * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

