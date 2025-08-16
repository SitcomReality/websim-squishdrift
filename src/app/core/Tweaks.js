export const Tweaks = {
  // Vehicle geometry/steering
  wheelBase: 2.4,                // tiles; effective distance between axles
  maxSteerAngle: 0.45,           // radians (≈25.8°) at full input
  minSteerSpeed: 1.0,            // tiles/sec to reach full steering authority
  alignToVelocityTorque: 2.0,    // heading → velocity alignment strength

  // Grip/drag model
  lateralGripLow: 8.0,           // grip at high speed (lower = more drift)
  lateralGripHigh: 22.0,         // grip at low speed (higher = sticks to ground)
  driftSlipSpeed: 6.0,           // speed where grip transitions toward low
  airDrag: 0.3,
  rollingResistance: 10,

  // AI driving (steering/pursuit)
  aiPredictionTime: 0.5,         // seconds to look ahead
  aiSteerK: 6.0,                 // proportional steering gain
  aiArrivalTolerance: 0.75       // tiles to consider node reached
};