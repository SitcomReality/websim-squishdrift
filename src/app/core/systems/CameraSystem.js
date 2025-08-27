export class CameraSystem {
  constructor() {
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
    this.maxShake = 0.3; // Maximum shake in tiles
    // track for speed-based zoom
    this._prevTarget = null; this._lastTime = 0;
  }

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
      speed = (this._prevTarget && dt) ? Math.hypot(target.x - this._prevTarget.x, target.y - this._prevTarget.y) / dt : 0;
    }
    const maxRef = state.control.inVehicle ? (state.control.vehicle?.maxSpeed || 6) : ((state.entities.find(e=>e.type==='player')?.moveSpeed) || 6);
    const sensitivityMultiplier = 1.5; // Reduced from 3.5 to 1.5 for higher speed requirement
    const frac = Math.max(0, Math.min(1, (speed / (maxRef || 1)) * sensitivityMultiplier));
    const minZoom = cam.defaultZoom;
    const maxZoom = cam.defaultZoom * 2;
    // INVERTED: fast = zoom OUT (far), slow = zoom IN (close)
    const desiredZoom = maxZoom - (maxZoom - minZoom) * frac;
    // asymmetric lerp: faster snap-back when slowing/crashing
    const fastSnap = speed < 0.3 && cam.zoom > cam.defaultZoom * 1.05;
    const lerpRate = fastSnap ? 0.35 : (desiredZoom < (cam.zoom ?? cam.defaultZoom) ? 0.28 : 0.12);
    cam.zoom = (cam.zoom ?? cam.defaultZoom) + (desiredZoom - (cam.zoom ?? cam.defaultZoom)) * lerpRate;
    
    // manual zoom only when debug is enabled
    if (state.debugOverlay?.enabled && input) { 
      const minZ = cam.defaultZoom, maxZ = cam.defaultZoom * 2;
      cam.zoom = Math.min(maxZ, Math.max(minZ, cam.zoom + (input.zoomDelta || 0)));
      input.zoomDelta = 0;
    } else if (input) { input.zoomDelta = 0; }

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
    const z = cam.zoom || 1;
    const halfX = (viewW / (ts * z)) / 2;
    const halfY = (viewH / (ts * z)) / 2;
    
    const map = state.world.map;
    const pad = 30; // tiles of ocean padding beyond city edges
    cam.x = Math.min(Math.max(cam.x, halfX - pad), map.width - halfX + pad);
    cam.y = Math.min(Math.max(cam.y, halfY - pad), map.height - halfY + pad);

    // Update previous target and time for speed-based zoom
    this._prevTarget = target;
    this._lastTime = now;
  }

  addShake(intensity = 1) {
    this.shakeIntensity = Math.min(this.maxShake, intensity);
  }
}