import { generateCity } from '../../map/MapGen.js';
import { isWalkable } from '../../map/TileTypes.js';
import { rng } from '../../utils/RNG.js';
import { Vec2 } from '../../utils/Vec2.js';

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
  player.vel = { x: 0, y: 0 }; player.mass = 80; player.hitboxW = 0.6; player.hitboxH = 0.6;
  
  // Spawn empty vehicle right next to player
  const emptyVehicle = {
    type: 'vehicle',
    pos: new Vec2(spawnX + 1.5, spawnY + 0.5), // Right side of player
    t: 0,
    speed: 0,
    rot: 0,
    vel: { x: 0, y: 0 },
    angularVel: 0,
    ctrl: { throttle: 0, brake: 0, steer: 0 },
    mass: 1200, maxSpeed: 4, engineForce: 900, brakeForce: 1600,
    rollingRes: 1.0, drag: 0.25, grip: 6.0, steerRate: 10.0,
    health: { hp: 100, maxHp: 100, getPercent: () => 1, isAlive: () => true },
    controlled: false, // Make sure it's not controlled by player
    controlledByAI: false // Explicitly disable AI control
  };
  state.entities.push(emptyVehicle);
  
  // Spawn simple vehicles on road graph
  const maxVehicles = 5; // Define maxVehicles
  const roads = state.world.map.roads;
  const roadNodes = roads.nodes.filter(n => n.next && n.next.length > 0);
  const validSpawns = roadNodes.filter(node => {
    const distance = Math.hypot(node.x - spawnX, node.y - spawnY);
    return distance <= 15 && distance >= 8;
  }).slice(0, maxVehicles);

  for (let i = 0; i < validSpawns.length; i++) {
    const spawnNode = validSpawns[i];
    const next = spawnNode.next[Math.floor(rand() * spawnNode.next.length)];
    
    // Determine direction based on road direction
    let rot = 0;
    switch(spawnNode.dir) {
      case 'N': rot = -Math.PI/2; break;
      case 'E': rot = 0; break;
      case 'S': rot = Math.PI/2; break;
      case 'W': rot = Math.PI; break;
    }
    
    state.entities.push({
      type: 'vehicle',
      pos: new Vec2(spawnNode.x + 0.5, spawnNode.y + 0.5),
      node: spawnNode,
      next,
      t: 0,
      speed: 0.25 * 1.5, // 25% of original speed
      rot,
      vel: { x: 0, y: 0 },
      angularVel: 0,
      ctrl: { throttle: 0, brake: 0, steer: 0 },
      mass: 1200, maxSpeed: 4, engineForce: 900, brakeForce: 1600,
      rollingRes: 1.0, drag: 0.25, grip: 6.0, steerRate: 10.0
    });
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
  
  // Spawn simple items (pistol) on footpaths near player
  const footpathTiles = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = map.tiles[y][x];
      if (t === 7) { // Footpath
        footpathTiles.push({ x: x + 0.5, y: y + 0.5 });
      }
    }
  }
  footpathTiles.sort((a,b) => Math.hypot(a.x-spawnX, a.y-spawnY) - Math.hypot(b.x-spawnX, b.y-spawnY));
  for (let i = 0; i < Math.min(5, footpathTiles.length); i++) {
    const pos = footpathTiles[i];
    state.entities.push({ type: 'item', pos: new Vec2(pos.x, pos.y), name: 'Pistol', color: '#FFD700' });
  }
  return state;
}