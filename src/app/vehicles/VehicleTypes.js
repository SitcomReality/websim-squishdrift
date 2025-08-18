// Base vehicle archetype - all vehicles inherit from this
export const VehicleArchetype = {
  // Physics properties
  mass: 1200,
  maxSpeed: 4,
  engineForce: 900,
  brakeForce: 1600,
  maxReverseForce: 1500,
  airDrag: 0.425,
  rollingResistance: 12.0,
  maxLateralFriction: 8000,
  corneringStiffness: 15000,
  maxSteerAngle: Math.PI / 6,
  lowSpeedSteerFactor: 2.0,
  wheelBase: 2.5,
  
  // Collision properties
  hitboxW: 0.9,
  hitboxH: 0.5,
  
  // Visual properties
  color: '#555',
  width: 0.9,
  height: 0.5,
  cornerRadius: 0.15,
  
  // Lighting
  headlights: {
    count: 2,
    size: 0.075,
    width: 0.15,
    height: 0.075,
    spacing: 0.25,
    frontOffset: 0.4,
    color: '#fff'
  },
  
  brakeLights: {
    size: 4,
    width: 4,
    height: 0.3,
    rearOffset: 0.5,
    offColor: '#4a0000',
    onColor: '#ff2d2d'
  },
  
  // Health
  maxHealth: 100
};

// Specific vehicle types extending the archetype
export const VehicleTypes = {
  compact: {
    // Smaller, lighter, faster
    mass: 800,
    maxSpeed: 5,
    engineForce: 1200,
    hitboxW: 0.7,
    hitboxH: 0.4,
    width: 0.7,
    height: 0.4,
    cornerRadius: 0.2,
    color: '#ff4444',
    headlights: {
      ...VehicleArchetype.headlights,
      size: 0.06,
      width: 0.12
    }
  },
  
  sedan: {
    // Standard car
    ...VehicleArchetype,
    color: '#4444ff'
  },
  
  truck: {
    // Larger, heavier, slower
    mass: 2000,
    maxSpeed: 3,
    engineForce: 1500,
    brakeForce: 2000,
    hitboxW: 1.2,
    hitboxH: 0.7,
    width: 1.2,
    height: 0.7,
    cornerRadius: 0.1,
    color: '#8B4513',
    headlights: {
      ...VehicleArchetype.headlights,
      size: 0.09,
      width: 0.18,
      spacing: 0.35
    },
    brakeLights: {
      ...VehicleArchetype.brakeLights,
      size: 6,
      width: 6
    }
  },
  
  sports: {
    // Fast, powerful
    mass: 1000,
    maxSpeed: 7,
    engineForce: 2000,
    brakeForce: 2200,
    hitboxW: 0.85,
    hitboxH: 0.45,
    width: 0.85,
    height: 0.45,
    cornerRadius: 0.25,
    color: '#ffff00',
    headlights: {
      ...VehicleArchetype.headlights,
      size: 0.05,
      width: 0.1,
      frontOffset: 0.45
    }
  },
  
  emergency: {
    // Emergency vehicles (police, firetruck, ambulance)
    mass: 1400,
    maxSpeed: 6,
    engineForce: 1800,
    brakeForce: 1900,
    hitboxW: 1.0,
    hitboxH: 0.55,
    width: 1.0,
    height: 0.55,
    color: '#0000ff', // Default to police blue
    headlights: {
      ...VehicleArchetype.headlights,
      size: 0.08,
      width: 0.16
    }
  }
};

// Helper function to create a vehicle with type
export function createVehicle(type, pos, options = {}) {
  const base = VehicleTypes[type] || VehicleTypes.sedan;
  return {
    type: 'vehicle',
    vehicleType: type,
    pos: { x: pos.x, y: pos.y },
    vel: { x: 0, y: 0 },
    rot: 0,
    angularVel: 0,
    ctrl: { throttle: 0, brake: 0, steer: 0 },
    ...base,
    ...options,
    health: { hp: base.maxHealth, maxHp: base.maxHealth, getPercent: () => 1, isAlive: () => true }
  };
}