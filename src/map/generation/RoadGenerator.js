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

    // Top and bottom lanes - 5 road tiles + 2 zebra crossings
    for (let i = 2; i < width - 2; i++) {
      // Top lanes
      tiles[0][i] = Tile.RoadW;
      tiles[1][i] = Tile.RoadW;
      tiles[2][i] = Tile.RoadW;
      tiles[3][i] = Tile.RoadW;
      tiles[4][i] = Tile.RoadW;
      
      // Bottom lanes
      tiles[height - 1][i] = Tile.RoadE;
      tiles[height - 2][i] = Tile.RoadE;
      tiles[height - 3][i] = Tile.RoadE;
      tiles[height - 4][i] = Tile.RoadE;
      tiles[height - 5][i] = Tile.RoadE;
    }

    // Left and right lanes - 5 road tiles + 2 zebra crossings
    for (let i = 2; i < height - 2; i++) {
      // Left lanes
      tiles[i][0] = Tile.RoadS;
      tiles[i][1] = Tile.RoadS;
      tiles[i][2] = Tile.RoadS;
      tiles[i][3] = Tile.RoadS;
      tiles[i][4] = Tile.RoadS;
      
      // Right lanes
      tiles[i][width - 1] = Tile.RoadN;
      tiles[i][width - 2] = Tile.RoadN;
      tiles[i][width - 3] = Tile.RoadN;
      tiles[i][width - 4] = Tile.RoadN;
      tiles[i][width - 5] = Tile.RoadN;
    }

    // Add zebra crossings at intersections
    this.addZebraCrossings(tiles);
  }

  addZebraCrossings(tiles) {
    const width = this.cityLayout.width;
    const height = this.cityLayout.height;

    // Top zebra crossings at intersections
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      const y = this.cityLayout.getIntersectionCenter(0, gy).y;
      if (y >= 0 && y < height) {
        const cx = this.cityLayout.getIntersectionCenter(0, gy).x;
        if (cx >= 2 && cx <= width - 3) {
          // Left zebra crossing
          tiles[1][cx - 2] = Tile.ZebraCrossingW;
          tiles[1][cx - 1] = Tile.ZebraCrossingW;
          tiles[1][cx + 1] = Tile.ZebraCrossingE;
          tiles[1][cx + 2] = Tile.ZebraCrossingE;
          
          // Right zebra crossing
          tiles[width - 2][cx - 2] = Tile.ZebraCrossingW;
          tiles[width - 2][cx - 1] = Tile.ZebraCrossingW;
          tiles[width - 2][cx + 1] = Tile.ZebraCrossingE;
          tiles[width - 2][cx + 2] = Tile.ZebraCrossingE;
        }
      }
    }

    // Bottom zebra crossings
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      const y = this.cityLayout.getIntersectionCenter(0, gy).y;
      if (y >= 0 && y < height) {
        const cx = this.cityLayout.getIntersectionCenter(0, gy).x;
        if (cx >= 2 && cx <= width - 3) {
          // Left zebra crossing
          tiles[height - 2][cx - 2] = Tile.ZebraCrossingW;
          tiles[height - 2][cx - 1] = Tile.ZebraCrossingW;
          tiles[height - 2][cx + 1] = Tile.ZebraCrossingE;
          tiles[height - 2][cx + 2] = Tile.ZebraCrossingE;
          
          // Right zebra crossing
          tiles[height - 1][cx - 2] = Tile.ZebraCrossingW;
          tiles[height - 1][cx - 1] = Tile.ZebraCrossingW;
          tiles[height - 1][cx + 1] = Tile.ZebraCrossingE;
          tiles[height - 1][cx + 2] = Tile.ZebraCrossingE;
        }
      }
    }

    // Left and right zebra crossings
    for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
      const x = this.cityLayout.getIntersectionCenter(gx, 0).x;
      if (x >= 0 && x < width) {
        const cy = this.cityLayout.getIntersectionCenter(gx, 0).y;
        if (cy >= 2 && cy <= height - 3) {
          // Top zebra crossing
          tiles[cy - 2][1] = Tile.ZebraCrossingS;
          tiles[cy - 1][1] = Tile.ZebraCrossingS;
          tiles[cy + 1][1] = Tile.ZebraCrossingN;
          tiles[cy + 2][1] = Tile.ZebraCrossingN;
          
          // Bottom zebra crossing
          tiles[cy - 2][width - 2] = Tile.ZebraCrossingS;
          tiles[cy - 1][width - 2] = Tile.ZebraCrossingS;
          tiles[cy + 1][width - 2] = Tile.ZebraCrossingN;
          tiles[cy + 2][width - 2] = Tile.ZebraCrossingN;
        }
      }
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
    
    // Top side zebra crossings
    set(cx - 2, cy - 3, Tile.ZebraCrossingS);
    set(cx - 1, cy - 3, Tile.ZebraCrossingS);
    set(cx + 1, cy - 3, Tile.ZebraCrossingN);
    set(cx + 2, cy - 3, Tile.ZebraCrossingN);
    
    // Bottom side zebra crossings
    set(cx - 2, cy + 3, Tile.ZebraCrossingS);
    set(cx - 1, cy + 3, Tile.ZebraCrossingS);
    set(cx + 1, cy + 3, Tile.ZebraCrossingN);
    set(cx + 2, cy + 3, Tile.ZebraCrossingN);
    
    // Left side zebra crossings
    set(cx - 3, cy - 2, Tile.ZebraCrossingW);
    set(cx - 3, cy - 1, Tile.ZebraCrossingW);
    set(cx - 3, cy + 1, Tile.ZebraCrossingE);
    set(cx - 3, cy + 2, Tile.ZebraCrossingE);

    // Right side zebra crossings
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
    // For perimeter roundabouts, create proper lanes
    const isTop = cy <= 2;
    const isBottom = cy >= this.cityLayout.height - 3;
    const isLeft = cx <= 2;
    const isRight = cx >= this.cityLayout.width - 3;

    // Top/bottom edges
    if (isTop || isBottom) {
      for (let x = cx - 2; x <= cx + 2; x++) {
        set(x, cy - 2, Tile.RoadW);
        set(x, cy - 1, Tile.RoadW);
        set(x, cy + 1, Tile.RoadE);
        set(x, cy + 2, Tile.RoadE);
      }
    }

    // Left/right edges
    if (isLeft || isRight) {
      for (let y = cy - 2; y <= cy + 2; y++) {
        set(cx - 2, y, Tile.RoadS);
        set(cx - 1, y, Tile.RoadS);
        set(cx + 1, y, Tile.RoadN);
        set(cx + 2, y, Tile.RoadN);
      }
    }
  }

  getRoundabouts() {
    return this.roundabouts;
  }
}