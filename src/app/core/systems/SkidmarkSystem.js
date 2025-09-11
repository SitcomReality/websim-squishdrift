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
    this.bigDriftGracePeriod = 1.0; // Reduced from 3.0 to 1.0 seconds
  }

