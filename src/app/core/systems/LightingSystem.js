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

    // Preserve previous canvas state values we will override later
    const prevAlpha = ctx.globalAlpha;
    const prevOp = ctx.globalCompositeOperation;
    ctx.save();

    const ts = state.world.tileSize;

    // The transform is now set by the RenderSystem before this is called.
    // We start by clearing the lighting buffer and filling it with darkness.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Use screen space for clearing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore(); // Restore world transform

    // Draw darkness overlay
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0, ${this.nightAlpha})`;
    // Use screen-space coordinates to fill the whole buffer, regardless of camera
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Render light sources using destination-out to erase darkness
    ctx.globalCompositeOperation = 'destination-out';

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
        // The gradient for destination-out should be opaque where light is bright
        // and transparent where it's dim. Color doesn't matter, only alpha.
        const color = `rgba(0,0,0,${intensity})`;
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.3, `rgba(0,0,0,${intensity * 0.7})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

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
          const color = `rgba(0,0,0,${vIntensity})`;
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.5, `rgba(0,0,0,${vIntensity * 0.5})`);
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          
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

    // --- Wall illumination pass: brighten walls using adjacent ground light ---
    const map = state.world?.map; if (map?.buildings?.length) {
      // Collect lights (static + vehicle headlights resolved to world)
      const lights = [];
      for (const e of (state.entities||[])) {
        if (e.type === 'light' && e.light?.active) lights.push({pos:e.pos, ...e.light});
        if (e.type === 'vehicle' && e.lightSources) {
          const c=Math.cos(e.rot||0), s=Math.sin(e.rot||0);
          for (const L of e.lightSources) if (L.active){
            const ox=L.offset.x*c - L.offset.y*s, oy=L.offset.x*s + L.offset.y*c;
            lights.push({pos:{x:e.pos.x+ox,y:e.pos.y+oy}, kind:'cone', radius:L.radius, intensity:L.intensity, direction:e.rot||0, coneAngle:L.coneAngle||Math.PI/6});
          }
        }
      }
      // Helper to accumulate ground light at a point
      const groundLightAt = (p, n) => {
        let sum = 0;
        for (const L of lights) {
          const dx = p.x - L.pos.x, dy = p.y - L.pos.y;
          const dist = Math.hypot(dx, dy); if (dist > (L.radius||0)) continue;
          // Cone check for headlights
          if (L.kind === 'cone') {
            // Normalize angle difference into [-PI,PI] then abs it
            let ang = Math.atan2(dy, dx) - (L.direction || 0);
            ang = ang + Math.PI * 3; // shift positive
            ang = ang % (Math.PI * 2);
            ang = ang - Math.PI;
            ang = Math.abs(ang);
            if (ang > (L.coneAngle||0)) continue;
          }
          const dirN = { x: (dx/dist)||0, y: (dy/dist)||0 };
          const facing = Math.max(0, -(dirN.x*n.x + dirN.y*n.y)); // prefer light on face normal
          const falloff = 1 - (dist / (L.radius||1));
          sum += (L.intensity||1) * falloff * (0.5 + 0.5 * facing);
        }
        return Math.min(1, sum);
      };
      // Draw a thin destination-out stroke along each wall edge proportional to ground light there
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round';
      for (const b of map.buildings) {
        const h = (b.currentHeight ?? b.height) || 0; if (h <= 0.1) continue;
        const x=b.rect.x, y=b.rect.y, w=b.rect.width, ht=b.rect.height;
        const edges = [
          { p1:{x,     y},     p2:{x+w, y    }, n:{x:0,  y:-1} }, // top
          { p1:{x,     y+ht},  p2:{x+w, y+ht}, n:{x:0,  y:1 } }, // bottom
          { p1:{x,     y},     p2:{x,   y+ht}, n:{x:-1, y:0 } }, // left
          { p1:{x:x+w, y},     p2:{x+w, y+ht}, n:{x:1,  y:0 } }  // right
        ];
        for (const e of edges) {
          const mx=(e.p1.x+e.p2.x)/2, my=(e.p1.y+e.p2.y)/2;
          const sample={ x: mx + e.n.x*0.2, y: my + e.n.y*0.2 };
          const I = groundLightAt(sample, e.n); if (I <= 0) continue;
          const alpha = Math.max(0, Math.min(0.9, I * 0.85));
          ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
          ctx.lineWidth = ts * 0.18;
          ctx.beginPath(); ctx.moveTo(e.p1.x*ts, e.p1.y*ts); ctx.lineTo(e.p2.x*ts, e.p2.y*ts); ctx.stroke();
        }
      }
      ctx.restore();
    }

    ctx.globalAlpha = prevAlpha;
    ctx.globalCompositeOperation = prevOp;
    ctx.restore();
  }
}