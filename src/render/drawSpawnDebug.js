export function drawSpawnDebug(r, state) {
  const { ctx } = r, ts = state.world.tileSize;
  const player = state.entities.find(e => e.type === 'player');
  if (!player) return;

  ctx.save();
  
  // Draw spawn radius (15 tiles)
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.pos.x * ts, player.pos.y * ts, 15 * ts, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw despawn radius (25 tiles)
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(player.pos.x * ts, player.pos.y * ts, 25 * ts, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw entity counts in HUD instead
  const npcs = state.entities.filter(e => e.type === 'npc').length;
  const vehicles = state.entities.filter(e => e.type === 'vehicle').length;
  const bullets = state.entities.filter(e => e.type === 'bullet').length;
  
  // Update HUD with counts
  const debugText = document.getElementById('debug-text');
  if (debugText) {
    debugText.textContent = `NPCs: ${npcs} | Vehicles: ${vehicles} | Bullets: ${bullets}`;
  }
  
  ctx.restore();
}