Here is the updated code for src/app/core/systems/rendering/applyLighting.js:
```javascript
// src/app/core/systems/rendering/applyLighting.js
export function applyLighting(renderer, state, lightingCanvas, lightingCtx) {
  if (!state.lightingSystem || !lightingCanvas) return;

  const { ctx, canvas } = renderer;
  const { width, height } = canvas;
  if (lightingCanvas.width !== width || lightingCanvas.height !== height) {
    lightingCanvas.width = width;
    lightingCanvas.height = height;
  }

  // Render lights and shadows to the offscreen buffer using same world transform
  lightingCtx.save();
  lightingCtx.setTransform(ctx.getTransform());

  // Render lights and shadows to the offscreen buffer.
  state.lightingSystem.render(state, { canvas: lightingCanvas, ctx: lightingCtx });

  lightingCtx.restore();

  // Now, draw the completed lighting buffer onto the main canvas.
  // We use 'multiply' to darken the scene based on the light map.
  // We need to do this in screen space, so we reset the transform on the main context.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lightingCanvas, 0, 0);
  ctx.restore(); // Restores world transform and composite operation for any subsequent draws.
}
```

src/app/core/systems/LightingSystem.js
```
// src/app/core/systems/LightingSystem.js
import { applyLighting } from './rendering/applyLighting.js';
import { drawTiles } from '../../../render/drawTiles.js';
import { drawBuildings } from '../../entities/drawBuildings.js';

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

  update(state, input) {
    const target = state.control.inVehicle ? state.control.vehicle.pos : 
                  state.entities.find(e => e.type === 'player')?.pos;
    if (!target) return;
    const cam = state.camera; cam.defaultZoom = cam.defaultZoom || cam.zoom || 1;
    
    // speed-based zoom using velocity when available (fallback to position delta)
    const now = performance.now() * 0.001; const dt = this._lastTime ? Math.max(1e-3, now - this._lastTime) : 0;
    let speed = 0;
    
    if (state.control.inVehicle && state.control.vehicle?.vel) {
      const v = state.control.vehicle.vel; speed = Math.hypot(v.x || 0, v.y || 0);
    } else {
      // Check if player is sprinting
      const player = state.entities.find(e => e.type === 'player');
      const isSprinting = player && (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) && 
                          (input.keys.has('KeyW') || input.keys.has('KeyS') || 
                           input.keys.has('KeyA') || input.keys.has('KeyD') ||
                           input.keys.has('ArrowUp') || input.keys.has('ArrowDown') ||
                           input.keys.has('ArrowLeft') || input.keys.has('ArrowRight')) &&
                           player.stamina > 0;
      
      if (isSprinting) {
        // Calculate sprint speed for zoom purposes
        const baseSpeed = player.moveSpeed || 1.5;
        const sprintSpeed = baseSpeed * 1.8; // 80% faster when sprinting
        speed = sprintSpeed;
      } else {
        speed = (this._prevTarget && dt) ? Math.hypot(target.x - this._prevTarget.x, target.y - this._prevTarget.y) / dt : 0;
      }
    }
    
    const maxRef = state.control.inVehicle ? (state.control.vehicle?.maxSpeed || 6) : ((state.entities.find(e=>e.type==='player')?.moveSpeed) || 6);
    const sensitivityMultiplier = 1.5; // Reduced from 3.5 to 1.5 for higher speed requirement
    const frac = Math.max(0, Math.min(1, (speed / (maxRef || 1)) * sensitivityMultiplier));
    // If sprinting on foot, reduce the zoom-out effect by half (less dramatic than vehicle zoom)
    const playerEntity = state.entities.find(e=>e.type==='player');
    const onFootSprinting = playerEntity && !state.control.inVehicle && (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) && playerEntity.stamina > 0;
    const adjustedFrac = onFootSprinting ? frac * 0.5 : frac;
    const minZoom = cam.defaultZoom;
    const maxZoom = cam.defaultZoom * 2;
    // INVERTED: fast = zoom OUT (far), slow = zoom IN (close)
    const desiredZoom = maxZoom - (maxZoom - minZoom) * adjustedFrac;
    // asymmetric lerp: faster snap-back when slowing/crashing
    const fastSnap = speed < 0.3 && cam.zoom > cam.defaultZoom * 1.05;
    const lerpRate = fastSnap ? 0.35 : (desiredZoom < (cam.zoom || cam.defaultZoom) ? 0.28 : 0.12);
    cam.zoom = (cam.zoom || cam.defaultZoom) + (desiredZoom - (cam.zoom || cam.defaultZoom)) * lerpRate;
    
    // manual zoom only when debug is enabled
    if (input) { 
      const minZ = cam.defaultZoom, maxZ = cam.defaultZoom * 2;
      
      input.zoomDelta = 0;
    }

    // Apply shake effect
    let shakeX = 0, shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
      
      // Stop shaking when intensity becomes very small
      if (this.shakeIntensity < 0.01) {
        this.shakeIntensity = 0;
      }
    }

    // Smooth camera movement using velocity-based interpolation
    const dx = target.x - cam.x;
    const dy = target.y - cam.y;
    
    // Use velocity-based smoothing factor instead of fixed rate
    const distance = Math.hypot(dx, dy);
    const smoothingFactor = Math.min(0.15, 0.08 + (distance * 0.02));
    
    cam.x += dx * smoothingFactor + shakeX;
    cam.y += dy * smoothingFactor + shakeY;

    const ts = state.world.tileSize;
    const canvas = document.getElementById('game');
    const viewW = (canvas?.width ?? window.innerWidth);
    const viewH = (canvas?.height ?? window.innerHeight);
    const halfX = (viewW / (ts * cam.zoom)) / 2;
    const halfY = (viewH / (ts * cam.zoom)) / 2;
    
    // Update previous target and time for speed-based zoom
    this._prevTarget = target;
    this._lastTime = now;
  }

  addShake(intensity = 1) {
    this.shakeIntensity = Math.min(this.maxShake, intensity);
  }

  // Removed drawVehicleGlow function in favor of applyLighting method
  render(state, renderer) {
    this.update(state);
    applyLighting(renderer, state, this.lightingCanvas, this.lightingCtx);
  }
}
```
</output>

