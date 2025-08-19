import { Tile } from '../TileTypes.js';

export class CityLayout {
  constructor(blocksWide, blocksHigh) {
    this.W = 11; // block width
    this.MED = 1; // median width
    this.blocksWide = blocksWide;
    this.blocksHigh = blocksHigh;
    
    this.cityWidth = blocksWide * (this.W + this.MED) + this.MED;
    this.cityHeight = blocksHigh * (this.W + this.MED) + this.MED;
    this.mapOffset = 2; // space for perimeter road
    
    this.width = this.cityWidth + this.mapOffset * 2;
    this.height = this.cityHeight + this.mapOffset * 2;
    
    // Track merged "triple block" pairs
    this.tripleH = new Set(); // keys: `${bx},${by}` merged with (bx+1,by)
    this.tripleV = new Set(); // keys: `${bx},${by}` merged with (bx,by+1)
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