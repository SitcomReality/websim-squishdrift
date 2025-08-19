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

    // Inner ring road (clockwise): top and bottom lanes
    for (let i = 1; i < width - 1; i++) { // start from 1 to leave room for outer footpath
      tiles[1][i] = Tile.RoadW; // top lane going west
      tiles[2][i] = Tile.RoadW; // second top lane going west
      tiles[height - 3][i] = Tile.RoadE; // second bottom lane going east
      tiles[height - 2][i] = Tile.RoadE; // bottom lane going east
    }

    // Inner ring road (clockwise): left and right lanes
    for (let i = 1; i < height - 1; i++) { // start from 1 to leave room for outer footpath
      tiles[i][1] = Tile.RoadS; // left lane going south
      tiles[i][2] = Tile.RoadS; // second left lane going south
      tiles[i][width - 3] = Tile.RoadN; // second right lane going north
      tiles[i][width - 2] = Tile.RoadN; // right lane going north
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
    const { width, height } = this.cityLayout;
    const set = (x, y, t) => {
      if (x >= 0 && y >= 0 && x < width && y < height) {
        tiles[y][x] = t;
      }
    };

    const isTopEdge = cy === this.cityLayout.getIntersectionCenter(0,0).y;
    const isBottomEdge = cy === this.cityLayout.getIntersectionCenter(0, this.cityLayout.blocksHigh).y;
    const isLeftEdge = cx === this.cityLayout.getIntersectionCenter(0,0).x;
    const isRightEdge = cx === this.cityLayout.getIntersectionCenter(this.cityLayout.blocksWide, 0).x;
    
    // Crossings on inner lanes (distance 3)
    if (!isTopEdge) {
      set(cx - 2, cy - 3, Tile.ZebraCrossingS);
      set(cx - 1, cy - 3, Tile.ZebraCrossingS);
      set(cx + 1, cy - 3, Tile.ZebraCrossingN);
      set(cx + 2, cy - 3, Tile.ZebraCrossingN);
    }
    if (!isBottomEdge) {
      set(cx - 2, cy + 3, Tile.ZebraCrossingS);
      set(cx - 1, cy + 3, Tile.ZebraCrossingS);
      set(cx + 1, cy + 3, Tile.ZebraCrossingN);
      set(cx + 2, cy + 3, Tile.ZebraCrossingN);
    }
    if (!isLeftEdge) {
      set(cx - 3, cy - 2, Tile.ZebraCrossingW);
      set(cx - 3, cy - 1, Tile.ZebraCrossingW);
      set(cx - 3, cy + 1, Tile.ZebraCrossingE);
      set(cx - 3, cy + 2, Tile.ZebraCrossingE);
    }
    if (!isRightEdge) {
      set(cx + 3, cy - 2, Tile.ZebraCrossingW);
      set(cx + 3, cy - 1, Tile.ZebraCrossingW);
      set(cx + 3, cy + 1, Tile.ZebraCrossingE);
      set(cx + 3, cy + 2, Tile.ZebraCrossingE);
    }

    // Crossings on outermost lanes (distance 2) for perimeter intersections
    if (isTopEdge) {
      set(cx - 1, cy - 2, Tile.ZebraCrossingS);
      set(cx, cy - 2, Tile.ZebraCrossingS);
      set(cx, cy - 2, Tile.ZebraCrossingS);
      set(cx + 1, cy - 2, Tile.ZebraCrossingN);
    }
    if (isBottomEdge) {
      set(cx - 1, cy + 2, Tile.ZebraCrossingS);
      set(cx, cy + 2, Tile.ZebraCrossingN);
      set(cx, cy + 2, Tile.ZebraCrossingN);
      set(cx + 1, cy + 2, Tile.ZebraCrossingN);
    }
    if (isLeftEdge) {
      set(cx - 2, cy - 1, Tile.ZebraCrossingW);
      set(cx - 2, cy, Tile.ZebraCrossingW);
      set(cx - 2, cy, Tile.ZebraCrossingW);
      set(cx - 2, cy + 1, Tile.ZebraCrossingE);
    }
    if (isRightEdge) {
      set(cx + 2, cy - 1, Tile.ZebraCrossingW);
      set(cx + 2, cy, Tile.ZebraCrossingE);
      set(cx + 2, cy, Tile.ZebraCrossingE);
      set(cx + 2, cy + 1, Tile.ZebraCrossingE);
    }
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

  getRoundabouts() {
    return this.roundabouts;
  }
}