Here is the updated code for src/app/core/systems/LightingSystem.js:
```javascript
// src/app/core/systems/LightingSystem.js
import { applyLighting } from './rendering/applyLighting.js';
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

  update(state, input) {
    const target = state.control.inVehicle ? state.control.vehicle.pos : 
                  state.entities.find(e => e.type === 'player')?.pos;
    if (!target) return;
    const cam = state.camera; cam.defaultZoom = cam.defaultZoom || cam.zoom || 1;
    
    // speed-based zoom using velocity when available (fallback to position delta)
    const now = performance.now() * 0.001; const dt = this._lastTime ? Math.max(1e-3, now - this._lastTime) : 0;
    let speed = 0;
    
    if (state.control.inVehicle && state.control.vehicle?.vel) {
      const v = state.control.vehicle.vel; speed = Math.hypot(v.x || 0, v.y || 0);
    } else {
      // Check if player is sprinting
      const player = state.entities.find(e => e.type === 'player');
      const isSprinting = player && (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) && 
                          (input.keys.has('KeyW') || input.keys.has('KeyS') || 
                           input.keys.has('KeyA') || input.keys.has('KeyD') ||
                           input.keys.has('ArrowUp') || input.keys.has('ArrowDown') ||
                           input.keys.has('ArrowLeft') || input.keys.has('ArrowRight')) &&
                           player.stamina > 0;
      
      if (isSprinting) {
        // Calculate sprint speed for zoom purposes
        const baseSpeed = player.moveSpeed || 1.5;
        const sprintSpeed = baseSpeed * 1.8; // 80% faster when sprinting
        speed = sprintSpeed;
      } else {
        speed = (this._prevTarget && dt) ? Math.hypot(target.x - this._prevTarget.x, target.y - this._prevTarget.y) / dt : 0;
      }
    }
    
    const maxRef = state.control.inVehicle ? (state.control.vehicle?.maxSpeed || 6) : ((state.entities.find(e=>e.type==='player')?.moveSpeed) || 6);
    const sensitivityMultiplier = 1.5; // Reduced from 3.5 to 1.5 for higher speed requirement
    const frac = Math.max(0, Math.min(1, (speed / (maxRef || 1)) * sensitivityMultiplier));
    // If sprinting on foot, reduce the zoom-out effect by half (less dramatic than vehicle zoom)
    const playerEntity = state.entities.find(e=>e.type==='player');
    const onFootSprinting = playerEntity && !state.control.inVehicle && (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) && playerEntity.stamina > 0;
    const adjustedFrac = onFootSprinting ? frac * 0.5 : frac;
    const minZoom = cam.defaultZoom;
    const maxZoom = cam.defaultZoom * 2;
    // INVERTED: fast = zoom OUT (far), slow = zoom IN (close)
    const desiredZoom = maxZoom - (maxZoom - minZoom) * adjustedFrac;
    // asymmetric lerp: faster snap-back when slowing/crashing
    const fastSnap = speed < 0.3 && cam.zoom > cam.defaultZoom * 1.05;
    const lerpRate = fastSnap ? 0.35 : (desiredZoom < (cam.zoom || cam.defaultZoom) ? 0.28 : 0.12);
    cam.zoom = (cam.zoom || cam.defaultZoom) + (desiredZoom - (cam.zoom || cam.defaultZoom)) * lerpRate;
    
    // manual zoom only when debug is enabled
    if (input) { 
      const minZ = cam.defaultZoom, maxZ = cam.defaultZoom * 2;
      
      input.zoomDelta = 0;
    }

    // Apply shake effect
    let shakeX = 0, shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
      
      // Stop shaking when intensity becomes very small
      if (this.shakeIntensity < 0.01) {
        this.shakeIntensity = 0;
      }
    }

    // Smooth camera movement using velocity-based interpolation
    const dx = target.x - cam.x;
    const dy = target.y - cam.y;
    
    // Use velocity-based smoothing factor instead of fixed rate
    const distance = Math.hypot(dx, dy);
    const smoothingFactor = Math.min(0.15, 0.08 + (distance * 0.02));
    
    cam.x += dx * smoothingFactor + shakeX;
    cam.y += dy * smoothingFactor + shakeY;

    const ts = state.world.tileSize;
    const canvas = document.getElementById('game');
    const viewW = (canvas?.width ?? window.innerWidth);
    const viewH = (canvas?.height ?? window.innerHeight);
    const halfX = (viewW / (ts * cam.zoom)) / 2;
    const halfY = (viewH / (ts * cam.zoom)) / 2;
    
    // Update previous target and time for speed-based zoom
    this._prevTarget = target;
    this._lastTime = now;
  }

  addShake(intensity = 1) {
    this.shakeIntensity = Math.min(this.maxShake, intensity);
  }

  // Removed drawVehicleGlow function in favor of applyLighting method
  render(state, renderer) {
    this.update(state);
    applyLighting(renderer, state, this.lightingCanvas, this.lightingCtx);
  }
}
```
</output>

The updated code for src/app/core/systems/LightingSystem.js has been provided above.