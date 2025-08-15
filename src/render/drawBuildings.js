export function drawBuildings(r, state) {
  const { ctx } = r, ts = state.world.tileSize, map = state.world.map;
  const cam = state.camera, perspectiveScale = 0.8;
  
  // Calculate camera direction vector for roof offset
  const vCam = {
    x: state.camera.x - r.canvas.width / (2 * ts),
    y: state.camera.y - r.canvas.height / (2 * ts)
  };
  const camLen = Math.sqrt(vCam.x * vCam.x + vCam.y * vCam.y);
  if (camLen > 0) {
    vCam.x /= camLen;
    vCam.y /= camLen;
  }
  
  // Sort buildings by distance to camera for proper z-ordering
  const sortedBuildings = [...map.buildings].sort((a, b) => {
    const aDist = Math.abs(a.rect.x + a.rect.width/2 - state.camera.x) + 
                  Math.abs(a.rect.y + a.rect.height/2 - state.camera.y);
    const bDist = Math.abs(b.rect.x + b.rect.width/2 - state.camera.x) + 
                  Math.abs(b.rect.y + b.rect.height/2 - state.camera.y);
    return aDist - bDist;
  });

  for (const b of sortedBuildings) {
    const floorRect = { 
      x: b.rect.x * ts, 
      y: b.rect.y * ts, 
      w: b.rect.width * ts, 
      h: b.rect.height * ts 
    };
    
    // Check if camera is inside building
    const isCamInside = (cam.x >= b.rect.x && 
                        cam.x < b.rect.x + b.rect.width && 
                        cam.y >= b.rect.y && 
                        cam.y < b.rect.y + b.rect.height);
    
    // Calculate roof offset based on camera position
    let roofOffset = { x: 0, y: 0 };
    if (!isCamInside) {
      const distanceToBuilding = Math.sqrt(
        Math.pow(cam.x - (b.rect.x + b.rect.width/2), 2) + 
        Math.pow(cam.y - (b.rect.y + b.rect.height/2), 2)
      );
      
      // Scale offset by distance and building height
      const offsetMagnitude = b.height * perspectiveScale * Math.min(1, distanceToBuilding * 0.1);
      roofOffset.x = vCam.x * offsetMagnitude;
      roofOffset.y = vCam.y * offsetMagnitude;
    }
    
    const roofRect = { 
      x: floorRect.x + roofOffset.x, 
      y: floorRect.y + roofOffset.y, 
      w: floorRect.w, 
      h: floorRect.h 
    };
    
    const hue = 200;
    const topWallColor = `hsl(${hue}, 20%, 75%)`;
    const sideWallColor = `hsl(${hue}, 20%, 65%)`;
    
    // Draw walls connecting floor to roof
    // West wall
    ctx.fillStyle = sideWallColor;
    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y);
    ctx.lineTo(roofRect.x, roofRect.y);
    ctx.lineTo(roofRect.x, roofRect.y + roofRect.h);
    ctx.lineTo(floorRect.x, floorRect.y + floorRect.h);
    ctx.closePath();
    ctx.fill();
    
    // East wall
    ctx.fillStyle = sideWallColor;
    ctx.beginPath();
    ctx.moveTo(floorRect.x + floorRect.w, floorRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y + roofRect.h);
    ctx.lineTo(floorRect.x + floorRect.w, floorRect.y + floorRect.h);
    ctx.closePath();
    ctx.fill();
    
    // North wall
    ctx.fillStyle = topWallColor;
    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y);
    ctx.lineTo(roofRect.x, roofRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y);
    ctx.lineTo(floorRect.x + floorRect.w, floorRect.y);
    ctx.closePath();
    ctx.fill();
    
    // South wall
    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y + floorRect.h);
    ctx.lineTo(roofRect.x, roofRect.y + roofRect.h);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y + roofRect.h);
    ctx.lineTo(floorRect.x + floorRect.w, floorRect.y + floorRect.h);
    ctx.closePath();
    ctx.fill();
    
    // Draw roof
    ctx.fillStyle = b.color;
    ctx.fillRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
  }
}