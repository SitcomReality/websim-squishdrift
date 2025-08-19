import { Tile, TileColor } from '../map/TileTypes.js';

export function drawTiles(r, state, layer = 'all'){
  const { ctx } = r, ts = state.world.tileSize, map = state.world.map;
  const z = state.camera.zoom || 1;
  const wTiles = Math.ceil(r.canvas.width/(ts*z))+2, hTiles = Math.ceil(r.canvas.height/(ts*z))+2;
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
    } else if (isRoadMarked(t)) {
      // Draw road background
      r.ctx.fillStyle = TileColor[Tile.RoadN];
      r.ctx.fillRect(gx*ts, gy*ts, ts, ts);
      
      // Draw road markings (arrows)
      drawRoadMarking(r, gx, gy, ts, t);
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

function isZebraCrossing(tile) {
  return tile >= Tile.ZebraCrossingN && tile <= Tile.ZebraCrossingW;
}

function isRoadMarked(tile) {
  return tile >= Tile.RoadNMarked && tile <= Tile.RoadWMarked;
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

function drawRoadMarking(r, gx, gy, ts, tileType) {
  const { ctx } = r;
  
  // Draw arrow based on direction
  const arrowColor = '#FFFFFF';
  const arrowSize = ts * 0.3;
  
  ctx.fillStyle = arrowColor;
  ctx.beginPath();
  
  // Determine direction from tile type
  let direction = null;
  if (tileType === Tile.RoadNMarked) direction = 'N';
  else if (tileType === Tile.RoadEMarked) direction = 'E';
  else if (tileType === Tile.RoadSMarked) direction = 'S';
  else if (tileType === Tile.RoadWMarked) direction = 'W';
  
  if (!direction) return;
  
  const centerX = gx * ts + ts/2;
  const centerY = gy * ts + ts/2;
  
  // Draw arrow pointing in the correct direction
  ctx.save();
  ctx.translate(centerX, centerY);
  
  switch(direction) {
    case 'N':
      // Arrow pointing up (north)
      ctx.beginPath();
      ctx.moveTo(0, -arrowSize/2);
      ctx.lineTo(-arrowSize/4, -arrowSize/2 + arrowSize/3);
      ctx.lineTo(arrowSize/4, -arrowSize/2 + arrowSize/3);
      ctx.closePath();
      break;
      
    case 'E':
      // Arrow pointing right (east)
      ctx.rotate(Math.PI/2);
      ctx.beginPath();
      ctx.moveTo(0, -arrowSize/2);
      ctx.lineTo(-arrowSize/4, -arrowSize/2 + arrowSize/3);
      ctx.lineTo(arrowSize/4, -arrowSize/2 + arrowSize/3);
      ctx.closePath();
      break;
      
    case 'S':
      // Arrow pointing down (south)
      ctx.rotate(Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, -arrowSize/2);
      ctx.lineTo(-arrowSize/4, -arrowSize/2 + arrowSize/3);
      ctx.lineTo(arrowSize/4, -arrowSize/2 + arrowSize/3);
      ctx.closePath();
      break;
      
    case 'W':
      // Arrow pointing left (west)
      ctx.rotate(-Math.PI/2);
      ctx.beginPath();
      ctx.moveTo(0, -arrowSize/2);
      ctx.lineTo(-arrowSize/4, -arrowSize/2 + arrowSize/3);
      ctx.lineTo(arrowSize/4, -arrowSize/2 + arrowSize/3);
      ctx.closePath();
      break;
  }
  
  ctx.fill();
  ctx.restore();
}