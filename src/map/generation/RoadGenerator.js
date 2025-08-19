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

    // Add zebra crossings to inner perimeter lanes between intersections
    this.addPerimeterInnerCrossings(tiles);
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
      this.createPerimeterRoundabout(tiles, cx, cy, set);
    }

    this.createZebraCrossings(tiles, cx, cy);
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

  createPerimeterRoundabout(tiles, cx, cy, set) {
    // For perimeter roundabouts, we start with a standard one and then
    // overwrite the parts that are off-map or need to connect differently.
    this.createStandardRoundabout(tiles, cx, cy, set);
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

  addPerimeterInnerCrossings(tiles) {
    const W = this.cityLayout.width, H = this.cityLayout.height;

    // Top inner lane: y = 1, road flows West => use ZebraCrossingW (left-right neighbors are road)
    for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
      const cx = this.cityLayout.getIntersectionCenter(gx, 0).x;
      if (cx - 2 >= 0) {
        tiles[1][cx - 2] = Tile.ZebraCrossingW;
        tiles[1][cx - 1] = Tile.ZebraCrossingW;
      }
      if (cx + 2 < W) {
        tiles[1][cx + 1] = Tile.ZebraCrossingW;
        tiles[1][cx + 2] = Tile.ZebraCrossingW;
      }
    }

    // Bottom inner lane: y = H - 2, road flows East => use ZebraCrossingE
    for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
      const cx = this.cityLayout.getIntersectionCenter(gx, this.cityLayout.blocksHigh).x;
      const y = H - 2;
      if (cx - 2 >= 0) {
        tiles[y][cx - 2] = Tile.ZebraCrossingE;
        tiles[y][cx - 1] = Tile.ZebraCrossingE;
      }
      if (cx + 2 < W) {
        tiles[y][cx + 1] = Tile.ZebraCrossingE;
        tiles[y][cx + 2] = Tile.ZebraCrossingE;
      }
    }

    // Left inner lane: x = 1, road flows South => use ZebraCrossingS (up/down neighbors are road)
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      const cy = this.cityLayout.getIntersectionCenter(0, gy).y;
      if (cy - 2 >= 0) {
        tiles[cy - 2][1] = Tile.ZebraCrossingS;
        tiles[cy - 1][1] = Tile.ZebraCrossingS;
      }
      if (cy + 2 < H) {
        tiles[cy + 1][1] = Tile.ZebraCrossingS;
        tiles[cy + 2][1] = Tile.ZebraCrossingS;
      }
    }

    // Right inner lane: x = W - 2, road flows North => use ZebraCrossingN
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      const cy = this.cityLayout.getIntersectionCenter(this.cityLayout.blocksWide, gy).y;
      const x = W - 2;
      if (cy - 2 >= 0) {
        tiles[cy - 2][x] = Tile.ZebraCrossingN;
        tiles[cy - 1][x] = Tile.ZebraCrossingN;
      }
      if (cy + 2 < H) {
        tiles[cy + 1][x] = Tile.ZebraCrossingN;
        tiles[cy + 2][x] = Tile.ZebraCrossingN;
      }
    }
  }

  getRoundabouts() {
    return this.roundabouts;
  }
}