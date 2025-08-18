export function drawVehicle(r, state, v){
  const { ctx } = r, ts = state.world.tileSize;
  const w = ts * 0.9, h = ts * 0.5;

  ctx.save();
  ctx.translate(v.pos.x * ts, v.pos.y * ts);
  ctx.rotate(v.rot || 0);

  // Body
  ctx.fillStyle = '#555'; // neutral body color
  ctx.fillRect(-w*0.5, -h*0.5, w, h);

  // Two headlights (front)
  ctx.fillStyle = '#fff';
  const headlightWidth = ts * 0.12;
  const headlightHeight = 4;
  const headlightY = -h*0.5 + 2;
  
  // Left headlight
  ctx.fillRect(-w*0.25, headlightY, headlightWidth, headlightHeight);
  // Right headlight
  ctx.fillRect(w*0.25 - headlightWidth, headlightY, headlightWidth, headlightHeight);

  // Brake lights (rear) - darker when off
  ctx.fillStyle = v.brakeLight ? '#ff2d2d' : '#661111'; // Darker red when off
  const brakeLightWidth = 4;
  const brakeLightHeight = h * 0.3;
  const leftBrakeX = -w*0.5 + 2;
  const rightBrakeX = w*0.5 - 6;
  
  // Left brake light
  ctx.fillRect(leftBrakeX, -h*0.5 + 2, brakeLightWidth, brakeLightHeight);
  // Right brake light
  ctx.fillRect(rightBrakeX, -h*0.5 + 2, brakeLightWidth, brakeLightHeight);

  ctx.restore();
}

