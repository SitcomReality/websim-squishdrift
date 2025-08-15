import { roadDir } from '../map/TileTypes.js';

export function drawRoadDebug(r, state){
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const wTiles = Math.ceil(canvas.width/ts)+2, hTiles = Math.ceil(canvas.height/ts)+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#111'; ctx.fillStyle = '#111';
  for (let y=0; y<hTiles; y++) for (let x=0; x<wTiles; x++){
    const gx = sx + x, gy = sy + y; if (gy<0||gx<0||gy>=map.height||gx>=map.width) continue;
    const d = roadDir(map.tiles[gy][gx]); if (d){ drawDirArrow(ctx, gx*ts+ts/2, gy*ts+ts/2, d, ts*0.28); }
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

