export function drawVehicle(r, state, v){
  const { ctx } = r, ts = state.world.tileSize;
  const w = ts * 0.9, h = ts * 0.5;

  ctx.save();
  ctx.translate(v.pos.x * ts, v.pos.y * ts);
  ctx.rotate(v.rot || 0);

  // Body
  ctx.fillStyle = '#555';
  ctx.fillRect(-w*0.5, -h*0.5, w, h);

  // Two headlights side-by-side (aligned with vehicle width)
  ctx.fillStyle = '#fff';
  const headlightSize = ts * 0.15;
  const headlightSpacing = ts * 0.25;
  ctx.fillRect(headlightSpacing/2, -headlightSize/2, headlightSize, headlightSize);
  ctx.fillRect(-headlightSpacing/2 - headlightSize, -headlightSize/2, headlightSize, headlightSize);

  // Brake lights (side-by-side, darker when off)
  ctx.fillStyle = v.brakeLight ? '#ff2d2d' : '#4a0000';
  ctx.fillRect(-h*0.3, -h*0.5, 4, h*0.3);
  ctx.fillRect(-h*0.3, h*0.2, 4, h*0.3);

  ctx.restore();
}

