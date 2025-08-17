import { Tile, TileColor } from '../map/TileTypes.js';

export function drawTiles(r, state, layer = 'all'){
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const z = state.camera.zoom || 1;
  const wTiles = Math.ceil(canvas.width/(ts*z))+2, hTiles = Math.ceil(canvas.height/(ts*z))+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  const floorTypes = new Set([Tile.BuildingFloor]);
  
  for (let y=0; y<hTiles; y++) for (let x=0; x<wTiles; x++){
    const gx = sx + x, gy = sy + y; if (gy<0||gx<0||gy>=map.height||gx>=map.width) continue;
    const t = map.tiles[gy][gx];
    if (layer === 'ground' && floorTypes.has(t)) continue;
    if (layer === 'floors' && !floorTypes.has(t)) continue;
    
    // Handle special rendering for roundabout centers (grass with circular pattern)
    if (isRoundaboutCenter(map, gx, gy)) {
      drawRoundaboutCenter(r, gx, gy, ts);
    } else if (isZebraCrossing(t)) {
      drawZebraCrossing(r, gx, gy, ts, t);
    } else {
      r.ctx.fillStyle = TileColor[t] || '#f5f5f5';
      r.ctx.fillRect(gx*ts, gy*ts, ts, ts);
    }
    
    if (t === Tile.BuildingWall) {
      r.ctx.fillStyle = 'rgba(0,0,0,0.2)';
      r.ctx.fillRect(gx*ts, gy*ts + ts*0.7, ts, ts*0.3);
    }
  }
}

function isRoundaboutCenter(map, x, y) {
  // Check if this is the center of a roundabout
  const centerTiles = map.roads?.roundabouts?.map(r => ({x: r.cx, y: r.cy})) || [];
  return centerTiles.some(center => center.x === x && center.y === y);
}

function drawRoundaboutCenter(r, gx, gy, ts) {
  const { ctx } = r;
  
  // Base grass color
  ctx.fillStyle = TileColor[Tile.Grass];
  ctx.fillRect(gx*ts, gy*ts, ts, ts);
  
  // Draw circular grass pattern
  ctx.fillStyle = TileColor[Tile.Grass];
  ctx.beginPath();
  ctx.arc(gx*ts + ts/2, gy*ts + ts/2, ts * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw road color around the circle
  ctx.fillStyle = TileColor[Tile.RoadN];
  ctx.fillRect(gx*ts, gy*ts, ts, ts);
  
  // Draw grass circle on top
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = TileColor[Tile.Grass];
  ctx.beginPath();
  ctx.arc(gx*ts + ts/2, gy*ts + ts/2, ts * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function isZebraCrossing(tile) {
  return tile >= Tile.ZebraCrossingN && tile <= Tile.ZebraCrossingW;
}

function drawZebraCrossing(r, gx, gy, ts, tileType) {
  const { ctx } = r;
  
  // Base road color
  ctx.fillStyle = TileColor[Tile.RoadN];
  ctx.fillRect(gx*ts, gy*ts, ts, ts);
  
  // Zebra crossing stripes
  ctx.fillStyle = TileColor[tileType]; // Use the lighter grey for stripes
  
  const stripeWidth = ts * 0.15; // 15% of tile width
  const gapWidth = stripeWidth; // Equal gap between stripes
  
  switch(tileType) {
    case Tile.ZebraCrossingN:
    case Tile.ZebraCrossingS:
      // Vertical stripes for N/S roads (rotated 90 degrees)
      for (let i = 0; i < 5; i++) {
        const x = gx*ts + (i * (stripeWidth + gapWidth)) + gapWidth/2;
        if (x + stripeWidth <= (gx+1)*ts) {
          ctx.fillRect(x, gy*ts, stripeWidth, ts);
        }
      }
      break;
      
    case Tile.ZebraCrossingE:
    case Tile.ZebraCrossingW:
      // Horizontal stripes for E/W roads (rotated 90 degrees)
      for (let i = 0; i < 5; i++) {
        const y = gy*ts + (i * (stripeWidth + gapWidth)) + gapWidth/2;
        if (y + stripeWidth <= (gy+1)*ts) {
          ctx.fillRect(gx*ts, y, ts, stripeWidth);
        }
      }
      break;
  }
}