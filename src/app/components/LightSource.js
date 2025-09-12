// src/app/components/LightSource.js
export class LightSource {
  constructor({
    radius = 6,          // world units (tiles)
    intensity = 1,       // 0..1 multiplier
    color = 'rgba(255,240,200,1)',
    kind = 'point',      // 'point' | 'cone'
    direction = 0,       // radians (for 'cone')
    coneAngle = Math.PI / 3, // radians (full cone width)
    flicker = 0,         // 0..1 amount of random intensity jitter
    active = true
  } = {}) {
    this.radius = radius;
    this.intensity = intensity;
    this.color = color;
    this.kind = kind;
    this.direction = direction;
    this.coneAngle = coneAngle;
    this.flicker = flicker;
    this.active = active;
    // runtime cache (not serialized)
    this._lastFlicker = 0;
  }

  setActive(on) { this.active = !!on; }
  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); }
  setRadius(r) { this.radius = Math.max(0, r); }
}