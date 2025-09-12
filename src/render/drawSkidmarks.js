export function drawSkidmarks(r, state) {
  const { ctx } = r, ts = state.world.tileSize;
  const marks = state.skidmarks || [];
  if (!marks.length) return;

  ctx.save();
  for (const m of marks) {
    const fade = Math.max(0, 1 - (m.age / (m.fadeDuration || 9999))); // age fade optional
    const alpha = (m.alpha ?? 0.3) * fade;
    
    // Use custom color if provided, otherwise default black
    ctx.strokeStyle = m.color || `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = m.widthPx ?? 2;
    ctx.beginPath();
    ctx.moveTo(m.left.x * ts, m.left.y * ts);
    ctx.lineTo(m.right.x * ts, m.right.y * ts);
    ctx.stroke();
  }
  ctx.restore();
}

