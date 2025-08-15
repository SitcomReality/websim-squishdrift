import { Tile } from './TileTypes.js';
import { rng } from '../utils/RNG.js';

export function generateCity(seed = 'alpha-seed', blocksWide = 4, blocksHigh = 4) {
  const W = 11, MED = 1;
  const ROAD_RING = 2;      // 2-tile road ring
  const FOOTPATH_RING = 1;  // 1-tile footpath ring
  const width = blocksWide * (W + MED) + MED;
  const height = blocksHigh * (W + MED) + MED;
  const tiles = Array.from({ length: height }, () => new Uint8Array(width).fill(Tile.Grass));
  const buildings = [];
  const rand = rng(seed);

  // Per-block generation
  for (let by = 0; by < blocksHigh; by++) {
    for (let bx = 0; bx < blocksWide; bx++) {
      const ox = MED + bx * (W + MED);
      const oy = MED + by * (W + MED);
      
      // 2-tile road ring
      for (let t = 0; t < ROAD_RING; t++) {
        // top/bottom rows (E/W lanes)
        for (let i = t; i < W - t; i++) {
          tiles[oy + t][ox + i] = Tile.RoadE;
          tiles[oy + W - 1 - t][ox + i] = Tile.RoadW;
        }
        // left/right cols (N/S lanes)
        for (let i = t; i < W - t; i++) {
          tiles[oy + i][ox + t] = Tile.RoadN;
          tiles[oy + i][ox + W - 1 - t] = Tile.RoadS;
        }
      }

      // Footpaths inside road ring (1-tile border)
      const fpStart = ROAD_RING;
      const fpSize = W - ROAD_RING * 2;
      for (let i = 0; i < fpSize; i++) {
        tiles[oy + fpStart][ox + fpStart + i] = Tile.Footpath; // Top
        tiles[oy + fpStart + fpSize - 1][ox + fpStart + i] = Tile.Footpath; // Bottom
        tiles[oy + fpStart + i][ox + fpStart] = Tile.Footpath; // Left
        tiles[oy + fpStart + i][ox + fpStart + fpSize - 1] = Tile.Footpath; // Right
      }

      // 5x5 Interior: lots and alleys
      const interiorStart = ROAD_RING + FOOTPATH_RING; // 3
      const interiorSize = W - 2 * interiorStart; // 11 - 6 = 5
      
      // Generate 4 lots (2x2 each) with alleys between
      const lots = [
        { x: 0, y: 0 }, { x: 3, y: 0 },
        { x: 0, y: 3 }, { x: 3, y: 3 }
      ];
      
      // First fill with alleys (cross pattern)
      for (let y = 0; y < interiorSize; y++) {
        for (let x = 0; x < interiorSize; x++) {
          const isAlley = (x === 2 || y === 2);
          const tile = isAlley ? Tile.Footpath : Tile.Grass;
          tiles[oy + interiorStart + y][ox + interiorStart + x] = tile;
        }
      }
      
      // Then fill lots with buildings or parks
      for (const lot of lots) {
        const isBuilding = rand() < 0.7; // 70% buildings, 30% parks
        
        if (isBuilding) {
          const buildingRect = {
            x: ox + interiorStart + lot.x,
            y: oy + interiorStart + lot.y,
            width: 2,
            height: 2,
          };

          buildings.push({
            rect: buildingRect,
            height: 40 + rand() * 80, // Building height in pixels
            color: `hsl(${Math.floor(rand() * 40 + 190)}, 20%, ${Math.floor(rand() * 20 + 55)}%)`
          });

          // Create a building with floor and walls
          for (let ly = 0; ly < 2; ly++) {
            for (let lx = 0; lx < 2; lx++) {
              const tx = buildingRect.x + lx;
              const ty = buildingRect.y + ly;
              
              const isWall = (lx === 0 || lx === 1 || ly === 0 || ly === 1);
              tiles[ty][tx] = isWall ? Tile.BuildingWall : Tile.BuildingFloor;
            }
          }
        } else {
          // Create a park
          for (let ly = 0; ly < 2; ly++) {
            for (let lx = 0; lx < 2; lx++) {
              const tx = ox + interiorStart + lot.x + lx;
              const ty = oy + interiorStart + lot.y + ly;
              tiles[ty][tx] = Tile.Park;
            }
          }
        }
      }
    }
  }

  // Medians between blocks
  for (let gy = 0; gy <= blocksHigh; gy++) {
    const y = gy * (W + MED);
    if (y >= 0 && y < height) for (let x = 0; x < width; x++) tiles[y][x] = Tile.Median;
  }
  for (let gx = 0; gx <= blocksWide; gx++) {
    const x = gx * (W + MED);
    if (x >= 0 && x < width) for (let y = 0; y < height; y++) tiles[y][x] = Tile.Median;
  }
  
  // Inter-block corridors are now formed by block road rings + medians
  // The logic that carved corridors explicitly has been removed.

  // Intersections: medians at crossings convert to road
  for (let gy = 0; gy <= blocksHigh; gy++) {
    for (let gx = 0; gx <= blocksWide; gx++) {
      const y = gy * (W + MED), x = gx * (W + MED);
      if (y < height && x < width) tiles[y][x] = Tile.Intersection;
      // add plus-shaped roads extending 2 tiles in each direction for 5x5 intersection
      const setIfMedian = (tx, ty, t) => {
        if (tx >= 0 && ty >= 0 && tx < width && ty < height && tiles[ty][tx] === Tile.Median) tiles[ty][tx] = t;
      };
      // horizontal arms: left = RoadE (into center), right = RoadW (into center)
      setIfMedian(x - 1, y, Tile.RoadE);
      setIfMedian(x - 2, y, Tile.RoadE);
      setIfMedian(x + 1, y, Tile.RoadW);
      setIfMedian(x + 2, y, Tile.RoadW);
      // vertical arms: up = RoadS (into center), down = RoadN (into center)
      setIfMedian(x, y - 1, Tile.RoadS);
      setIfMedian(x, y - 2, Tile.RoadS);
      setIfMedian(x, y + 1, Tile.RoadN);
      setIfMedian(x, y + 2, Tile.RoadN);
    }
  }

  // At intersections: create roundabout with clockwise lanes around central median
  for (let gy = 0; gy <= blocksHigh; gy++) {
    for (let gx = 0; gx <= blocksWide; gx++) {
      const x = gx * (W + MED);
      const y = gy * (W + MED);
      
      // Central median tile
      if (y < height && x < width) tiles[y][x] = Tile.Median;
      
      // Create 5x5 roundabout with clockwise lanes
      // Bottom lanes (travel East)
      for (let i = -2; i <= 2; i++) {
        if (y + 2 < height && x + i >= 0 && x + i < width) {
          tiles[y + 2][x + i] = Tile.RoadE;
        }
      }
      
      // Left lanes (travel North)
      for (let i = -2; i <= 2; i++) {
        if (y + i >= 0 && y + i < height && x - 2 >= 0) {
          tiles[y + i][x - 2] = Tile.RoadN;
        }
      }
      
      // Top lanes (travel West)
      for (let i = -2; i <= 2; i++) {
        if (y - 2 >= 0 && x + i >= 0 && x + i < width) {
          tiles[y - 2][x + i] = Tile.RoadW;
        }
      }
      
      // Right lanes (travel South)
      for (let i = -2; i <= 2; i++) {
        if (y + i >= 0 && y + i < height && x + 2 < width) {
          tiles[y + i][x + 2] = Tile.RoadS;
        }
      }
    }
  }

  const roads = buildRoadGraph(tiles, width, height);
  const peds = buildPedGraph(tiles, width, height);
  return { tiles, width, height, W, MED, seed, roads, peds, buildings };
}

