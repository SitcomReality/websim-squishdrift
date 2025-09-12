import { Health } from '../components/Health.js';

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
    frontOffset: 0.6, // Increased from 0.4 to 0.6 to move further forward
    color: '#fff'
  },
  
  brakeLights: {
    count: 2,
    width: 0.1,
    height: 0.05,
    spacing: 0.3,
    rearOffset: 0.7, // Increased from 0.5 to 0.7 to move further back
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
      width: 0.12,
      frontOffset: 0.7 // Increased from 0.6 to 0.7 for compact
    },
    colorScheme: { hue:[20,50], sat:[30,45], light:[28,45] } // warm, darker, mid-low sat
  },
  
  sedan: {
    // Standard car
    ...VehicleArchetype,
    color: '#4444ff',
    colorScheme: { hue:[20,50], sat:[22,35], light:[28,42] }
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
      spacing: 0.35,
      frontOffset: 0.65 // Increased from 0.5 to 0.65 for truck
    },
    brakeLights: {
      ...VehicleArchetype.brakeLights,
      width: 0.12,
      height: 0.06,
      spacing: 0.3,
      rearOffset: 0.75 // Increased from 0.6 to 0.75 for truck
    },
    colorScheme: { hue:[25,45], sat:[12,22], light:[26,40] } // lowest saturation
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
      frontOffset: 0.75
    },
    colorScheme: { hue:[15,40], sat:[70,85], light:[30,50] } // highest saturation
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
      width: 0.16,
      frontOffset: 0.65 // Increased from 0.4 to 0.65 for emergency
    },
    colorScheme: { hue:[205,225], sat:[85,100], light:[40,55] } // vibrant blues
  }
};

// Helper function to create a vehicle with type
export function createVehicle(type, pos, options = {}) {
  const base = VehicleTypes[type] || VehicleTypes.sedan;
  const vehicle = {
    type: 'vehicle',
    vehicleType: type,
    pos: { x: pos.x, y: pos.y },
    vel: { x: 0, y: 0 },
    rot: 0,
    angularVel: 0,
    ctrl: { throttle: 0, brake: 0, steer: 0 },
    ...base,
    ...options,
    color: options.color || randomColorForType(base),
    health: new Health(base.maxHealth || 100)
  };

  // Add runtime headlight entities configuration so LightingSystem can pick them up.
  // Two headlights (left/right) expressed in vehicle-local offsets; LightingSystem should
  // transform these by vehicle.pos/rot when rendering lights.
  const hl = base.headlights || VehicleArchetype.headlights || { spacing: 0.25, frontOffset: 0.6, color: '#fff', radius: 7, intensity: 0.9, coneAngle: Math.PI / 6 };
  vehicle.lightSources = [
    { // left headlight
      offset: { x: hl.frontOffset, y: - (hl.spacing || 0.25) / 2 },
      kind: 'cone',
      radius: hl.radius,
      intensity: hl.intensity ?? 0.9,
      color: hl.color || '#fff',
      coneAngle: hl.coneAngle || Math.PI / 6,
      active: true
    },
    { // right headlight
      offset: { x: hl.frontOffset, y: (hl.spacing || 0.25) / 2 },
      kind: 'cone',
      radius: hl.radius,
      intensity: hl.intensity ?? 0.9,
      color: hl.color || '#fff',
      coneAngle: hl.coneAngle || Math.PI / 6,
      active: true
    }
  ];

  return vehicle;
}

function randomColorForType(base){
  const cs = base.colorScheme;
  if (!cs) return base.color || '#555';
  const h = randRange(cs.hue[0], cs.hue[1]);
  const s = randRange(cs.sat[0], cs.sat[1]);
  const l = randRange(cs.light[0], cs.light[1]);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function randRange(a,b){ return a + Math.random()*(b-a); }