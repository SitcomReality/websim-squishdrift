export function drawExplosion(r, state, explosion) {
  const { ctx } = r, ts = state.world.tileSize;
  
  if (!state.explosionImage) return;
  
  const frame = explosion.currentFrame;
  const frameWidth = explosion.frameWidth;
  const frameHeight = explosion.frameHeight;
  
  // Calculate source position in sprite sheet
  const framesPerRow = 8;
  const srcX = (frame % framesPerRow) * frameWidth;
  const srcY = Math.floor(frame / framesPerRow) * frameHeight;
  
  // Calculate screen position (center explosion on vehicle)
  const screenX = explosion.pos.x * ts - (frameWidth / (ts * 2)) * ts;
  const screenY = explosion.pos.y * ts - (frameHeight / (ts * 2)) * ts;
  
  // Calculate scale to fit 1x1 tile
  const scaleX = ts / frameWidth;
  const scaleY = ts / frameHeight;
  
  ctx.save();
  
  // Draw explosion with scaling
  ctx.translate(explosion.pos.x * ts, explosion.pos.y * ts);
  ctx.scale(scaleX, scaleY);
  
  ctx.drawImage(
    state.explosionImage,
    srcX, srcY, frameWidth, frameHeight,
    -frameWidth/2, -frameHeight/2, frameWidth, frameHeight
  );
  
  ctx.restore();
}