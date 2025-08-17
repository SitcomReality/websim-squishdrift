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
}