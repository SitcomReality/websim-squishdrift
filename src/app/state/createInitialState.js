import { generateCity } from '../../map/MapGen.js';
import { isWalkable } from '../../map/TileTypes.js';
import { rng } from '../../utils/RNG.js';
import { Vec2 } from '../../utils/Vec2.js';

export function createInitialState() {
  const map = generateCity('alpha-seed', 4, 4);
  const rand = rng('alpha-seed');
  const player = { type: 'player', pos: new Vec2(), facing: new Vec2(1,0), moveSpeed: 6 };
  const state = { time: 0, entities: [player], camera: { x: map.width/2, y: map.height/2 }, world: { tileSize: 24, map }, rand };
  let spawnX = map.width / 2, spawnY = map.height / 2, bestDist = Infinity;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const t = map.tiles[y][x];
    if (isWalkable(t)) {
      const d = Math.abs(x - map.width/2) + Math.abs(y - map.height/2);
      if (d < bestDist) { bestDist = d; spawnX = x + 0.5; spawnY = y + 0.5; }
    }
  }
  player.pos.x = spawnX; player.pos.y = spawnY; state.camera.x = spawnX; state.camera.y = spawnY;
  let best = null, bp = player.pos;
  for (const n of map.roads.nodes) {
    const dx = n.x - bp.x, dy = n.y - bp.y, d2 = dx*dx+dy*dy;
    if (!best || d2 < best.d2) best = { n, d2 };
  }
  if (best) {
    const vehicle = { type: 'vehicle', pos: new Vec2(best.n.x, best.n.y), node: best.n, next: best.n.next[0] || best.n, t: 0, speed: 6 };
    state.entities.push(vehicle);
  }
  return state;
}