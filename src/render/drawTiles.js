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
      drawZebraCrossing(r, gx, gy, ts, t, map);
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
    
    if (t === Tile.BuildingWall) {
      r.ctx.fillStyle = 'rgba(0,0,0,0.2)';
      r.ctx.fillRect(gx*ts, gy*ts + ts*0.7, ts, ts*0.3);
    }
  }

  // Draw dashed lines on straight roads
  drawDashedLines(r, state);
}

function isZebraCrossing(tile) {
  return tile >= Tile.ZebraCrossingN && tile <= Tile.ZebraCrossingW;
}

function drawZebraCrossing(r, gx, gy, ts, tileType, map) {
  const { ctx } = r;
  
  // Base road color
  ctx.fillStyle = TileColor[Tile.RoadN];
  ctx.fillRect(gx*ts, gy*ts, ts, ts);
  
  // Zebra crossing stripes
  ctx.fillStyle = TileColor[tileType]; // Use the lighter grey for stripes
  
  const stripeWidth = ts * 0.15; // 15% of tile width
  const gapWidth = stripeWidth; // Equal gap between stripes
  const centerOffset = ts * 0.5; // Center of tile
  
  switch(tileType) {
    case Tile.ZebraCrossingN:
    case Tile.ZebraCrossingS:
      // Vertical stripes for N/S roads
      for (let i = 0; i < 5; i++) {
        // Adjusted positioning - half of previous magnitude
        const x = gx*ts + centerOffset - (1.25 * stripeWidth) + (i * (stripeWidth + gapWidth));
        if (x + stripeWidth <= (gx+1)*ts && x >= gx*ts) {
          ctx.fillRect(x, gy*ts, stripeWidth, ts);
        }
      }
      // Draw shared central vertical stripe if adjacent tile horizontally is also a N/S zebra
      if (map && gx+1 < map.width) {
        const right = map.tiles[gy][gx+1];
        if (right === Tile.ZebraCrossingN || right === Tile.ZebraCrossingS) {
          // Make the shared central vertical stripe centered on the tile boundary so it straddles both tiles
          const sharedX = (gx + 1) * ts - stripeWidth; // Corrected starting position
          ctx.fillRect(sharedX, gy * ts, stripeWidth * 2, ts);
        }
      }
      break;
      
    case Tile.ZebraCrossingE:
    case Tile.ZebraCrossingW:
      // Horizontal stripes for E/W roads
      for (let i = 0; i < 5; i++) {
        // Adjusted positioning - half of previous magnitude
        const y = gy*ts + centerOffset - (1.25 * stripeWidth) + (i * (stripeWidth + gapWidth));
        if (y + stripeWidth <= (gy+1)*ts && y >= gy*ts) {
          ctx.fillRect(gx*ts, y, ts, stripeWidth);
        }
      }
      // Draw shared central horizontal stripe if adjacent tile vertically is also an E/W zebra
      if (map && gy+1 < map.height) {
        const below = map.tiles[gy+1][gx];
        if (below === Tile.ZebraCrossingE || below === Tile.ZebraCrossingW) {
          // Make the shared central horizontal stripe centered on the tile boundary so it straddles both tiles
          const sharedY = (gy + 1) * ts - stripeWidth; // Corrected starting position
          ctx.fillRect(gx * ts, sharedY, ts, stripeWidth * 2);
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

function drawDashedLines(r, state) {
  const { ctx } = r, ts = state.world.tileSize, map = state.world.map;
  const z = state.camera.zoom || 1;
  const wTiles = Math.ceil(r.canvas.width/(ts*z))+2, hTiles = Math.ceil(r.canvas.height/(ts*z))+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]); // Changed from [6, 4] to [12, 8] for single longer dash
  
  // Check each tile for straight road sections
  for (let y = 0; y < hTiles; y++) {
    for (let x = 0; x < wTiles; x++) {
      const gx = sx + x, gy = sy + y;
      if (gy < 0 || gx < 0 || gy >= map.height || gx >= map.width) continue;
      
      const tile = map.tiles[gy][gx];
      
      // Only draw on road tiles adjacent to median strip
      if (tile === Tile.RoadE || tile === Tile.RoadW) {
        // Check if this tile is adjacent to median strip
        const isNextToMedian = (gy > 0 && map.tiles[gy-1][gx] === Tile.Median) || 
                              (gy < map.height-1 && map.tiles[gy+1][gx] === Tile.Median);
        
        if (isNextToMedian) {
          // Determine which side the median is on to position line correctly
          const medianIsAbove = gy > 0 && map.tiles[gy-1][gx] === Tile.Median;
          
          if (!isIntersectionArea(map, gx, gy)) {
            // Horizontal road, draw line on bottom edge if median is above, top if below
            const lineY = medianIsAbove ? (gy + 1) * ts : gy * ts;
            ctx.beginPath();
            ctx.moveTo(gx * ts + ts * 0.25, lineY); // Start 25% into tile
            ctx.lineTo((gx + 1) * ts - ts * 0.25, lineY); // End 25% before tile end
            ctx.stroke();
          }
        }
      }
      
      if (tile === Tile.RoadN || tile === Tile.RoadS) {
        // Check if this tile is adjacent to median strip
        const isNextToMedian = (gx > 0 && map.tiles[gy][gx-1] === Tile.Median) || 
                              (gx < map.width-1 && map.tiles[gy][gx+1] === Tile.Median);
        
        if (isNextToMedian) {
          // Determine which side the median is on to position line correctly
          const medianIsLeft = gx > 0 && map.tiles[gy][gx-1] === Tile.Median;
          
          if (!isIntersectionArea(map, gx, gy)) {
            // Vertical road, draw line on right edge if median is left, left if right
            const lineX = medianIsLeft ? (gx + 1) * ts : gx * ts;
            ctx.beginPath();
            ctx.moveTo(lineX, gy * ts + ts * 0.25); // Start 25% into tile
            ctx.lineTo(lineX, (gy + 1) * ts - ts * 0.25); // End 25% before tile end
            ctx.stroke();
          }
        }
      }
    }
  }
  
  ctx.restore();
}

function isIntersectionArea(map, x, y) {
  // Check if this tile is near an intersection (within 2 tiles of a roundabout center)
  const checkRadius = 2;
  
  for (let dy = -checkRadius; dy <= checkRadius; dy++) {
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      const checkX = x + dx;
      const checkY = y + dy;
      
      if (checkX >= 0 && checkX < map.width && 
          checkY >= 0 && checkY < map.height) {
        const tile = map.tiles[checkY][checkX];
        if (tile === Tile.RoundaboutCenter || tile === Tile.Intersection) {
          return true;
        }
      }
    }
  }
  
  return false;
}