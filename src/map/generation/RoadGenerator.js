import { Tile } from '../TileTypes.js';

export class RoadGenerator {
  constructor(cityLayout, rand) {
    this.cityLayout = cityLayout;
    this.rand = rand;
    this.roundabouts = [];
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
    // Check if this tile position is within any merged block area
    const roundabouts = this.roundabouts || [];
    
    for (const rb of roundabouts) {
      const { cx, cy } = rb;
      
      // Check if this tile is in the zebra crossing area between merged blocks
      const isHorizontalMerge = 
        (Math.abs(y - (cy - 3)) <= 0.5 && Math.abs(x - cx) <= 2) || // top crossings
        (Math.abs(y - (cy + 3)) <= 0.5 && Math.abs(x - cx) <= 2);  // bottom crossings
        
      const isVerticalMerge = 
        (Math.abs(x - (cx - 3)) <= 0.5 && Math.abs(y - cy) <= 2) || // left crossings
        (Math.abs(x - (cx + 3)) <= 0.5 && Math.abs(y - cy) <= 2);   // right crossings
        
      if (isHorizontalMerge || isVerticalMerge) {
        // Check if this roundabout is part of a merged block
        const isMerged = this.isRoundaboutMerged(rb);
        if (isMerged) {
          return true;
        }
      }
    }
    
    return false;
  }

  isRoundaboutMerged(rb) {
    const { cx, cy } = rb;
    
    // Check if this roundabout has been merged horizontally or vertically
    const cityLayout = this.cityLayout;
    const blocksWide = cityLayout.blocksWide;
    const blocksHigh = cityLayout.blocksHigh;
    
    // Get grid position of this roundabout
    const gx = Math.round((cx - cityLayout.mapOffset) / (cityLayout.W + cityLayout.MED));
    const gy = Math.round((cy - cityLayout.mapOffset) / (cityLayout.W + cityLayout.MED));
    
    // Check if there's a horizontal merge with the next block
    if (gx < blocksWide - 1) {
      const rightKey = `${gx},${gy}`;
      const leftKey = `${gx-1},${gy}`;
      // Check if usedH contains this pair (indicating horizontal merge)
      if (this.usedH && (this.usedH.has(rightKey) || this.usedH.has(leftKey))) {
        return true;
      }
    }
    
    // Check if there's a vertical merge with the block below
    if (gy < blocksHigh - 1) {
      const bottomKey = `${gx},${gy}`;
      const topKey = `${gx},${gy-1}`;
      // Check if usedV contains this pair (indicating vertical merge)
      if (this.usedV && (this.usedV.has(bottomKey) || this.usedV.has(topKey))) {
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