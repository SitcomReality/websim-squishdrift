export function drawExplosion(r, state, explosion) {
  const { ctx } = r, ts = state.world.tileSize;
  
  // Early return if no explosion image loaded
  if (!state.explosionImage) {
    // Fallback: draw simple explosion effect
    ctx.save();
    ctx.translate(explosion.pos.x * ts, explosion.pos.y * ts);
    
    // Draw explosion as expanding circles
    const alpha = 1 - (explosion.currentFrame / explosion.totalFrames);
    const size = ts * (0.5 + (explosion.currentFrame / explosion.totalFrames) * 0.5);
    
    // Multiple circles for explosion effect
    ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = `rgba(255, 200, 0, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    return;
  }
  
  const frame = explosion.currentFrame;
  const frameWidth = explosion.frameWidth;
  const frameHeight = explosion.frameHeight;
  
  // Calculate source position in sprite sheet
  const framesPerRow = 8;
  const srcX = (frame % framesPerRow) * frameWidth;
  const srcY = Math.floor(frame / framesPerRow) * frameHeight;
  
  // Calculate screen position (center explosion on vehicle)
  const screenX = explosion.pos.x * ts;
  const screenY = explosion.pos.y * ts;
  
  // Calculate scale to fit 2x2 tiles for better visibility
  const scale = (ts * 2) / frameWidth;
  
  ctx.save();
  
  // Draw explosion with scaling
  ctx.translate(screenX, screenY);
  ctx.scale(scale, scale);
  
  ctx.drawImage(
    state.explosionImage,
    srcX, srcY, frameWidth, frameHeight,
    -frameWidth/2, -frameHeight/2, frameWidth, frameHeight
  );
  
  ctx.restore();
}