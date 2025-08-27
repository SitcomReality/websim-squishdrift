import { generateCity } from '../../map/MapGen.js';
import { isWalkable, Tile } from '../../map/TileTypes.js';
import { rng } from '../../utils/RNG.js';
import { Vec2 } from '../../utils/Vec2.js';
import { createVehicle } from '../vehicles/VehicleTypes.js';

export function createInitialState(seed = null) {
  // Use provided seed or generate new random one
  const finalSeed = seed || Math.random().toString(36).substring(2, 15);
  const rand = rng(finalSeed);
  
  // Randomize city dimensions between 3-6 blocks
  const blocksWide = 3 + Math.floor(rand() * 4); // 3-6 blocks
  const blocksHigh = 3 + Math.floor(rand() * 4); // 3-6 blocks
  
  const map = generateCity(finalSeed, blocksWide, blocksHigh);
  const player = { type: 'player', pos: new Vec2(), facing: new Vec2(1,0), moveSpeed: 6 };
  const state = { 
    time: 0, 
    entities: [player], 
    camera: { x: map.width/2, y: map.height/2, zoom: 4 }, 
    world: { tileSize: 24, map }, 
    rand,
    seed: finalSeed // Store seed for debugging
  };
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
  
  // Create sprite pool and assign unique player sprite
  const skinTones = [0, 1]; // 0=dark, 1=light
  const bodyIndices = [0, 1, 2, 3, 4]; // 0-4 for body sprite
  const armIndices = [0, 1, 2, 3]; // 0-3 for arm sprite
  
  // Create all possible combinations
  const allCombinations = [];
  for (const skinTone of skinTones) {
    for (const bodyIndex of bodyIndices) {
      let armIndex;
      if (bodyIndex < 2) {
        armIndex = 0; // Sleeveless for first two bodies
      } else {
        armIndex = bodyIndex - 1; // Map body 2,3,4 -> arm 1,2,3
      }
      
      allCombinations.push({
        skinTone,
        bodyIndex,
        armIndex
      });
    }
  }
  
  // Shuffle and pick unique player sprite
  const shuffled = allCombinations.sort(() => rand() - 0.5);
  const playerSprite = shuffled.pop(); // Remove from pool
  
  // Assign to player
  player.skinTone = playerSprite.skinTone;
  player.bodyIndex = playerSprite.bodyIndex;
  player.armIndex = playerSprite.armIndex;
  
  // Store remaining combinations for NPCs
  state.availableSpriteCombinations = shuffled;
  
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
      ctrl: { throttle: 0, brake: 0, steer: 0 },
      mass: 1200, maxSpeed: 4, engineForce: 900, brakeForce: 1600,
      rollingRes: 1.0, drag: 0.25, grip: 6.0, steerRate: 2.5
    });
    
    state.entities.push(vehicle);
  }
  
  // Spawn NPC pedestrians from remaining sprite combinations
  const pedNodes = map.peds?.list || [];
  const spawnCount = Math.min(30, pedNodes.length);
  const sortedByDist = pedNodes.slice().sort((a,b)=> (Math.hypot(a.x+0.5-spawnX,a.y+0.5-spawnY) - Math.hypot(b.x+0.5-spawnX,b.y+0.5-spawnY)));
  
  // Shuffle remaining combinations for NPCs
  const remainingCombinations = [...state.availableSpriteCombinations].sort(() => rand() - 0.5);
  
  for (let i=0;i<spawnCount && remainingCombinations.length > 0;i++){
    const n = sortedByDist[i];
    // Skip spawning on median strips
    if (map.tiles[Math.floor(n.y)][Math.floor(n.x)] === Tile.Median) continue;
    
    const next = (n.neighbors && n.neighbors.length) ? n.neighbors[Math.floor(rand() * n.neighbors.length)] : { x:n.x, y:n.y };
    
    // Use remaining sprite combinations for NPCs
    const spriteCombo = remainingCombinations.pop();
    
    const npc = { 
      type:'npc', 
      pos:new Vec2(n.x+0.5, n.y+0.5), 
      from:{x:n.x,y:n.y}, 
      to: next, 
      t: 0, 
      speed: 0.2 + rand() * 0.15,
      skinTone: spriteCombo.skinTone,
      bodyIndex: spriteCombo.bodyIndex,
      armIndex: spriteCombo.armIndex
    };
    
    state.entities.push(npc);
  }
  
  // Create pickup spots at the center of each block and spawn an initial pickup (pistol)
  // Use map properties instead of cityLayout
  // Map generation applies a fixed 2-tile shift when expanding the map.
  // Compute block center using the same formula as CityLayout.getBlockOrigin:
  // center = (original mapOffset + MED + bx*(W+MED)) + floor(W/2) + 0.5, then add the generation shift.
  state.pickupSpots = [];
  const availablePickups = ['Pistol', 'AK47', 'Shotgun', 'Grenade', 'Health', 'Bribe'];
  const ORIGINAL_MAP_OFFSET = 2; // CityLayout.mapOffset
  const MAP_GEN_SHIFT = 2; // shift applied in MapGen.js
  const W = map.W;
  const MED = map.MED;
  for (let by = 0; by < blocksHigh; by++) {
    for (let bx = 0; bx < blocksWide; bx++) {
      const originX = ORIGINAL_MAP_OFFSET + MED + bx * (W + MED) + MAP_GEN_SHIFT;
      const originY = ORIGINAL_MAP_OFFSET + MED + by * (W + MED) + MAP_GEN_SHIFT;
      const centerX = originX + Math.floor(W / 2) + 0.5;
      const centerY = originY + Math.floor(W / 2) + 0.5;
      const spotId = state.pickupSpots.length;
      state.pickupSpots.push({ x: centerX, y: centerY, hasItem: false });
      // Spawn initial random weapon at each spot
      const pickupName = availablePickups[Math.floor(rand() * availablePickups.length)];
      const item = { type: 'item', pos: new Vec2(centerX, centerY), name: pickupName, color: '#FFD700', spotId };
      state.entities.push(item);
      state.pickupSpots[spotId].hasItem = true;
    }
  }
  
  return state;
}