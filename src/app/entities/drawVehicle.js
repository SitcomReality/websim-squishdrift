export function drawVehicle(r, state, v){
  const { ctx } = r, ts = state.world.tileSize;
  const w = ts * 0.9, h = ts * 0.5;

  ctx.save();
  ctx.translate(v.pos.x * ts, v.pos.y * ts);
  ctx.rotate(v.rot || 0);

  // Body with rounded front corners
  ctx.fillStyle = '#555';
  
  // Draw main body
  ctx.beginPath();
  const cornerRadius = w * 0.15; // Slight rounding for aerodynamic look
  const frontOffset = w * 0.5;
  const rearOffset = -w * 0.5;
  
  // Start at bottom-left
  ctx.moveTo(rearOffset, -h * 0.5);
  
  // Bottom edge
  ctx.lineTo(frontOffset - cornerRadius, -h * 0.5);
  
  // Bottom-right rounded corner
  ctx.arcTo(frontOffset, -h * 0.5, frontOffset, -h * 0.5 + cornerRadius, cornerRadius);
  
  // Right edge
  ctx.lineTo(frontOffset, h * 0.5 - cornerRadius);
  
  // Top-right rounded corner
  ctx.arcTo(frontOffset, h * 0.5, frontOffset - cornerRadius, h * 0.5, cornerRadius);
  
  // Top edge
  ctx.lineTo(rearOffset, h * 0.5);
  
  // Left edge (straight)
  ctx.lineTo(rearOffset, -h * 0.5);
  
  ctx.closePath();
  ctx.fill();

  // Two headlights (side-by-side)
  ctx.fillStyle = '#fff';
  const headlightSize = ts * 0.15;
  const headlightSpacing = ts * 0.25;
  // Position headlights forward on the vehicle (x) and offset across the width (y) so they sit side-by-side
  const headX = w * 0.25;
  ctx.fillRect(headX - headlightSize/2, -headlightSpacing/2 - headlightSize/2, headlightSize, headlightSize);
  ctx.fillRect(headX - headlightSize/2, headlightSpacing/2 - headlightSize/2, headlightSize, headlightSize);

  // Brake lights (darker when off)
  ctx.fillStyle = v.brakeLight ? '#ff2d2d' : '#4a0000'; // Darker red when off
  ctx.fillRect(-w*0.5, -h*0.5, 4, h*0.3);
  ctx.fillRect(-w*0.5, h*0.2, 4, h*0.3);

  ctx.restore();
}