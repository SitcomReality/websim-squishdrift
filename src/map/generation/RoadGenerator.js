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
    tiles[cy][cx] = Tile.Median; // Will be overwritten
    
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

    // Create circular grass median with tree
    this.createCircularMedian(tiles, cx, cy);
    
    this.createZebraCrossings(tiles, cx, cy);
  }

  createCircularMedian(tiles, cx, cy) {
    // Create circular grass in the center
    const radius = 0.4; // 40% of tile size
    const centerX = cx + 0.5;
    const centerY = cy + 0.5;
    
    // Fill with road color first
    for (let y = cy - 2; y <= cy + 2; y++) {
      for (let x = cx - 2; x <= cx + 2; x++) {
        if (x >= 0 && x < this.cityLayout.width && y >= 0 && y < this.cityLayout.height) {
          // Check if this tile is within the roundabout center
          if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) {
            tiles[y][x] = Tile.RoadN; // Use road color
          }
        }
      }
    }
    
    // Create circular grass in the very center
    for (let y = cy - 1; y <= cy + 1; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) {
        if (x >= 0 && x < this.cityLayout.width && y >= 0 && y < this.cityLayout.height) {
          // Check if this tile is the center 3x3
          if (Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1) {
            tiles[y][x] = Tile.Grass;
          }
        }
      }
    }
    
    // The very center tile gets a tree
    if (cx >= 0 && cx < this.cityLayout.width && cy >= 0 && cy < this.cityLayout.height) {
      // Add tree data to be processed by BuildingGenerator
      if (!this.trees) this.trees = [];
      
      // Random tree size for this roundabout
      const trunkHeight = 15 + this.rand() * 10;
      const leafSize = (0.5 + this.rand() * 0.3) * 0.5; // 50-80% of base, then 50% reduction
      
      this.trees.push({
        pos: { x: cx + 0.5, y: cy + 0.5 },
        trunkHeight: trunkHeight,
        leafHeight: (10 + this.rand() * 5) * leafSize,
        leafWidth: (1.0 + this.rand() * 0.5) * leafSize,
        leafColor: `hsl(${100 + this.rand() * 40}, 60%, ${35 + this.rand() * 20}%)`,
        trunkColor: `hsl(${30 + this.rand() * 20}, 40%, ${25 + this.rand() * 15}%)`,
        isRoundaboutTree: true // Flag for special handling
      });
    }
  }

  createZebraCrossings(tiles, cx, cy) {
    const set = (x, y, t) => {
      if (x >= 0 && y >= 0 && x < this.cityLayout.width && y < this.cityLayout.height) {
        tiles[y][x] = t;
      }
    };
    
    // Top side (horizontal zebra crossing over N/S road) - fix directions
    set(cx - 2, cy - 3, Tile.ZebraCrossingS);
    set(cx - 1, cy - 3, Tile.ZebraCrossingS);
    set(cx + 1, cy - 3, Tile.ZebraCrossingN);
    set(cx + 2, cy - 3, Tile.ZebraCrossingN);
    
    // Bottom side (horizontal zebra crossing over N/S road) - fix directions
    set(cx - 2, cy + 3, Tile.ZebraCrossingS);
    set(cx - 1, cy + 3, Tile.ZebraCrossingS);
    set(cx + 1, cy + 3, Tile.ZebraCrossingN);
    set(cx + 2, cy + 3, Tile.ZebraCrossingN);
    
    // Left side (vertical zebra crossing over E/W road) - these are correct
    set(cx - 3, cy - 2, Tile.ZebraCrossingW);
    set(cx - 3, cy - 1, Tile.ZebraCrossingW);
    set(cx - 3, cy + 1, Tile.ZebraCrossingE);
    set(cx - 3, cy + 2, Tile.ZebraCrossingE);

    // Right side (vertical zebra crossing over E/W road) - these are correct
    set(cx + 3, cy - 2, Tile.ZebraCrossingW);
    set(cx + 3, cy - 1, Tile.ZebraCrossingW);
    set(cx + 3, cy + 1, Tile.ZebraCrossingE);
    set(cx + 3, cy + 2, Tile.ZebraCrossingE);
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