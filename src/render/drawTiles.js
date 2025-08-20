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

function drawIntersectionArrows(r, gx, gy, ts, tileType, state) {
  const { ctx } = r;
  
  // Only draw arrows for specific uni-directional road tiles in intersections
  const uniDirectionalTiles = [Tile.RoadN, Tile.RoadE, Tile.RoadS, Tile.RoadW];
  
  if (!uniDirectionalTiles.includes(tileType)) return;
  
  // Check if this is part of an intersection by checking for roundabout center
  const map = state.world.map;
  
  // Check for a roundabout center within 2 tiles
  let isInIntersection = false;
  const checkRadius = 2;
  
  for (let dy = -checkRadius; dy <= checkRadius; dy++) {
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      const checkX = gx + dx;
      const checkY = gy + dy;
      
      if (checkX >= 0 && checkX < map.width && 
          checkY >= 0 && checkY < map.height) {
        if (map.tiles[checkY][checkX] === Tile.RoundaboutCenter) {
          isInIntersection = true;
          break;
        }
      }
    }
  }
  
  if (!isInIntersection) return;
  
  // Calculate Manhattan distance to nearest roundabout center
  let minDistance = Infinity;
  for (let dy = -checkRadius; dy <= checkRadius; dy++) {
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      const checkX = gx + dx;
      const checkY = gy + dy;
      
      if (checkX >= 0 && checkX < map.width && 
          checkY >= 0 && checkY < map.height) {
        if (map.tiles[checkY][checkX] === Tile.RoundaboutCenter) {
          const distance = Math.abs(dx) + Math.abs(dy);
          minDistance = Math.min(minDistance, distance);
        }
      }
    }
  }
  
  // Only draw arrows on tiles that are adjacent to the roundabout center
  // This ensures we only get the 8 tiles forming the plus shape
  if (minDistance !== 1) return;
  
  // Determine direction based on tile type
  let direction = null;
  switch(tileType) {
    case Tile.RoadN: direction = 'N'; break;
    case Tile.RoadE: direction = 'E'; break;
    case Tile.RoadS: direction = 'S'; break;
    case Tile.RoadW: direction = 'W'; break;
  }
  
  if (!direction) return;
  
  const cx = gx * ts + ts/2;
  const cy = gy * ts + ts/2;
  
  // Use zebra crossing color for arrows
  ctx.fillStyle = TileColor[Tile.ZebraCrossingN];
  ctx.strokeStyle = TileColor[Tile.ZebraCrossingN];
  ctx.lineWidth = 2;
  
  // Draw arrow based on direction
  const arrowLength = ts * 0.4;
  const arrowHeadSize = ts * 0.1;
  
  ctx.save();
  ctx.translate(cx, cy);
  
  switch(direction) {
    case 'N':
      ctx.beginPath();
      ctx.moveTo(0, arrowLength/2);
      ctx.lineTo(0, -arrowLength/2);
      ctx.moveTo(-arrowHeadSize, -arrowLength/2 + arrowHeadSize);
      ctx.lineTo(0, -arrowLength/2);
      ctx.lineTo(arrowHeadSize, -arrowLength/2 + arrowHeadSize);
      ctx.stroke();
      break;
    case 'S':
      ctx.beginPath();
      ctx.moveTo(0, -arrowLength/2);
      ctx.lineTo(0, arrowLength/2);
      ctx.moveTo(-arrowHeadSize, arrowLength/2 - arrowHeadSize);
      ctx.lineTo(0, arrowLength/2);
      ctx.lineTo(arrowHeadSize, arrowLength/2 - arrowHeadSize);
      ctx.stroke();
      break;
    case 'E':
      ctx.beginPath();
      ctx.moveTo(-arrowLength/2, 0);
      ctx.lineTo(arrowLength/2, 0);
      ctx.moveTo(arrowLength/2 - arrowHeadSize, -arrowHeadSize);
      ctx.lineTo(arrowLength/2, 0);
      ctx.lineTo(arrowLength/2 - arrowHeadSize, arrowHeadSize);
      ctx.stroke();
      break;
    case 'W':
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

function drawDottedLines(r, gx, gy, ts, tileType, state) {
  const { ctx } = r;
  const map = state.world.map;
  
  // Only draw on road tiles in straight sections
  const roadTiles = [Tile.RoadN, Tile.RoadE, Tile.RoadS, Tile.RoadW];
  if (!roadTiles.includes(tileType)) return;
  
  // Check if this is in an intersection
  const isInIntersection = checkIntersection(gx, gy, map);
  if (isInIntersection) return;
  
  // Check if this is adjacent to footpath or median
  const isAdjacentToNonRoad = checkAdjacentToNonRoad(gx, gy, map);
  if (!isAdjacentToNonRoad) return;
  
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]); // Dotted line pattern
  
  const x = gx * ts;
  const y = gy * ts;
  
  switch(tileType) {
    case Tile.RoadN:
    case Tile.RoadS:
      // Vertical road - draw horizontal dotted line in middle
      ctx.beginPath();
      ctx.moveTo(x + ts * 0.25, y + ts * 0.5);
      ctx.lineTo(x + ts * 0.75, y + ts * 0.5);
      ctx.stroke();
      break;
      
    case Tile.RoadE:
    case Tile.RoadW:
      // Horizontal road - draw vertical dotted line in middle
      ctx.beginPath();
      ctx.moveTo(x + ts * 0.5, y + ts * 0.25);
      ctx.lineTo(x + ts * 0.5, y + ts * 0.75);
      ctx.stroke();
      break;
  }
  
  ctx.restore();
}

function checkIntersection(x, y, map) {
  const checkRadius = 3;
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

function checkAdjacentToNonRoad(x, y, map) {
  const nonRoadTiles = [Tile.Footpath, Tile.Median, Tile.Grass, Tile.Park, Tile.BuildingWall, Tile.BuildingFloor, Tile.Beach];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (const [dx, dy] of directions) {
    const checkX = x + dx;
    const checkY = y + dy;
    if (checkX >= 0 && checkX < map.width && 
        checkY >= 0 && checkY < map.height) {
      if (nonRoadTiles.includes(map.tiles[checkY][checkX])) {
        return true;
      }
    }
  }
  return false;
}