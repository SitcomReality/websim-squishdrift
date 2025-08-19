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
    
    // Only draw arrows for uni-directional lanes in intersections
    drawIntersectionDirectionArrows(r, gx, gy, ts, t, state);
    
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

function drawIntersectionDirectionArrows(r, gx, gy, ts, tileType, state) {
  const { ctx } = r;
  
  // Only process uni-directional road tiles
  const uniDirectionalTiles = [Tile.RoadN, Tile.RoadE, Tile.RoadS, Tile.RoadW];
  if (!uniDirectionalTiles.includes(tileType)) return;
  
  // Check if this tile is part of an intersection
  const map = state.world.map;
  const checkRadius = 3; // Check for roundabout centers within 3 tiles
  
  let isInIntersection = false;
  let centerX = -1, centerY = -1;
  
  // Look for a roundabout center nearby
  for (let dy = -checkRadius; dy <= checkRadius; dy++) {
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      const checkX = gx + dx;
      const checkY = gy + dy;
      
      if (checkX >= 0 && checkX < map.width && 
          checkY >= 0 && checkY < map.height &&
          map.tiles[checkY][checkX] === Tile.RoundaboutCenter) {
        isInIntersection = true;
        centerX = checkX;
        centerY = checkY;
        break;
      }
    }
  }
  
  if (!isInIntersection) return;
  
  // Determine if this tile should have an arrow
  // Calculate distance from roundabout center
  const distanceFromCenter = Math.max(Math.abs(gx - centerX), Math.abs(gy - centerY));
  
  // Only add arrows to tiles exactly 2 tiles away from center (the 8 uni-directional lanes)
  if (distanceFromCenter !== 2) return;
  
  // Determine direction based on tile type
  let direction = null;
  switch(tileType) {
    case Tile.RoadN: direction = 'N'; break;
    case Tile.RoadE: direction = 'E'; break;
    case Tile.RoadS: direction = 'S'; break;
    case Tile.RoadW: direction = 'W'; break;
  }
  
  if (!direction) return;
  
  // Draw arrow
  const cx = gx * ts + ts/2;
  const cy = gy * ts + ts/2;
  
  ctx.fillStyle = TileColor[Tile.ZebraCrossingN];
  ctx.strokeStyle = TileColor[Tile.ZebraCrossingN];
  ctx.lineWidth = 2;
  
  const arrowLength = ts * 0.4;
  const arrowHeadSize = ts * 0.1;
  
  ctx.save();
  ctx.translate(cx, cy);
  
  // Draw arrow pointing in the correct direction
  drawArrow(ctx, direction, arrowLength, arrowHeadSize);
  
  ctx.restore();
}

function drawArrow(ctx, direction, length, headSize) {
  switch(direction) {
    case 'N':
      ctx.beginPath();
      ctx.moveTo(0, length/2);
      ctx.lineTo(0, -length/2);
      ctx.moveTo(-headSize, -length/2 + headSize);
      ctx.lineTo(0, -length/2);
      ctx.lineTo(headSize, -length/2 + headSize);
      ctx.stroke();
      break;
    case 'S':
      ctx.beginPath();
      ctx.moveTo(0, -length/2);
      ctx.lineTo(0, length/2);
      ctx.moveTo(-headSize, length/2 - headSize);
      ctx.lineTo(0, length/2);
      ctx.lineTo(headSize, length/2 - headSize);
      ctx.stroke();
      break;
    case 'E':
      ctx.beginPath();
      ctx.moveTo(-length/2, 0);
      ctx.lineTo(length/2, 0);
      ctx.moveTo(length/2 - headSize, -headSize);
      ctx.lineTo(length/2, 0);
      ctx.lineTo(length/2 - headSize, headSize);
      ctx.stroke();
      break;
    case 'W':
      ctx.beginPath();
      ctx.moveTo(length/2, 0);
      ctx.lineTo(-length/2, 0);
      ctx.moveTo(-length/2 + headSize, -headSize);
      ctx.lineTo(-length/2, 0);
      ctx.lineTo(-length/2 + headSize, headSize);
      ctx.stroke();
      break;
  }
}