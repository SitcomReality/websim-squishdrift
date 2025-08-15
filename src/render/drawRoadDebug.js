import { roadDir } from '../map/TileTypes.js';

export function drawRoadDebug(r, state){
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const roads = map.roads;
  const z = state.camera.zoom || 1;
  const wTiles = Math.ceil(canvas.width/(ts*z))+2, hTiles = Math.ceil(canvas.height/(ts*z))+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#111'; ctx.fillStyle = '#111';
  for (let y=0; y<hTiles; y++) for (let x=0; x<wTiles; x++){
    const gx = sx + x, gy = sy + y; if (gy<0||gx<0||gy>=map.height||gx>=map.width) continue;
    const d = roadDir(map.tiles[gy][gx]); if (!d) continue;
    const node = roads.byKey.get(`${gx},${gy},${d}`); if (!node) { drawDirArrow(ctx, gx*ts+ts/2, gy*ts+ts/2, d, ts*0.28); continue; }
    const cxp = gx*ts+ts/2, cyp = gy*ts+ts/2;
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
  ctx.restore();
}

function dirToAngle(dir) {
    return dir==='N'? -Math.PI/2 : dir==='E'? 0 : dir==='S'? Math.PI/2 : Math.PI;
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