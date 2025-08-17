export function drawProjectile(r, state, projectile) {
  const { ctx } = r, ts = state.world.tileSize;
  const size = ts * projectile.size;
  
  ctx.save();
  ctx.translate(projectile.pos.x * ts, projectile.pos.y * ts);
  
  // Draw bullet trail
  ctx.strokeStyle = 'rgba(255, 200, 0, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const prevX = projectile.pos.x - projectile.vel.x * 0.1;
  const prevY = projectile.pos.y - projectile.vel.y * 0.1;
  ctx.moveTo(prevX * ts, prevY * ts);
  ctx.lineTo(projectile.pos.x * ts, projectile.pos.y * ts);
  ctx.stroke();
  
  // Draw bullet
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

