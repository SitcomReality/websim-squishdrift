export function drawBuildings(r, state, mode = 'all') {
  const { ctx } = r, ts = state.world.tileSize, map = state.world.map;
  const cam = state.camera, perspectiveScale = 0.8;
  
  // Sort buildings by y-position + height for proper z-ordering
  const sortedBuildings = [...map.buildings].sort((a, b) => {
    const aY = a.rect.y + a.rect.height;
    const bY = b.rect.y + b.rect.height;
    const aZ = aY + (a.height / ts) * 0.1;
    const bZ = bY + (b.height / ts) * 0.1;
    return aZ - bZ;
  });

  for (const b of sortedBuildings) {
    // Check if this is an octagonal building
    if (b.shape === 'octagon') {
      drawOctagonalBuilding(r, state, b, mode);
    } else {
      drawRectangularBuilding(r, state, b, mode);
    }
  }
}

function drawRectangularBuilding(r, state, b, mode) {
  const { ctx } = r, ts = state.world.tileSize;
  
  const floorRect = { 
    x: b.rect.x * ts, 
    y: b.rect.y * ts, 
    w: b.rect.width * ts, 
    h: b.rect.height * ts 
  };
  
  // ... existing rectangular building drawing code ...
  const isCamInside = (cam.x >= b.rect.x && 
                      cam.x < b.rect.x + b.rect.width && 
                      cam.y >= b.rect.y && 
                      cam.y < b.rect.y + b.rect.height);
  
  let roofOffset = { x: 0, y: 0 };
  let roofScale = 1;
  
  if (!isCamInside) {
    const bx = b.rect.x + b.rect.width/2, by = b.rect.y + b.rect.height/2;
    const dir = { x: bx - cam.x, y: by - cam.y };
    const len = Math.hypot(dir.x, dir.y) || 1;
    dir.x /= len; dir.y /= len;
    const offsetMagnitude = b.height * perspectiveScale * Math.min(1, len / 20);
    roofOffset.x = dir.x * offsetMagnitude;
    roofOffset.y = dir.y * offsetMagnitude;
    
    const heightFactor = Math.min(1.2, 1 + (b.height / 200) * 0.3);
    roofScale = heightFactor;
  }
  
  const scaledW = floorRect.w * roofScale;
  const scaledH = floorRect.h * roofScale;
  const roofRect = { 
    x: floorRect.x + roofOffset.x - (scaledW - floorRect.w) / 2, 
    y: floorRect.y + roofOffset.y - (scaledH - floorRect.h) / 2, 
    w: scaledW, 
    h: scaledH 
  };
  
  const hue = 200;
  const topWallColor = `hsl(${hue}, 20%, 75%)`;
  const sideWallColor = `hsl(${hue}, 20%, 65%)`;
  
  // Draw walls connecting floor to roof
  if (mode === 'walls' || mode === 'all') {
    ctx.fillStyle = sideWallColor;
    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y);
    ctx.lineTo(roofRect.x, roofRect.y);
    ctx.lineTo(roofRect.x, roofRect.y + roofRect.h);
    ctx.lineTo(floorRect.x, floorRect.y + floorRect.h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = sideWallColor;
    ctx.beginPath();
    ctx.moveTo(floorRect.x + floorRect.w, floorRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y + roofRect.h);
    ctx.lineTo(floorRect.x + floorRect.w, floorRect.y + floorRect.h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = topWallColor;
    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y);
    ctx.lineTo(roofRect.x, roofRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y);
    ctx.lineTo(floorRect.x + floorRect.w, floorRect.y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y + floorRect.h);
    ctx.lineTo(roofRect.x, roofRect.y + roofRect.h);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y + roofRect.h);
    ctx.lineTo(floorRect.x + floorRect.w, floorRect.y + floorRect.h);
    ctx.closePath();
    ctx.fill();
  }
  
  // Draw roof
  if (mode === 'roofs' || mode === 'all') {
    ctx.fillStyle = b.color;
    ctx.fillRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
  }
}

