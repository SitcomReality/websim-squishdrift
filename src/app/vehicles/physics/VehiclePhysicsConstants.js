export const VehiclePhysicsConstants = {
  // Vehicle properties
  vehicleMass: 1200, // kg
  wheelBase: 2.5, // meters, distance between front and rear wheels
  
  // Engine
  maxEngineForce: 3000, // Newtons
  maxBrakeForce: 8000, // Newtons
  maxReverseForce: 1500, // Newtons
  
  // Aerodynamics
  airDrag: 0.425, // drag coefficient
  rollingResistance: 12.0, // N
  
  // Steering
  maxSteerAngle: Math.PI / 6, // 30 degrees
  lowSpeedSteerFactor: 2.0, // extra turning at low speeds
  
  // Tires
  maxLateralFriction: 8000, // Maximum lateral friction force (N)
  corneringStiffness: 15000, // Tire cornering stiffness
  
  // Collision
  vehicleCollisionRadius: 0.35,
  vehicleWidth: 0.9,
  vehicleHeight: 0.5,
  
  // AI constants
  PREDICTION_TIME: 0.5,
  ARRIVAL_TOLERANCE: 0.75
};