export function drawVehiclePathDebug(r, state) {
  const { ctx, canvas } = r;
  const ts = state.world.tileSize;
  const map = state.world.map;
  const z = state.camera.zoom || 1;
  const wTiles = Math.ceil(canvas.width / (ts * z)) + 2;
  const hTiles = Math.ceil(canvas.height / (ts * z)) + 2;
  const sx = Math.floor(state.camera.x - wTiles / 2);
  const sy = Math.floor(state.camera.y - hTiles / 2);

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FF00FF'; // Magenta for vehicle paths
  ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';

  // Draw vehicle paths
  const vehicles = state.entities.filter(e => e.type === 'vehicle');
  for (const vehicle of vehicles) {
    if (!vehicle.plannedRoute || !vehicle.plannedRoute.length) continue;

    // Draw path lines
    ctx.beginPath();
    const startPos = vehicle.pos;
    ctx.moveTo(startPos.x * ts, startPos.y * ts);

    for (let i = vehicle.currentPathIndex || 0; i < vehicle.plannedRoute.length; i++) {
      const node = vehicle.plannedRoute[i];
      const x = node.x * ts + ts / 2 - sx * ts;
      const y = node.y * ts + ts / 2 - sy * ts;
      
      ctx.lineTo(x, y);
      
      // Draw path nodes
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.stroke();

    // Highlight current target
    if (vehicle.currentPathIndex < vehicle.plannedRoute.length) {
      const target = vehicle.plannedRoute[vehicle.currentPathIndex];
      const x = target.x * ts + ts / 2 - sx * ts;
      const y = target.y * ts + ts / 2 - sy * ts;
      
      ctx.fillStyle = '#FF00FF';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}