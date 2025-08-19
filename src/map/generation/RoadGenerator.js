import { Tile } from '../TileTypes.js';

export class RoadGenerator {
  constructor(cityLayout, rand) {
    this.cityLayout = cityLayout;
    this.rand = rand;
    this.roundabouts = [];
  }

  generateRoads(tiles) {
    // First add footpath border
    this.addFootpathBorder(tiles);
    
    // Then generate roads inside the footpath
    this.generatePerimeterRoad(tiles);
    
    // Generate roundabouts at intersections
    this.generateRoundabouts(tiles);
  }

  addFootpathBorder(tiles) {
    const bounds = this.cityLayout.getPerimeterFootpathBounds();
    
    // Top and bottom footpath
    for (let x = 0; x < this.cityLayout.width; x++) {
      tiles[bounds.top][x] = Tile.Footpath;
      tiles[bounds.bottom][x] = Tile.Footpath;
    }
    
    // Left and right footpath
    for (let y = 0; y < this.cityLayout.height; y++) {
      tiles[y][bounds.left] = Tile.Footpath;
      tiles[y][bounds.right] = Tile.Footpath;
    }
  }

  generatePerimeterRoad(tiles) {
    const bounds = this.cityLayout.getPerimeterFootpathBounds();
    const roadTop = bounds.top + 1;
    const roadBottom = bounds.bottom - 1;
    const roadLeft = bounds.left + 1;
    const roadRight = bounds.right - 1;
    
    // Top road (going east)
    for (let x = roadLeft; x <= roadRight; x++) {
      tiles[roadTop][x] = Tile.RoadE;
      tiles[roadTop + 1][x] = Tile.RoadE;
    }
    
    // Bottom road (going west)
    for (let x = roadLeft; x <= roadRight; x++) {
      tiles[roadBottom - 1][x] = Tile.RoadW;
      tiles[roadBottom][x] = Tile.RoadW;
    }
    
    // Left road (going north)
    for (let y = roadTop; y <= roadBottom; y++) {
      tiles[y][roadLeft] = Tile.RoadN;
      tiles[y][roadLeft + 1] = Tile.RoadN;
    }
    
    // Right road (going south)
    for (let y = roadTop; y <= roadBottom; y++) {
      tiles[y][roadRight - 1] = Tile.RoadS;
      tiles[y][roadRight] = Tile.RoadS;
    }
  }

  generateRoundabouts(tiles) {
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
        const center = this.cityLayout.getIntersectionCenter(gx, gy);
        if (center.y >= this.cityLayout.height || center.x >= this.cityLayout.width) continue;
        
        this.createRoundabout(tiles, center.x, center.y);
        this.roundabouts.push({ cx: center.x, cy: center.y });
      }
    }
  }

  createRoundabout(tiles, cx, cy) {
    const bounds = this.cityLayout.getPerimeterFootpathBounds();
    const roadTop = bounds.top + 1;
    const roadBottom = bounds.bottom - 1;
    const roadLeft = bounds.left + 1;
    const roadRight = bounds.right - 1;
    
    // Check if this is an edge intersection
    const isEdgeX = cx <= roadLeft + 2 || cx >= roadRight - 2;
    const isEdgeY = cy <= roadTop + 2 || cy >= roadBottom - 2;
    const isEdge = isEdgeX || isEdgeY;
    
    if (isEdge) {
      // Edge intersection - create clockwise flow around center
      this.createEdgeRoundabout(tiles, cx, cy);
    } else {
      // Standard 5x5 roundabout
      this.createStandardRoundabout(tiles, cx, cy);
    }
  }

  createEdgeRoundabout(tiles, cx, cy) {
    const radius = 2;
    
    // Create clockwise flow around center
    // Top tiles point west
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x >= 0 && x < this.cityLayout.width) {
        tiles[cy - radius][x] = Tile.RoadW;
        tiles[cy - radius + 1][x] = Tile.RoadW;
      }
    }
    
    // Right tiles point north
    for (let y = cy - radius; y <= cy + radius; y++) {
      if (y >= 0 && y < this.cityLayout.height) {
        tiles[y][cx + radius] = Tile.RoadN;
        tiles[y][cx + radius - 1] = Tile.RoadN;
      }
    }
    
    // Bottom tiles point east
    for (let x = cx + radius; x >= cx - radius; x--) {
      if (x >= 0 && x < this.cityLayout.width) {
        tiles[cy + radius][x] = Tile.RoadE;
        tiles[cy + radius - 1][x] = Tile.RoadE;
      }
    }
    
    // Left tiles point south
    for (let y = cy + radius; y >= cy - radius; y--) {
      if (y >= 0 && y < this.cityLayout.height) {
        tiles[y][cx - radius] = Tile.RoadS;
        tiles[y][cx - radius + 1] = Tile.RoadS;
      }
    }
    
    // Center tree
    tiles[cy][cx] = Tile.RoundaboutCenter;
  }

  createStandardRoundabout(tiles, cx, cy) {
    const radius = 2;
    
    // Standard 5x5 roundabout
    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let y = cy - radius; y <= cy + radius; y++) {
        if (x >= 0 && x < this.cityLayout.width && y >= 0 && y < this.cityLayout.height) {
          if (x === cx && y === cy) {
            tiles[y][x] = Tile.RoundaboutCenter;
          } else if (Math.abs(x - cx) === radius || Math.abs(y - cy) === radius) {
            // Determine direction for outer ring
            if (y === cy - radius) tiles[y][x] = Tile.RoadW;
            else if (y === cy + radius) tiles[y][x] = Tile.RoadE;
            else if (x === cx - radius) tiles[y][x] = Tile.RoadS;
            else if (x === cx + radius) tiles[y][x] = Tile.RoadN;
          } else {
            // Inner ring
            if (Math.abs(x - cx) === 1 || Math.abs(y - cy) === 1) {
              if (y === cy - 1) tiles[y][x] = Tile.RoadW;
              else if (y === cy + 1) tiles[y][x] = Tile.RoadE;
              else if (x === cx - 1) tiles[y][x] = Tile.RoadS;
              else if (x === cx + 1) tiles[y][x] = Tile.RoadN;
            }
          }
        }
      }
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