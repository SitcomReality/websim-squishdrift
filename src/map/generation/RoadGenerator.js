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
    // Mark center as a special roundabout center tile
    tiles[cy][cx] = Tile.RoundaboutCenter;
    
    const set = (x, y, t) => {
      if (x >= 0 && y >= 0 && x < this.cityLayout.width && y < this.cityLayout.height) {
        tiles[y][x] = t;
      }
    };

    if (!isPerimeter) {
      // Standard 5x5 roundabout for non-edge intersections
      this.createStandardRoundabout(tiles, cx, cy, set);
    } else {
      // Perimeter roundabout with corrected edge handling
      this.createPerimeterRoundabout(tiles, cx, cy, set, isPerimeter);
    }

    this.createZebraCrossings(tiles, cx, cy);
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
    const width = this.cityLayout.width;
    const height = this.cityLayout.height;
    
    // Determine which sides are at the edge
    const isTopEdge = cy <= 1;
    const isBottomEdge = cy >= height - 2;
    const isLeftEdge = cx <= 1;
    const isRightEdge = cx >= width - 2;
    
    // Top lanes - adjust based on edge
    if (!isTopEdge) {
      // Standard leftward lanes
      for (let x = cx - 2; x <= cx + 2; x++) {
        set(x, cy - 2, Tile.RoadW);
        set(x, cy - 1, Tile.RoadW);
      }
    } else {
      // Top edge - use correct direction
      for (let x = cx - 2; x <= cx + 2; x++) {
        set(x, cy - 2, Tile.RoadE);
        set(x, cy - 1, Tile.RoadE);
      }
    }
    
    // Bottom lanes - adjust based on edge
    if (!isBottomEdge) {
      // Standard rightward lanes
      for (let x = cx - 2; x <= cx + 2; x++) {
        set(x, cy + 2, Tile.RoadE);
        set(x, cy + 1, Tile.RoadE);
      }
    } else {
      // Bottom edge - use correct direction
      for (let x = cx - 2; x <= cx + 2; x++) {
        set(x, cy + 2, Tile.RoadW);
        set(x, cy + 1, Tile.RoadW);
      }
    }
    
    // Left lanes - adjust based on edge
    if (!isLeftEdge) {
      // Standard downward lanes
      for (let y = cy - 2; y <= cy + 2; y++) {
        set(cx - 2, y, Tile.RoadS);
        set(cx - 1, y, Tile.RoadS);
      }
    } else {
      // Left edge - use correct direction
      for (let y = cy - 2; y <= cy + 2; y++) {
        set(cx - 2, y, Tile.RoadN);
        set(cx - 1, y, Tile.RoadN);
      }
    }
    
    // Right lanes - adjust based on edge
    if (!isRightEdge) {
      // Standard upward lanes
      for (let y = cy - 2; y <= cy + 2; y++) {
        set(cx + 1, y, Tile.RoadN);
        set(cx + 2, y, Tile.RoadN);
      }
    } else {
      // Right edge - use correct direction
      for (let y = cy - 2; y <= cy + 2; y++) {
        set(cx + 1, y, Tile.RoadS);
        set(cx + 2, y, Tile.RoadS);
      }
    }
  }

  createZebraCrossings(tiles, cx, cy) {
    const set = (x, y, t) => {
      if (x >= 0 && y >= 0 && x < this.cityLayout.width && y < this.cityLayout.height) {
        tiles[y][x] = t;
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

  getRoundabouts() {
    return this.roundabouts;
  }
}