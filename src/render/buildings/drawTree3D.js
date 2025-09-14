// src/render/buildings/drawTree3D.js
import { fillWithLight } from './helpers.js';

export function drawTree3D(r, state, tree, mode, lightingCanvas) {
  const { ctx } = r, ts = state.world.tileSize, cam = state.camera, perspectiveScale = 0.8;
  const trunkHeight = tree.currentTrunkHeight ?? tree.trunkHeight;
  const leafHeight = tree.currentLeafHeight ?? tree.leafHeight;

  if (trunkHeight + leafHeight <= 0.1) {
    if (mode !== 'roofs_flat') return;
    const leafWidth = ts * tree.leafWidth; const leafX = tree.pos.x * ts - leafWidth/2; const leafY = tree.pos.y * ts - leafWidth/2;
    ctx.globalAlpha = 0.75; ctx.fillStyle = tree.trunkColor;
    const trunkWidth = ts * 0.3;const trunkX = tree.pos.x * ts - trunkWidth/2;const trunkY = tree.pos.y * ts - trunkWidth/2;
    ctx.fillRect(trunkX, trunkY, trunkWidth, trunkWidth);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.strokeRect(trunkX, trunkY, trunkWidth, trunkWidth);
    ctx.globalAlpha = 0.9;ctx.fillStyle = tree.leafColor;ctx.fillRect(leafX, leafY, leafWidth, leafWidth);ctx.strokeRect(leafX, leafY, leafWidth, leafWidth);
    ctx.globalAlpha = 1.0;return;
  }

  const trunkWidth = ts * 0.3, trunkX = tree.pos.x * ts - trunkWidth/2, trunkY = tree.pos.y * ts - trunkWidth/2;
  const leafWidth = ts * tree.leafWidth, leafX = tree.pos.x * ts - leafWidth/2, leafY = tree.pos.y * ts - leafWidth/2;
  const distX = tree.pos.x - cam.x, distY = tree.pos.y - cam.y;const len = Math.hypot(distX, distY) || 1;const dir = {x: distX/len, y: distY/len};
  const offsetMagnitude = trunkHeight * perspectiveScale * Math.min(1, len / 20);
  const trunkRoofOffset = {x: dir.x * offsetMagnitude, y: dir.y * offsetMagnitude};
  const leafOffsetMagnitude = (trunkHeight + leafHeight) * perspectiveScale * Math.min(1, len / 20);
  const leafRoofOffset = {x: dir.x * leafOffsetMagnitude, y: dir.y * leafOffsetMagnitude};

  const trunkRect = {x: trunkX, y: trunkY, w: trunkWidth, h: trunkWidth};
  const trunkRoofRect = {x : trunkX + trunkRoofOffset.x, y : trunkY + trunkRoofOffset.y, w : trunkWidth, h : trunkWidth};

  ctx.globalAlpha = 0.75;
  const wallQuads = [
    [{x:trunkRect.x,y:trunkRect.y}, {x :trunkRoofRect.x,y :trunkRoofRect.y}, {x :trunkRoofRect.x+trunkRoofRect.w,y :trunkRoofRect.y}, {x :trunkRect.x+trunkRect.w,y :trunkRect.y} ],
    [{x :trunkRect.x,y :trunkRect.y+trunkRect.h}, {x :trunkRoofRect.x,y :trunkRoofRect.y+trunkRoofRect.h}, {x :trunkRoofRect.x+trunkRoofRect.w,y :trunkRoofRect.y+trunkRoofRect.h}, {x :trunkRect.x+trunkRect.w,y :trunkRect.y+trunkRect.h} ],
    [{x :trunkRect.x,y :trunkRect.y}, {x :trunkRoofRect.x,y :trunkRoofRect.y}, {x :trunkRoofRect.x,y :trunkRoofRect.y+trunkRoofRect.h},{x :trunkRect.x,y :trunkRect.y+trunkRect.h} ],
    [{x :trunkRect.x+trunkRect.w,y :trunkRect.y}, {x :trunkRoofRect.x+trunkRoofRect.w,y :trunkRoofRect.y}, {x :trunkRoofRect.x+trunkRoofRect.w,y :trunkRoofRect.y+trunkRoofRect.h},{x :trunkRect.x+trunkRect.w,y :trunkRect.y+trunkRect.h} ],
  ];
  for (const q of wallQuads) {ctx.beginPath();ctx.moveTo(q[0].x,q[0].y); for (let i=1;i<q.length;i++) ctx.lineTo(q[i].x,q[i].y);ctx.closePath(); fillWithLight(ctx, tree.trunkColor, lightingCanvas);}
  ctx.beginPath();ctx.rect(trunkRoofRect.x, trunkRoofRect.y, trunkRoofRect.w, trunkRoofRect.h);fillWithLight(ctx, tree.trunkColor, lightingCanvas);

  const leafRoofRect = {x :leafX + leafRoofOffset.x, y :leafY + leafRoofOffset.y, w :leafWidth, h :leafWidth};
  const leafFloorProjectedRect = {x :leafX + trunkRoofOffset.x, y :leafY + trunkRoofOffset.y, w :leafWidth, h :leafWidth};

  ctx.globalAlpha = 0.75;
  const leafQuads = [
    [{x: leafFloorProjectedRect.x, y: leafFloorProjectedRect.y}, {x: leafRoofRect.x, y: leafRoofRect.y}, {x: leafRoofRect.x + leafRoofRect.w, y: leafRoofRect.y}, {x: leafFloorProjectedRect.x + leafFloorProjectedRect.w, y: leafFloorProjectedRect.y}],
    [{x: leafFloorProjectedRect.x, y: leafFloorProjectedRect.y + leafFloorProjectedRect.h}, {x: leafRoofRect.x, y: leafRoofRect.y + leafRoofRect.h}, {x: leafRoofRect.x + leafRoofRect.w, y: leafRoofRect.y + leafRoofRect.h}, {x: leafFloorProjectedRect.x + leafFloorProjectedRect.w, y: leafFloorProjectedRect.y + leafFloorProjectedRect.h}],
    [{x: leafFloorProjectedRect.x, y: leafFloorProjectedRect.y}, {x: leafRoofRect.x, y: leafRoofRect.y}, {x: leafRoofRect.x, y: leafRoofRect.y + leafRoofRect.h}, {x: leafFloorProjectedRect.x, y: leafFloorProjectedRect.y + leafFloorProjectedRect.h}],
    [{x: leafFloorProjectedRect.x + leafFloorProjectedRect.w, y: leafFloorProjectedRect.y}, {x: leafRoofRect.x + leafRoofRect.w, y: leafRoofRect.y}, {x: leafRoofRect.x + leafRoofRect.w, y: leafRoofRect.y + leafRoofRect.h}, {x: leafFloorProjectedRect.x + leafFloorProjectedRect.w, y: leafFloorProjectedRect.y + leafFloorProjectedRect.h}],
  ];
  for (const q of leafQuads) {
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].x, q[i].y);
    ctx.closePath();
    fillWithLight(ctx, tree.leafColor, lightingCanvas);
  }
  ctx.beginPath();
  ctx.rect(leafRoofRect.x, leafRoofRect.y, leafRoofRect.w, leafRoofRect.h);
  fillWithLight(ctx, tree.leafColor, lightingCanvas);
  ctx.globalAlpha = 1.0;
}