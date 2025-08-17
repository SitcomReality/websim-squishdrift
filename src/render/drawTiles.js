import { Tile, TileColor } from '../map/TileTypes.js';

export function drawTiles(r, state, layer = 'all') {
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const z = state.camera.zoom || 1;
  const wTiles = Math.ceil(canvas.width/(ts*z))+2, hTiles = Math.ceil(canvas.height/(ts*z))+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  const floorTypes = new Set([Tile.BuildingFloor]);
  
  for (let y = 0; y < hTiles; y++) {
    for (let x = 0; x < wTiles; x++) {
      const gx = sx + x, gy = sy + y; 
      if (gy < 0 || gx < 0 || gy >= map.height || gx >= map.width) continue;
      const t = map.tiles[gy][gx];
      
      if (layer === 'ground' && floorTypes.has(t)) continue;
      if (layer === 'floors' && !floorTypes.has(t)) continue;
      
      // Draw zebra stripes for zebra crossings
      if (t >= 11 && t <= 14) {
        ctx.fillStyle = '#E0E0E0'; // Light gray base
        ctx.fillRect(gx * ts, gy * ts, ts, ts);
        
        // Draw zebra stripes
        ctx.fillStyle = '#FFFFFF';
        const stripeWidth = 2;
        const stripeGap = 4;
        for (let i = 0; i < ts; i += stripeWidth + stripeGap) {
          if (t === 11 || t === 12) { // Horizontal stripes
            ctx.fillRect(gx * ts + i, gy * ts, stripeWidth, ts);
          } else { // Vertical stripes
            ctx.fillRect(gx * ts, gy * ts + i, ts, stripeWidth);
          }
        }
      } else {
        ctx.fillStyle = TileColor[t] || '#f5f5f5';
        ctx.fillRect(gx * ts, gy * ts, ts, ts);
      }
      
      if (t === Tile.BuildingWall) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(gx * ts, gy * ts + ts * 0.7, ts, ts * 0.3);
      }
    }
  }
}