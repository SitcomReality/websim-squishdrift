import { Tile } from '../TileTypes.js';

export class BlockGenerator {
  constructor(cityLayout, rand) {
    this.cityLayout = cityLayout;
    this.rand = rand;
  }

  generateBlocks(tiles) {
    const key = (bx, by) => `${bx},${by}`;
    // Generate individual blocks
    for (let by = 0; by < this.cityLayout.blocksHigh; by++) {
      for (let bx = 0; bx < this.cityLayout.blocksWide; bx++) {
        const origin = this.cityLayout.getBlockOrigin(bx, by);
        const isMergedRight = this.cityLayout.mergedHorizontal.has(key(bx, by));
        const isMergedDown = this.cityLayout.mergedVertical.has(key(bx, by));
        this.generateSingleBlock(tiles, origin.x, origin.y, { skipEast: isMergedRight, skipSouth: isMergedDown });
      }
    }
    
    // Generate the "middle" blocks in merged spaces
    this.generateMergedBlocks(tiles);

    // Generate medians between blocks
    this.generateMedians(tiles);
  }

  generateSingleBlock(tiles, ox, oy, { skipEast = false, skipSouth = false } = {}) {
    const ROAD_RING = 2;
    const FOOTPATH_RING = 1;

    // 2-tile road ring
    for (let t = 0; t < ROAD_RING; t++) {
      // top/bottom rows (E/W lanes)
      for (let i = t; i < this.cityLayout.W - t; i++) {
        tiles[oy + t][ox + i] = Tile.RoadE;
        if (!skipSouth) {
          tiles[oy + this.cityLayout.W - 1 - t][ox + i] = Tile.RoadW;
        }
      }
      // left/right cols (N/S lanes)
      for (let i = t; i < this.cityLayout.W - t; i++) {
        tiles[oy + i][ox + t] = Tile.RoadN;
        if (!skipEast) {
          tiles[oy + i][ox + this.cityLayout.W - 1 - t] = Tile.RoadS;
        }
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
  
  generateMergedBlocks(tiles) {
    const key = (bx, by) => `${bx},${by}`;
    for (let by = 0; by < this.cityLayout.blocksHigh; by++) {
      for (let bx = 0; bx < this.cityLayout.blocksWide; bx++) {
        const k = key(bx, by);
        const origin = this.cityLayout.getBlockOrigin(bx, by);
        
        if (this.cityLayout.mergedHorizontal.has(k)) {
          const startX = origin.x + this.cityLayout.W;
          const startY = origin.y + 2; // Align with block interior
          this.generateMergedBlockContent(tiles, startX, startY, 5, this.cityLayout.W - 4, 'horizontal');
        }
        if (this.cityLayout.mergedVertical.has(k)) {
          const startX = origin.x + 2; // Align with block interior
          const startY = origin.y + this.cityLayout.W;
          this.generateMergedBlockContent(tiles, startX, startY, this.cityLayout.W - 4, 5, 'vertical');
        }
      }
    }
  }

  generateMergedBlockContent(tiles, ox, oy, width, height, direction) {
    // Fill the area with grass first
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles[oy + y][ox + x] = Tile.Grass;
      }
    }

    // Create the central footpath alley
    if (direction === 'horizontal') {
      const alleyX = 2; // Center of the 5-tile width
      for (let y = 0; y < height; y++) {
        tiles[oy + y][ox + alleyX] = Tile.Footpath;
        // Add perpendicular alley segments
        if (y === 2 || y === 7) {
           tiles[oy + y][ox + alleyX - 1] = Tile.Footpath;
           tiles[oy + y][ox + alleyX - 2] = Tile.Footpath;
           tiles[oy + y][ox + alleyX + 1] = Tile.Footpath;
           tiles[oy + y][ox + alleyX + 2] = Tile.Footpath;
        }
      }
    } else { // vertical
      const alleyY = 2; // Center of the 5-tile height
      for (let x = 0; x < width; x++) {
        tiles[oy + alleyY][ox + x] = Tile.Footpath;
        // Add perpendicular alley segments
        if (x === 2 || x === 7) {
           tiles[oy + alleyY - 1][ox + x] = Tile.Footpath;
           tiles[oy + alleyY - 2][ox + x] = Tile.Footpath;
           tiles[oy + alleyY + 1][ox + x] = Tile.Footpath;
           tiles[oy + alleyY + 2][ox + x] = Tile.Footpath;
        }
      }
    }
  }

  generateMedians(tiles) {
    const key = (bx, by) => `${bx},${by}`;
    // Horizontal medians
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      const y = this.cityLayout.getIntersectionCenter(0, gy).y;
      if (y >= 0 && y < this.cityLayout.height) {
        for (let x = 0; x < this.cityLayout.width; x++) {
          // Check if this median is between two vertically merged blocks
          const bx = Math.floor((x - this.cityLayout.mapOffset) / (this.cityLayout.W + this.cityLayout.MED));
          const isMerged = gy > 0 && this.cityLayout.mergedVertical.has(key(bx, gy - 1));
          if (!isMerged) {
            tiles[y][x] = Tile.Median;
          }
        }
      }
    }

    // Vertical medians
    for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
      const x = this.cityLayout.getIntersectionCenter(gx, 0).x;
      if (x >= 0 && x < this.cityLayout.width) {
        for (let y = 0; y < this.cityLayout.height; y++) {
          // Check if this median is between two horizontally merged blocks
          const by = Math.floor((y - this.cityLayout.mapOffset) / (this.cityLayout.W + this.cityLayout.MED));
          const isMerged = gx > 0 && this.cityLayout.mergedHorizontal.has(key(gx - 1, by));
          if (!isMerged) {
            tiles[y][x] = Tile.Median;
          }
        }
      }
    }
  }
}