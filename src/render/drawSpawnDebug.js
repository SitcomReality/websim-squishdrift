export function drawSpawnDebug(r, state) {
  const { ctx, canvas } = r, ts = state.world.tileSize;
  const wTiles = Math.ceil(canvas.width/ts)+2, hTiles = Math.ceil(canvas.height/ts)+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.lineWidth = 2;
  
  // Draw spawn radius
  const player = state.entities.find(e => e.type === 'player');
  if (player) {
    const px = player.pos.x * ts;
    const py = player.pos.y * ts;
    
    // Spawn radius (visualized as a circle)
    ctx.beginPath();
    ctx.arc(px, py, 30 * ts, 0, Math.PI*2);
    ctx.stroke();
    
    // Despawn radius
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(px, py, 50 * ts, 0, Math.PI*2);
    ctx.stroke();
  }
  
  // Draw entity counts
  ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
  ctx.font = '12px monospace';
  const npcs = state.entities.filter(e => e.type === 'npc').length;
  const vehicles = state.entities.filter(e => e.type === 'vehicle').length;
  const bullets = state.entities.filter(e => e.type === 'bullet').length;
  
  ctx.fillText(`NPCs: ${npcs}`, sx * ts + 10, sy * ts + 20);
  ctx.fillText(`Vehicles: ${vehicles}`, sx * ts + 10, sy * ts + 35);
  ctx.fillText(`Bullets: ${bullets}`, sx * ts + 10, sy * ts + 50);
  
  ctx.restore();
}

