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
  const roundabouts = []; // track centers for exit graph augmentation

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

  // Intersections: build 2-lane anti-clockwise roundabouts (5x5 area)
  for (let gy = 0; gy <= blocksHigh; gy++) {
    for (let gx = 0; gx <= blocksWide; gx++) {
      const cy = gy * (W + MED), cx = gx * (W + MED);
      if (cy >= height || cx >= width) continue;
      tiles[cy][cx] = Tile.Median; // central island
      roundabouts.push({ cx, cy });
      const set = (x,y,t)=>{ if (x>=0&&y>=0&&x<width&&y<height) tiles[y][x]=t; };
      // top (leftward)
      for (let x=cx-2; x<=cx+2; x++){ set(x, cy-2, Tile.RoadW); set(x, cy-1, Tile.RoadW); }
      // bottom (rightward)
      for (let x=cx-2; x<=cx+2; x++){ set(x, cy+2, Tile.RoadE); set(x, cy+1, Tile.RoadE); }
      // left (downward)
      for (let y=cy-2; y<=cy+2; y++){ set(cx-2, y, Tile.RoadS); set(cx-1, y, Tile.RoadS); }
      // right (upward)
      for (let y=cy-2; y<=cy+2; y++){ set(cx+1, y, Tile.RoadN); set(cx+2, y, Tile.RoadN); }
    }
  }

  // Add a clockwise two-lane perimeter ring just inside map edges
  // Top edge: two rows (y=1,2) go West; Bottom edge: (y=height-2,height-1) go East
  // Left edge: two cols (x=1,2) go South; Right edge: (x=width-2,width-1) go North
  const setP = (x,y,t)=>{ if (x>=0&&y>=0&&x<width&&y<height) tiles[y][x]=t; };
  // Top
  for (let x=1; x<width-1; x++){ setP(x,1,Tile.RoadW); setP(x,2,Tile.RoadW); }
  // Bottom
  for (let x=1; x<width-1; x++){ setP(x,height-2,Tile.RoadE); setP(x,height-1,Tile.RoadE); }
  // Left
  for (let y=1; y<height-1; y++){ setP(1,y,Tile.RoadS); setP(2,y,Tile.RoadS); }
  // Right
  for (let y=1; y<height-1; y++){ setP(width-2,y,Tile.RoadN); setP(width-1,y,Tile.RoadN); }

  const roads = buildRoadGraph(tiles, width, height, roundabouts);
  const peds = buildPedGraph(tiles, width, height);
  return { tiles, width, height, W, MED, seed, roads, peds, buildings };
}

// helpers
function rectLine(tiles, x, y, len, type) { for (let i = 0; i < len; i++) tiles[y] && (tiles[y][x + i] = type); }
function colLine(tiles, x, y, len, type) { for (let i = 0; i < len; i++) tiles[y + i] && (tiles[y + i][x] = type); }

function buildRoadGraph(tiles, width, height, roundabouts){
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
  // link
  for (const n of nodes){
    const v = dirVec[n.dir], a1x = n.x+v.x, a1y = n.y+v.y, t1 = get(a1x,a1y);
    const td = tileDir(t1);
    if (td) { n.next.push({ x:a1x, y:a1y, dir:td }); } // allow turning through corners
  }
  // augment exits for roundabouts (outer lanes provide optional exits)
  for (const {cx,cy} of roundabouts){
    const addExit = (x,y,ex,ey)=>{
      const from = byKey.get(keyOf(x,y,tileDir(get(x,y)))); const td = tileDir(get(ex,ey));
      if (from && td) from.next.push({ x:ex, y:ey, dir:td });
    };
    // Right side bottom two: up (default) OR right -> exit to (x+1,y)
    addExit(cx+2, cy+1, cx+3, cy+1); addExit(cx+1, cy+1, cx+2, cy+1);
    // Top row right two: left (default) OR up -> exit to (x, y-1)
    addExit(cx+1, cy-2, cx+1, cy-3); addExit(cx+2, cy-2, cx+2, cy-3);
    // Left side top two: down (default) OR left -> exit to (x-1, y)
    addExit(cx-2, cy-2, cx-3, cy-2); addExit(cx-2, cy-1, cx-3, cy-1);
    // Bottom row left two: right (default) OR down -> exit to (x, y+1)
    addExit(cx-2, cy+1, cx-2, cy+2); addExit(cx-1, cy+1, cx-1, cy+2);
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