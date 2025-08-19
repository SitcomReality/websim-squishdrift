import { Tile, TileColor, roadDir } from '../map/TileTypes.js';

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
      // Draw permanent lane-direction arrow for single-outlet road tiles (intersection arms)
      try {
        const d = roadDir(t);
        const node = d && map.roads && map.roads.byKey && map.roads.byKey.get(`${gx},${gy},${d}`);
        if (node && Array.isArray(node.next) && node.next.length === 1) {
          drawRoadArrow(r.ctx, gx*ts + ts/2, gy*ts + ts/2, d, Math.min(ts*0.28, 18), TileColor[Tile.ZebraCrossingN] || '#6a6a6a');
        }
      } catch(e) { /* defensive: don't break rendering on graph issues */ }
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

// Add helper to draw a small filled arrow used as road marking
function drawRoadArrow(ctx, cx, cy, dir, len, color) {
  const ang = dir==='N'? -Math.PI/2 : dir==='E'? 0 : dir==='S'? Math.PI/2 : Math.PI;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  // arrow shaft
  ctx.rect(-len*0.45, -2, len*0.9, 4);
  // arrow head
  ctx.moveTo(len*0.45, 0);
  ctx.lineTo(len*0.9, -6);
  ctx.lineTo(len*0.9, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}