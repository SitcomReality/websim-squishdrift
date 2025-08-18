// Color palettes for consistent theming
const ColorPalettes = {
  // Traffic vehicles - dark low saturation warm colors
  traffic: {
    compact: [
      '#8B4513', // SaddleBrown
      '#A0522D', // Sienna
      '#CD853F', // Peru
      '#D2691E', // Chocolate
      '#B8860B'  // DarkGoldenrod
    ],
    sedan: [
      '#556B2F', // DarkOliveGreen
      '#696969', // DimGray
      '#2F4F4F', // DarkSlateGray
      '#8B7355', // Peru variant
      '#A0522D'  // Sienna
    ],
    truck: [
      '#654321', // DarkBrown
      '#5D4037', // Brown
      '#6D4C41', // DarkBrown variant
      '#795548', // Brown variant
      '#6D4E41'  // Brownish
    ],
    sports: [
      '#B22222', // FireBrick (highest saturation)
      '#A52A2A', // Brown
      '#FF4500', // OrangeRed
      '#DC143C', // Crimson
      '#B8860B'  // DarkGoldenrod
    ]
  },
  
  // Emergency - vibrant high saturation blues
  emergency: [
    '#0000FF', // Blue
    '#0000CD', // MediumBlue
    '#00008B', // DarkBlue
    '#4169E1', // RoyalBlue
    '#1E90FF'  // DodgerBlue
  ],
  
  // NPCs - low saturation cool colors
  npc: [
    '#9370DB', // MediumPurple
    '#8A2BE2', // BlueViolet
    '#6A5ACD', // SlateBlue
    '#483D8B', // DarkSlateBlue
    '#556B2F', // DarkOliveGreen
    '#2E8B57', // SeaGreen
    '#3CB371', // MediumSeaGreen
    '#9ACD32'  // YellowGreen
  ]
};

// Helper to get a color from palette with slight variation
function getColorFromPalette(palette, baseColor = null) {
  const colors = Array.isArray(palette) ? palette : palette;
  const base = baseColor || colors[Math.floor(Math.random() * colors.length)];
  
  // Slight variation by adjusting brightness
  const hsl = hexToHsl(base);
  hsl.l += (Math.random() - 0.5) * 0.1; // ±5% brightness variation
  hsl.l = Math.max(0.2, Math.min(0.8, hsl.l));
  
  return hslToHex(hsl);
}

// Color conversion utilities
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }) {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r, g, b;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  const toHex = (n) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

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
    baseColor: '#8B4513'
  },
  
  sedan: {
    // Standard car
    ...VehicleArchetype,
    color: '#4444ff',
    baseColor: '#556B2F'
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
    baseColor: '#654321'
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
      frontOffset: 0.7, // Increased from 0.45 to 0.7 for sports
      frontOffset: 0.75 // Further increased to 0.75
    },
    baseColor: '#B22222'
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
    baseColor: '#0000FF'
  }
};

// Helper function to create a vehicle with type and color
export function createVehicle(type, pos, options = {}) {
  const base = VehicleTypes[type] || VehicleTypes.sedan;
  
  // Determine color based on type
  let color;
  if (type === 'emergency') {
    color = getColorFromPalette(ColorPalettes.emergency);
  } else if (['compact', 'sedan', 'truck', 'sports'].includes(type)) {
    color = getColorFromPalette(ColorPalettes.traffic[type]);
  } else {
    color = base.baseColor || '#555';
  }
  
  return {
    type: 'vehicle',
    vehicleType: type,
    pos: { x: pos.x, y: pos.y },
    vel: { x: 0, y: 0 },
    rot: 0,
    angularVel: 0,
    ctrl: { throttle: 0, brake: 0, steer: 0 },
    color: color, // Use the dynamically selected color
    ...base,
    ...options,
    health: { hp: base.maxHealth, maxHp: base.maxHealth, getPercent: () => 1, isAlive: () => true }
  };
}