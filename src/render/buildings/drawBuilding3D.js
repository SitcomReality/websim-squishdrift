import { fillWithLight, isOccluded } from './helpers.js';

export function drawBuilding3D(r, state, b, mode, lightingCanvas, allLights) {
  const { ctx } = r, ts = state.world.tileSize, cam = state.camera, perspectiveScale = 0.8;
  const floorRect = { x: b.rect.x * ts, y: b.rect.y * ts, w: b.rect.width * ts, h: b.rect.height * ts };
  const isCamInside = (cam.x >= b.rect.x && cam.x < b.rect.x + b.rect.width && cam.y >= b.rect.y && cam.y < b.rect.y + b.rect.height);
  const bHeight = b.currentHeight ?? b.height;
  if (bHeight <= 0.1) {
    if (mode === 'roofs' || mode === 'all' || mode === 'roofs_flat') {
      ctx.fillStyle = b.color; ctx.fillRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.strokeRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h);
    }
    return;
  }
  if ((mode === 'roofs_flat' || mode === 'roofs_flat_animating') && bHeight > 0.1) return;

  let roofOffset = { x: 0, y: 0 }, roofScale = 1;
  if (!isCamInside) {
    const bx = b.rect.x + b.rect.width/2, by = b.rect.y + b.rect.height/2;
    const dir = { x: bx - cam.x, y: by - cam.y }; const len = Math.hypot(dir.x, dir.y) || 1; dir.x/=len; dir.y/=len;
    const offsetMagnitude = bHeight * perspectiveScale * Math.min(1, len / 20);
    roofOffset.x = dir.x * offsetMagnitude; roofOffset.y = dir.y * offsetMagnitude;
    const heightFactor = Math.min(1.2, 1 + (bHeight / 200) * 0.3); roofScale = heightFactor;
  }
  const scaledW = floorRect.w * roofScale, scaledH = floorRect.h * roofScale;
  const roofRect = { x: floorRect.x + roofOffset.x - (scaledW - floorRect.w)/2, y: floorRect.y + roofOffset.y - (scaledH - floorRect.h)/2, w: scaledW, h: scaledH };

  const hue = 200, baseLightness = 65, topWallBaseLightness = 75;
  const wallFaces = [
    { normal:{x:0,y:-1}, baseLightness: topWallBaseLightness, p1:{x:floorRect.x,y:floorRect.y}, p2:{x:floorRect.x+floorRect.w,y:floorRect.y}, rp1:{x:roofRect.x,y:roofRect.y}, rp2:{x:roofRect.x+roofRect.w,y:roofRect.y} },
    { normal:{x:0,y:1},  baseLightness: topWallBaseLightness, p1:{x:floorRect.x,y:floorRect.y+floorRect.h}, p2:{x:floorRect.x+floorRect.w,y:floorRect.y+floorRect.h}, rp1:{x:roofRect.x,y:roofRect.y+roofRect.h}, rp2:{x:roofRect.x+roofRect.w,y:roofRect.y+roofRect.h} },
    { normal:{x:-1,y:0}, baseLightness: baseLightness, p1:{x:floorRect.x,y:floorRect.y}, p2:{x:floorRect.x,y:floorRect.y+floorRect.h}, rp1:{x:roofRect.x,y:roofRect.y}, rp2:{x:roofRect.x,y:roofRect.y+roofRect.h} },
    { normal:{x:1,y:0},  baseLightness: baseLightness, p1:{x:floorRect.x+floorRect.w,y:floorRect.y}, p2:{x:floorRect.x+floorRect.w,y:floorRect.y+floorRect.h}, rp1:{x:roofRect.x+roofRect.w,y:roofRect.y}, rp2:{x:roofRect.x+roofRect.w,y:roofRect.y+roofRect.h} }
  ];

  if (mode === 'walls' || mode === 'all' || mode === 'walls_animating') {
    for (const face of wallFaces) {
      const wallCenterX = (b.rect.x + b.rect.width/2) + face.normal.x * (b.rect.width/2);
      const wallCenterY = (b.rect.y + b.rect.height/2) + face.normal.y * (b.rect.height/2);
      let totalIllumination = 0;
      for (const le of allLights) {
        const light = le.light, lp = le.pos;
        const dx = wallCenterX - lp.x, dy = wallCenterY - lp.y;
        const distSq = dx*dx + dy*dy; if (distSq > light.radius*light.radius) continue;
        if (isOccluded(state, lp, {x:wallCenterX,y:wallCenterY}, b)) continue;
        const dist = Math.sqrt(distSq); const lightDir = { x: -dx / dist, y: -dy / dist };
        let angleFactor = 1;
        if (light.kind === 'cone') {
          const coneAngle = light.coneAngle / 2, lightAngle = light.direction;
          const angleToWall = Math.atan2(lightDir.y, lightDir.x);
          let angleDiff = Math.abs(lightAngle - angleToWall); if (angleDiff > Math.PI) angleDiff = 2*Math.PI - angleDiff;
          if (angleDiff > coneAngle) continue; angleFactor = 1 - (angleDiff / coneAngle);
        }
        const dot = lightDir.x * face.normal.x + lightDir.y * face.normal.y; if (dot <= 0) continue;
        const falloff = 1 - (dist / light.radius);
        totalIllumination += light.intensity * dot * falloff * angleFactor;
      }
      const finalLightness = Math.min(95, face.baseLightness + totalIllumination * 25);
      const baseStyle = `hsl(${hue}, 20%, ${finalLightness}%)`;
      ctx.beginPath();
      ctx.moveTo(face.p1.x, face.p1.y); ctx.lineTo(face.rp1.x, face.rp1.y);
      ctx.lineTo(face.rp2.x, face.rp2.y); ctx.lineTo(face.p2.x, face.p2.y);
      ctx.closePath();
      fillWithLight(ctx, baseStyle, lightingCanvas);
    }
  }

  if (mode === 'roofs' || mode === 'all' || mode === 'roofs_animating') {
    ctx.beginPath(); ctx.rect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
    fillWithLight(ctx, b.color, lightingCanvas);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.strokeRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
  }
}

