import { isWalkable } from '../map/TileTypes.js';

export function drawPedestrianDebug(r, state) {
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const z = state.camera.zoom || 1;
  const wTiles = Math.ceil(canvas.width/(ts*z))+2, hTiles = Math.ceil(canvas.height/(ts*z))+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  
  ctx.save();
  ctx.lineWidth = 1;
  
  // Draw walkable tiles
  ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
  for (let y=0; y<hTiles; y++) {
    for (let x=0; x<wTiles; x++) {
      const gx = sx + x, gy = sy + y;
      if (gy<0||gx<0||gy>=map.height||gx>=map.width) continue;
      if (isWalkable(map.tiles[gy][gx])) {
        ctx.fillRect(gx*ts, gy*ts, ts, ts);
      }
    }
  }
  
  // Draw pedestrian path graph
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
  ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
  for (const [key, node] of map.peds.nodes) {
    const x = node.x * ts + ts/2;
    const y = node.y * ts + ts/2;
    
    // Draw connections
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (const neighbor of node.neighbors) {
      const nx = neighbor.x * ts + ts/2;
      const ny = neighbor.y * ts + ts/2;
      ctx.lineTo(nx, ny);
    }
    ctx.stroke();
    
    // Draw node
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI*2);
    ctx.fill();
  }
  
  // Draw entity counts
  ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
  ctx.font = '12px monospace';
  const npcs = state.entities.filter(e => e.type === 'npc').length;
  const vehicles = state.entities.filter(e => e.type === 'vehicle').length;
  const bullets = state.entities.filter(e => e.type === 'bullet').length;
  
  // Remove the on-canvas text display since it's now in HUD
  // ctx.fillText(`NPCs: ${npcs}`, sx * ts + 10, sy * ts + 20);
  // ctx.fillText(`Vehicles: ${vehicles}`, sx * ts + 10, sy * ts + 35);
  // ctx.fillText(`Bullets: ${bullets}`, sx * ts + 10, sy * ts + 50);
  
  ctx.restore();
}