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
    drawIntersectionArrows(r, gx, gy, ts, t, state);
    
    // Draw dotted lines for straight roads
    drawDottedLines(r, gx, gy, ts, t, state);
    
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
  ctx.fillStyle = TileColor[tileType];
  
  const stripeWidth = ts * 0.15;
  const gapWidth = stripeWidth;
  
  switch(tileType) {
    case Tile.ZebraCrossingN:
    case Tile.ZebraCrossingS:
      // Vertical stripes for N/S roads
      for (let i = 0; i < 5; i++) {
        const x = gx*ts + (i * (stripeWidth + gapWidth)) + gapWidth/2;
        if (x + stripeWidth <= (gx+1)*ts) {
          ctx.fillRect(x, gy*ts, stripeWidth, ts);
        }
      }
      break;
      
    case Tile.ZebraCrossingE:
    case Tile.ZebraCrossingW:
      // Horizontal stripes for E/W roads
      for (let i = 0; i < 5; i++) {
        const y = gy*ts + (i * (stripeWidth + gapWidth)) + gapWidth/2;
        if (y + stripeWidth <= (gy+1)*ts) {
          ctx.fillRect(gx*ts, y, ts, stripeWidth);
        }
      }
      break;
  }
}

function drawDottedLines(r, gx, gy, ts, tileType, state) {
  const { ctx } = r;
  const map = state.world.map;
  
  // Only draw on road tiles
  if (![Tile.RoadN, Tile.RoadE, Tile.RoadS, Tile.RoadW].includes(tileType)) return;
  
  // Check if this is a straight road outside intersections
  if (!isStraightRoad(gx, gy, map)) return;
  
  ctx.fillStyle = '#FFFFFF'; // White dashed lines
  
  switch(tileType) {
    case Tile.RoadN:
    case Tile.RoadS:
      // Vertical dashed line between lanes
      drawVerticalDottedLine(r, gx, gy, ts);
      break;
    case Tile.RoadE:
    case Tile.RoadW:
      // Horizontal dashed line between lanes
      drawHorizontalDottedLine(r, gx, gy, ts);
      break;
  }
}

function isStraightRoad(x, y, map) {
  // Check if this road tile is part of a straight road outside intersections
  const t = map.tiles[y][x];
  if (![Tile.RoadN, Tile.RoadE, Tile.RoadS, Tile.RoadW].includes(t)) return false;
  
  // Check adjacent tiles to determine if it's a straight road
  const up = y > 0 ? map.tiles[y-1][x] : -1;
  const down = y < map.height - 1 ? map.tiles[y+1][x] : -1;
  const left = x > 0 ? map.tiles[y][x-1] : -1;
  const right = x < map.width - 1 ? map.tiles[y][x+1] : -1;
  
  // Check if adjacent to footpath or median
  const adjacentToFootpath = [left, right, up, down].includes(Tile.Footpath);
  const adjacentToMedian = [left, right, up, down].includes(Tile.Median);
  
  return adjacentToFootpath || adjacentToMedian;
}

function drawVerticalDottedLine(r, gx, gy, ts) {
  const { ctx } = r;
  const dashLength = ts * 0.3;
  const gapLength = ts * 0.2;
  const lineWidth = ts * 0.05;
  
  ctx.fillStyle = '#FFFFFF';
  
  for (let y = gy * ts; y < (gy + 1) * ts; y += dashLength + gapLength) {
    ctx.fillRect(gx * ts + ts/2 - lineWidth/2, y, lineWidth, dashLength);
  }
}

function drawHorizontalDottedLine(r, gx, gy, ts) {
  const { ctx } = r;
  const dashLength = ts * 0.3;
  const gapLength = ts * 0.2;
  const lineWidth = ts * 0.05;
  
  ctx.fillStyle = '#FFFFFF';
  
  for (let x = gx * ts; x < (gx + 1) * ts; x += dashLength + gapLength) {
    ctx.fillRect(x, gy * ts + ts/2 - lineWidth/2, dashLength, lineWidth);
  }
}

