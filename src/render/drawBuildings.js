import { aabbForTrunk } from '../app/vehicles/physics/geom.js';

export function drawBuildings(r, state, mode = 'all', lightingCanvas) {
  const { ctx } = r, ts = state.world.tileSize, map = state.world.map;
  const cam = state.camera, perspectiveScale = 0.8;
  
  // --- Step 3.2: Gather all light sources for wall illumination ---
  const allLights = [];
  // Add static lights
  allLights.push(...(state.entities || []).filter(e => e.type === 'light' && e.light?.active));
  // Add dynamic vehicle lights
  (state.entities || []).filter(e => e.type === 'vehicle' && e.lightSources).forEach(v => {
    if (v.lightSources) {
      v.lightSources.forEach(lsDef => {
        if (lsDef.active) {
          const cos = Math.cos(v.rot);
          const sin = Math.sin(v.rot);
          const worldOffsetX = lsDef.offset.x * cos - lsDef.offset.y * sin;
          const worldOffsetY = lsDef.offset.x * sin + lsDef.offset.y * cos;
          allLights.push({
            pos: { x: v.pos.x + worldOffsetX, y: v.pos.y + worldOffsetY },
            light: { ...lsDef, kind: 'cone', direction: v.rot }
          });
        }
      });
    }
  });

  // Sort buildings and trees by y-position + height for proper z-ordering
  const sortedElements = [...map.buildings];
  
  // Add trees to sorting array
  if (map.trees) {
    map.trees.forEach(tree => {
      sortedElements.push({
        type: 'tree',
        pos: tree.pos,
        height: (tree.currentTrunkHeight ?? tree.trunkHeight) + (tree.currentLeafHeight ?? tree.leafHeight),
        tree: tree
      });
    });
  }
  
  // Sort by y-position + height for proper z-ordering
  sortedElements.sort((a, b) => {
    const aY = a.rect ? (a.rect.y + a.rect.height) : (a.pos.y + 1);
    const bY = b.rect ? (b.rect.y + b.rect.height) : (b.pos.y + 1);
    const aHeight = a.currentHeight ?? a.height ?? 0;
    const bHeight = b.currentHeight ?? b.height ?? 0;
    const aZ = aY + (aHeight / ts) * 0.1;
    const bZ = bY + (bHeight / ts) * 0.1;
    return aZ - bZ;
  });

  for (const element of sortedElements) {
    if (element.type === 'tree') {
      drawTree(r, state, element.tree, mode);
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
      const baseLightness = 65; // Side wall base lightness
      const topWallBaseLightness = 75;

      const wallFaces = [
        { normal: { x: 0, y: -1 }, baseLightness: topWallBaseLightness, // Top
          p1: { x: floorRect.x, y: floorRect.y }, 
          p2: { x: floorRect.x + floorRect.w, y: floorRect.y },
          rp1: { x: roofRect.x, y: roofRect.y },
          rp2: { x: roofRect.x + roofRect.w, y: roofRect.y }
        },
        { normal: { x: 0, y: 1 }, baseLightness: topWallBaseLightness, // Bottom
          p1: { x: floorRect.x, y: floorRect.y + floorRect.h },
          p2: { x: floorRect.x + floorRect.w, y: floorRect.y + floorRect.h },
          rp1: { x: roofRect.x, y: roofRect.y + roofRect.h },
          rp2: { x: roofRect.x + roofRect.w, y: roofRect.y + roofRect.h }
        },
        { normal: { x: -1, y: 0 }, baseLightness: baseLightness, // Left
          p1: { x: floorRect.x, y: floorRect.y },
          p2: { x: floorRect.x, y: floorRect.y + floorRect.h },
          rp1: { x: roofRect.x, y: roofRect.y },
          rp2: { x: roofRect.x, y: roofRect.y + roofRect.h }
        },
        { normal: { x: 1, y: 0 }, baseLightness: baseLightness, // Right
          p1: { x: floorRect.x + floorRect.w, y: floorRect.y },
          p2: { x: floorRect.x + floorRect.w, y: floorRect.y + floorRect.h },
          rp1: { x: roofRect.x + roofRect.w, y: roofRect.y },
          rp2: { x: roofRect.x + roofRect.w, y: roofRect.y + roofRect.h }
        }
      ];

      // Draw walls connecting floor to roof
      if (mode === 'walls' || mode === 'all' || mode === 'walls_animating') {
        for (const face of wallFaces) {
            const wallCenterX = (b.rect.x + b.rect.width / 2) + face.normal.x * (b.rect.width / 2);
            const wallCenterY = (b.rect.y + b.rect.height / 2) + face.normal.y * (b.rect.height / 2);
            
            let totalIllumination = 0;
            for (const lightEntity of allLights) {
                const light = lightEntity.light;
                const lightPos = lightEntity.pos;
                const dx = wallCenterX - lightPos.x;
                const dy = wallCenterY - lightPos.y;
                const distSq = dx * dx + dy * dy;

                if (distSq > light.radius * light.radius) continue;

                if (isOccluded(state, lightPos, { x: wallCenterX, y: wallCenterY }, b)) continue;

                const dist = Math.sqrt(distSq);
                const lightDir = { x: -dx / dist, y: -dy / dist };

                let angleFactor = 1;
                if (light.kind === 'cone') {
                    const coneAngle = light.coneAngle / 2;
                    const lightAngle = light.direction;
                    const angleToWall = Math.atan2(lightDir.y, lightDir.x);
                    let angleDiff = Math.abs(lightAngle - angleToWall);
                    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                    if (angleDiff > coneAngle) continue;
                    angleFactor = 1 - (angleDiff / coneAngle);
                }
                
                const dot = lightDir.x * face.normal.x + lightDir.y * face.normal.y;
                if (dot <= 0) continue;

                const falloff = 1 - (dist / light.radius);
                totalIllumination += light.intensity * dot * falloff * angleFactor;
            }

            const finalLightness = Math.min(95, face.baseLightness + totalIllumination * 25);
            const baseStyle = `hsl(${hue}, 20%, ${finalLightness}%)`;
            ctx.beginPath();
            ctx.moveTo(face.p1.x, face.p1.y);
            ctx.lineTo(face.rp1.x, face.rp1.y);
            ctx.lineTo(face.rp2.x, face.rp2.y);
            ctx.lineTo(face.p2.x, face.p2.y);
            ctx.closePath();
            fillWithLight(ctx, baseStyle, lightingCanvas);
        }
      }
      
      // Draw roof
      if (mode === 'roofs' || mode === 'all' || mode === 'roofs_animating') {
        ctx.beginPath();
        ctx.rect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
        fillWithLight(ctx, b.color, lightingCanvas);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
      }
    }
  }
}

