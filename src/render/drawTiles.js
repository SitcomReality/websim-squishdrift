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
      
      // Add dotted road markings for straight roads
      if (isStraightRoad(t)) {
        drawDottedRoadMarkings(r, gx, gy, ts, t);
      }
      
      // Draw intersection arrows for uni-directional lanes
      drawIntersectionArrows(r, gx, gy, ts, t, state);
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

function isStraightRoad(tile) {
  return tile === Tile.RoadN || tile === Tile.RoadE || tile === Tile.RoadS || tile === Tile.RoadW;
}

function drawDottedRoadMarkings(r, gx, gy, ts, tileType) {
  const { ctx } = r;
  
  // Set color for road markings (same as zebra crossings)
  ctx.fillStyle = TileColor[Tile.ZebraCrossingN];
  
  const segmentLength = ts * 0.15; // Length of each dash
  const gapLength = ts * 0.1; // Gap between dashes
  const lineWidth = ts * 0.05; // Width of the marking line
  
  switch(tileType) {
    case Tile.RoadN:
    case Tile.RoadS:
      // Vertical road - draw vertical dashed line in center
      for (let y = 0; y < ts; y += segmentLength + gapLength) {
        const startY = gy * ts + y;
        if (startY + segmentLength <= (gy + 1) * ts) {
          ctx.fillRect(gx * ts + ts/2 - lineWidth/2, startY, lineWidth, segmentLength);
        }
      }
      break;
      
    case Tile.RoadE:
    case Tile.RoadW:
      // Horizontal road - draw horizontal dashed line in center
      for (let x = 0; x < ts; x += segmentLength + gapLength) {
        const startX = gx * ts + x;
        if (startX + segmentLength <= (gx + 1) * ts) {
          ctx.fillRect(startX, gy * ts + ts/2 - lineWidth/2, segmentLength, lineWidth);
        }
      }
      break;
  }
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

function drawIntersectionArrows(r, gx, gy, ts, tileType, state) {
  const { ctx } = r;
  
  // Only draw arrows for uni-directional road tiles in intersections
  const uniDirectionalTiles = [Tile.RoadN, Tile.RoadE, Tile.RoadS, Tile.RoadW];
  
  if (!uniDirectionalTiles.includes(tileType)) return;
  
  // Check if this is part of an intersection
  const map = state.world.map;
  let isInIntersection = false;
  let roundaboutCenter = null;
  
  // Check for roundabout center within 2 tiles
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const checkX = gx + dx;
      const checkY = gy + dy;
      
      if (checkX >= 0 && checkX < map.width && 
          checkY >= 0 && checkY < map.height) {
        if (map.tiles[checkY][checkX] === Tile.RoundaboutCenter) {
          isInIntersection = true;
          roundaboutCenter = { x: checkX, y: checkY };
          break;
        }
      }
    }
  }
  
  if (!isInIntersection || !roundaboutCenter) return;
  
  // Calculate Manhattan distance to roundabout center
  const distance = Math.abs(gx - roundaboutCenter.x) + Math.abs(gy - roundaboutCenter.y);
  
  // Only draw arrows on tiles exactly 1 tile away from center (forming the plus shape)
  if (distance !== 1) return;
  
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
  const arrowLength = ts * 0.3;
  const arrowHeadSize = ts * 0.08;
  
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