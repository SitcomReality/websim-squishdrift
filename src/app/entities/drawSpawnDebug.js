import { SpawnManager } from '../core/SpawnManager.js';

export function drawSpawnDebug(r, state) {
  const { ctx } = r, ts = state.world.tileSize;
  const player = state.entities.find(e => e.type === 'player');
  if (!player) return;

  // Use vehicle position if player is in vehicle, otherwise use player position
  const referenceEntity = state.control.inVehicle 
    ? state.control.vehicle 
    : player;
  
  ctx.save();
  
  // Get the actual spawn manager values
  const spawnManager = new SpawnManager(state._engine?.stateManager);
  
  // Draw inner spawn radius (8 tiles)
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // Yellow
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(referenceEntity.pos.x * ts, referenceEntity.pos.y * ts, 8 * ts, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw outer spawn radius (10 tiles)
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(referenceEntity.pos.x * ts, referenceEntity.pos.y * ts, 10 * ts, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw despawn radius (12 tiles)
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(referenceEntity.pos.x * ts, referenceEntity.pos.y * ts, 12 * ts, 0, Math.PI * 2);
  ctx.stroke();
  
  // Update HUD with counts
  const npcs = state.entities.filter(e => e.type === 'npc').length;
  const vehicles = state.entities.filter(e => e.type === 'vehicle').length;
  const bullets = state.entities.filter(e => e.type === 'bullet').length;
  
  const debugText = document.getElementById('debug-text');
  if (debugText) {
    debugText.textContent = `NPCs: ${npcs} | Vehicles: ${vehicles} | Bullets: ${bullets}`;
  }
  
  ctx.restore();
}