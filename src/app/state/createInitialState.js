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
    state.entities.push({ type:'npc', pos:new Vec2(n.x+0.5, n.y+0.5), from:{x:n.x,y:n.y}, to: next, t: 0, speed: 0.2 + rand()*0.15 });
  }
  
  // Create pickup spots at the center of each block
  // Use original city layout coordinates before perimeter expansion
  const cityLayout = new CityLayout(blocksWide, blocksHigh);
  const pickupSpots = [];
  
  for (let by = 0; by < blocksHigh; by++) {
    for (let bx = 0; bx < blocksWide; bx++) {
      const origin = cityLayout.getBlockOrigin(bx, by);
      const centerX = origin.x + Math.floor(cityLayout.W / 2) + 0.5;
      const centerY = origin.y + Math.floor(cityLayout.W / 2) + 0.5;
      
      // Adjust for the perimeter expansion
      const adjustedX = centerX + shift;
      const adjustedY = centerY + shift;
      
      const spotId = pickupSpots.length;
      pickupSpots.push({ x: adjustedX, y: adjustedY, hasItem: false });
      
      // Spawn initial pistol at this spot
      const item = { 
        type: 'item', 
        pos: new Vec2(adjustedX, adjustedY), 
        name: 'Pistol', 
        color: '#FFD700', 
        spotId 
      };
      state.entities.push(item);
      pickupSpots[spotId].hasItem = true;
    }
  }
  
  state.pickupSpots = pickupSpots;
  
  return state;
}