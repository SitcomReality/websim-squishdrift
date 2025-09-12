export function drawFlattenEffects(state, renderer) {
    const { ctx, canvas } = renderer;

    // Flatten pulse FX (expanding ring + tint)
    if (state.flattenFX?.active) {
      const fx = state.flattenFX, p = Math.min(1, fx.t / fx.duration);
      const ts = state.world.tileSize, z = state.camera?.zoom || 1;
      const cx = Math.floor(canvas.width/2), cy = Math.floor(canvas.height/2);
      const sx = cx + (fx.origin.x - (state.camera?.x||0)) * ts * z;
      const sy = cy + (fx.origin.y - (state.camera?.y||0)) * ts * z;
      const color = fx.mode === 'down' ? 'rgba(0,229,255,' : 'rgba(255,209,102, ';
      const r = (Math.hypot(canvas.width, canvas.height) * 0.5) * p;
      ctx.save(); ctx.setTransform(1,0,0,1,0,0);
      ctx.strokeStyle = `${color}${1 - p})`; ctx.lineWidth = 6 + 24 * (1 - p);
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = `${color}${0.08 * (1 - p)})`; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.restore();
    }
    
    // Warning ring when auto-flatten is about to expire (last 3s)
    if (state.flattenAuto?.active) {
      const now = Date.now();
      const timeLeft = Math.max(0, state.flattenAuto.expiresAt - now);
      if (timeLeft <= 3000) {
        const warnP = timeLeft / 3000;           // 1 -> 0
        const intensity = 1 - warnP;             // 0 -> 1
        const freq = 1 + intensity * 6;          // speeds up as it nears 0
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.12;
        // determine origin (fallback to player if no current fx origin)
        const ref = (state.control?.inVehicle ? state.control.vehicle?.pos : state.entities.find(e=>e.type==='player')?.pos) || state.flattenFX?.origin || {x:0,y:0};
        const ts = state.world.tileSize, z = state.camera?.zoom || 1;
        const cx = Math.floor(canvas.width/2), cy = Math.floor(canvas.height/2);
        const sx = cx + (ref.x - (state.camera?.x||0)) * ts * z;
        const sy = cy + (ref.y - (state.camera?.y||0)) * ts * z;
        const t = (now % 1000) / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * freq);
        const radius = baseRadius * (0.8 + intensity * 1.5) * (0.9 + 0.2 * pulse);
        ctx.save(); ctx.setTransform(1,0,0,1,0,0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,209,102,${0.25 + 0.5 * intensity})`;
        ctx.lineWidth = 2 + 6 * intensity * pulse;
        ctx.beginPath();ctx.arc(sx, sy, radius, 0, Math.PI*2);ctx.stroke();
        // subtle center flash growing as it nears end
        ctx.fillStyle = `rgba(255,209,102,${0.03 + 0.12 * intensity * pulse})`;
        ctx.beginPath();ctx.arc(sx, sy, radius * 0.35 * (0.7 + 0.6 * pulse), 0, Math.PI*2);ctx.fill();
        ctx.restore();
      }
    }
}