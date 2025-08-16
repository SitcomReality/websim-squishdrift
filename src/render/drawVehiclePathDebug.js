export function drawVehiclePathDebug(r, state) {
  const { ctx, canvas } = r;
  const ts = state.world.tileSize;
  const z = state.camera.zoom || 1;
  const wTiles = Math.ceil(canvas.width / (ts * z)) + 2;
  const hTiles = Math.ceil(canvas.height / (ts * z)) + 2;
  const sx = Math.floor(state.camera.x - wTiles / 2);
  const sy = Math.floor(state.camera.y - hTiles / 2);

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00FF00'; // Green for vehicle paths
  ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
  ctx.setLineDash([5, 5]);

  // Draw vehicle paths for AI vehicles
  const vehicles = state.entities.filter(e => e.type === 'vehicle' && e.controlled !== true);
  
  for (const vehicle of vehicles) {
    // Use the plannedRoute from AIDrivingSystem
    const path = vehicle.plannedRoute;
    if (!path || !path.length) continue;

    // Filter path nodes to only those within view
    const visiblePath = path.filter(node => {
      const x = node.x * ts + ts / 2 - sx * ts;
      const y = node.y * ts + ts / 2 - sy * ts;
      return x > -50 && x < canvas.width + 50 && y > -50 && y < canvas.height + 50;
    });

    if (visiblePath.length < 2) continue;

    // Draw path line
    ctx.beginPath();
    const startPos = vehicle.pos;
    const startX = startPos.x * ts - sx * ts;
    const startY = startPos.y * ts - sy * ts;
    ctx.moveTo(startX, startY);

    for (const node of visiblePath) {
      const x = node.x * ts + ts / 2 - sx * ts;
      const y = node.y * ts + ts / 2 - sy * ts;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw path nodes
    for (const node of visiblePath) {
      const x = node.x * ts + ts / 2 - sx * ts;
      const y = node.y * ts + ts / 2 - sy * ts;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight current target
    if (vehicle.currentPathIndex !== undefined && vehicle.currentPathIndex < visiblePath.length) {
      const target = visiblePath[vehicle.currentPathIndex];
      const x = target.x * ts + ts / 2 - sx * ts;
      const y = target.y * ts + ts / 2 - sy * ts;
      
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    }
  }

  ctx.restore();
}