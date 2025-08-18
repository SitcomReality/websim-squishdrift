import { generateCity } from '../../map/MapGen.js';
import { isWalkable, Tile } from '../../map/TileTypes.js';
import { rng } from '../../utils/RNG.js';
import { Vec2 } from '../../utils/Vec2.js';
import { createVehicle } from '../vehicles/VehicleTypes.js';

// Add color conversion helpers
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

export function createInitialState() {
  const map = generateCity('alpha-seed', 4, 4);
  const rand = rng('alpha-seed');
  const player = { type: 'player', pos: new Vec2(), facing: new Vec2(1,0), moveSpeed: 6 };
  const state = { time: 0, entities: [player], camera: { x: map.width/2, y: map.height/2, zoom: 4 }, world: { tileSize: 24, map }, rand };
  let spawnX = map.width / 2, spawnY = map.height / 2, bestDist = Infinity;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const t = map.tiles[y][x];
    if (isWalkable(t)) {
      const d = Math.abs(x - map.width/2) + Math.abs(y - map.height/2);
      if (d < bestDist) { bestDist = d; spawnX = x + 0.5; spawnY = y + 0.5; }
    }
  }
  player.pos.x = spawnX; player.pos.y = spawnY; state.camera.x = spawnX; state.camera.y = spawnY;
  player.vel = { x: 0, y: 0 }; player.mass = 80; player.hitboxW = 0.15; player.hitboxH = 0.15;
  
  // Helper function to get NPC color from cool palette
  const getNPCColor = () => {
    const colors = [
      '#9370DB', // MediumPurple
      '#8A2BE2', // BlueViolet
      '#6A5ACD', // SlateBlue
      '#483D8B', // DarkSlateBlue
      '#556B2F', // DarkOliveGreen
      '#2E8B57', // SeaGreen
      '#3CB371', // MediumSeaGreen
      '#9ACD32'  // YellowGreen
    ];
    
    // Add slight variation
    const baseColor = colors[Math.floor(rand() * colors.length)];
    const hsl = hexToHsl(baseColor);
    hsl.l += (rand() - 0.5) * 10; // ±5% brightness
    hsl.l = Math.max(20, Math.min(80, hsl.l));
    
    // Convert back to hex
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 360 / 60) % 2) - 1));
    const m = l - c / 2;
    
    const toHex = (n) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(c)}${toHex(x)}${toHex(0)}`.replace(/undefined/g, '00');
  };
  
  // Spawn empty vehicle using new system
  const emptyVehicleTypes = ['compact', 'sedan', 'truck', 'sports'];
  const randomEmptyType = emptyVehicleTypes[Math.floor(rand() * emptyVehicleTypes.length)];
  const emptyVehicle = createVehicle(randomEmptyType, new Vec2(spawnX + 1.5, spawnY + 0.5), {
    controlled: false
  });
  state.entities.push(emptyVehicle);
  
  // Spawn different vehicle types on road graph
  const maxVehicles = 5;
  const roads = state.world.map.roads;
  const roadNodes = roads.nodes.filter(n => n.next && n.next.length > 0);
  const validSpawns = roadNodes.filter(node => {
    const distance = Math.hypot(node.x - spawnX, node.y - spawnY);
    return distance <= 15 && distance >= 8;
  }).slice(0, maxVehicles);

  const vehicleTypes = ['compact', 'sedan', 'truck', 'sports'];
  for (let i = 0; i < validSpawns.length; i++) {
    const spawnNode = validSpawns[i];
    const next = spawnNode.next[Math.floor(rand() * spawnNode.next.length)];
    const vehicleType = vehicleTypes[i % vehicleTypes.length];
    
    // Determine rotation based on road direction
    let rot = 0;
    switch(spawnNode.dir) {
      case 'N': rot = -Math.PI/2; break;
      case 'E': rot = 0; break;
      case 'S': rot = Math.PI/2; break;
      case 'W': rot = Math.PI; break;
    }
    
    const vehicle = createVehicle(vehicleType, new Vec2(spawnNode.x + 0.5, spawnNode.y + 0.5), {
      node: spawnNode,
      next,
      rot,
      speed: 0.25 * 1.5,
      vel: { x: 0, y: 0 },
      angularVel: 0,
      ctrl: { throttle: 0, brake: 0, steer: 0 }
    });
    
    state.entities.push(vehicle);
  }
  
  // Spawn simple NPC pedestrians on ped graph near player
  const pedNodes = map.peds?.list || [];
  const spawnCount = Math.min(30, pedNodes.length);
  const sortedByDist = pedNodes.slice().sort((a,b)=> (Math.hypot(a.x+0.5-spawnX,a.y+0.5-spawnY) - Math.hypot(b.x+0.5-spawnX,b.y+0.5-spawnY)));
  for (let i=0;i<spawnCount;i++){
    const n = sortedByDist[i];
    // Skip spawning on median strips
    if (map.tiles[Math.floor(n.y)][Math.floor(n.x)] === Tile.Median) continue;
    
    const next = (n.neighbors && n.neighbors.length) ? n.neighbors[Math.floor(rand()*n.neighbors.length)] : { x:n.x, y:n.y };
    state.entities.push({ 
      type:'npc', 
      pos:new Vec2(n.x+0.5, n.y+0.5), 
      from:{x:n.x,y:n.y}, 
      to: next, 
      t: 0, 
      speed: 0.2 + rand()*0.15,
      color: getNPCColor() // Assign NPC color
    });
  }
  
  // Create pickup spots at the center of each block and spawn an initial pickup (pistol)
  // Use map properties instead of cityLayout
  const blocksWide = 4;
  const blocksHigh = 4;
  const W = 11; // block width from CityLayout
  const MED = 1; // median width from CityLayout
  const mapOffset = 2;
  
  state.pickupSpots = [];
  for (let by = 0; by < blocksHigh; by++) {
    for (let bx = 0; bx < blocksWide; bx++) {
      const originX = mapOffset + MED + bx * (W + MED);
      const originY = mapOffset + MED + by * (W + MED);
      const centerX = originX + Math.floor(W / 2) + 0.5;
      const centerY = originY + Math.floor(W / 2) + 0.5;
      const spotId = state.pickupSpots.length;
      state.pickupSpots.push({ x: centerX, y: centerY, hasItem: false });
      // Spawn initial pistol at each spot
      const item = { type: 'item', pos: new Vec2(centerX, centerY), name: 'Pistol', color: '#FFD700', spotId };
      state.entities.push(item);
      state.pickupSpots[spotId].hasItem = true;
    }
  }
  
  return state;
}