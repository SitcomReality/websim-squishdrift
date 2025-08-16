export function drawVehicle(r, state, v){
  const { ctx } = r, ts = state.world.tileSize;
  const w = ts * 0.9, h = ts * 0.5;

  // Ensure hitbox is properly sized
  if (!v.hitbox) {
    v.hitbox = {
      x: v.pos.x - 0.45,
      y: v.pos.y - 0.25,
      width: 0.9,
      height: 0.5
    };
  }

  ctx.save();
  ctx.translate(v.pos.x * ts, v.pos.y * ts);
  ctx.rotate(v.rot || 0);

  // Body
  ctx.fillStyle = '#555'; // neutral body color
  ctx.fillRect(-w*0.5, -h*0.5, w, h);

  // Headlights (front)
  ctx.fillStyle = '#fff';
  ctx.fillRect(w*0.25, -2, ts*0.18, 4);

  // Brake lights (rear)
  ctx.fillStyle = v.brakeLight ? '#ff2d2d' : '#aa3333';
  ctx.fillRect(-w*0.5, -h*0.5, 4, h*0.3);
  ctx.fillRect(-w*0.5, h*0.2, 4, h*0.3);

  ctx.restore();
}