// helpers
function rectLine(tiles, x, y, len, type) { for (let i = 0; i < len; i++) tiles[y] && (tiles[y][x + i] = type); }
function colLine(tiles, x, y, len, type) { for (let i = 0; i < len; i++) tiles[y + i] && (tiles[y + i][x] = type); }

function buildRoadGraph(tiles, width, height){
  const dirVec = { N:{x:0,y:-1}, E:{x:1,y:0}, S:{x:0,y:1}, W:{x:-1,y:0} };
  const leftOf = { N:'W', E:'N', S:'E', W:'S' }, rightOf = { N:'E', E:'S', S:'W', W:'N' };
  const nodes = []; const byKey = new Map();
  const get = (x,y)=> (x>=0&&y>=0&&x<width&&y<height)?tiles[y][x]:255;
  const tileDir = (t)=> t===Tile.RoadN?'N':t===Tile.RoadE?'E':t===Tile.RoadS?'S':t===Tile.RoadW?'W':null;
  const keyOf = (x,y,d)=> `${x},${y},${d}`;
  
  // collect nodes
  for (let y=0;y<height;y++) for (let x=0;x<width;x++){
    const d = tileDir(get(x,y)); if (!d) continue;
    const node = { x, y, dir:d, next:[] }; nodes.push(node); byKey.set(keyOf(x,y,d), node);
  }
  
  // link - handle roundabout connections
  for (const n of nodes){
    const v = dirVec[n.dir], a1x = n.x+v.x, a1y = n.y+v.y, t1 = get(a1x,a1y);
    if (tileDir(t1) === n.dir) {
      n.next.push({ x:a1x, y:a1y, dir:n.dir });
    } else if (t1 === Tile.Median) {
      // At roundabout center, continue clockwise flow
      const nextDir = {
        'E': 'N', // East lanes turn North
        'N': 'W', // North lanes turn West  
        'W': 'S', // West lanes turn South
        'S': 'E'  // South lanes turn East
      };
      
      const newDir = nextDir[n.dir];
      if (newDir) {
        const nv = dirVec[newDir];
        const nextX = n.x + nv.x;
        const nextY = n.y + nv.y;
        if (tileDir(get(nextX, nextY)) === newDir) {
          n.next.push({ x:nextX, y:nextY, dir:newDir });
        }
      }
    } else if (tileDir(t1)) {
      // Handle lane changes at roundabout edges
      n.next.push({ x:a1x, y:a1y, dir:tileDir(t1) });
    }
  }
  return { nodes, byKey };
}

function buildPedGraph(tiles, width, height){
  const nodes = new Map(); const key=(x,y)=>`${x},${y}`;
  const walkable = (t)=> t!==Tile.Median && t!==Tile.Intersection && t!==Tile.BuildingWall && t!==Tile.BuildingFloor &&
                        t!==Tile.RoadN && t!==Tile.RoadE && t!==Tile.RoadS && t!==Tile.RoadW;
  for (let y=0;y<height;y++) for (let x=0;x<width;x++){
    if (!walkable(tiles[y][x])) continue; nodes.set(key(x,y), { x, y, neighbors:[] });
  }
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for (const n of nodes.values()) for (const [dx,dy] of dirs){
    const k = key(n.x+dx, n.y+dy); const m = nodes.get(k); if (m) n.neighbors.push({ x:m.x, y:m.y });
  }
  return { nodes, list: Array.from(nodes.values()) };
}