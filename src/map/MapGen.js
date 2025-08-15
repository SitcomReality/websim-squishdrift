import { Tile } from './TileTypes.js';
import { rng } from '../utils/RNG.js';

export function generateCity(seed = 'alpha-seed', blocksWide = 2, blocksHigh = 2) {
  const W = 11, MED = 1, RING = 2; // per DESIGN: 11 footprint, 1 median, 2-tile road ring
  const width = blocksWide * (W + MED) + MED;
  const height = blocksHigh * (W + MED) + MED;
  const tiles = Array.from({ length: height }, () => new Uint8Array(width).fill(Tile.Grass));
  const rand = rng(seed); // reserved for future variability

  // Owned road rings per block
  for (let by = 0; by < blocksHigh; by++) {
    for (let bx = 0; bx < blocksWide; bx++) {
      const ox = MED + bx * (W + MED);
      const oy = MED + by * (W + MED);
      // 2-tile thick border around W x W block footprint
      for (let t = 0; t < RING; t++) {
        // top/bottom rows (E/W)
        for (let i = 0; i < W - t * 2; i++) {
          tiles[oy + t][ox + t + i] = Tile.RoadE;
          tiles[oy + W - 1 - t][ox + t + i] = Tile.RoadW;
        }
        // left/right cols (N/S)
        for (let i = 0; i < W - t * 2; i++) {
          tiles[oy + t + i][ox + t] = Tile.RoadN;
          tiles[oy + t + i][ox + W - 1 - t] = Tile.RoadS;
        }
      }
    }
  }

  // Medians between blocks (grid lines)
  for (let gy = 0; gy <= blocksHigh; gy++) {
    const y = gy * (W + MED);
    if (y >= 0 && y < height) for (let x = 0; x < width; x++) tiles[y][x] = Tile.Median;
  }
  for (let gx = 0; gx <= blocksWide; gx++) {
    const x = gx * (W + MED);
    if (x >= 0 && x < width) for (let y = 0; y < height; y++) tiles[y][x] = Tile.Median;
  }

  // Carve 2-lane road corridors adjacent to each median (connect blocks)
  for (let gy = 0; gy <= blocksHigh; gy++) {
    const y = gy * (W + MED);
    if (y > 0 && y < height - 0) {
      const yNorth = y - 1, ySouth = y + 1;
      if (yNorth >= 0) for (let x = 0; x < width; x++) tiles[yNorth][x] = Tile.RoadE;
      if (ySouth < height) for (let x = 0; x < width; x++) tiles[ySouth][x] = Tile.RoadW;
    }
  }
  for (let gx = 0; gx <= blocksWide; gx++) {
    const x = gx * (W + MED);
    if (x > 0 && x < width - 0) {
      const xWest = x - 1, xEast = x + 1;
      if (xWest >= 0) for (let y = 0; y < height; y++) tiles[y][xWest] = Tile.RoadS;
      if (xEast < width) for (let y = 0; y < height; y++) tiles[y][xEast] = Tile.RoadN;
    }
  }

  // Intersections: medians at crossings convert to road
  for (let gy = 0; gy <= blocksHigh; gy++) {
    for (let gx = 0; gx <= blocksWide; gx++) {
      const y = gy * (W + MED), x = gx * (W + MED);
      if (y < height && x < width) tiles[y][x] = Tile.Intersection;
    }
  }

  const roads = buildRoadGraph(tiles, width, height);
  return { tiles, width, height, W, MED, RING, seed, roads };
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
  // link
  for (const n of nodes){
    const v = dirVec[n.dir], a1x = n.x+v.x, a1y = n.y+v.y, t1 = get(a1x,a1y);
    if (tileDir(t1) === n.dir) { // straight lane continues
      n.next.push({ x:a1x, y:a1y, dir:n.dir });
    } else if (t1 === Tile.Intersection) {
      // straight through intersection (two tiles ahead)
      const a2x = a1x+v.x, a2y = a1y+v.y, t2 = get(a2x,a2y);
      if (tileDir(t2) === n.dir) n.next.push({ x:a2x, y:a2y, dir:n.dir });
      // left/right turns enter the first lane adjacent to intersection center
      const ld = leftOf[n.dir], lv = dirVec[ld], lx=a1x+lv.x, ly=a1y+lv.y;
      if (tileDir(get(lx,ly)) === ld) n.next.push({ x:lx, y:ly, dir:ld });
      const rd = rightOf[n.dir], rv = dirVec[rd], rx=a1x+rv.x, ry=a1y+rv.y;
      if (tileDir(get(rx,ry)) === rd) n.next.push({ x:rx, y:ry, dir:rd });
    }
  }
  return { nodes, byKey };
}