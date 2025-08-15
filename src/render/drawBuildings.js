export function drawBuildings(r, state) {
  const { ctx } = r, ts = state.world.tileSize, map = state.world.map;
  const cam = state.camera, perspectiveScale = 0.8, vCam = { x: 0, y: -1 };
  for (const b of map.buildings) {
    const floorRect = { x: b.rect.x * ts, y: b.rect.y * ts, w: b.rect.width * ts, h: b.rect.height * ts };
    const roofOffset = { x: vCam.x * b.height * perspectiveScale, y: vCam.y * b.height * perspectiveScale };
    const isCamInside = (cam.x >= b.rect.x && cam.x < b.rect.x + b.rect.width && cam.y >= b.rect.y && cam.y < b.rect.y + b.rect.height);
    if (isCamInside) { roofOffset.x = 0; roofOffset.y = 0; }
    const roofRect = { x: floorRect.x + roofOffset.x, y: floorRect.y + roofOffset.y, w: floorRect.w, h: floorRect.h };
    const hue = 200; // stable hue approximation
    const topWallColor = `hsl(${hue}, 20%, 75%)`;
    const sideWallColor = `hsl(${hue}, 20%, 65%)`;
    ctx.fillStyle = sideWallColor; ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y); ctx.lineTo(roofRect.x, roofRect.y);
    ctx.lineTo(roofRect.x, roofRect.y + roofRect.h); ctx.lineTo(floorRect.x, floorRect.y + floorRect.h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = sideWallColor; ctx.beginPath();
    ctx.moveTo(floorRect.x + floorRect.w, floorRect.y); ctx.lineTo(roofRect.x + roofRect.w, roofRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y + roofRect.h); ctx.lineTo(floorRect.x + floorRect.w, floorRect.y + floorRect.h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = topWallColor; ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y); ctx.lineTo(roofRect.x, roofRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y); ctx.lineTo(floorRect.x + floorRect.w, floorRect.y);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y + floorRect.h); ctx.lineTo(roofRect.x, roofRect.y + roofRect.h);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y + roofRect.h); ctx.lineTo(floorRect.x + floorRect.w, floorRect.y + floorRect.h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = b.color; ctx.fillRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.strokeRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
  }
}

