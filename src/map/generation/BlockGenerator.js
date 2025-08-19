import { Tile } from '../TileTypes.js';

export class BlockGenerator {
  constructor(cityLayout, rand) {
    this.cityLayout = cityLayout;
    this.rand = rand;
  }

  generateBlocks(tiles) {
    // Generate individual blocks
    for (let by = 0; by < this.cityLayout.blocksHigh; by++) {
      for (let bx = 0; bx < this.cityLayout.blocksWide; bx++) {
        const origin = this.cityLayout.getBlockOrigin(bx, by);
        this.generateSingleBlock(tiles, origin.x, origin.y);
      }
    }

    // Generate medians between blocks
    this.generateMedians(tiles);
    // Optionally merge adjacent blocks into a "triple block"
    this.generateTripleBlocks(tiles);
  }

  generateSingleBlock(tiles, ox, oy) {
    const ROAD_RING = 2;
    const FOOTPATH_RING = 1;

    // 2-tile road ring
    for (let t = 0; t < ROAD_RING; t++) {
      // top/bottom rows (E/W lanes)
      for (let i = t; i < this.cityLayout.W - t; i++) {
        tiles[oy + t][ox + i] = Tile.RoadE;
        tiles[oy + this.cityLayout.W - 1 - t][ox + i] = Tile.RoadW;
      }
      // left/right cols (N/S lanes)
      for (let i = t; i < this.cityLayout.W - t; i++) {
        tiles[oy + i][ox + t] = Tile.RoadN;
        tiles[oy + i][ox + this.cityLayout.W - 1 - t] = Tile.RoadS;
      }
    }

    // Footpaths inside road ring
    const fpStart = ROAD_RING;
    const fpSize = this.cityLayout.W - ROAD_RING * 2;
    for (let i = 0; i < fpSize; i++) {
      tiles[oy + fpStart][ox + fpStart + i] = Tile.Footpath;
      tiles[oy + fpStart + fpSize - 1][ox + fpStart + i] = Tile.Footpath;
      tiles[oy + fpStart + i][ox + fpStart] = Tile.Footpath;
      tiles[oy + fpStart + i][ox + fpStart + fpSize - 1] = Tile.Footpath;
    }

    // 5x5 Interior: lots and alleys
    const interiorStart = ROAD_RING + FOOTPATH_RING;
    const interiorSize = this.cityLayout.W - 2 * interiorStart;
    
    // Generate alleys (cross pattern)
    for (let y = 0; y < interiorSize; y++) {
      for (let x = 0; x < interiorSize; x++) {
        const isAlley = (x === 2 || y === 2);
        const tile = isAlley ? Tile.Footpath : Tile.Grass;
        tiles[oy + interiorStart + y][ox + interiorStart + x] = tile;
      }
    }
  }

  generateMedians(tiles) {
    // Horizontal medians
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      const y = this.cityLayout.getIntersectionCenter(0, gy).y;
      if (y >= 0 && y < this.cityLayout.height) {
        for (let x = 0; x < this.cityLayout.width; x++) {
          tiles[y][x] = Tile.Median;
        }
      }
    }

    // Vertical medians
    for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
      const x = this.cityLayout.getIntersectionCenter(gx, 0).x;
      if (x >= 0 && x < this.cityLayout.width) {
        for (let y = 0; y < this.cityLayout.height; y++) {
          tiles[y][x] = Tile.Median;
        }
      }
    }
  }

  generateTripleBlocks(tiles) {
    const { blocksWide, blocksHigh, MED, W, mapOffset } = this.cityLayout;
    const ROAD_RING = 2, FOOTPATH_RING = 1;
    // Horizontal merges
    for (let by = 0; by < blocksHigh; by++) {
      for (let bx = 0; bx < blocksWide - 1; bx++) {
        if (this.rand() < 0.25) this.carveHorizontalTriple(tiles, bx, by, ROAD_RING, FOOTPATH_RING);
      }
    }
    // Vertical merges
    for (let by = 0; by < blocksHigh - 1; by++) {
      for (let bx = 0; bx < blocksWide; bx++) {
        if (this.rand() < 0.25) this.carveVerticalTriple(tiles, bx, by, ROAD_RING, FOOTPATH_RING);
      }
    }
  }

  carveHorizontalTriple(tiles, bx, by, ROAD_RING, FOOTPATH_RING) {
    const { W, MED } = this.cityLayout;
    const left = this.cityLayout.getBlockOrigin(bx, by);
    const right = this.cityLayout.getBlockOrigin(bx + 1, by);
    const xStart = left.x + (W - 2);           // left block's rightmost road start
    const xEnd = right.x + 1;                  // right block's leftmost road end
    const yStart = left.y + ROAD_RING;         // share existing footpaths as top/bottom
    const yEnd = left.y + (W - ROAD_RING) - 1;
    // Mark merged pair
    this.cityLayout.tripleH.add(`${bx},${by}`);
    // Top/bottom boundaries as footpath
    for (let x = xStart; x <= xEnd; x++) { tiles[yStart][x] = Tile.Footpath; tiles[yEnd][x] = Tile.Footpath; }
    // Center column (former median) as footpath
    const cx = left.x + W;
    for (let y = yStart; y <= yEnd; y++) tiles[y][cx] = Tile.Footpath;
    // Plus shape arms at center row
    const cy = yStart + 2; // middle of 5 rows
    tiles[cy][xStart + 1] = Tile.Footpath;
    tiles[cy][xEnd - 1] = Tile.Footpath;
    // Fill remaining 5x5 area with lots (parks/buildings)
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        const isBoundary = (y === yStart || y === yEnd);
        const isCenter = (x === cx || y === cy);
        const isArm = (y === cy && (x === xStart + 1 || x === xEnd - 1));
        if (isBoundary || isCenter || isArm) continue;
        tiles[y][x] = (this.rand() < 0.3) ? Tile.Park : Tile.BuildingFloor;
      }
    }
  }

  carveVerticalTriple(tiles, bx, by, ROAD_RING, FOOTPATH_RING) {
    const { W, MED } = this.cityLayout;
    const top = this.cityLayout.getBlockOrigin(bx, by);
    const bottom = this.cityLayout.getBlockOrigin(bx, by + 1);
    const yStart = top.y + (W - 2);            // top block's bottom road start
    const yEnd = bottom.y + 1;                 // bottom block's top road end
    const xStart = top.x + ROAD_RING;
    const xEnd = top.x + (W - ROAD_RING) - 1;
    // Mark merged pair
    this.cityLayout.tripleV.add(`${bx},${by}`);
    // Left/right boundaries as footpath
    for (let y = yStart; y <= yEnd; y++) { tiles[y][xStart] = Tile.Footpath; tiles[y][xEnd] = Tile.Footpath; }
    // Center row (former median) as footpath
    const cy = top.y + W;
    for (let x = xStart; x <= xEnd; x++) tiles[cy][x] = Tile.Footpath;
    // Plus shape arms at center column
    const cx = xStart + 2; // middle of 5 cols
    tiles[yStart + 1][cx] = Tile.Footpath;
    tiles[yEnd - 1][cx] = Tile.Footpath;
    // Fill remaining 5x5 area with lots (parks/buildings)
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        const isBoundary = (x === xStart || x === xEnd);
        const isCenter = (y === cy || x === cx);
        const isArm = ((x === cx) && (y === yStart + 1 || y === yEnd - 1));
        if (isBoundary || isCenter || isArm) continue;
        tiles[y][x] = (this.rand() < 0.3) ? Tile.Park : Tile.BuildingFloor;
      }
    }
  }
}