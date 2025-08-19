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

    // Add zebra crossings to the outermost lane (edge lane) before each intersection
    this.addPerimeterZebraCrossings(tiles);
  }

  addPerimeterZebraCrossings(tiles) {
    const width = this.cityLayout.width;
    const height = this.cityLayout.height;

    // Add zebra crossings on the outermost lane (edge lane) before each intersection
    // Top edge - zebra crossings before each intersection
    for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
      const cx = this.cityLayout.getIntersectionCenter(gx, 0).x;
      if (cx >= 0 && cx < width) {
        // Add zebra crossing before intersection on top edge lane
        if (cx - 2 >= 0) tiles[0][cx - 2] = Tile.ZebraCrossingW;
        if (cx - 1 >= 0) tiles[0][cx - 1] = Tile.ZebraCrossingW;
        if (cx + 1 < width) tiles[0][cx + 1] = Tile.ZebraCrossingE;
        if (cx + 2 < width) tiles[0][cx + 2] = Tile.ZebraCrossingE;
      }
    }

    // Bottom edge - zebra crossings before each intersection
    for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
      const cx = this.cityLayout.getIntersectionCenter(gx, this.cityLayout.blocksHigh).x;
      if (cx >= 0 && cx < width) {
        // Add zebra crossing before intersection on bottom edge lane
        if (cx - 2 >= 0) tiles[height - 1][cx - 2] = Tile.ZebraCrossingW;
        if (cx - 1 >= 0) tiles[height - 1][cx - 1] = Tile.ZebraCrossingW;
        if (cx + 1 < width) tiles[height - 1][cx + 1] = Tile.ZebraCrossingE;
        if (cx + 2 < width) tiles[height - 1][cx + 2] = Tile.ZebraCrossingE;
      }
    }

    // Left edge - zebra crossings before each intersection
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      const cy = this.cityLayout.getIntersectionCenter(0, gy).y;
      if (cy >= 0 && cy < height) {
        // Add zebra crossing before intersection on left edge lane
        if (cy - 2 >= 0) tiles[cy - 2][0] = Tile.ZebraCrossingN;
        if (cy - 1 >= 0) tiles[cy - 1][0] = Tile.ZebraCrossingN;
        if (cy + 1 < height) tiles[cy + 1][0] = Tile.ZebraCrossingS;
        if (cy + 2 < height) tiles[cy + 2][0] = Tile.ZebraCrossingS;
      }
    }

    // Right edge - zebra crossings before each intersection
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      const cy = this.cityLayout.getIntersectionCenter(this.cityLayout.blocksWide, gy).y;
      if (cy >= 0 && cy < height) {
        // Add zebra crossing before intersection on right edge lane
        if (cy - 2 >= 0) tiles[cy - 2][width - 1] = Tile.ZebraCrossingN;
        if (cy - 1 >= 0) tiles[cy - 1][width - 1] = Tile.ZebraCrossingN;
        if (cy + 1 < height) tiles[cy + 1][width - 1] = Tile.ZebraCrossingS;
        if (cy + 2 < height) tiles[cy + 2][width - 1] = Tile.ZebraCrossingS;
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
    for (let x = cx - 2; x <= cx + 2; x++) {
      set(x, cy - 3, Tile.ZebraCrossingS);
      set(x, cy + 3, Tile.ZebraCrossingN);
    }
    
    // Left side (vertical zebra crossing over E/W road) - these are correct
    for (let y = cy - 2; y <= cy + 2; y++) {
      set(cx - 3, y, Tile.ZebraCrossingW);
      set(cx + 3, y, Tile.ZebraCrossingE);
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