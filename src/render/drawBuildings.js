export function drawBuildings(r, state, mode = 'all') {
  const { ctx } = r, ts = state.world.tileSize, map = state.world.map;
  const cam = state.camera, perspectiveScale = 0.8;
  
  // --- NEW: Tree trunks should be drawn in this pass to be included on the undarkened layer ---
  const buildingsAndTrees = [...map.buildings];
  if (map.trees) {
    for (const tree of map.trees) {
        buildingsAndTrees.push({
            isTree: true,
            treeData: tree,
            // Use rect-like properties for sorting
            rect: { x: Math.floor(tree.pos.x), y: Math.floor(tree.pos.y), width: 1, height: 1 },
            height: (tree.currentTrunkHeight ?? tree.trunkHeight),
            currentHeight: (tree.currentTrunkHeight ?? tree.trunkHeight),
        });
    }
  }
  
  // Sort buildings and trees by y-position for proper z-ordering
  const sortedElements = buildingsAndTrees.sort((a, b) => {
    const aY = a.rect.y + a.rect.height;
    const bY = b.rect.y + b.rect.height;
    return aY - bY;
  });

  for (const element of sortedElements) {
    // --- NEW: Handle drawing either a building or a tree ---
    if (element.isTree) {
      drawTree(r, state, element.treeData, mode);
      continue;
    }
    
    const b = element;
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
    
    const bHeight = b.currentHeight ?? b.height;
    if (bHeight <= 0.1) { // When flattened, just draw the roof on the ground
        if (mode === 'roofs' || mode === 'all' || mode === 'roofs_flat') {
            ctx.fillStyle = b.color;
            ctx.fillRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h);
        }
        continue;
    }
    
    // If mode is for flat things and building isn't flattened, skip drawing anything for this building
    if ((mode === 'roofs_flat' || mode === 'roofs_flat_animating') && bHeight > 0.1) continue;
    
    // Calculate roof offset based on camera position
    let roofOffset = { x: 0, y: 0 };
    let roofScale = 1;
    
    if (!isCamInside) {
        const bx = b.rect.x + b.rect.width/2, by = b.rect.y + b.rect.height/2;
        const dir = { x: bx - cam.x, y: by - cam.y };
        const len = Math.hypot(dir.x, dir.y) || 1;
        dir.x /= len; dir.y /= len; // unit vector away from camera
        const offsetMagnitude = bHeight * perspectiveScale * Math.min(1, len / 20);
        roofOffset.x = dir.x * offsetMagnitude;
        roofOffset.y = dir.y * offsetMagnitude;
        
        // Perspective scale increases with building height
        const heightFactor = Math.min(1.2, 1 + (bHeight / 200) * 0.3);
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
    if (mode === 'walls' || mode === 'all' || mode === 'walls_animating') {
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

        // Ensure West/East outer walls are drawn like North/South (visible from outside)
        ctx.fillStyle = topWallColor;
        ctx.beginPath();
        ctx.moveTo(floorRect.x + floorRect.w, floorRect.y);
        ctx.lineTo(roofRect.x + roofRect.w, roofRect.y);
        ctx.lineTo(roofRect.x + roofRect.w, roofRect.y + roofRect.h);
        ctx.lineTo(floorRect.x + floorRect.w, floorRect.y + floorRect.h);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(floorRect.x, floorRect.y);
        ctx.lineTo(roofRect.x, roofRect.y);
        ctx.lineTo(roofRect.x, roofRect.y + roofRect.h);
        ctx.lineTo(floorRect.x, floorRect.y + floorRect.h);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw roof
    if (mode === 'roofs' || mode === 'all' || mode === 'roofs_animating') {
        ctx.fillStyle = b.color;
        ctx.fillRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
    }
  }
}

function drawTree(r, state, tree, mode) {
  const { ctx } = r, ts = state.world.tileSize;
  const cam = state.camera, perspectiveScale = 0.8;
  
  const trunkHeight = tree.currentTrunkHeight ?? tree.trunkHeight;
  const leafHeight = tree.currentLeafHeight ?? tree.leafHeight;

  // --- MODIFIED: Draw flattened tree trunk to be included on undarkened layer ---
  if (trunkHeight + leafHeight <= 0.1) {
    if (mode !== 'roofs_flat' && mode !== 'floors') {
        return;
    }
    // When flattened, draw the leaf roof in front of the trunk
    const leafWidth = ts * tree.leafWidth;
    const leafX = tree.pos.x * ts - leafWidth / 2;
    const leafY = tree.pos.y * ts - leafWidth / 2;
    
    // Draw trunk first (behind) - this is the "floor"
    ctx.globalAlpha = 1.0; // It's a floor tile, should be opaque
    ctx.fillStyle = tree.trunkColor;
    const trunkWidth = ts * 0.3;
    const trunkX = tree.pos.x * ts - trunkWidth / 2;
    const trunkY = tree.pos.y * ts - trunkWidth / 2;
    ctx.fillRect(trunkX, trunkY, trunkWidth, trunkWidth);
    
    // Draw leaves in front (with higher opacity)
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = tree.leafColor;
    ctx.fillRect(leafX, leafY, leafWidth, leafWidth);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(leafX, leafY, leafWidth, leafWidth);
    ctx.globalAlpha = 1.0;
    return;
  }

  // Tree trunk dimensions
  const trunkWidth = ts * 0.3;
  const trunkX = tree.pos.x * ts - trunkWidth / 2;
  const trunkY = tree.pos.y * ts - trunkWidth / 2;
  
  // Tree leaves dimensions
  const leafWidth = ts * tree.leafWidth;
  const leafX = tree.pos.x * ts - leafWidth / 2;
  const leafY = tree.pos.y * ts - leafWidth / 2;
  
  // Calculate roof offset based on camera position
  let trunkRoofOffset = { x: 0, y: 0 };
  let leafRoofOffset = { x: 0, y: 0 };
  
  const distX = tree.pos.x - cam.x;
  const distY = tree.pos.y - cam.y;
  const len = Math.hypot(distX, distY) || 1;
  const dir = { x: distX / len, y: distY / len };
  
  const offsetMagnitude = trunkHeight * perspectiveScale * Math.min(1, len / 20);
  trunkRoofOffset.x = dir.x * offsetMagnitude;
  trunkRoofOffset.y = dir.y * offsetMagnitude;
  
  const leafOffsetMagnitude = (trunkHeight + leafHeight) * perspectiveScale * Math.min(1, len / 20);
  leafRoofOffset.x = dir.x * leafOffsetMagnitude;
  leafRoofOffset.y = dir.y * leafOffsetMagnitude;
  
  // Draw trunk (impassable)
  const trunkRect = { 
      x: trunkX, 
      y: trunkY, 
      w: trunkWidth, 
      h: trunkWidth 
  };
  
  const trunkRoofRect = { 
      x: trunkX + trunkRoofOffset.x - (trunkWidth - trunkWidth) / 2, 
      y: trunkY + trunkRoofOffset.y - (trunkWidth - trunkWidth) / 2, 
      w: trunkWidth, 
      h: trunkWidth 
  };
  
  // Draw trunk walls
  ctx.fillStyle = tree.trunkColor;
  
  // Front and back walls
  ctx.beginPath();
  ctx.moveTo(trunkRect.x, trunkRect.y);
  ctx.lineTo(trunkRoofRect.x, trunkRoofRect.y);
  ctx.lineTo(trunkRoofRect.x + trunkRoofRect.w, trunkRoofRect.y);
  ctx.lineTo(trunkRect.x + trunkRect.w, trunkRect.y);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(trunkRect.x, trunkRect.y + trunkRect.h);
  ctx.lineTo(trunkRoofRect.x, trunkRoofRect.y + trunkRoofRect.h);
  ctx.lineTo(trunkRoofRect.x + trunkRoofRect.w, trunkRoofRect.y + trunkRoofRect.h);
  ctx.lineTo(trunkRect.x + trunkRect.w, trunkRect.y + trunkRect.h);
  ctx.closePath();
  ctx.fill();
  
  // Side walls
  ctx.beginPath();
  ctx.moveTo(trunkRect.x, trunkRect.y);
  ctx.lineTo(trunkRoofRect.x, trunkRoofRect.y);
  ctx.lineTo(trunkRoofRect.x, trunkRoofRect.y + trunkRoofRect.h);
  ctx.lineTo(trunkRect.x, trunkRect.y + trunkRect.h);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(trunkRect.x + trunkRect.w, trunkRect.y);
  ctx.lineTo(trunkRoofRect.x + trunkRoofRect.w, trunkRoofRect.y);
  ctx.lineTo(trunkRoofRect.x + trunkRoofRect.w, trunkRoofRect.y + trunkRoofRect.h);
  ctx.lineTo(trunkRect.x + trunkRect.w, trunkRect.y + trunkRect.h);
  ctx.closePath();
  ctx.fill();
  
  // Draw trunk top
  ctx.fillStyle = tree.trunkColor;
  ctx.fillRect(trunkRoofRect.x, trunkRoofRect.y, trunkRoofRect.w, trunkRoofRect.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(trunkRoofRect.x, trunkRoofRect.y, trunkRoofRect.w, trunkRoofRect.h);
  
  // Draw leaves (drawn after trunk, in front of buildings)
  const leafFloorRect = { 
      x: leafX, 
      y: leafY, 
      w: leafWidth, 
      h: leafWidth 
  };
  
  const leafRoofRect = { 
      x: leafX + leafRoofOffset.x - (leafWidth - leafWidth) / 2, 
      y: leafY + leafRoofOffset.y - (leafWidth - leafWidth) / 2, 
      w: leafWidth, 
      h: leafWidth 
  };
  
  // The 'floor' of the leaves should be at the same projected height as the top of the trunk.
  const leafFloorProjectedRect = {
      x: leafX + trunkRoofOffset.x,
      y: leafY + trunkRoofOffset.y,
      w: leafWidth,
      h: leafWidth
  };
  
  // Draw leaves with 75% opacity
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = tree.leafColor;
  
  // Front and back walls
  ctx.beginPath();
  ctx.moveTo(leafFloorProjectedRect.x, leafFloorProjectedRect.y);
  ctx.lineTo(leafRoofRect.x, leafRoofRect.y);
  ctx.lineTo(leafRoofRect.x + leafRoofRect.w, leafRoofRect.y);
  ctx.lineTo(leafFloorProjectedRect.x + leafFloorProjectedRect.w, leafFloorProjectedRect.y);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(leafFloorProjectedRect.x, leafFloorProjectedRect.y + leafFloorProjectedRect.h);
  ctx.lineTo(leafRoofRect.x, leafRoofRect.y + leafRoofRect.h);
  ctx.lineTo(leafRoofRect.x + leafRoofRect.w, leafRoofRect.y + leafRoofRect.h);
  ctx.lineTo(leafFloorProjectedRect.x + leafFloorProjectedRect.w, leafFloorProjectedRect.y + leafFloorProjectedRect.h);
  ctx.closePath();
  ctx.fill();
  
  // Side walls
  ctx.beginPath();
  ctx.moveTo(leafFloorProjectedRect.x, leafFloorProjectedRect.y);
  ctx.lineTo(leafRoofRect.x, leafRoofRect.y);
  ctx.lineTo(leafRoofRect.x, leafRoofRect.y + leafRoofRect.h);
  ctx.lineTo(leafFloorProjectedRect.x, leafFloorProjectedRect.y + leafFloorProjectedRect.h);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(leafFloorProjectedRect.x + leafFloorProjectedRect.w, leafFloorProjectedRect.y);
  ctx.lineTo(leafRoofRect.x + leafRoofRect.w, leafRoofRect.y);
  ctx.lineTo(leafRoofRect.x + leafRoofRect.w, leafRoofRect.y + leafRoofRect.h);
  ctx.lineTo(leafFloorProjectedRect.x + leafFloorProjectedRect.w, leafFloorProjectedRect.y + leafFloorProjectedRect.h);
  ctx.closePath();
  ctx.fill();
  
  // Draw leaves top with 75% opacity
  ctx.fillStyle = tree.leafColor;
  ctx.fillRect(leafRoofRect.x, leafRoofRect.y, leafRoofRect.w, leafRoofRect.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(leafRoofRect.x, leafRoofRect.y, leafRoofRect.w, leafRoofRect.h);
  
  // Reset opacity
  ctx.globalAlpha = 1.0;
}