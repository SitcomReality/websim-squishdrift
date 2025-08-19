import { Tile } from '../TileTypes.js';

export class RoadGenerator {
  constructor(cityLayout, rand) {
    this.cityLayout = cityLayout;
    this.rand = rand;
    this.roundabouts = [];
    this.mergedBlocksH = new Set(); // Stores 'bx,by' of horizontally merged left blocks
    this.mergedBlocksV = new Set(); // Stores 'bx,by' of vertically merged top blocks
  }

  // Methods to be called by BlockGenerator to register merged blocks
  addHorizontalMerge(bx, by) {
    this.mergedBlocksH.add(`${bx},${by}`);
  }

  addVerticalMerge(bx, by) {
    this.mergedBlocksV.add(`${bx},${by}`);
  }

  generateRoads(tiles) {
    // Outer perimeter road
    this.generatePerimeterRoad(tiles);
    
    // Generate roundabouts at intersections
    this.generateRoundabouts(tiles);
  }

  generatePerimeterRoad(tiles) {
    const width = this.cityLayout.width;
    const height = this.cityLayout.height;

    // Top and bottom lanes
    for (let i = 0; i < width; i++) {
      tiles[0][i] = Tile.RoadW;
      tiles[1][i] = Tile.RoadW;
      tiles[height - 2][i] = Tile.RoadE;
      tiles[height - 1][i] = Tile.RoadE;
    }

    // Left and right lanes
    for (let i = 0; i < height; i++) {
      tiles[i][0] = Tile.RoadS;
      tiles[i][1] = Tile.RoadS;
      tiles[i][width - 2] = Tile.RoadN;
      tiles[i][width - 1] = Tile.RoadN;
    }
  }

