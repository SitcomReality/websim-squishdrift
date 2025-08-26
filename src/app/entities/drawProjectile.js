export function drawProjectile(r, state, projectile) {
  const { ctx } = r, ts = state.world.tileSize;
  const size = ts * projectile.size;
  
  ctx.save();
  ctx.translate(projectile.pos.x * ts, projectile.pos.y * ts);
  
  // Draw bullet trail - reduced opacity
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const prevX = projectile.pos.x - projectile.vel.x * 0.1;
  const prevY = projectile.pos.y - projectile.vel.y * 0.1;
  ctx.moveTo(prevX * ts, prevY * ts);
  ctx.lineTo(projectile.pos.x * ts, projectile.pos.y * ts);
  ctx.stroke();
  
  // Draw smaller bullet with grey-orange tint
  ctx.fillStyle = '#666'; // Darker than footpath grey (#D3D3D3), lighter than zebra crossing (#6a6a6a)
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2); // Slightly smaller core
  ctx.fill();
  
  // Add subtle orange tint highlight
  ctx.fillStyle = '#884422';
  ctx.beginPath();
  ctx.arc(-size * 0.2, -size * 0.2, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}