export function drawProjectile(r, state, projectile) {
  const { ctx } = r, ts = state.world.tileSize;
  const size = ts * projectile.size;
  
  ctx.save();
  ctx.translate(projectile.pos.x * ts, projectile.pos.y * ts);
  
  // Draw bullet trail
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const prevX = projectile.pos.x - projectile.vel.x * 0.1;
  const prevY = projectile.pos.y - projectile.vel.y * 0.1;
  ctx.moveTo(prevX * ts, prevY * ts);
  ctx.lineTo(projectile.pos.x * ts, projectile.pos.y * ts);
  ctx.stroke();
  
  // Draw bullet - smaller and grey with orange tint
  ctx.fillStyle = '#8B8B8B'; // Darker grey than footpath, lighter than zebra
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2); // 25% of original size
  ctx.fill();
  
  // Add subtle orange tint around edges
  ctx.strokeStyle = '#A0522D'; // Sienna brown for orange tint
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}