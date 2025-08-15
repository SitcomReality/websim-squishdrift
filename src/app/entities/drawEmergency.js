export function drawEmergency(r, state, vehicle) {
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(vehicle.pos.x * ts, vehicle.pos.y * ts);
  if (vehicle.rot) {
    ctx.rotate(vehicle.rot);
  }
  
  // Base vehicle
  ctx.fillStyle = vehicle.color;
  ctx.fillRect(-ts * 0.5, -ts * 0.3, ts, ts * 0.6);
  
  // Siren lights
  if (vehicle.siren && Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, -ts * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, ts * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Vehicle type indicator
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  const label = vehicle.vehicleType === 'police' ? 'P' : 
                vehicle.vehicleType === 'firetruck' ? 'F' : 'A';
  ctx.fillText(label, 0, ts * 0.1);
  
  ctx.restore();
}