import { VehicleArchetype, VehicleTypes } from '../vehicles/VehicleTypes.js';

export function drawVehicle(renderer, state, v) {
  const { ctx } = renderer, ts = state.world.tileSize;
  
  // Get vehicle properties, falling back to archetype if not defined
  const vehicleType = v.vehicleType || 'sedan';
  const typeProps = VehicleTypes[vehicleType] || VehicleArchetype;
  
  // Use vehicle-specific properties if available, otherwise use type defaults
  const color = v.color || typeProps.color;
  const width = v.width || typeProps.width;
  const height = v.height || typeProps.height;
  const cornerRadius = v.cornerRadius || typeProps.cornerRadius;
  const w = ts * width;
  const h = ts * height;
  
  // Normalize semantics: length = larger body dimension (forward axis), width = smaller (cross axis)
  const lengthPx = Math.max(w, h);
  const widthPx  = Math.min(w, h);
  
  ctx.save();
  ctx.translate(v.pos.x * ts, v.pos.y * ts);
  ctx.rotate(v.rot || 0);
  
  // Draw main body with rounded corners
  ctx.fillStyle = color;
  
  // Calculate rounded rectangle path
  const cx = 0, cy = 0;
  const hw = lengthPx/2, hh = widthPx/2;
  const r = Math.min(hw * cornerRadius, hh * cornerRadius);
  
  ctx.beginPath();
  ctx.moveTo(cx - hw + r, cy - hh);
  ctx.lineTo(cx + hw - r, cy - hh);
  ctx.quadraticCurveTo(cx + hw, cy - hh, cx + hw, cy - hh + r);
  ctx.lineTo(cx + hw, cy + hh - r);
  ctx.quadraticCurveTo(cx + hw, cy + hh, cx + hw - r, cy + hh);
  ctx.lineTo(cx - hw + r, cy + hh);
  ctx.quadraticCurveTo(cx - hw, cy + hh, cx - hw, cy + hh - r);
  ctx.lineTo(cx - hw, cy - hh + r);
  ctx.quadraticCurveTo(cx - hw, cy - hh, cx - hw + r, cy - hh);
  ctx.closePath();
  ctx.fill();
  
  // Draw cabin - darker rectangle in central area
  const cabinLength = lengthPx * 0.65; // Reduced from 0.75 to 0.65
  const cabinWidth  = widthPx  * 0.6;  // 60% of vehicle width (breadth)
  const cabinX = -cabinLength / 2;
  const cabinY = -cabinWidth  / 2;
  
  // Create a darker version of the base color
  const darkerColor = darkenColor(color, 0.3);
  ctx.fillStyle = darkerColor;
  ctx.fillRect(cabinX, cabinY, cabinLength, cabinWidth);
  
  // Get lighting properties
  const headlights = { ...VehicleArchetype.headlights, ...typeProps.headlights, ...(v.headlights || {}) };
  const brakeLights = { ...VehicleArchetype.brakeLights, ...typeProps.brakeLights, ...(v.brakeLights || {}) };
  
  // Draw headlights
  ctx.fillStyle = headlights.color;
  const headX = hw * (headlights.frontOffset || 0.4);
  
  for (let i = 0; i < headlights.count; i++) {
    const offset = (i - (headlights.count - 1) / 2) * (headlights.spacing * ts);
    const headlightW = ts * headlights.width;
    const headlightH = ts * headlights.height;
    
    ctx.fillRect(
      headX - headlightW/2,
      offset - headlightH/2,
      headlightW,
      headlightH
    );
  }
  
  // Draw brake lights
  const brakeX = -hw * (brakeLights.rearOffset || 0.5);
  const brakeLightWidth = ts * (brakeLights.width || VehicleArchetype.brakeLights.width);
  const brakeLightHeight = ts * (brakeLights.height || VehicleArchetype.brakeLights.height);
  
  for (let i = 0; i < brakeLights.count; i++) {
    const offset = (i - (brakeLights.count - 1) / 2) * (brakeLights.spacing * ts);
    ctx.fillStyle = v.brakeLight ? brakeLights.onColor : brakeLights.offColor;
    ctx.fillRect(
      brakeX - brakeLightWidth / 2,
      offset - brakeLightHeight / 2,
      brakeLightWidth,
      brakeLightHeight
    );
  }
  
  // Add windows if defined
  if (v.windows || typeProps.windows) {
    const windows = v.windows || typeProps.windows;
    ctx.fillStyle = '#333';
    
    if (windows.front) {
      const win = windows.front;
      ctx.fillRect(
        headX - hw * win.width/2,
        -widthPx * win.height/2,
        hw * win.width,
        widthPx * win.height
      );
    }
    
    if (windows.rear) {
      const win = windows.rear;
      ctx.fillRect(
        brakeX - hw * win.width/2,
        -widthPx * win.height/2,
        hw * win.width,
        widthPx * win.height
      );
    }
  }
  
  // Add stripes or decals if defined
  if (v.stripes || typeProps.stripes) {
    const stripes = v.stripes || typeProps.stripes;
    ctx.fillStyle = stripes.color || '#fff';
    
    for (const stripe of stripes.list || []) {
      ctx.fillRect(
        -hw * stripe.x,
        -hh * stripe.y,
        hw * stripe.width,
        hh * stripe.height
      );
    }
  }
  
  // Draw sirens for emergency vehicles
  if (v.vehicleType === 'emergency' && v.siren) {
    ctx.fillStyle = Math.floor(Date.now() / 500) % 2 ? '#ff0000' : '#0000ff';
    ctx.beginPath();
    ctx.arc(headX + ts * 0.1, 0, ts * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  
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