function drawIntersectionArrows(r, gx, gy, ts, tileType, state) {
  const { ctx } = r;
  const map = state.world.map;
  
  // Only draw arrows for uni-directional lanes in intersections
  const uniDirectionalTiles = [Tile.RoadN, Tile.RoadE, Tile.RoadS, Tile.RoadW];
  
  if (!uniDirectionalTiles.includes(tileType)) return;
  
  // Check if this is part of an intersection
  if (!isInIntersection(gx, gy, map)) return;
  
  // Check if this is adjacent to roundabout center
  if (!isAdjacentToRoundabout(gx, gy, map)) return;
  
  ctx.fillStyle = TileColor[Tile.ZebraCrossingN]; // Use zebra crossing color
  ctx.strokeStyle = TileColor[Tile.ZebraCrossingN];
  ctx.lineWidth = 2;
  
  // Calculate arrow direction based on tile type
  const cx = gx * ts + ts/2;
  const cy = gy * ts + ts/2;
  const arrowLength = ts * 0.4;
  const arrowHeadSize = ts * 0.1;
  
  ctx.save();
  ctx.translate(cx, cy);
  
  switch(tileType) {
    case Tile.RoadN:
      // Arrow pointing North
      ctx.beginPath();
      ctx.moveTo(0, arrowLength/2);
      ctx.lineTo(0, -arrowLength/2);
      ctx.moveTo(-arrowHeadSize, -arrowLength/2 + arrowHeadSize);
      ctx.lineTo(0, -arrowLength/2);
      ctx.lineTo(arrowHeadSize, -arrowLength/2 + arrowHeadSize);
      ctx.stroke();
      break;
    case Tile.RoadS:
      // Arrow pointing South
      ctx.beginPath();
      ctx.moveTo(0, -arrowLength/2);
      ctx.lineTo(0, arrowLength/2);
      ctx.moveTo(-arrowHeadSize, arrowLength/2 - arrowHeadSize);
      ctx.lineTo(0, arrowLength/2);
      ctx.lineTo(arrowHeadSize, arrowLength/2 - arrowHeadSize);
      ctx.stroke();
      break;
    case Tile.RoadE:
      // Arrow pointing East
      ctx.beginPath();
      ctx.moveTo(-arrowLength/2, 0);
      ctx.lineTo(arrowLength/2, 0);
      ctx.moveTo(arrowLength/2 - arrowHeadSize, -arrowHeadSize);
      ctx.lineTo(arrowLength/2, 0);
      ctx.lineTo(arrowLength/2 - arrowHeadSize, arrowHeadSize);
      ctx.stroke();
      break;
    case Tile.RoadW:
      // Arrow pointing West
      ctx.beginPath();
      ctx.moveTo(arrowLength/2, 0);
      ctx.lineTo(-arrowLength/2, 0);
      ctx.moveTo(-arrowLength/2 + arrowHeadSize, -arrowHeadSize);
      ctx.lineTo(-arrowLength/2, 0);
      ctx.lineTo(-arrowLength/2 + arrowHeadSize, arrowHeadSize);
      ctx.stroke();
      break;
  }
  
  ctx.restore();
}

function isInIntersection(x, y, map) {
  // Check if this tile is within 2 tiles of a roundabout center
  const checkRadius = 2;
  for (let dy = -checkRadius; dy <= checkRadius; dy++) {
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      const checkX = x + dx;
      const checkY = y + dy;
      if (checkX >= 0 && checkX < map.width && 
          checkY >= 0 && checkY < map.height) {
        if (map.tiles[checkY][checkX] === Tile.RoundaboutCenter) {
          return true;
        }
      }
    }
  }
  return false;
}

function isAdjacentToRoundabout(x, y, map) {
  // Check if this tile is adjacent to a roundabout center
  const directions = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]];
  for (const [dx, dy] of directions) {
    const checkX = x + dx;
    const checkY = y + dy;
    if (checkX >= 0 && checkX < map.width && 
        checkY >= 0 && checkY < map.height) {
      if (map.tiles[checkY][checkX] === Tile.RoundaboutCenter) {
        return true;
      }
    }
  }
  return false;
}