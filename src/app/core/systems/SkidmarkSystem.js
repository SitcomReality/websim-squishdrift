import { Vec2 } from '../../../utils/Vec2.js';

export class SkidmarkSystem {
    /* @tweakable Lateral slip threshold for skid detection */
    skidLateralSlipThreshold = 0.35;
    
    /* @tweakable Minimum speed for brake-induced skids */
    skidMinSpeedForBraking = 3.0;
    
    /* @tweakable Brake threshold for skid activation */
    skidBrakeThreshold = 0.7;
    
    /* @tweakable Minimum spacing between skid segments */
    skidMinSegmentSpacing = 0.05;
    
    /* @tweakable Half-width of skid tracks in tiles */
    skidTrackHalfWidth = 0.23;
    
    /* @tweakable Line width of skid marks in pixels */
    skidLineWidthPx = 2;
    
    /* @tweakable Opacity of skid marks */
    skidAlpha = 0.35;
    
    /* @tweakable Maximum age of skid marks in seconds */
    skidMaxAge = 18;
    
    /* @tweakable Despawn radius for skid marks in tiles */
    skidDespawnRadius = 15;
    
    /* @tweakable Length of each skid segment in tiles */
    skidSegmentLength = 0.05;
    
    /* @tweakable Offset from vehicle center to rear wheels */
    rearWheelOffset = -0.3;

  update(state, dt) {
    if (!state.skidmarks) state.skidmarks = [];
    const ref = state.control.inVehicle ? state.control.vehicle?.pos : state.entities.find(e=>e.type==='player')?.pos;
    if (!ref) return;

    // Emit new segments from vehicles
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      const speed = Math.hypot(v.vel?.x||0, v.vel?.y||0);
      const lateralSlip = this.computeLateralSlip(v);
      const hardBrake = (v.ctrl?.brake || 0) >= this.skidBrakeThreshold && speed >= this.skidMinSpeedForBraking;
      const drifting = lateralSlip >= this.skidLateralSlipThreshold;

      if ((drifting || hardBrake) && speed > 0.05) {
        // spacing against last drop using vehicle's center position
        if (!v._lastSkidPos) v._lastSkidPos = new Vec2(v.pos.x, v.pos.y);
        const moved = Math.hypot(v.pos.x - v._lastSkidPos.x, v.pos.y - v._lastSkidPos.y);

        if (moved >= this.skidMinSegmentSpacing) {
          const alpha = Math.min(1, this.skidAlpha + (drifting ? (lateralSlip * 0.25) : 0));
          const segmentHalfLength = this.skidSegmentLength / 2;

          // Forward vector of the car (along its rotation)
          const fwdX = Math.cos(v.rot || 0);
          const fwdY = Math.sin(v.rot || 0);

          // Perpendicular vector to the car's forward direction (pointing to the right of the car)
          const perpX = Math.sin(v.rot || 0);
          const perpY = -Math.cos(v.rot || 0);
          
          const lw = this.skidTrackHalfWidth;

          // Calculate approximate rear wheel positions by offsetting from vehicle center
          const rearX = v.pos.x + fwdX * this.rearWheelOffset;
          const rearY = v.pos.y + fwdY * this.rearWheelOffset;

          // Left wheel track segment: segment is aligned with car's rotation
          state.skidmarks.push({
            left: { x: rearX - perpX * lw - fwdX * segmentHalfLength, y: rearY - perpY * lw - fwdY * segmentHalfLength },
            right: { x: rearX - perpX * lw + fwdX * segmentHalfLength, y: rearY - perpY * lw + fwdY * segmentHalfLength },
            age: 0,
            widthPx: this.skidLineWidthPx,
            alpha: alpha,
          });

          // Right wheel track segment: segment is aligned with car's rotation
          state.skidmarks.push({
            left: { x: rearX + perpX * lw - fwdX * segmentHalfLength, y: rearY + perpY * lw - fwdY * segmentHalfLength },
            right: { x: rearX + perpX * lw + fwdX * segmentHalfLength, y: rearY + perpY * lw + fwdY * segmentHalfLength },
            age: 0,
            widthPx: this.skidLineWidthPx,
            alpha: alpha,
          });
          
          v._lastSkidPos.x = v.pos.x; v._lastSkidPos.y = v.pos.y;
        }
      } else {
        // If not skidding/braking, reset the last position to current pos to start a fresh line next time
        v._lastSkidPos = new Vec2(v.pos.x, v.pos.y);
      }
    }

    // Age and cull by age and distance
    for (let i = state.skidmarks.length - 1; i >= 0; i--) {
      const m = state.skidmarks[i];
      m.age += dt;
      if (m.age > this.skidMaxAge) { state.skidmarks.splice(i, 1); continue; }
      // distance check vs reference
      const mx = (m.left.x + m.right.x) * 0.5;
      const my = (m.left.y + m.right.y) * 0.5;
      if (Math.hypot(mx - ref.x, my - ref.y) > this.skidDespawnRadius) {
        state.skidmarks.splice(i, 1);
      }
    }
  }

  computeLateralSlip(v) {
    // component of velocity perpendicular to car forward axis
    const vx = v.vel?.x || 0, vy = v.vel?.y || 0;
    const fwdX = Math.cos(v.rot || 0), fwdY = Math.sin(v.rot || 0);
    const speed = Math.hypot(vx, vy);
    if (speed < 0.001) return 0;
    const vDotF = (vx * fwdX + vy * fwdY) / speed;           // cos between vel and forward
    const vCrossF = (vx * fwdY - vy * fwdX) / speed;         // sin between vel and forward
    return Math.abs(vCrossF); // normalized lateral slip in [0..1]
  }
}