function isOccluded(state, p1, p2, ignoreBuilding) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    for (const building of state.world.map.buildings) {
        if (building === ignoreBuilding) continue;
        if ((building.currentHeight ?? building.height) <= 0.1) continue;
        if (segmentIntersectsAABB(p1, p2, building.rect)) return true;
    }

    for (const tree of state.world.map.trees || []) {
        if ((tree.currentTrunkHeight ?? tree.trunkHeight) <= 0.1) continue;
        const trunkAABB = {
            x: Math.floor(tree.pos.x) + 0.5 - 0.15,
            y: Math.floor(tree.pos.y) + 0.5 - 0.15,
            width: 0.3,
            height: 0.3
        };
        if (segmentIntersectsAABB(p1, p2, trunkAABB)) return true;
    }
    return false;
}

function segmentIntersectsAABB(p1, p2, aabb) {
    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;
    const { x: rx, y: ry, width: rw, height: rh } = aabb;

    let t0 = 0, t1 = 1;
    const dx = x2 - x1;
    const dy = y2 - y1;

    const check = (p, q) => {
        if (p === 0) {
            if (q < 0) return false;
        } else {
            const t = q / p;
            if (p < 0) {
                if (t > t1) return false;
                if (t > t0) t0 = t;
            } else {
                if (t < t0) return false;
                if (t < t1) t1 = t;
            }
        }
        return true;
    };

    if (!check(-dx, x1 - rx)) return false;
    if (!check(dx, rx + rw - x1)) return false;
    if (!check(-dy, y1 - ry)) return false;
    if (!check(dy, ry + rh - y1)) return false;

    return t0 <= t1;
}

