import { entityOBB } from '../../physics/geom.js';

export function smoothCollisionNormal(normal, objA, objB) {
  const centerToCenter = { x: objB.pos.x - objA.pos.x, y: objB.pos.y - objA.pos.y };
  const len = Math.hypot(centerToCenter.x, centerToCenter.y) || 1;
  const nx = centerToCenter.x / len, ny = centerToCenter.y / len;
  const blend = 0.8;
  return { x: normal.x * blend + nx * (1 - blend), y: normal.y * blend + ny * (1 - blend) };
}
export function applyCollisionDamping(a, b) {
  if (typeof a.angularVelocity === 'number') a.angularVelocity *= 0.7;
  if (typeof b?.angularVelocity === 'number') b.angularVelocity *= 0.7;
  let damping = 0.85;
  if (b && a?.vel && b?.vel) {
    const rel = Math.hypot((a.vel.x||0)-(b.vel.x||0),(a.vel.y||0)-(b.vel.y||0));
    const ang = x=>((x%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
    const hDiff = (a.rot!=null && b.rot!=null) ? Math.abs(((ang(a.rot)-ang(b.rot)+Math.PI)%(2*Math.PI))-Math.PI) : Math.PI;
    if (rel < 0.6 && hDiff < 0.5) damping = 0.97;
  }
  if (a.vel) { a.vel.x *= damping; a.vel.y *= damping; }
  if (b?.vel) { b.vel.x *= damping; b.vel.y *= damping; }
}
export function applyBuildingDamping(v) {
  if (v.vel) { v.vel.x *= 0.5; v.vel.y *= 0.5; }
  if (typeof v.angularVelocity === 'number') v.angularVelocity *= 0.6;
}
export function getVelocityDirection(e) {
  const s = Math.hypot(e.vel.x, e.vel.y);
  return s < 0.01 ? { x: 0, y: 0 } : { x: e.vel.x / s, y: e.vel.y / s };
}
export function calculateBounceNormal(vDir, n) {
  if (!vDir.x && !vDir.y) return n;
  const dot = vDir.x * n.x + vDir.y * n.y;
  const rx = vDir.x - 2 * dot * n.x, ry = vDir.y - 2 * dot * n.y;
  const l = Math.hypot(rx, ry) || 1;
  return { x: rx / l, y: ry / l };
}
export function isTreeTrunk(x, y, map) {
  if (!map.trees) return false;
  return map.trees.some(t => Math.floor(t.pos.x) === x && Math.floor(t.pos.y) === y);
}
export { entityOBB };

