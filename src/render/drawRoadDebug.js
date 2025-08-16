import { roadDir } from '../map/TileTypes.js';

export function drawRoadDebug(r, state){
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const roads = map.roads;
  const z = state.camera.zoom || 1;
  const wTiles = Math.ceil(canvas.width/(ts*z))+2, hTiles = Math.ceil(canvas.height/(ts*z))+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#111'; ctx.fillStyle = '#111';
  
  for (let y=0; y<hTiles; y++) for (let x=0; x<wTiles; x++){
    const gx = sx + x, gy = sy + y; 
    if (gy<0||gx<0||gy>=map.height||gx>=map.width) continue;
    const t = map.tiles[gy][gx];
    const d = roadDir(t); 
    if (!d) continue;
    
    // Check if this is an intersection tile with dual direction
    const isIntersectionTile = isIntersectionPosition(gx, gy, map);
    const hasDualDirection = isIntersectionTile && isDualDirectionTile(gx, gy, map);
    
    const node = roads.byKey.get(`${gx},${gy},${d}`);
    const cxp = gx*ts+ts/2, cyp = gy*ts+ts/2;
    
    if (hasDualDirection) {
      // Draw diagonal arrow for dual-direction tiles
      const dualDir = getDualDirection(gx, gy, map);
      const ang = dirToAngle(dualDir);
      drawAngleArrow(ctx, cxp, cyp, ang, ts*0.28);
    } else {
      const outs = node.next || [];
      if (outs.length === 2) {
        const v1 = { x:(outs[0].x - gx), y:(outs[0].y - gy) }, v2 = { x:(outs[1].x - gx), y:(outs[1].y - gy) };
        const ax = v1.x + v2.x, ay = v1.y + v2.y; const ang = Math.atan2(ay, ax);
        drawAngleArrow(ctx, cxp, cyp, ang, ts*0.28);
      } else if (outs.length >= 1) {
        const v = outs[0]; const ang = Math.atan2(v.y - gy, v.x - gx);
        drawAngleArrow(ctx, cxp, cyp, ang, ts*0.28);
      } else {
        drawDirArrow(ctx, cxp, cyp, d, ts*0.28);
      }
    }
  }
  ctx.restore();
}

function dirToAngle(dir) {
    return dir==='N'? -Math.PI/2 : 
           dir==='E'? 0 : 
           dir==='S'? Math.PI/2 : 
           dir==='W'? Math.PI : 
           dir==='NE'? -Math.PI/4 : 
           dir==='NW'? -3*Math.PI/4 : 
           dir==='SE'? Math.PI/4 : 
           dir==='SW'? 3*Math.PI/4 : 0;
}

function drawDirArrow(ctx, cx, cy, dir, len){
  const ang = dirToAngle(dir);
  drawAngleArrow(ctx, cx, cy, ang, len);
}

function drawAngleArrow(ctx, cx, cy, ang, len){
  const tx = cx + Math.cos(ang)*len, ty = cy + Math.sin(ang)*len;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
  const ah = 6, a1 = ang + 2.6, a2 = ang - 2.6;
  ctx.beginPath(); ctx.moveTo(tx, ty);
  ctx.lineTo(tx + Math.cos(a1)*ah, ty + Math.sin(a1)*ah);
  ctx.lineTo(tx + Math.cos(a2)*ah, ty + Math.sin(a2)*ah);
  ctx.closePath(); ctx.fill();
}

// Add helper functions for intersection detection:
function isIntersectionPosition(x, y, map) {
  // Check if this tile is part of an intersection
  const blockSize = 12; // W + MED
  const mapOffset = 2;
  const relX = (x - mapOffset) % blockSize;
  const relY = (y - mapOffset) % blockSize;
  return relX === 0 && relY === 0;
}

function isDualDirectionTile(x, y, map) {
  // Check if this tile has dual direction in roundabout
  const blockSize = 12;
  const mapOffset = 2;
  const relX = (x - mapOffset) % blockSize;
  const relY = (y - mapOffset) % blockSize;
  
  // Check if in intersection quadrant
  return (relX >= -2 && relX <= 2 && relY >= -2 && relY <= 2);
}

function getDualDirection(x, y, map) {
  // Determine the dual direction based on quadrant
  const blockSize = 12;
  const mapOffset = 2;
  const relX = (x - mapOffset) % blockSize;
  const relY = (y - mapOffset) % blockSize;
  
  if (relX < 0 && relY < 0) return 'NW'; // Top-left
  if (relX > 0 && relY < 0) return 'NE'; // Top-right
  if (relX < 0 && relY > 0) return 'SW'; // Bottom-left
  if (relX > 0 && relY > 0) return 'SE'; // Bottom-right
  
  return 'N'; // Default fallback
}