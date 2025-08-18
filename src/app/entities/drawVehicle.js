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
  
  ctx.save();
  ctx.translate(v.pos.x * ts, v.pos.y * ts);
  ctx.rotate(v.rot || 0);
  
  // Draw main body with rounded corners
  ctx.fillStyle = color;
  
  // Calculate rounded rectangle path
  const cx = 0, cy = 0;
  const hw = w/2, hh = h/2;
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
  
  // Get lighting properties
  const headlights = { ...VehicleArchetype.headlights, ...typeProps.headlights, ...(v.headlights || {}) };
  const brakeLights = { ...VehicleArchetype.brakeLights, ...typeProps.brakeLights, ...(v.brakeLights || {}) };
  
  // Draw headlights
  ctx.fillStyle = headlights.color;
  const headX = hw * headlights.frontOffset;
  
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
  
  // Draw brake lights - now two side-by-side brake lights
  const brakeX = -hw * (brakeLights.rearOffset || 0.5);
  const brakeW = brakeLights.width; // Individual light width
  const brakeH = brakeLights.height * h;
  const brakeSpacing = w * 0.3; // Spacing between the two brake lights
  
  // Left brake light
  ctx.fillStyle = v.brakeLight ? brakeLights.onColor : brakeLights.offColor;
  ctx.fillRect(
    brakeX - brakeSpacing/2,
    -brakeH/2,
    brakeW,
    brakeH
  );
  
  // Right brake light
  ctx.fillRect(
    brakeX + brakeSpacing/2 - brakeW/2,
    -brakeH/2,
    brakeW,
    brakeH
  );
  
  // Add windows if defined
  if (v.windows || typeProps.windows) {
    const windows = v.windows || typeProps.windows;
    ctx.fillStyle = '#333';
    
    if (windows.front) {
      const win = windows.front;
      ctx.fillRect(
        headX - hw * win.width/2,
        -h * win.height/2,
        hw * win.width,
        h * win.height
      );
    }
    
    if (windows.rear) {
      const win = windows.rear;
      ctx.fillRect(
        brakeX - hw * win.width/2,
        -h * win.height/2,
        hw * win.width,
        h * win.height
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