// src/render/buildings/helpers.js
export function fillWithLight(ctx, baseStyle, lightingCanvas) {
  ctx.fillStyle = baseStyle; ctx.fill();
  if (!lightingCanvas) return;
  const pat = ctx.createPattern(lightingCanvas, 'no-repeat');
  if (!pat) return;
  const inv = ctx.getTransform().inverse();
  pat.setTransform?.(inv);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = pat; ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export function segmentIntersectsAABB(p1, p2, aabb) {
  const { x: x1, y: y1 } = p1, { x: x2, y: y2 } = p2;
  const { x: rx, y: ry, width: rw, height: rh } = aabb;
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  const check = (p, q) => { if (p === 0) return q >= 0; const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; } return true; };
  if (!check(-dx, x1 - rx)) return false;
  if (!check(dx, rx + rw - x1)) return false;
  if (!check(-dy, y1 - ry)) return false;
  if (!check(dy, ry + rh - y1)) return false;
  return t0 <= t1;
}

export function isOccluded(state, p1, p2, ignoreBuilding) {
  for (const building of state.world.map.buildings) {
    if (building === ignoreBuilding) continue;
    if ((building.currentHeight ?? building.height) <= 0.1) continue;
    if (segmentIntersectsAABB(p1, p2, building.rect)) return true;
  }
  for (const tree of state.world.map.trees || []) {
    if ((tree.currentTrunkHeight ?? tree.trunkHeight) <= 0.1) continue;
    const trunkAABB = { x: Math.floor(tree.pos.x) + 0.5 - 0.15, y: Math.floor(tree.pos.y) + 0.5 - 0.15, width: 0.3, height: 0.3 };
    if (segmentIntersectsAABB(p1, p2, trunkAABB)) return true;
  }
  return false;
}

export function gatherAllLights(state) {
  const all = [];
  all.push(...(state.entities || []).filter(e => e.type === 'light' && e.light?.active));
  (state.entities || []).filter(e => e.type === 'vehicle' && e.lightSources).forEach(v => {
    v.lightSources?.forEach(lsDef => {
      if (!lsDef.active) return;
      const cos = Math.cos(v.rot), sin = Math.sin(v.rot);
      const ox = lsDef.offset.x * cos - lsDef.offset.y * sin;
      const oy = lsDef.offset.x * sin + lsDef.offset.y * cos;
      all.push({ pos: { x: v.pos.x + ox, y: v.pos.y + oy }, light: { ...lsDef, kind: 'cone', direction: v.rot } });
    });
  });
  return all;
}
```

</output>