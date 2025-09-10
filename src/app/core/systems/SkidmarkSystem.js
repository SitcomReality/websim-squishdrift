import { Vec2 } from '../../../utils/Vec2.js';

export class SkidmarkSystem {
  constructor() {
    this.skidLateralSlipThreshold = 0.35;
    this.skidMinSpeedForBraking = 3.0;
    this.skidBrakeThreshold = 0.7;
    this.skidMinSegmentSpacing = 0.05;
    this.skidTrackHalfWidth = 0.23;
    this.skidLineWidthPx = 2;
    this.skidAlpha = 0.35;
    this.skidMaxAge = 18;
    this.skidDespawnRadius = 15;
    this.skidSegmentLength = 0.05;
    this.rearWheelOffset = -0.3;
    this.playerVehicleSkidBoost = 2.0; // Boost volume for player vehicle
  }

  update(state, dt) {
    if (!state.skidmarks) state.skidmarks = [];
    const ref = state.control.inVehicle ? state.control.vehicle?.pos : state.entities.find(e=>e.type==='player')?.pos;
    if (!ref) return;

    // Track blood stains for collision detection
    const bloodStains = state.entities.filter(e => e.type === 'blood');  
    
    // Emit new segments from vehicles
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      const speed = Math.hypot(v.vel?.x||0, v.vel?.y||0);
      const lateralSlip = this.computeLateralSlip(v);
      const hardBrake = (v.ctrl?.brake || 0) >= this.skidBrakeThreshold && speed >= this.skidMinSpeedForBraking;
      const drifting = lateralSlip >= this.skidLateralSlipThreshold;

      // --- BIG DRIFT LOGIC ---
      v.driftState = v.driftState || { active: false, startTime: 0, distance: 0, lastPos: null, graceStart: 0 };
      const isActuallyDrifting = drifting && speed > 1.5;

      if (isActuallyDrifting) {
         if (!v.driftState.active) {
           // Start of a new drift
           v.driftState.active = true;
           v.driftState.startTime = state.time;
           v.driftState.distance = 0;
           v.driftState.lastPos = new Vec2(v.pos.x, v.pos.y);
           v.driftState.graceStart = 0; // reset any ending grace
         } else {
           // Continuing a drift
           const dist = Math.hypot(v.pos.x - v.driftState.lastPos.x, v.pos.y - v.driftState.lastPos.y);
           v.driftState.distance += dist;
           v.driftState.lastPos.x = v.pos.x;
           v.driftState.lastPos.y = v.pos.y;
         }

         const duration = state.time - v.driftState.startTime;
         const isBigDrift = duration > 2.0 || v.driftState.distance > 5.0;

         if (isBigDrift) {
           state.particleSystem?.emitDriftParticles(state, v);
         }
      } else {
        // Not drifting: start/continue a short grace window so brief corrections won't end the big drift
        const nowTime = state.time;
        if (v.driftState.active && !v.driftState.graceStart) {
          v.driftState.graceStart = nowTime; // begin grace
        }
        // If within 5s grace window, keep active but don't advance distance
        const GRACE_DURATION = 5.0;
        if (v.driftState.active && v.driftState.graceStart && (nowTime - v.driftState.graceStart) < GRACE_DURATION) {
          // maintain active state but do not add distance; particles may continue if already big
          const duration = nowTime - v.driftState.startTime;
          const isBigDrift = duration > 2.0 || v.driftState.distance > 5.0;
          if (isBigDrift) state.particleSystem?.emitDriftParticles(state, v);
        } else {
          // Grace expired or not active: reset state
          v.driftState.active = false;
          v.driftState.graceStart = 0;
        }
       }

      if ((drifting || hardBrake) && speed > 0.05) {
        // spacing against last drop using vehicle's center position
        if (!v._lastSkidPos) v._lastSkidPos = new Vec2(v.pos.x, v.pos.y);
        // NEW: start/update skid loop while skidding
        if (!v._isSkidding) {
          v._skidLoopId = v._skidLoopId || { type: 'skid', vehicle: v };
          
          // Check if this is the player's vehicle
          const isPlayerVehicle = state.control?.inVehicle && state.control?.vehicle === v;
          const effectiveVolume = isPlayerVehicle ? 0.35 * this.playerVehicleSkidBoost : 0.35;
          
          state.audio?.startOrUpdateLoopAt?.('tire_skid_loop', v._skidLoopId, v.pos, state, {
            rate: 1.0,
            baseVolume: effectiveVolume,
            startOffset: Math.random() * 4.0
          });
          v._isSkidding = true;
        } else {
          // Check if this is the player's vehicle
          const isPlayerVehicle = state.control?.inVehicle && state.control?.vehicle === v;
          let vol = 0.25 + Math.min(0.5, (v.skidIntensity || 0) * 0.5);
          
          // Apply boost for player vehicle
          if (isPlayerVehicle) {
            vol *= this.playerVehicleSkidBoost;
          }
          
          state.audio?.startOrUpdateLoopAt?.('tire_skid_loop', v._skidLoopId, v.pos, state, { rate: 1.0, baseVolume: vol });
        }
        const moved = Math.hypot(v.pos.x - v._lastSkidPos.x, v.pos.y - v._lastSkidPos.y);

        if (moved >= this.skidMinSegmentSpacing) {
          // Calculate rear wheel positions
          const fwdX = Math.cos(v.rot || 0);
          const fwdY = Math.sin(v.rot || 0);
          const perpX = Math.sin(v.rot || 0);
          const perpY = -Math.cos(v.rot || 0);
          
          const rearX = v.pos.x + fwdX * this.rearWheelOffset;
          const rearY = v.pos.y + fwdY * this.rearWheelOffset;

          // Check if rear wheels are over blood
          const isOverBlood = this.checkBloodCollision(rearX, rearY, bloodStains);
          
          // Update blood skid state
          if (!v._bloodSkidState) {
            v._bloodSkidState = { inBlood: false, bloodCount: 0 };
          }
          
          if (isOverBlood) {
            v._bloodSkidState.inBlood = true;
            v._bloodSkidState.bloodCount = 24; // Continue blood skids for 24 segments (3x longer)
          } else if (v._bloodSkidState.bloodCount > 0) {
            v._bloodSkidState.bloodCount--;
          }
          
          // Determine skid color based on state
          const useBloodSkids = v._bloodSkidState.inBlood || v._bloodSkidState.bloodCount > 0;
          const alpha = Math.min(1, this.skidAlpha + (drifting ? (lateralSlip * 0.25) : 0));
          const segmentHalfLength = this.skidSegmentLength / 2;
          
          const skidColor = useBloodSkids ? 'rgba(139, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.8)';
          
          // Adjust track width based on vehicle type
          const isTruck = v.vehicleType === 'truck';
          const trackWidth = isTruck ? this.skidTrackHalfWidth : this.skidTrackHalfWidth * 0.6; // 60% width for non-trucks
          
          const lw = trackWidth;

          // Left wheel track
          state.skidmarks.push({
            left: { x: rearX - perpX * lw - fwdX * segmentHalfLength, y: rearY - perpY * lw - fwdY * segmentHalfLength },
            right: { x: rearX - perpX * lw + fwdX * segmentHalfLength, y: rearY - perpY * lw + fwdY * segmentHalfLength },
            age: 0,
            widthPx: this.skidLineWidthPx,
            alpha: alpha,
            color: skidColor
          });

          // Right wheel track
          state.skidmarks.push({
            left: { x: rearX + perpX * lw - fwdX * segmentHalfLength, y: rearY + perpY * lw - fwdY * segmentHalfLength },
            right: { x: rearX + perpX * lw + fwdX * segmentHalfLength, y: rearY + perpY * lw + fwdY * segmentHalfLength },
            age: 0,
            widthPx: this.skidLineWidthPx,
            alpha: alpha,
            color: skidColor
          });
          
          v._lastSkidPos.x = v.pos.x; v._lastSkidPos.y = v.pos.y;
          
          // Reset inBlood flag if not currently over blood
          if (!isOverBlood) {
            v._bloodSkidState.inBlood = false;
          }
        }
      } else {
        // If not skidding/braking, reset the last position and blood state
        v._lastSkidPos = new Vec2(v.pos.x, v.pos.y);
        if (v._bloodSkidState) {
          v._bloodSkidState.inBlood = false;
          v._bloodSkidState.bloodCount = 0;
        }
        // Reset skidding flag and stop skid loop
        if (v._isSkidding && state.audio?.stopLoop) {
          state.audio.stopLoop(v._skidLoopId);
        }
        v._isSkidding = false;
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

  checkBloodCollision(x, y, bloodStains) {
    const detectionRadius = 0.3; // Radius around rear wheels
    for (const blood of bloodStains) {
      const dx = x - blood.pos.x;
      const dy = y - blood.pos.y;
      const distance = Math.hypot(dx, dy);
      if (distance < detectionRadius) {
        return true;
      }
    }
    return false;
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