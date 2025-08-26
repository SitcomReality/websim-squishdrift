import { VehicleArchetype, VehicleTypes } from '../vehicles/VehicleTypes.js';

export function drawVehicle(renderer, state, v) {
  const { ctx } = renderer;
  const ts = state.world.tileSize;
  
  // Get vehicle type and corresponding sprite
  const vehicleType = v.vehicleType || 'sedan';
  const vehicleImages = state.vehicleImages || {};
  const img = vehicleImages[vehicleType];
  
  if (!img) {
    // Fallback to box drawing if image not loaded
    drawBoxVehicle(renderer, state, v);
    return;
  }
  
  ctx.save();
  ctx.translate(v.pos.x * ts, v.pos.y * ts);
  ctx.rotate(v.rot || 0);
  
  // Calculate scale based on image dimensions
  const imageWidth = img.width;
  const imageHeight = img.height;
  const targetHeight = ts * 1.2; // Make vehicles slightly larger than tile size
  const scale = targetHeight / imageHeight;
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  
  // Center the image
  const offsetX = -scaledWidth / 2;
  const offsetY = -scaledHeight / 2;
  
  // Draw the sprite
  ctx.drawImage(
    img,
    offsetX,
    offsetY,
    scaledWidth,
    scaledHeight
  );
  
  // Draw health bar above vehicles
  if (v.health && v.health.maxHealth) {
    const healthPercent = v.health.hp / v.health.maxHealth;
    const barWidth = scaledWidth * 0.8;
    const barHeight = 4;
    const barX = -barWidth / 2;
    const barY = offsetY - barHeight - 8;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health bar
    const healthColor = healthPercent > 0.6 ? '#4CAF50' : 
                       healthPercent > 0.3 ? '#FF9800' : '#F44336';
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }
  
  // Draw siren for emergency vehicles
  if (v.siren && v.vehicleType === 'emergency') {
    const now = Date.now();
    const blink = Math.floor(now / 500) % 2 === 0;
    
    ctx.fillStyle = blink ? '#FF0000' : '#0000FF';
    ctx.beginPath();
    ctx.arc(0, -scaledHeight/2 - 10, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

// Fallback box drawing function
function drawBoxVehicle(renderer, state, v) {
  const { ctx } = renderer;
  const ts = state.world.tileSize;
  const w = ts * (v.width || 0.9);
  const h = ts * (v.height || 0.5);
  
  ctx.save();
  ctx.translate(v.pos.x * ts, v.pos.y * ts);
  ctx.rotate(v.rot || 0);
  
  ctx.fillStyle = v.color || '#555';
  ctx.fillRect(-w/2, -h/2, w, h);
  
  ctx.restore();
}

// Helper function to darken a color
function darkenColor(color, amount) {
  // Handle hex colors
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    
    r = Math.floor(r * (1 - amount));
    g = Math.floor(g * (1 - amount));
    b = Math.floor(b * (1 - amount));
    
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  // Handle hsl colors
  if (color.startsWith('hsl')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      const h = match[0];
      const s = match[1];
      const l = Math.max(0, Math.floor(parseInt(match[2]) * (1 - amount)));
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
  }
  
  // Fallback
  return color;
}