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
    
    // Increase width/height by 2 to account for footpath border
    this.width = this.cityWidth + this.mapOffset * 2 + 2;
    this.height = this.cityHeight + this.mapOffset * 2 + 2;
    
    // Adjust offsets to account for footpath border
    this.footpathOffset = 1; // footpath border offset
  }

  createEmptyTiles() {
    return Array.from({ length: this.height }, () => 
      new Uint8Array(this.width).fill(Tile.Grass)
    );
  }

  getBlockOrigin(bx, by) {
    return {
      x: this.mapOffset + this.MED + bx * (this.W + this.MED) + this.footpathOffset,
      y: this.mapOffset + this.MED + by * (this.W + this.MED) + this.footpathOffset
    };
  }

  getIntersectionCenter(gx, gy) {
    return {
      x: this.mapOffset + gx * (this.W + this.MED) + this.footpathOffset,
      y: this.mapOffset + gy * (this.W + this.MED) + this.footpathOffset
    };
  }
}