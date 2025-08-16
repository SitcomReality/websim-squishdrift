export function resolveDynamicStatic(a,contact,restitution=0.3){
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

