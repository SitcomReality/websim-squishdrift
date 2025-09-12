// src/app/core/systems/LightingSystem.js
export class LightingSystem {
  constructor() {
    this.enabled = true;
    this.nightAlpha = 0.94; // 0..1
    this.color = '#000000';
  }

  setEnabled(v) { this.enabled = !!v; }
  setAlpha(a) { this.nightAlpha = Math.max(0, Math.min(1, a)); }
  setNight(on = true, alpha = this.nightAlpha) { this.enabled = !!on; this.setAlpha(alpha); }

  update(/* state, dt */) {
    // Placeholder for future day/night or flicker logic
  }

  render(state, renderer) {
    if (!this.enabled || this.nightAlpha <= 0) return;
    const { ctx, canvas } = renderer;
    if (!ctx || !canvas || !state?.world?.tileSize || !state?.camera) return;

    const ts = state.world.tileSize;
    const z = state.camera.zoom || 1;

    // Compute visible world rect in tile space (match other renderers)
    const wTiles = Math.ceil(canvas.width / (ts * z)) + 2;
    const hTiles = Math.ceil(canvas.height / (ts * z)) + 2;
    const sx = Math.floor((state.camera.x || 0) - wTiles / 2);
    const sy = Math.floor((state.camera.y || 0) - hTiles / 2);

    // Draw darkness in world space (assumes world transform already applied)
    ctx.save();
    const prevOp = ctx.globalCompositeOperation;
    const prevAlpha = ctx.globalAlpha;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = this.nightAlpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(sx * ts, sy * ts, wTiles * ts, hTiles * ts);

    // Render light sources using destination-out to erase darkness
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1.0; // Reset alpha for drawing lights

    const lightEntities = (state.entities || []).filter(e => e.type === 'light' && e.light?.active);

    for (const entity of lightEntities) {
        const light = entity.light;
        const lx = entity.pos.x * ts;
        const ly = entity.pos.y * ts;
        const radiusPx = light.radius * ts;

        // Handle flicker
        const intensity = light.intensity * (1 - light.flicker + Math.random() * light.flicker * 2);

        const gradient = ctx.createRadialGradient(lx, ly, 0, lx, ly, radiusPx);
        
        // The gradient's alpha channel determines how much is erased.
        // We use the light's intensity to control the alpha.
        // The color itself doesn't matter for destination-out.
        gradient.addColorStop(0, `rgba(0,0,0,${intensity})`);
        gradient.addColorStop(0.3, `rgba(0,0,0,${intensity * 0.7})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(lx, ly, radiusPx, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = prevAlpha;
    ctx.globalCompositeOperation = prevOp;
    ctx.restore();
  }
}