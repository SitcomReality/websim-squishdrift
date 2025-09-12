// src/app/core/systems/LightingSystem.js
import { getOccludersInRadius, computeVisibilityPolygon } from '../../../render/occlusion.js';

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

    ctx.save();
    const prevOp = ctx.globalCompositeOperation;

    // 1. Darken the scene with multiply
    ctx.globalCompositeOperation = 'multiply';
    const darkness = 1.0 - this.nightAlpha;
    const darknessRgb = Math.floor(255 * darkness);
    ctx.fillStyle = `rgb(${darknessRgb}, ${darknessRgb}, ${darknessRgb})`;
    ctx.fillRect(sx * ts, sy * ts, wTiles * ts, hTiles * ts);

    // 2. Additive lights
    ctx.globalCompositeOperation = 'screen';

    const lightEntities = (state.entities || []).filter(e => e.type === 'light' && e.light?.active);

    for (const entity of lightEntities) {
        const light = entity.light;
        const lightPosition = entity.pos;
        
        const occluders = getOccludersInRadius(state, lightPosition, light.radius);
        
        ctx.save();

        if (occluders.length > 0) {
            const visibilityPolygon = computeVisibilityPolygon(lightPosition, light.radius, occluders);
            // Create clipping path from visibility polygon
            ctx.beginPath();
            if (visibilityPolygon.length > 0) {
                ctx.moveTo(visibilityPolygon[0].x * ts, visibilityPolygon[0].y * ts);
                for (let i = 1; i < visibilityPolygon.length; i++) {
                    ctx.lineTo(visibilityPolygon[i].x * ts, visibilityPolygon[i].y * ts);
                }
            }
            ctx.closePath();
            ctx.clip();
        }
        
        // Render the light source (clipped if occluders were present)
        const lx_px = lightPosition.x * ts;
        const ly_px = lightPosition.y * ts;
        const radiusPx = light.radius * ts;

        const rawIntensity = Number.isFinite(light.intensity) ? light.intensity : 1;
        const intensity = Math.max(0, Math.min(1, rawIntensity * (1 - (light.flicker || 0) + Math.random() * (light.flicker || 0) * 2)));
        if (!isFinite(lx_px) || !isFinite(ly_px) || !isFinite(radiusPx) || radiusPx <= 0) {
            ctx.restore();
            continue;
        }

        const gradient = ctx.createRadialGradient(lx_px, ly_px, 0, lx_px, ly_px, radiusPx);
        const color = light.color || 'rgba(255,240,200,1)';
        const baseColor = color.substring(0, color.lastIndexOf(','));
        
        gradient.addColorStop(0, `${baseColor}, ${intensity})`);
        gradient.addColorStop(0.3, `${baseColor}, ${intensity * 0.7})`);
        gradient.addColorStop(1, `${baseColor}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(lx_px, ly_px, radiusPx, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore(); // remove clip
    }

    // Render vehicle headlights
    const vehicles = (state.entities || []).filter(e => e.type === 'vehicle' && e.lightSources);
    for (const vehicle of vehicles) {
      if (!vehicle.lightSources) continue;

      for (const lightDef of vehicle.lightSources) {
        if (!lightDef.active) continue;

        // Transform light offset from vehicle-local to world space
        const cos = Math.cos(vehicle.rot);
        const sin = Math.sin(vehicle.rot);
        const worldOffsetX = lightDef.offset.x * cos - lightDef.offset.y * sin;
        const worldOffsetY = lightDef.offset.x * sin + lightDef.offset.y * cos;
        
        const lightPosition = { x: vehicle.pos.x + worldOffsetX, y: vehicle.pos.y + worldOffsetY };

        const occluders = getOccludersInRadius(state, lightPosition, lightDef.radius);

        ctx.save();
        
        if (occluders.length > 0) {
            const visibilityPolygon = computeVisibilityPolygon(lightPosition, lightDef.radius, occluders);
            // Create clipping path from visibility polygon
            ctx.beginPath();
            if (visibilityPolygon.length > 0) {
                ctx.moveTo(visibilityPolygon[0].x * ts, visibilityPolygon[0].y * ts);
                for (let i = 1; i < visibilityPolygon.length; i++) {
                    ctx.lineTo(visibilityPolygon[i].x * ts, visibilityPolygon[i].y * ts);
                }
            }
            ctx.closePath();
            ctx.clip();
        }

        const lx_px = lightPosition.x * ts;
        const ly_px = lightPosition.y * ts;
        const radiusPx = lightDef.radius * ts;

        const rawVDI = Number.isFinite(lightDef.intensity) ? lightDef.intensity : 1;
        const vIntensity = Math.max(0, Math.min(1, rawVDI));
        if (!isFinite(lx_px) || !isFinite(ly_px) || !isFinite(radiusPx) || radiusPx <= 0) {
          ctx.restore();
          continue;
        }

        if (lightDef.kind === 'cone') {
          const startAngle = vehicle.rot - lightDef.coneAngle / 2;
          const endAngle = vehicle.rot + lightDef.coneAngle / 2;
          
          const gradient = ctx.createRadialGradient(lx_px, ly_px, 0, lx_px, ly_px, radiusPx);
          const color = lightDef.color || 'rgba(255,255,255,1)';
          const baseColor = color.substring(0, color.lastIndexOf(',')) || 'rgba(255,255,255';

          gradient.addColorStop(0, `${baseColor}, ${vIntensity})`);
          gradient.addColorStop(0.5, `${baseColor}, ${vIntensity * 0.5})`);
          gradient.addColorStop(1, `${baseColor}, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(lx_px, ly_px);
          ctx.arc(lx_px, ly_px, radiusPx, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();
        }
        
        ctx.restore(); // remove clip
      }
    }

    ctx.globalCompositeOperation = prevOp;
    ctx.restore();
  }
}