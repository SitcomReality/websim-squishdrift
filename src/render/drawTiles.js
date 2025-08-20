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

    // Draw dashed center line for straight non-intersection roads adjacent to footpath/median
    drawDashedCenterLineIfNeeded(r, gx, gy, ts, t, map);
    
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

/* New: draw dashed center line on straight road tiles outside intersections */
function drawDashedCenterLineIfNeeded(r, gx, gy, ts, tileType, map) {
  const { ctx } = r;
  // Only consider road tiles (uni-directional types)
  const verticalTypes = [Tile.RoadN, Tile.RoadS];
  const horizontalTypes = [Tile.RoadE, Tile.RoadW];
  const isVertical = verticalTypes.includes(tileType);
  const isHorizontal = horizontalTypes.includes(tileType);
  if (!isVertical && !isHorizontal) return;

  // Determine if tile is part of an intersection: simple heuristic - nearby roundabout center or zebra crossing
  const nearbyIsIntersection = (() => {
    for (let dy=-2; dy<=2; dy++) for (let dx=-2; dx<=2; dx++) {
      const nx = gx+dx, ny = gy+dy;
      if (nx<0||ny<0||nx>=map.width||ny>=map.height) continue;
      const t = map.tiles[ny][nx];
      if (t === Tile.RoundaboutCenter) return true;
      if (t >= Tile.ZebraCrossingN && t <= Tile.ZebraCrossingW) return true;
    }
    return false;
  })();
  if (nearbyIsIntersection) return;

  // Only draw on straight road segments that are adjacent to footpath or median (outside intersections)
  const adjFootOrMed = (() => {
    const left = (gx-1>=0) ? map.tiles[gy][gx-1] : null;
    const right = (gx+1<map.width) ? map.tiles[gy][gx+1] : null;
    const up = (gy-1>=0) ? map.tiles[gy-1][gx] : null;
    const down = (gy+1<map.height) ? map.tiles[gy+1][gx] : null;
    const isAdj = (v)=> v === Tile.Footpath || v === Tile.Median;
    if (isVertical) return isAdj(left) || isAdj(right);
    if (isHorizontal) return isAdj(up) || isAdj(down);
    return false;
  })();
  if (!adjFootOrMed) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = Math.max(1, Math.floor(ts * 0.06));
  ctx.setLineDash([Math.max(2, Math.floor(ts * 0.06)), Math.max(2, Math.floor(ts * 0.06))]);

  // Draw short dashes centered on tile so adjacent tiles render continuous dashed stripe.
  if (isVertical) {
    // vertical dashes centered horizontally in tile (will line up when drawn on both lane tiles)
    const cx = gx * ts + ts * 0.5;
    // draw a short vertical segment in the middle of the tile
    const segH = ts * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, gy * ts + (ts - segH) / 2);
    ctx.lineTo(cx, gy * ts + (ts + segH) / 2);
    ctx.stroke();
  } else if (isHorizontal) {
    // horizontal dashes centered vertically in tile
    const cy = gy * ts + ts * 0.5;
    const segW = ts * 0.35;
    ctx.beginPath();
    ctx.moveTo(gx * ts + (ts - segW) / 2, cy);
    ctx.lineTo(gx * ts + (ts + segW) / 2, cy);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}