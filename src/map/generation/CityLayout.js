import { Tile } from '../TileTypes.js';

export class CityLayout {
  constructor(blocksWide, blocksHigh, rand) {
    this.W = 11; // block width
    this.MED = 1; // median width
    this.blocksWide = blocksWide;
    this.blocksHigh = blocksHigh;
    this.rand = rand;
    
    this.cityWidth = blocksWide * (this.W + this.MED) + this.MED;
    this.cityHeight = blocksHigh * (this.W + this.MED) + this.MED;
    this.mapOffset = 2; // space for perimeter road
    
    this.width = this.cityWidth + this.mapOffset * 2;
    this.height = this.cityHeight + this.mapOffset * 2;
    
    // Decide on merged blocks
    this.mergedHorizontal = new Set();
    this.mergedVertical = new Set();
    this.initializeBlockMerges();
  }

  initializeBlockMerges() {
    const mergeChance = 0.35;
    const occupied = new Set();
    const key = (bx, by) => `${bx},${by}`;

    for (let by = 0; by < this.blocksHigh; by++) {
      for (let bx = 0; bx < this.blocksWide; bx++) {
        if (occupied.has(key(bx, by))) continue;

        // Try horizontal merge
        if (bx < this.blocksWide - 1 && !occupied.has(key(bx + 1, by)) && this.rand() < mergeChance) {
          this.mergedHorizontal.add(key(bx, by));
          occupied.add(key(bx, by));
          occupied.add(key(bx + 1, by));
          continue; // Skip vertical check if merged horizontally
        }

        // Try vertical merge
        if (by < this.blocksHigh - 1 && !occupied.has(key(bx, by + 1)) && this.rand() < mergeChance) {
          this.mergedVertical.add(key(bx, by));
          occupied.add(key(bx, by));
          occupied.add(key(bx, by + 1));
        }
      }
    }
  }

  createEmptyTiles() {
    return Array.from({ length: this.height }, () => 
      new Uint8Array(this.width).fill(Tile.Grass)
    );
  }

  getBlockOrigin(bx, by) {
    return {
      x: this.mapOffset + this.MED + bx * (this.W + this.MED),
      y: this.mapOffset + this.MED + by * (this.W + this.MED)
    };
  }

  getIntersectionCenter(gx, gy) {
    return {
      x: this.mapOffset + gx * (this.W + this.MED),
      y: this.mapOffset + gy * (this.W + this.MED)
    };
  }
}