function drawOctagonalBuilding(r, state, b, mode) {
  const { ctx } = r, ts = state.world.tileSize;
  const cam = state.camera, perspectiveScale = 0.8;
  
  // Calculate octagon dimensions
  const floorRect = { 
    x: b.rect.x * ts, 
    y: b.rect.y * ts, 
    w: b.rect.width * ts, 
    h: b.rect.height * ts 
  };
  
  const centerX = floorRect.x + floorRect.w / 2;
  const centerY = floorRect.y + floorRect.h / 2;
  const radius = Math.min(floorRect.w, floorRect.h) / 2;
  
  // Check if camera is inside building
  const isCamInside = (cam.x >= b.rect.x && 
                      cam.x < b.rect.x + b.rect.width && 
                      cam.y >= b.rect.y && 
                      cam.y < b.rect.y + b.rect.height);
  
  // Calculate roof offset based on camera position
  let roofOffsetX = 0, roofOffsetY = 0;
  let roofScale = 1;
  
  if (!isCamInside) {
    const bx = b.rect.x + b.rect.width/2, by = b.rect.y + b.rect.height/2;
    const dir = { x: bx - cam.x, y: by - cam.y };
    const len = Math.hypot(dir.x, dir.y) || 1;
    dir.x /= len; dir.y /= len;
    const offsetMagnitude = b.height * perspectiveScale * Math.min(1, len / 20);
    roofOffsetX = dir.x * offsetMagnitude;
    roofOffsetY = dir.y * offsetMagnitude;
    
    const heightFactor = Math.min(1.2, 1 + (b.height / 200) * 0.3);
    roofScale = heightFactor;
  }
  
  // Generate octagon points for floor
  const floorPoints = generateOctagonPoints(centerX, centerY, radius);
  
  // Generate octagon points for roof
  const roofRadius = radius * roofScale;
  const roofCenterX = centerX + roofOffsetX;
  const roofCenterY = centerY + roofOffsetY;
  const roofPoints = generateOctagonPoints(roofCenterX, roofCenterY, roofRadius);
  
  // Draw walls connecting floor to roof
  if (mode === 'walls' || mode === 'all') {
    drawOctagonWalls(ctx, floorPoints, roofPoints, b);
  }
  
  // Draw roof
  if (mode === 'roofs' || mode === 'all') {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(roofPoints[0].x, roofPoints[0].y);
    for (let i = 1; i < roofPoints.length; i++) {
      ctx.lineTo(roofPoints[i].x, roofPoints[i].y);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function generateOctagonPoints(centerX, centerY, radius) {
  const points = [];
  const angleStep = Math.PI / 4; // 45 degrees
  
  for (let i = 0; i < 8; i++) {
    const angle = i * angleStep - Math.PI / 8; // Offset to align flats
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    });
  }
  
  return points;
}

function drawOctagonWalls(ctx, floorPoints, roofPoints, building) {
  const hue = 200;
  const topWallColor = `hsl(${hue}, 20%, 75%)`;
  const sideWallColor = `hsl(${hue}, 20%, 65%)`;
  
  // Draw walls between floor and roof
  ctx.fillStyle = sideWallColor;
  
  for (let i = 0; i < floorPoints.length; i++) {
    const nextIndex = (i + 1) % floorPoints.length;
    
    // Draw wall face
    ctx.beginPath();
    ctx.moveTo(floorPoints[i].x, floorPoints[i].y);
    ctx.lineTo(roofPoints[i].x, roofPoints[i].y);
    ctx.lineTo(roofPoints[nextIndex].x, roofPoints[nextIndex].y);
    ctx.lineTo(floorPoints[nextIndex].x, floorPoints[nextIndex].y);
    ctx.closePath();
    ctx.fill();
    
    // Draw top edge
    ctx.fillStyle = topWallColor;
    ctx.beginPath();
    ctx.moveTo(roofPoints[i].x, roofPoints[i].y);
    ctx.lineTo(roofPoints[nextIndex].x, roofPoints[nextIndex].y);
    ctx.lineTo(floorPoints[nextIndex].x, floorPoints[nextIndex].y);
    ctx.lineTo(floorPoints[i].x, floorPoints[i].y);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = sideWallColor;
  }
}