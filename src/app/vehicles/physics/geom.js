export function entityOBB(e, fallback={w:0.9,h:0.5}) {
  const w = e.hitboxW ?? fallback.w, h = e.hitboxH ?? fallback.h, hw=w*0.5, hh=h*0.5;
  const rot = e.rot || 0, c=Math.cos(rot), s=Math.sin(rot);
  return { cx:e.pos.x, cy:e.pos.y, axes:[{x:c,y:s},{x:-s,y:c}], ext:[hw,hh] };
}
export function aabbForTile(x,y){ return { cx:x+0.5, cy:y+0.5, axes:[{x:1,y:0},{x:0,y:1}], ext:[0.5,0.5] }; }
// new: A tighter AABB for tree trunks (trunk occupies a small square centered in tile)
export function aabbForTrunk(x, y, trunkSize = 0.3) {
  const half = trunkSize / 2;
  return { cx: x + 0.5, cy: y + 0.5, axes: [{ x: 1, y: 0 }, { x: 0, y: 1 }], ext: [half, half] };
}
function projInterval(obb, axis){
  const corners=[[1,1],[1,-1],[-1,1],[-1,-1]];
  let min=Infinity,max=-Infinity;
  for(const [sx,sy] of corners){
    const vx=obb.axes[0].x*obb.ext[0]*sx + obb.axes[1].x*obb.ext[1]*sy;
    const vy=obb.axes[0].y*obb.ext[0]*sx + obb.axes[1].y*obb.ext[1]*sy;
    const px=obb.cx+vx, py=obb.cy+vy, dot=px*axis.x+py*axis.y;
    if (dot<min) min=dot; if (dot>max) max=dot;
  }
  return {min,max};
}
function overlapOnAxis(a,b,axis){
  const na=normalize(axis); const ia=projInterval(a,na), ib=projInterval(b,na);
  const overlap=Math.min(ia.max, ib.max) - Math.max(ia.min, ib.min);
  return {overlap, axis:na};
}
function normalize(v){ const l=Math.hypot(v.x,v.y)||1; return {x:v.x/l,y:v.y/l}; }
export function obbOverlap(a,b){
  const axes=[a.axes[0],a.axes[1],b.axes[0],b.axes[1]];
  let minPen=Infinity, best=null;
  for(const ax of axes){
    const {overlap,axis}=overlapOnAxis(a,b,ax);
    if (overlap<=0) return null;
    if (overlap<minPen){ minPen=overlap; best=axis; }
  }
  const dir={x:b.cx-a.cx,y:b.cy-a.cy};
  if (dir.x*best.x + dir.y*best.y < 0) best={x:-best.x,y:-best.y};
  return { normal: best, depth: minPen };
}
export function resolveDynamicDynamic(a,b,contact,restitution=0.8){
  const invMassA = a.mass>0 ? 1/a.mass : 0, invMassB = b.mass>0 ? 1/b.mass : 0;
  const totalInv = invMassA + invMassB || 1;
  // positional correction
  const corr = contact.depth / totalInv;
  a.pos.x -= contact.normal.x * corr * invMassA;
  a.pos.y -= contact.normal.y * corr * invMassA;
  b.pos.x += contact.normal.x * corr * invMassB;
  b.pos.y += contact.normal.y * corr * invMassB;
  // velocity impulse
  a.vel = a.vel || {x:0,y:0}; b.vel = b.vel || {x:0,y:0};
  const rvx = b.vel.x - a.vel.x, rvy = b.vel.y - a.vel.y;
  const velAlongN = rvx*contact.normal.x + rvy*contact.normal.y;
  if (velAlongN > 0) return;
  const j = -(1+restitution) * velAlongN / totalInv;
  const ix = contact.normal.x * j, iy = contact.normal.y * j;
  a.vel.x -= ix * invMassA; a.vel.y -= iy * invMassA;
  b.vel.x += ix * invMassB; b.vel.y += iy * invMassB;
}
export function resolveDynamicStatic(a,contact,restitution=0.8){
  const corr = contact.depth;
  a.pos.x -= contact.normal.x * corr;
  a.pos.y -= contact.normal.y * corr;
  a.vel = a.vel || {x:0,y:0};
  const vN = a.vel.x*contact.normal.x + a.vel.y*contact.normal.y;
  if (vN > 0) return;
  const bounce = -(1+restitution) * vN;
  a.vel.x += contact.normal.x * bounce;
  a.vel.y += contact.normal.y * bounce;
}