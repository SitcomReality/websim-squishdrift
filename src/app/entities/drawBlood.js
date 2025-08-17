export function drawBlood(r, state, blood) {
  const { ctx } = r, ts = state.world.tileSize;
  ctx.save();
  ctx.translate(blood.pos.x * ts, blood.pos.y * ts);
  ctx.rotate(blood.rotation || 0);
  
  // Create a realistic blood stain shape
  ctx.fillStyle = blood.color || 'hsl(0, 70%, 35%)';
  ctx.globalAlpha = 0.75; // 75% opacity
  ctx.beginPath();
  
  // Create an irregular blood stain shape - use fixed random values
  const size = ts * (blood.size || 0.125); // Reduced from 0.5 to 0.125 (25% of original)
  const segments = 8;
  const random = blood.random || [];
  
  // Generate fixed random values for this blood stain
  if (random.length === 0) {
    for (let i = 0; i < segments; i++) {
      random.push(0.7 + Math.random() * 0.3);
    }
    blood.random = random;
  }
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const radius = size * random[i];
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

// Blood management system
export class BloodManager {
  constructor(maxBloodPuddles = 25) { // Changed from 20 to 25
    this.maxBloodPuddles = maxBloodPuddles;
  }

  addBlood(state, blood) {
    const bloods = state.entities.filter(e => e.type === 'blood');
    
    // If we're over the limit, remove oldest blood puddles
    if (bloods.length >= this.maxBloodPuddles) {
      // Sort by age (oldest first)
      const sortedBloods = bloods.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      
      // Remove oldest puddles until we're at the limit
      const removeCount = sortedBloods.length - this.maxBloodPuddles + 1;
      for (let i = 0; i < removeCount; i++) {
        const index = state.entities.indexOf(sortedBloods[i]);
        if (index > -1) {
          state.entities.splice(index, 1);
        }
      }
    }
    
    // Add the new blood puddle
    blood.createdAt = Date.now();
    state.entities.push(blood);
  }
}