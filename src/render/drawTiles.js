import { Tile, TileColor } from '../map/TileTypes.js';

export function drawTiles(r, state, layer = 'all'){
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const wTiles = Math.ceil(canvas.width/ts)+2, hTiles = Math.ceil(canvas.height/ts)+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  const floorTypes = new Set([Tile.BuildingFloor]);
  
  // Fill background with ocean for out-of-bounds areas
  ctx.fillStyle = TileColor[Tile.Water] || '#1e40af';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let y=0; y<hTiles; y++) for (let x=0; x<wTiles; x++){
    const gx = sx + x, gy = sy + y;
    
    // Check if tile is within map bounds
    if (gy < 0 || gx < 0 || gy >= map.height || gx >= map.width) {
      // Draw ocean for out-of-bounds tiles
      ctx.fillStyle = TileColor[Tile.Water] || '#1e40af';
      ctx.fillRect(gx*ts, gy*ts, ts, ts);
      continue;
    }
    
    const t = map.tiles[gy][gx];
    if (layer === 'ground' && floorTypes.has(t)) continue;
    if (layer === 'floors' && !floorTypes.has(t)) continue;
    r.ctx.fillStyle = TileColor[t] || '#f5f5f5';
    r.ctx.fillRect(gx*ts, gy*ts, ts, ts);
    if (t === Tile.BuildingWall) {
      r.ctx.fillStyle = 'rgba(0,0,0,0.2)';
      r.ctx.fillRect(gx*ts, gy*ts + ts*0.7, ts, ts*0.3);
    }
  }
}