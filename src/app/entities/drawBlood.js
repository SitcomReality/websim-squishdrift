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
  const size = ts * (blood.size || 0.5) * 0.375; // Increased from 0.25 to 0.375 (50% increase)
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
  constructor(maxBloodPuddles = 15) { // Reduced from 20 to 15 for better performance
    this.maxBloodPuddles = maxBloodPuddles;
    this.bloodStains = []; // Track blood stains for efficient cleanup
  }

  addBlood(state, blood) {
    if (!state) return;
    
    // Find all existing blood stains
    const bloods = state.entities.filter(e => e.type === 'blood');
    
    // If we're at or over the limit, remove the oldest
    if (bloods.length >= this.maxBloodPuddles) {
      // Sort by creation time (oldest first)
      const sortedBloods = bloods.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      
      // Remove oldest blood stains
      const removeCount = Math.min(bloods.length - this.maxBloodPuddles + 1, sortedBloods.length);
      for (let i = 0; i < removeCount; i++) {
        const index = state.entities.indexOf(sortedBloods[i]);
        if (index > -1) {
          state.entities.splice(index, 1);
        }
      }
    }
    
    // Add the new blood stain
    blood.createdAt = Date.now();
    state.entities.push(blood);
  }

  cleanup(state) {
    if (!state) return;
    
    const bloods = state.entities.filter(e => e.type === 'blood');
    if (bloods.length > this.maxBloodPuddles) {
      const sortedBloods = bloods.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const removeCount = bloods.length - this.maxBloodPuddles;
      
      for (let i = 0; i < removeCount; i++) {
        const index = state.entities.indexOf(sortedBloods[i]);
        if (index > -1) {
          state.entities.splice(index, 1);
        }
      }
    }
  }
}