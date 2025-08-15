import { roadDir } from '../map/TileTypes.js';

export function drawRoadDebug(r, state){
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const roads = map.roads;
  const wTiles = Math.ceil(canvas.width/ts)+2, hTiles = Math.ceil(canvas.height/ts)+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  const dirVec = { N:{x:0,y:-1}, E:{x:1,y:0}, S:{x:0,y:1}, W:{x:-1,y:0} };
  
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#111'; ctx.fillStyle = '#111';
  
  for (let y=0; y<hTiles; y++) for (let x=0; x<wTiles; x++){
    const gx = sx + x, gy = sy + y; 
    if (gy<0||gx<0||gy>=map.height||gx>=map.width) continue;
    
    // Check for multiple directions at intersections
    const t = map.tiles[gy][gx];
    const d = roadDir(t);
    if (!d) continue;
    
    const node = roads.byKey.get(`${gx},${gy},${d}`);
    if (!node) {
      drawDirArrow(ctx, gx*ts+ts/2, gy*ts+ts/2, d, ts*0.28);
      continue;
    }
    
    const outs = node.next || [];
    if (outs.length >= 2) {
      // Draw diagonal arrow for multi-direction choices
      const angles = outs.map(o => Math.atan2(o.y - gy, o.x - gx));
      const avgAngle = angles.reduce((a,b) => a+b, 0) / angles.length;
      drawAngleArrow(ctx, gx*ts+ts/2, gy*ts+ts/2, avgAngle, ts*0.28);
    } else if (outs.length === 1) {
      const v = outs[0];
      const ang = Math.atan2(v.y - gy, v.x - gx);
      drawAngleArrow(ctx, gx*ts+ts/2, gy*ts+ts/2, ang, ts*0.28);
    } else {
      drawDirArrow(ctx, gx*ts+ts/2, gy*ts+ts/2, d, ts*0.28);
    }
  }
  ctx.restore();
}

function drawDirArrow(ctx, cx, cy, dir, len){
  const ang = dir==='N'? -Math.PI/2 : dir==='E'? 0 : dir==='S'? Math.PI/2 : Math.PI;
  const tx = cx + Math.cos(ang)*len, ty = cy + Math.sin(ang)*len;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
  const ah = 6, a1 = ang + 2.6, a2 = ang - 2.6;
  ctx.beginPath(); ctx.moveTo(tx, ty);
  ctx.lineTo(tx + Math.cos(a1)*ah, ty + Math.sin(a1)*ah);
  ctx.lineTo(tx + Math.cos(a2)*ah, ty + Math.sin(a2)*ah);
  ctx.closePath(); ctx.fill();
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