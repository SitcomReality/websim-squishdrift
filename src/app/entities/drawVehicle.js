export function drawVehicle(r, state, v){
  const { ctx } = r, ts = state.world.tileSize, a = v.t;
  const x = (v.node.x + 0.5) * (1 - a) + (v.next.x + 0.5) * a;
  const y = (v.node.y + 0.5) * (1 - a) + (v.next.y + 0.5) * a;
  v.pos.x = x; v.pos.y = y;
  const dir = v.next.dir || v.node.dir;
  const ang = dir==='N'?-Math.PI/2:dir==='E'?0:dir==='S'?Math.PI/2:Math.PI;
  ctx.save(); ctx.translate(x*ts, y*ts); ctx.rotate(ang);
  ctx.fillStyle = '#8A2BE2'; ctx.fillRect(-ts*0.45, -ts*0.25, ts*0.9, ts*0.5);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(ts*0.15, -2, ts*0.2, 4);
  ctx.restore();
}

