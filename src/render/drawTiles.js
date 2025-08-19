import { Tile, TileColor } from '../map/TileTypes.js';
import { roadDir } from '../map/TileTypes.js';

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
    
    // Handle zebra crossings with special rendering
    if (isZebraCrossing(t)) {
      drawZebraCrossing(r, gx, gy, ts, t);
    } else if (t === Tile.RoundaboutCenter) {
      // Draw road background first
      r.ctx.fillStyle = TileColor[Tile.RoadN];
      r.ctx.fillRect(gx*ts, gy*ts, ts, ts);
      
      // Draw circular grass patch centered in the tile
      const cx = gx*ts + ts/2, cy = gy*ts + ts/2;
      const radius = ts * 0.36;
      r.ctx.save();
      r.ctx.beginPath();
      r.ctx.arc(cx, cy, radius, 0, Math.PI*2);
      r.ctx.closePath();
      r.ctx.fillStyle = TileColor[Tile.Grass] || '#90EE90';
      r.ctx.fill();
      r.ctx.restore();
    } else {
      r.ctx.fillStyle = TileColor[t] || '#f5f5f5';
      r.ctx.fillRect(gx*ts, gy*ts, ts, ts);
    }
    
    // Permanent road direction markings: draw arrow on uni-directional road tiles adjacent
    // to a median strip or roundabout center (use same lighter color as zebra crossings).
    const isRoadTile = (tt) => (tt >= Tile.RoadN && tt <= Tile.RoadW);
    if (isRoadTile(t)) {
      // Check adjacency to median or roundabout center
      const neighs = [
        { x: gx - 1, y: gy },
        { x: gx + 1, y: gy },
        { x: gx, y: gy - 1 },
        { x: gx, y: gy + 1 }
      ];
      let adjacentToSpecial = false;
      for (const n of neighs) {
        if (n.x < 0 || n.y < 0 || n.x >= map.width || n.y >= map.height) continue;
        const nt = map.tiles[n.y][n.x];
        if (nt === Tile.Median || nt === Tile.RoundaboutCenter) { adjacentToSpecial = true; break; }
      }
      if (adjacentToSpecial) {
        drawRoadArrow(r.ctx, gx*ts, gy*ts, ts, roadDir(t));
      }
    }
    
    if (t === Tile.BuildingWall) {
      r.ctx.fillStyle = 'rgba(0,0,0,0.2)';
      r.ctx.fillRect(gx*ts, gy*ts + ts*0.7, ts, ts*0.3);
    }
  }
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

function drawRoadArrow(ctx, x, y, ts, dir) {
  if (!dir) return;
  // Use same color as zebra stripes (light grey)
  const color = TileColor[Tile.ZebraCrossingN] || '#6a6a6a';
  ctx.save();
  ctx.translate(x + ts/2, y + ts/2);
  // arrow size relative to tile
  const len = ts * 0.28;
  const w = ts * 0.12;
  let ang = 0;
  if (dir === 'N') ang = -Math.PI/2;
  if (dir === 'E') ang = 0;
  if (dir === 'S') ang = Math.PI/2;
  if (dir === 'W') ang = Math.PI;
  ctx.rotate(ang);
  
  // Draw simple filled arrow pointing right (after rotation)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-len, -w/2);
  ctx.lineTo(0, -w/2);
  ctx.lineTo(0, -w);
  ctx.lineTo(len, 0);
  ctx.lineTo(0, w);
  ctx.lineTo(0, w/2);
  ctx.lineTo(-len, w/2);
  ctx.closePath();
  ctx.fill();
  
  // Slight outline for contrast
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}