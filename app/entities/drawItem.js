export function drawItem(r, state, item) {
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(item.pos.x * ts, item.pos.y * ts);
  
  if (item.name === 'Pistol' && state.explosionImage) { // Check if images are loaded
    // Check for pistol image in the correct state property
    const pistolImg = state.vehicleImages?.pistol;
    
    if (pistolImg) {
      // Draw pistol sprite using the actual image object
      const scale = 0.4 * ts / Math.max(pistolImg.width, pistolImg.height);
      const width = pistolImg.width * scale;
      const height = pistolImg.height * scale;
      
      ctx.drawImage(
        pistolImg,
        -width / 2,
        -height / 2,
        width,
        height
      );
    } else {
      // Fallback if pistol image not loaded yet
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Fallback for other items or if images not loaded
    ctx.fillStyle = item.color || '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, ts * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}