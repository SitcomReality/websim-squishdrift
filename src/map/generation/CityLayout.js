import { Tile } from '../TileTypes.js';

export class CityLayout {
  constructor(blocksWide, blocksHigh) {
    this.W = 11; // block width
    this.MED = 1; // median width
    this.blocksWide = blocksWide;
    this.blocksHigh = blocksHigh;
    
    this.cityWidth = blocksWide * (this.W + this.MED) + this.MED;
    this.cityHeight = blocksHigh * (this.W + this.MED) + this.MED;
    this.mapOffset = 2; // Reduced from 3 to 2 to fit footpath outside
    
    // Add footpath border
    this.footpathBorder = 1;
    this.width = this.cityWidth + this.mapOffset * 2 + this.footpathBorder * 2;
    this.height = this.cityHeight + this.mapOffset * 2 + this.footpathBorder * 2;
  }

  createEmptyTiles() {
    return Array.from({ length: this.height }, () => 
      new Uint8Array(this.width).fill(Tile.Grass)
    );
  }

  getBlockOrigin(bx, by) {
    return {
      x: this.mapOffset + this.footpathBorder + this.MED + bx * (this.W + this.MED),
      y: this.mapOffset + this.footpathBorder + this.MED + by * (this.W + this.MED)
    };
  }

  getIntersectionCenter(gx, gy) {
    return {
      x: this.mapOffset + this.footpathBorder + gx * (this.W + this.MED),
      y: this.mapOffset + this.footpathBorder + gy * (this.W + this.MED)
    };
  }

  getPerimeterFootpathBounds() {
    return {
      top: this.mapOffset,
      bottom: this.height - this.mapOffset - 1,
      left: this.mapOffset,
      right: this.width - this.mapOffset - 1
    };
  }
}