  generateRoundabouts(tiles) {
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
        const center = this.cityLayout.getIntersectionCenter(gx, gy);
        if (center.y >= this.cityLayout.height || center.x >= this.cityLayout.width) continue;
        
        const isPerimeter = (gx === 0 || gx === this.cityLayout.blocksWide || 
                           gy === 0 || gy === this.cityLayout.blocksHigh);
        
        this.createRoundabout(tiles, center.x, center.y, isPerimeter);
        this.roundabouts.push({ cx: center.x, cy: center.y, isPerimeter });
      }
    }
  }

  createRoundabout(tiles, cx, cy, isPerimeter) {
    // Mark center as a special roundabout center tile (will be drawn as road background
    // with a circular grass patch). We keep separate metadata via roundabouts array.
    tiles[cy][cx] = Tile.RoundaboutCenter;
    
    const set = (x, y, t) => {
      if (x >= 0 && y >= 0 && x < this.cityLayout.width && y < this.cityLayout.height) {
        tiles[y][x] = t;
      }
    };

    if (!isPerimeter) {
      // Standard 5x5 roundabout
      this.createStandardRoundabout(tiles, cx, cy, set);
    } else {
      // Perimeter roundabout with adjusted connections
      this.createPerimeterRoundabout(tiles, cx, cy, set, isPerimeter);
    }

    this.createZebraCrossings(tiles, cx, cy);
  }

  createZebraCrossings(tiles, cx, cy) {
    const set = (x, y, t) => {
      if (x >= 0 && y >= 0 && x < this.cityLayout.width && y < this.cityLayout.height) {
        // Check if this tile is part of a merged block - if so, use footpath instead
        const isMerged = this.isTileInMergedArea(x, y);
        const finalType = isMerged ? Tile.Footpath : t;
        tiles[y][x] = finalType;
      }
    };
    
    // Top side (horizontal zebra crossing over N/S road)
    set(cx - 2, cy - 3, Tile.ZebraCrossingS);
    set(cx - 1, cy - 3, Tile.ZebraCrossingS);
    set(cx + 1, cy - 3, Tile.ZebraCrossingN);
    set(cx + 2, cy - 3, Tile.ZebraCrossingN);
    
    // Bottom side (horizontal zebra crossing over N/S road)
    set(cx - 2, cy + 3, Tile.ZebraCrossingS);
    set(cx - 1, cy + 3, Tile.ZebraCrossingS);
    set(cx + 1, cy + 3, Tile.ZebraCrossingN);
    set(cx + 2, cy + 3, Tile.ZebraCrossingN);
    
    // Left side (vertical zebra crossing over E/W road)
    set(cx - 3, cy - 2, Tile.ZebraCrossingW);
    set(cx - 3, cy - 1, Tile.ZebraCrossingW);
    set(cx - 3, cy + 1, Tile.ZebraCrossingE);
    set(cx - 3, cy + 2, Tile.ZebraCrossingE);

    // Right side (vertical zebra crossing over E/W road)
    set(cx + 3, cy - 2, Tile.ZebraCrossingW);
    set(cx + 3, cy - 1, Tile.ZebraCrossingW);
    set(cx + 3, cy + 1, Tile.ZebraCrossingE);
    set(cx + 3, cy + 2, Tile.ZebraCrossingE);
  }

  isTileInMergedArea(x, y) {
    const { W, MED, mapOffset } = this.cityLayout;

    // Check horizontal merges
    for (const key of this.mergedBlocksH) {
      const [bx, by] = key.split(',').map(Number);
      const leftBlockOrigin = this.cityLayout.getBlockOrigin(bx, by);
      
      const xStartInterior = leftBlockOrigin.x + (W - 2); // Start of 5x5 interior merged area
      const xEndInterior = xStartInterior + 4; // End of 5x5 interior merged area
      const yStartInterior = leftBlockOrigin.y + 3;
      const yEndInterior = yStartInterior + 4;

      // Check if (x,y) is within the main 5x5 merged interior
      if (x >= xStartInterior && x <= xEndInterior && y >= yStartInterior && y <= yEndInterior) {
        return true;
      }
      
      // Check the extended footpath areas (top/bottom rows and central median column)
      const topFootpathY = leftBlockOrigin.y + 2;
      const bottomFootpathY = leftBlockOrigin.y + (W - 3);
      const medianX = leftBlockOrigin.x + W;

      // Top and bottom extended footpaths (horizontal segments)
      if ((y === topFootpathY || y === bottomFootpathY) && x >= xStartInterior && x <= xEndInterior) {
          return true;
      }
      // Central median column (vertical segment)
      if (x === medianX && y >= topFootpathY && y <= bottomFootpathY) {
          return true;
      }
    }

    // Check vertical merges
    for (const key of this.mergedBlocksV) {
      const [bx, by] = key.split(',').map(Number);
      const topBlockOrigin = this.cityLayout.getBlockOrigin(bx, by);

      const yStartInterior = topBlockOrigin.y + (W - 2);
      const yEndInterior = yStartInterior + 4;
      const xStartInterior = topBlockOrigin.x + 3;
      const xEndInterior = xStartInterior + 4;

      // Check if (x,y) is within the main 5x5 merged interior
      if (x >= xStartInterior && x <= xEndInterior && y >= yStartInterior && y <= yEndInterior) {
        return true;
      }
      
      // Check the extended footpath areas (left/right columns and central median row)
      const leftFootpathX = topBlockOrigin.x + 2;
      const rightFootpathX = topBlockOrigin.x + (W - 3);
      const medianY = topBlockOrigin.y + W;

      // Left and right extended footpaths (vertical segments)
      if ((x === leftFootpathX || x === rightFootpathX) && y >= yStartInterior && y <= yEndInterior) {
          return true;
      }
      // Central median row (horizontal segment)
      if (y === medianY && x >= leftFootpathX && x <= rightFootpathX) {
          return true;
      }
    }

    return false;
  }

  createStandardRoundabout(tiles, cx, cy, set) {
    // Top (leftward)
    for (let x = cx - 2; x <= cx + 2; x++) {
      set(x, cy - 2, Tile.RoadW);
      set(x, cy - 1, Tile.RoadW);
    }
    // Bottom (rightward)
    for (let x = cx - 2; x <= cx + 2; x++) {
      set(x, cy + 2, Tile.RoadE);
      set(x, cy + 1, Tile.RoadE);
    }
    // Left (downward)
    for (let y = cy - 2; y <= cy + 2; y++) {
      set(cx - 2, y, Tile.RoadS);
      set(cx - 1, y, Tile.RoadS);
    }
    // Right (upward)
    for (let y = cy - 2; y <= cy + 2; y++) {
      set(cx + 1, y, Tile.RoadN);
      set(cx + 2, y, Tile.RoadN);
    }
  }

  createPerimeterRoundabout(tiles, cx, cy, set, isPerimeter) {
    // Adjust connections for perimeter roundabouts
    if (cy === 1 || cy === this.cityLayout.height - 2) {
      // Top/bottom perimeter
      this.adjustTopBottomPerimeter(tiles, cx, cy, set, cy === 1);
    }
    if (cx === 1 || cx === this.cityLayout.width - 2) {
      // Left/right perimeter
      this.adjustLeftRightPerimeter(tiles, cx, cy, set, cx === 1);
    }
  }

  adjustTopBottomPerimeter(tiles, cx, cy, set, isTop) {
    const direction = isTop ? Tile.RoadW : Tile.RoadE;
    for (let x = cx - 2; x <= cx + 2; x++) {
      set(x, isTop ? cy - 2 : cy + 2, direction);
      set(x, isTop ? cy - 1 : cy + 1, direction);
    }
  }

  adjustLeftRightPerimeter(tiles, cx, cy, set, isLeft) {
    const direction = isLeft ? Tile.RoadS : Tile.RoadN;
    for (let y = cy - 2; y <= cy + 2; y++) {
      set(isLeft ? cx - 2 : cx + 1, y, direction);
      set(isLeft ? cx - 1 : cx + 2, y, direction);
    }
  }

  getRoundabouts() {
    return this.roundabouts;
  }
}