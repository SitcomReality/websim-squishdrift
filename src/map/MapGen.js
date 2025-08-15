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
        rectLine(tiles, ox + t, oy + t, W - t * 2, Tile.Road);               // top
        rectLine(tiles, ox + t, oy + W - 1 - t, W - t * 2, Tile.Road);       // bottom
        colLine(tiles, ox + t, oy + t, W - t * 2, Tile.Road);                // left
        colLine(tiles, ox + W - 1 - t, oy + t, W - t * 2, Tile.Road);        // right
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

  // Intersections: medians at crossings convert to road
  for (let gy = 0; gy <= blocksHigh; gy++) {
    for (let gx = 0; gx <= blocksWide; gx++) {
      const y = gy * (W + MED), x = gx * (W + MED);
      if (y < height && x < width) tiles[y][x] = Tile.Road;
    }
  }

  return { tiles, width, height, W, MED, RING, seed };
}

// helpers
function rectLine(tiles, x, y, len, type) { for (let i = 0; i < len; i++) tiles[y] && (tiles[y][x + i] = type); }
function colLine(tiles, x, y, len, type) { for (let i = 0; i < len; i++) tiles[y + i] && (tiles[y + i][x] = type); }