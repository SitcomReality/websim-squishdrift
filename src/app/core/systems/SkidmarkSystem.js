import { Vec2 } from '../../../utils/Vec2.js';

export class SkidmarkSystem {
        skidLateralSlipThreshold = 0.35;
    
        skidMinSpeedForBraking = 3.0;
    
        skidBrakeThreshold = 0.7;
    
        skidMinSegmentSpacing = 0.05;
    
        skidTrackHalfWidth = 0.23;
    
        skidLineWidthPx = 2;
    
        skidAlpha = 0.35;
    
        skidMaxAge = 18;
    
        skidDespawnRadius = 15;
    
        skidSegmentLength = 0.05;
    
        rearWheelOffset = -0.3;

  update(state, dt) {
    if (!state.skidmarks) state.skidmarks = [];
    const ref = state.control.inVehicle ? state.control.vehicle?.pos : state.entities.find(e=>e.type==='player')?.pos;
    if (!ref) return;

    // Track

