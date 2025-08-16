import { Tile } from './TileTypes.js';
import { rng } from '../utils/RNG.js';

export function generateCity(seed = 'alpha-seed', blocksWide = 4, blocksHigh = 4) {
  const W = 11, MED = 1;
  const ROAD_RING = 2;      // 2-tile road ring
  const FOOTPATH_RING = 1;  // 1-tile footpath ring
  const mapOffset = 2; // space for new perimeter road
  const cityWidth = blocksWide * (W + MED) + MED;
  const cityHeight = blocksHigh * (W + MED) + MED;
  const width = cityWidth + mapOffset * 2;
  const height = cityHeight + mapOffset * 2;
  const tiles = Array.from({ length: height }, () => new Uint8Array(width).fill(Tile.Grass));
  const buildings = [];
  const rand = rng(seed);
  const roundabouts = []; // track centers for exit graph augmentation

  // Per-block generation
  for (let by = 0; by < blocksHigh; by++) {
    for (let bx = 0; bx < blocksWide; bx++) {
      const ox = mapOffset + MED + bx * (W + MED);
      const oy = mapOffset + MED + by * (W + MED);
      
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
    const y = mapOffset + gy * (W + MED);
    if (y >= 0 && y < height) for (let x = 0; x < width; x++) tiles[y][x] = Tile.Median;
  }
  for (let gx = 0; gx <= blocksWide; gx++) {
    const x = mapOffset + gx * (W + MED);
    if (x >= 0 && x < width) for (let y = 0; y < height; y++) tiles[y][x] = Tile.Median;
  }
  
  // Outer perimeter road (clockwise)
  for (let i = 0; i < width; i++) {
    tiles[0][i] = Tile.RoadE;
    tiles[1][i] = Tile.RoadE;
    tiles[height - 2][i] = Tile.RoadW;
    tiles[height - 1][i] = Tile.RoadW;
  }
  for (let i = 0; i < height; i++) {
    tiles[i][0] = Tile.RoadS;
    tiles[i][1] = Tile.RoadS;
    tiles[i][width - 2] = Tile.RoadN;
    tiles[i][width - 1] = Tile.RoadN;
  }

  // Inter-block corridors are now formed by block road rings + medians
  // The logic that carved corridors explicitly has been removed.

  // Intersections: build 2-lane anti-clockwise roundabouts (5x5 area)
  for (let gy = 0; gy <= blocksHigh; gy++) {
    for (let gx = 0; gx <= blocksWide; gx++) {
      const cx = mapOffset + gx * (W + MED);
      const cy = mapOffset + gy * (W + MED);
      if (cy >= height || cx >= width) continue;
      
      const isPerimeter = (gx === 0 || gx === blocksWide || gy === 0 || gy === blocksHigh);
      
      tiles[cy][cx] = Tile.Median; // central island
      roundabouts.push({ cx, cy, isPerimeter });
      
      // Top-left corner (SW direction)
      tiles[cy-2][cx-2] = Tile.RoadSW;
      tiles[cy-2][cx-1] = Tile.RoadSW;
      tiles[cy-1][cx-2] = Tile.RoadSW;
      tiles[cy-1][cx-1] = Tile.RoadSW;
      
      // Top-right corner (SE direction)  
      tiles[cy-2][cx+2] = Tile.RoadSE;
      tiles[cy-2][cx+1] = Tile.RoadSE;
      tiles[cy-1][cx+2] = Tile.RoadSE;
      tiles[cy-1][cx+1] = Tile.RoadSE;
      
      // Bottom-left corner (NW direction)
      tiles[cy+2][cx-2] = Tile.RoadNW;
      tiles[cy+2][cx-1] = Tile.RoadNW;
      tiles[cy+1][cx-2] = Tile.RoadNW;
      tiles[cy+1][cx-1] = Tile.RoadNW;
      
      // Bottom-right corner (NE direction)
      tiles[cy+2][cx+2] = Tile.RoadNE;
      tiles[cy+2][cx+1] = Tile.RoadNE;
      tiles[cy+1][cx+2] = Tile.RoadNE;
      tiles[cy+1][cx+1] = Tile.RoadNE;
      
      // Straight roads
      for (let x = cx-2; x <= cx+2; x++) {
        if (x !== cx) { // Skip median
          tiles[cy-2][x] = Tile.RoadW; // Top row westbound
          tiles[cy+2][x] = Tile.RoadE; // Bottom row eastbound
        }
      }
      
      for (let y = cy-2; y <= cy+2; y++) {
        if (y !== cy) { // Skip median
          tiles[y][cx-2] = Tile.RoadS; // Left column southbound
          tiles[y][cx+2] = Tile.RoadN; // Right column northbound
        }
      }
      
      if (isPerimeter) {
        if (gy === 0) { // Top perimeter
          for (let x=cx-2; x<=cx+2; x++) { 
            tiles[cy-2][x] = Tile.RoadW; 
            tiles[cy-1][x] = Tile.RoadW; 
          }
          for (let y=cy-1; y<=cy+2; y++) {
            if (gx > 0) { 
              tiles[y][cx-2] = Tile.RoadS; 
              tiles[y][cx-1] = Tile.RoadS; 
            }
            if (gx < blocksWide) { 
              tiles[y][cx+1] = Tile.RoadN; 
              tiles[y][cx+2] = Tile.RoadN; 
            }
          }
        }
        if (gy === blocksHigh) { // Bottom perimeter
          for (let x=cx-2; x<=cx+2; x++) { 
            tiles[cy+2][x] = Tile.RoadE; 
            tiles[cy+1][x] = Tile.RoadE; 
          }
          for (let y=cy-2; y<=cy+1; y++) {
             if (gx > 0) { 
               tiles[y][cx-2] = Tile.RoadS; 
               tiles[y][cx-1] = Tile.RoadS; 
             }
             if (gx < blocksWide) { 
               tiles[y][cx+1] = Tile.RoadN; 
               tiles[y][cx+2] = Tile.RoadN; 
             }
          }
        }
        if (gx === 0) { // Left perimeter
          for (let y=cy-2; y<=cy+2; y++) { 
            tiles[y][cx-2] = Tile.RoadS; 
            tiles[y][cx-1] = Tile.RoadS; 
          }
          for (let x=cx-1; x<=cx+2; x++) {
            if (gy > 0) { 
              tiles[cy-2][x] = Tile.RoadW; 
              tiles[cy-1][x] = Tile.RoadW; 
            }
            if (gy < blocksHigh) { 
              tiles[cy+2][x] = Tile.RoadE; 
              tiles[cy+1][x] = Tile.RoadE; 
            }
          }
        }
        if (gx === blocksWide) { // Right perimeter
          for (let y=cy-2; y<=cy+2; y++) { 
            tiles[y][cx+1] = Tile.RoadN; 
            tiles[y][cx+2] = Tile.RoadN; 
          }
          for (let x=cx-2; x<=cx+1; x++) {
            if (gy > 0) { 
              tiles[cy-2][x] = Tile.RoadW; 
              tiles[cy-1][x] = Tile.RoadW; 
            }
            if (gy < blocksHigh) { 
              tiles[cy+2][x] = Tile.RoadE; 
              tiles[cy+1][x] = Tile.RoadE; 
            }
          }
        }
      }
    }
  }

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
  
  // collect nodes - add support for multi-directional roads
  for (let y=0;y<height;y++) for (let x=0;x<width;x++){
    const tileType = get(x,y);
    let dirs = [];
    
    // Handle intersection special cases
    if (tileType === Tile.RoadN || tileType === Tile.RoadE || tileType === Tile.RoadS || tileType === Tile.RoadW) {
      // Check if this is part of an intersection
      let isIntersection = false;
      for (const {cx, cy} of roundabouts) {
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        if (dx <= 2 && dy <= 2) {
          isIntersection = true;
          break;
        }
      }
      
      if (isIntersection) {
        // Determine correct direction based on position relative to intersection center
        const center = roundabouts.find(r => Math.abs(x - r.cx) <= 2 && Math.abs(y - r.cy) <= 2);
        if (center) {
          const relX = x - center.cx;
          const relY = y - center.cy;
          
          // Corner quadrants
          if (relX === -2 && relY === -2) dirs = ['S', 'W']; // Top-left corner
          else if (relX === 2 && relY === -2) dirs = ['S', 'E']; // Top-right corner
          else if (relX === -2 && relY === 2) dirs = ['N', 'W']; // Bottom-left corner
          else if (relX === 2 && relY === 2) dirs = ['N', 'E']; // Bottom-right corner
          
          // Edge cases
          else if (relX === -2 && relY === -1) dirs = ['S', 'W'];
          else if (relX === -1 && relY === -2) dirs = ['S', 'W'];
          else if (relX === 2 && relY === -1) dirs = ['S', 'E'];
          else if (relX === 1 && relY === -2) dirs = ['S', 'E'];
          else if (relX === -2 && relY === 1) dirs = ['N', 'W'];
          else if (relX === -1 && relY === 2) dirs = ['N', 'W'];
          else if (relX === 2 && relY === 1) dirs = ['N', 'E'];
          else if (relX === 1 && relY === 2) dirs = ['N', 'E'];
          
          // Single direction for straight paths
          else if (relY === -2) dirs = ['W'];
          else if (relY === 2) dirs = ['E'];
          else if (relX === -2) dirs = ['S'];
          else if (relX === 2) dirs = ['N'];
          else dirs = [roadDir(tileType)];
        } else {
          dirs = [roadDir(tileType)];
        }
      } else {
        dirs = [roadDir(tileType)];
      }
    }
    
    // Create nodes for each direction
    for (const dir of dirs) {
      const node = { x, y, dir, next: [] };
      nodes.push(node);
      byKey.set(`${x},${y},${dir}`, node);
    }
  }
  
  // link
  for (const n of nodes){
    const v = dirVec[n.dir], a1x = n.x+v.x, a1y = n.y+v.y, t1 = get(a1x,a1y);
    const td = tileDir(t1);
    if (td) { n.next.push({ x:a1x, y:a1y, dir:td }); } // allow turning through corners
  }
  // augment exits for roundabouts (outer lanes provide optional exits)
  for (const {cx,cy, isPerimeter} of roundabouts){
    const addExit = (x,y,ex,ey)=>{
      const from = byKey.get(keyOf(x,y,tileDir(get(x,y)))); const td = tileDir(get(ex,ey));
      if (from && td) from.next.push({ x:ex, y:ey, dir:td });
    };
    // Right side bottom two: up (default) OR right -> exit to (x+1,y)
    if (!isPerimeter || (cx < width - mapOffset - 1)) {
        addExit(cx+2, cy+1, cx+3, cy+1); addExit(cx+1, cy+1, cx+2, cy+1);
    }
    // Top row right two: left (default) OR up -> exit to (x, y-1)
    if (!isPerimeter || cy > mapOffset) {
        addExit(cx+1, cy-2, cx+1, cy-3); addExit(cx+2, cy-2, cx+2, cy-3);
    }
    // Left side top two: down (default) OR left -> exit to (x-1, y)
    if (!isPerimeter || cx > mapOffset) {
        addExit(cx-2, cy-2, cx-3, cy-2); addExit(cx-2, cy-1, cx-3, cy-1);
    }
    // Bottom row left two: right (default) OR down -> exit to (x, y+1)
    if (!isPerimeter || cy < height - mapOffset -1) {
        addExit(cx-2, cy+1, cx-2, cy+2); addExit(cx-1, cy+1, cx-1, cy+2);
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