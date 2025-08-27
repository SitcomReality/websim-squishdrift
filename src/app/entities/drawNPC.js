export function drawNPC(r, state, npc){
  const { ctx } = r, ts = state.world.tileSize;

  const pedestrianImages = state.pedestrianImages;
  if (!pedestrianImages || !pedestrianImages.bodies || !pedestrianImages.arms) {
    // Fallback to drawing a circle if images are not loaded yet
    drawCircleNPC(r, state, npc);
    return;
  }
  
  // Sprite sheet dimensions
  const bodySpriteWidth = 21;
  const bodySpriteHeight = 31;
  const armSpriteWidth = 19;
  const armSpriteHeight = 13;

  // NPC sprite properties (should be assigned on creation)
  const skinTone = npc.skinTone ?? 0;
  const bodyIndex = npc.bodyIndex ?? 0;
  const armIndex = npc.armIndex ?? 0;

  ctx.save();
  ctx.translate(npc.pos.x * ts, npc.pos.y * ts);

  // Determine rotation from movement direction
  const dx = (npc.to.x + 0.5) - (npc.from.x + 0.5);
  const dy = (npc.to.y + 0.5) - (npc.from.y + 0.5);
  const angle = Math.atan2(dy, dx);
  // Sprites face right, so no adjustment needed for angle
  ctx.rotate(angle);

  // Scaled dimensions for drawing
  const scale = (ts * 0.4) / bodySpriteHeight; // Scale based on height to be ~40% of a tile
  const bodyW = bodySpriteWidth * scale;
  const bodyH = bodySpriteHeight * scale;
  const armW = armSpriteWidth * scale;
  const armH = armSpriteHeight * scale;
  
  // Body source coordinates
  const sxBody = bodyIndex * bodySpriteWidth;
  const syBody = skinTone * bodySpriteHeight;

  // Arm source coordinates
  const sxArm = armIndex * armSpriteWidth;
  const syArm = skinTone * armSpriteHeight;
  
  // Animation properties
  const animProgress = npc.t * Math.PI * 4; // Controls swing speed
  const armSwingAngle = Math.sin(animProgress) * 0.8; // Radians

  // --- Draw Arms (behind body) ---
  // Both arms are now drawn behind the body, positioned forward and spread apart
  
  // Left Arm (behind body, positioned forward and to the side)
  ctx.save();
  // Position arms more forward and slightly outward
  const armOffsetX = bodyW * 0.35; // Move arms forward
  const armOffsetY = bodyH * 0.1;   // Slight vertical offset
  const armSpread = bodyW * 0.6;  // Increased spread between arms
  
  ctx.translate(armOffsetX - armSpread/2, armOffsetY);
  ctx.rotate(-armSwingAngle); // Opposite swing for left arm
  ctx.drawImage(
    pedestrianImages.arms,
    sxArm, syArm, armSpriteWidth, armSpriteHeight,
    -armW / 2, -armH / 2, armW, armH
  );
  ctx.restore();

  // Right Arm (behind body, positioned forward and to the other side)
  ctx.save();
  ctx.translate(armOffsetX + armSpread/2, armOffsetY);
  ctx.rotate(armSwingAngle); // Swing for right arm
  ctx.drawImage(
    pedestrianImages.arms,
    sxArm, syArm, armSpriteWidth, armSpriteHeight,
    -armW / 2, -armH / 2, armW, armH
  );
  ctx.restore();

  // --- Draw Body (on top of arms) ---
  ctx.drawImage(
    pedestrianImages.bodies,
    sxBody, syBody, bodySpriteWidth, bodySpriteHeight,
    -bodyW / 2, -bodyH / 2, bodyW, bodyH
  );

  ctx.restore();
}

// Fallback drawing function if sprites aren't loaded
function drawCircleNPC(r, state, npc) {
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(npc.pos.x*ts, npc.pos.y*ts);
  
  if (!npc.color) {
    const hue = 120 + Math.random() * 140;
    const sat = 25 + Math.random() * 20;
    const lig = 45 + Math.random() * 20;
    npc.color = `hsl(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(lig)}%)`;
  }
  
  ctx.fillStyle = npc.color;
  const size = ts * 0.15;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI*2);
  ctx.fill();
  
  ctx.restore();
}