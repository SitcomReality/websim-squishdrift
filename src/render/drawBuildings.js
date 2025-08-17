export function drawBuildings(r, state, mode = 'all') {
  const { ctx } = r, ts = state.world.tileSize, map = state.world.map;
  const cam = state.camera, perspectiveScale = 0.8;
  
  // Sort buildings and trees by y-position + height for proper z-ordering
  const sortedElements = [...map.buildings];
  
  // Add trees to sorting array - separate trunks and leaves for proper z-ordering
  const treeElements = [];
  if (map.trees) {
    map.trees.forEach(tree => {
      // Trunk element (lower z-layer)
      treeElements.push({
        type: 'tree_trunk',
        pos: tree.pos,
        height: tree.trunkHeight,
        tree: tree,
        isTrunk: true
      });
      
      // Leaves element (higher z-layer)
      treeElements.push({
        type: 'tree_leaves',
        pos: tree.pos,
        height: tree.trunkHeight + tree.leafHeight,
        tree: tree,
        isLeaves: true
      });
    });
  }
  
  // Sort ALL elements together by y-position + height
  const allElements = [...sortedElements, ...treeElements];
  
  // Sort by y-position + height for proper z-ordering
  allElements.sort((a, b) => {
    const aY = a.rect ? (a.rect.y + a.rect.height) : (a.pos.y + 1);
    const bY = b.rect ? (b.rect.y + b.rect.height) : (b.pos.y + 1);
    const aZ = aY + ((a.height || 0) / ts) * 0.1;
    const bZ = bY + ((b.height || 0) / ts) * 0.1;
    return aZ - bZ;
  });

  for (const element of allElements) {
    if (element.type === 'tree_trunk') {
      drawTreeTrunk(r, state, element.tree);
    } else if (element.type === 'tree_leaves') {
      drawTreeLeaves(r, state, element.tree);
    } else if (element.type === 'tree') {
      // Handle legacy tree rendering
      drawTree(r, state, element.tree);
    } else {
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
      
      // Calculate roof offset based on camera position
      let roofOffset = { x: 0, y: 0 };
      let roofScale = 1;
      
      if (!isCamInside) {
        const bx = b.rect.x + b.rect.width/2, by = b.rect.y + b.rect.height/2;
        const dir = { x: bx - cam.x, y: by - cam.y };
        const len = Math.hypot(dir.x, dir.y) || 1;
        dir.x /= len; dir.y /= len; // unit vector away from camera
        const offsetMagnitude = b.height * perspectiveScale * Math.min(1, len / 20);
        roofOffset.x = dir.x * offsetMagnitude;
        roofOffset.y = dir.y * offsetMagnitude;
        
        // Perspective scale increases with building height
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
      if (mode === 'roofs' || mode === 'all') {
        ctx.fillStyle = b.color;
        ctx.fillRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
      }
    }
  }
}

function drawTreeTrunk(r, state, tree) {
  const { ctx } = r, ts = state.world.tileSize;
  const cam = state.camera, perspectiveScale = 0.8;
  
  // Tree trunk dimensions
  const trunkWidth = ts * 0.3;
  const trunkHeight = tree.trunkHeight;
  const trunkX = tree.pos.x * ts - trunkWidth / 2;
  const trunkY = tree.pos.y * ts - trunkWidth / 2;
  
  // Calculate roof offset based on camera position
  let trunkRoofOffset = { x: 0, y: 0 };
  
  const distX = tree.pos.x - cam.x;
  const distY = tree.pos.y - cam.y;
  const len = Math.hypot(distX, distY) || 1;
  const dir = { x: distX / len, y: distY / len };
  
  const offsetMagnitude = trunkHeight * perspectiveScale * Math.min(1, len / 20);
  trunkRoofOffset.x = dir.x * offsetMagnitude;
  trunkRoofOffset.y = dir.y * offsetMagnitude;
  
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
}

function drawTreeLeaves(r, state, tree) {
  const { ctx } = r, ts = state.world.tileSize;
  const cam = state.camera, perspectiveScale = 0.8;
  
  // Tree leaves dimensions
  const leafWidth = ts * tree.leafWidth;
  const leafHeight = tree.leafHeight;
  const leafX = tree.pos.x * ts - leafWidth / 2;
  const leafY = tree.pos.y * ts - leafWidth / 2;
  
  // Calculate roof offset based on camera position
  let leafRoofOffset = { x: 0, y: 0 };
  
  const distX = tree.pos.x - cam.x;
  const distY = tree.pos.y - cam.y;
  const len = Math.hypot(distX, distY) || 1;
  const dir = { x: distX / len, y: distY / len };
  
  const leafOffsetMagnitude = (tree.trunkHeight + leafHeight) * perspectiveScale * Math.min(1, len / 20);
  leafRoofOffset.x = dir.x * leafOffsetMagnitude;
  leafRoofOffset.y = dir.y * leafOffsetMagnitude;
  
  // Draw leaves with 3D effect
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
    x: leafX + leafRoofOffset.x,
    y: leafY + leafRoofOffset.y,
    w: leafWidth,
    h: leafWidth
  };
  
  // Draw leaves with 3D effect
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
  
  // Draw leaves top
  ctx.fillStyle = tree.leafColor;
  ctx.fillRect(leafRoofRect.x, leafRoofRect.y, leafRoofRect.w, leafRoofRect.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(leafRoofRect.x, leafRoofRect.y, leafRoofRect.w, leafRoofRect.h);
}

function drawTree(r, state, tree) {
  const { ctx } = r, ts = state.world.tileSize;
  const cam = state.camera, perspectiveScale = 0.8;
  
  // Tree trunk dimensions
  const trunkWidth = ts * 0.3;
  const trunkHeight = tree.trunkHeight;
  const trunkX = tree.pos.x * ts - trunkWidth / 2;
  const trunkY = tree.pos.y * ts - trunkWidth / 2;
  
  // Tree leaves dimensions
  const leafWidth = ts * tree.leafWidth;
  const leafHeight = tree.leafHeight;
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
  
  const leafOffsetMagnitude = (tree.trunkHeight + leafHeight) * perspectiveScale * Math.min(1, len / 20);
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
  
  // Draw leaves with 3D effect
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
  
  // Draw leaves top
  ctx.fillStyle = tree.leafColor;
  ctx.fillRect(leafRoofRect.x, leafRoofRect.y, leafRoofRect.w, leafRoofRect.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(leafRoofRect.x, leafRoofRect.y, leafRoofRect.w, leafRoofRect.h);
}