function fillWithLight(ctx, baseStyle, lightingCanvas) {
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

function drawTree(r, state, tree, mode) {
  const { ctx } = r, ts = state.world.tileSize;
  const cam = state.camera, perspectiveScale = 0.8;
  
  const trunkHeight = tree.currentTrunkHeight ?? tree.trunkHeight;
  const leafHeight = tree.currentLeafHeight ?? tree.leafHeight;

  if (trunkHeight + leafHeight <= 0.1) {
    if (mode !== 'roofs_flat') {
        return;
    }
    // When flattened, draw the leaf roof in front of the trunk
    const leafWidth = ts * tree.leafWidth;
    const leafX = tree.pos.x * ts - leafWidth / 2;
    const leafY = tree.pos.y * ts - leafWidth / 2;
    
    // Draw trunk first (behind)
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = tree.trunkColor;
    const trunkWidth = ts * 0.3;
    const trunkX = tree.pos.x * ts - trunkWidth / 2;
    const trunkY = tree.pos.y * ts - trunkWidth / 2;
    ctx.fillRect(trunkX, trunkY, trunkWidth, trunkWidth);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(trunkX, trunkY, trunkWidth, trunkWidth);
    
    // Draw leaves in front (with higher opacity)
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = tree.leafColor;
    ctx.fillRect(leafX, leafY, leafWidth, leafWidth);
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
  ctx.beginPath();
  ctx.moveTo(trunkRect.x, trunkRect.y);
  ctx.lineTo(trunkRoofRect.x, trunkRoofRect.y);
  ctx.lineTo(trunkRoofRect.x + trunkRoofRect.w, trunkRoofRect.y);
  ctx.lineTo(trunkRect.x + trunkRect.w, trunkRect.y);
  ctx.closePath();
  fillWithLight(ctx, tree.trunkColor, lightingCanvas);
  
  ctx.beginPath();
  ctx.moveTo(trunkRect.x, trunkRect.y + trunkRect.h);
  ctx.lineTo(trunkRoofRect.x, trunkRoofRect.y + trunkRoofRect.h);
  ctx.lineTo(trunkRoofRect.x + trunkRoofRect.w, trunkRoofRect.y + trunkRoofRect.h);
  ctx.lineTo(trunkRect.x + trunkRect.w, trunkRect.y + trunkRect.h);
  ctx.closePath();
  fillWithLight(ctx, tree.trunkColor, lightingCanvas);
  
  // Side walls
  ctx.beginPath();
  ctx.moveTo(trunkRect.x, trunkRect.y);
  ctx.lineTo(trunkRoofRect.x, trunkRoofRect.y);
  ctx.lineTo(trunkRoofRect.x, trunkRoofRect.y + trunkRoofRect.h);
  ctx.lineTo(trunkRect.x, trunkRect.y + trunkRect.h);
  ctx.closePath();
  fillWithLight(ctx, tree.trunkColor, lightingCanvas);
  
  ctx.beginPath();
  ctx.moveTo(trunkRect.x + trunkRect.w, trunkRect.y);
  ctx.lineTo(trunkRoofRect.x + trunkRoofRect.w, trunkRoofRect.y);
  ctx.lineTo(trunkRoofRect.x + trunkRoofRect.w, trunkRoofRect.y + trunkRoofRect.h);
  ctx.lineTo(trunkRect.x + trunkRect.w, trunkRect.y + trunkRect.h);
  ctx.closePath();
  fillWithLight(ctx, tree.trunkColor, lightingCanvas);
  
  // Draw trunk top
  ctx.beginPath();
  ctx.rect(trunkRoofRect.x, trunkRoofRect.y, trunkRoofRect.w, trunkRoofRect.h);
  fillWithLight(ctx, tree.trunkColor, lightingCanvas);
  
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
  ctx.beginPath();
  ctx.moveTo(leafFloorProjectedRect.x, leafFloorProjectedRect.y);
  ctx.lineTo(leafRoofRect.x, leafRoofRect.y);
  ctx.lineTo(leafRoofRect.x + leafRoofRect.w, leafRoofRect.y);
  ctx.lineTo(leafFloorProjectedRect.x + leafFloorProjectedRect.w, leafFloorProjectedRect.y);
  ctx.closePath();
  fillWithLight(ctx, tree.leafColor, lightingCanvas);
  
  ctx.beginPath();
  ctx.moveTo(leafFloorProjectedRect.x, leafFloorProjectedRect.y + leafFloorProjectedRect.h);
  ctx.lineTo(leafRoofRect.x, leafRoofRect.y + leafRoofRect.h);
  ctx.lineTo(leafRoofRect.x + leafRoofRect.w, leafRoofRect.y + leafRoofRect.h);
  ctx.lineTo(leafFloorProjectedRect.x + leafFloorProjectedRect.w, leafFloorProjectedRect.y + leafFloorProjectedRect.h);
  ctx.closePath();
  fillWithLight(ctx, tree.leafColor, lightingCanvas);
  
  // Side walls
  ctx.beginPath();
  ctx.moveTo(leafFloorProjectedRect.x, leafFloorProjectedRect.y);
  ctx.lineTo(leafRoofRect.x, leafRoofRect.y);
  ctx.lineTo(leafRoofRect.x, leafRoofRect.y + leafRoofRect.h);
  ctx.lineTo(leafFloorProjectedRect.x, leafFloorProjectedRect.y + leafFloorProjectedRect.h);
  ctx.closePath();
  fillWithLight(ctx, tree.leafColor, lightingCanvas);
  
  ctx.beginPath();
  ctx.moveTo(leafFloorProjectedRect.x + leafFloorProjectedRect.w, leafFloorProjectedRect.y);
  ctx.lineTo(leafRoofRect.x + leafRoofRect.w, leafRoofRect.y);
  ctx.lineTo(leafRoofRect.x + leafRoofRect.w, leafRoofRect.y + leafRoofRect.h);
  ctx.lineTo(leafFloorProjectedRect.x + leafFloorProjectedRect.w, leafFloorProjectedRect.y + leafFloorProjectedRect.h);
  ctx.closePath();
  fillWithLight(ctx, tree.leafColor, lightingCanvas);
  
  // Draw leaves top with 75% opacity
  ctx.beginPath();
  ctx.rect(leafRoofRect.x, leafRoofRect.y, leafRoofRect.w, leafRoofRect.h);
  fillWithLight(ctx, tree.leafColor, lightingCanvas);
  
  // Reset opacity
  ctx.globalAlpha = 1.0;
}