import { Vec2 } from '../../utils/Vec2.js';

export function drawItem(r, state, item){
  const { ctx } = r, ts = state.world.tileSize;

  const imageMap = {
    'Pistol': 'pistol',
    'AK47': 'ak47',
    'Shotgun': 'shotgun',
    'Grenade': 'grenade',
    'Health': 'health',
    'Bribe': 'bribe'
  };

  const imageName = imageMap[item.name];

  // Handle image-based pickups
  if (imageName && state.pickupImages?.[imageName]) {
    const img = state.pickupImages[imageName];
    // Make pickups 25% of their previous size (previously ~0.75*ts -> now 0.75*0.25 = 0.1875*ts)
    const itemSize = ts * 0.1875;
    const aspect = img.width / img.height;
    const w = itemSize;
    const h = itemSize / aspect;
    
    ctx.save();
    ctx.translate(item.pos.x * ts, item.pos.y * ts);
    
    // Add a subtle glow effect for health pickups
    if (item.name === 'Health') {
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  // Fallback to drawing a circle for other items
  ctx.save();
  ctx.translate(item.pos.x * ts, item.pos.y * ts);
  
  // Special rendering for health pickup
  if (item.name === 'Health') {
    // Draw health cross
    ctx.fillStyle = '#00ff00';
    // Scale health cross down to 25% of previous dimensions
    ctx.fillRect(-ts * 0.0375, -ts * 0.075, ts * 0.075, ts * 0.0375);
    ctx.fillRect(-ts * 0.01875, -ts * 0.09375, ts * 0.0375, ts * 0.09375);
  } else {
    // Default circle for other items
    ctx.fillStyle = item.color || '#FFD700';
    ctx.beginPath();
    // Reduce circle radius to 25% of previous (0.25 -> 0.0625)
    ctx.arc(0, 0, ts * 0.0625, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}