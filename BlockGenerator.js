import { Tile } from '../TileTypes.js';

export class BlockGenerator {
  constructor(cityLayout, rand) {
    this.cityLayout = cityLayout;
    this.rand = rand;
  }

  generateBlocks(tiles) {
    // Generate individual blocks
    for (let by = 0; by < this.cityLayout.blocksHigh; by++) {
      for (let bx = 0; bx < this.cityLayout.blocksWide; bx++) {
        const origin = this.cityLayout.getBlockOrigin(bx, by);
        this.generateSingleBlock(tiles, origin.x, origin.y);
      }
    }

    // Generate medians between blocks
    this.generateMedians(tiles);

    // After base layout, randomly convert some corridors into merged blocks
    this.generateMergedBlocks(tiles);
  }

  generateSingleBlock(tiles, ox, oy) {
    const ROAD_RING = 2;
    const FOOTPATH_RING = 1;

    // 2-tile road ring
    for (let t = 0; t < ROAD_RING; t++) {
      // top/bottom rows (E/W lanes)
      for (let i = t; i < this.cityLayout.W - t; i++) {
        tiles[oy + t][ox + i] = Tile.RoadE;
        tiles[oy + this.cityLayout.W - 1 - t][ox + i] = Tile.RoadW;
      }
      // left/right cols (N/S lanes)
      for (let i = t; i < this.cityLayout.W - t; i++) {
        tiles[oy + i][ox + t] = Tile.RoadN;
        tiles[oy + i][ox + this.cityLayout.W - 1 - t] = Tile.RoadS;
      }
    }

    // Footpaths inside road ring
    const fpStart = ROAD_RING;
    const fpSize = this.cityLayout.W - ROAD_RING * 2;
    for (let i = 0; i < fpSize; i++) {
      tiles[oy + fpStart][ox + fpStart + i] = Tile.Footpath;
      tiles[oy + fpStart + fpSize - 1][ox + fpStart + i] = Tile.Footpath;
      tiles[oy + fpStart + i][ox + fpStart] = Tile.Footpath;
      tiles[oy + fpStart + i][ox + fpStart + fpSize - 1] = Tile.Footpath;
    }

    // 5x5 Interior: lots and alleys
    const interiorStart = ROAD_RING + FOOTPATH_RING;
    const interiorSize = this.cityLayout.W - 2 * interiorStart;
    
    // Generate alleys (cross pattern)
    for (let y = 0; y < interiorSize; y++) {
      for (let x = 0; x < interiorSize; x++) {
        const isAlley = (x === 2 || y === 2);
        const tile = isAlley ? Tile.Footpath : Tile.Grass;
        tiles[oy + interiorStart + y][ox + interiorStart + x] = tile;
      }
    }

    // Use the same lot generation for regular blocks
    this.generateLotsInBlock(tiles, ox + interiorStart, oy + interiorStart, interiorSize);
  }

  generateMedians(tiles) {
    // Horizontal medians
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      const y = this.cityLayout.getIntersectionCenter(0, gy).y;
      if (y >= 0 && y < this.cityLayout.height) {
        for (let x = 0; x < this.cityLayout.width; x++) {
          tiles[y][x] = Tile.Median;
        }
      }
    }

    // Vertical medians
    for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
      const x = this.cityLayout.getIntersectionCenter(gx, 0).x;
      if (x >= 0 && x < this.cityLayout.width) {
        for (let y = 0; y < this.cityLayout.height; y++) {
          tiles[y][x] = Tile.Median;
        }
      }
    }
  }

  generateMergedBlocks(tiles) {
    const W = this.cityLayout.W, MED = this.cityLayout.MED;
    const mergedChance = 0.3;
    const usedH = new Set(), usedV = new Set();

    // Horizontal merged pairs (bx,by) with (bx+1,by)
    for (let by = 0; by < this.cityLayout.blocksHigh; by++) {
      for (let bx = 0; bx < this.cityLayout.blocksWide - 1; bx++) {
        if (this.rand() > mergedChance) continue;
        const key = `${bx},${by}`; if (usedH.has(key)) continue;
        usedH.add(key);

        const left = this.cityLayout.getBlockOrigin(bx, by);
        const right = this.cityLayout.getBlockOrigin(bx + 1, by);

        // Compute the 5x5 interior band between blocks
        const xStart = left.x + (W - 2);     // columns: W-2 .. W+2 relative to left block
        const yStart = left.y + 3;           // rows: 3..7 (5 rows) inside block's interior
        const centerX = left.x + W;          // former median
        const topY = left.y + 2, bottomY = left.y + (W - 3); // shared footpaths rows

        // Extend top/bottom footpaths across the gap
        for (let x = 0; x < 5; x++) {
          tiles[topY][xStart + x] = Tile.Footpath;
          tiles[bottomY][xStart + x] = Tile.Footpath;
        }
        // Convert the entire median strip within the block band to footpath
        for (let y = topY; y <= bottomY; y++) {
          tiles[y][centerX] = Tile.Footpath;
        }

        // Clear interior 5x5 to grass first
        for (let dy = 0; dy < 5; dy++) {
          for (let dx = 0; dx < 5; dx++) {
            tiles[yStart + dy][xStart + dx] = Tile.Grass;
          }
        }

        // Carve plus-shaped alley and place four 2x2 lots (buildings/parks)
        for (let dy = 0; dy < 5; dy++) {
          for (let dx = 0; dx < 5; dx++) {
            const gx = xStart + dx, gy = yStart + dy;
            if (dx === 2 || dy === 2) {
              tiles[gy][gx] = Tile.Footpath;
            }
          }
        }

        // Use the same lot generation as regular blocks
        this.generateLotsInBlock(tiles, xStart, yStart, 5);
      }
    }

    // Vertical merged pairs (bx,by) with (bx,by+1)
    for (let by = 0; by < this.cityLayout.blocksHigh - 1; by++) {
      for (let bx = 0; bx < this.cityLayout.blocksWide; bx++) {
        if (this.rand() > mergedChance) continue;
        const key = `${bx},${by}`; if (usedV.has(key)) continue;
        usedV.add(key);

        const top = this.cityLayout.getBlockOrigin(bx, by);
        const bottom = this.cityLayout.getBlockOrigin(bx, by + 1);

        // Compute the 5x5 interior band between blocks (vertical)
        const yStart = top.y + (W - 2);      // rows W-2 .. W+2 relative to top block
        const xStart = top.x + 3;            // cols 3..7 inside block's interior width
        const centerY = top.y + W;           // former median
        const leftX = top.x + 2, rightX = top.x + (W - 3); // shared footpaths cols

        // Extend left/right footpaths across the gap
        for (let y = 0; y < 5; y++) {
          tiles[yStart + y][leftX] = Tile.Footpath;
          tiles[yStart + y][rightX] = Tile.Footpath;
        }
        // Convert the entire median strip within the block band to footpath
        for (let x = leftX; x <= rightX; x++) {
          tiles[centerY][x] = Tile.Footpath;
        }

        // Clear interior 5x5 to grass first
        for (let dy = 0; dy < 5; dy++) {
          for (let dx = 0; dx < 5; dx++) {
            tiles[yStart + dy][xStart + dx] = Tile.Grass;
          }
        }

        // Carve plus-shaped alley and place four 2x2 lots (buildings/parks)
        for (let dy = 0; dy < 5; dy++) {
          for (let dx = 0; dx < 5; dx++) {
            const gx = xStart + dx, gy = yStart + dy;
            if (dx === 2 || dy === 2) {
              tiles[gy][gx] = Tile.Footpath;
            }
          }
        }

        // Use the same lot generation as regular blocks
        this.generateLotsInBlock(tiles, xStart, yStart, 5);
      }
    }
  }

  generateLotsInBlock(tiles, startX, startY, size) {
    // Define 4 lots (2x2 each) in the same pattern as regular blocks
    const lotSize = 2;
    const lots = [
      { x: 0, y: 0 }, { x: 3, y: 0 },
      { x: 0, y: 3 }, { x: 3, y: 3 }
    ];

    // Fill lots with buildings or parks
    for (const lot of lots) {
      const isBuilding = this.rand() < 0.7; // 70% buildings, 30% parks
      
      const buildingRect = {
        x: startX + lot.x,
        y: startY + lot.y,
        width: lotSize,
        height: lotSize,
      };

      if (isBuilding) {
        this.createBuilding(tiles, buildingRect);
      } else {
        this.createPark(tiles, buildingRect);
      }
    }
  }

  createBuilding(tiles, rect) {
    for (let ly = 0; ly < rect.height; ly++) {
      for (let lx = 0; lx < rect.width; lx++) {
        const tx = rect.x + lx;
        const ty = rect.y + ly;
        const isWall = (lx === 0 || lx === rect.width - 1 || ly === 0 || ly === rect.height - 1);
        tiles[ty][tx] = isWall ? Tile.BuildingWall : Tile.BuildingFloor;
      }
    }
  }

  createPark(tiles, rect) {
    for (let ly = 0; ly < rect.height; ly++) {
      for (let lx = 0; lx < rect.width; lx++) {
        const tx = rect.x + lx;
        const ty = rect.y + ly;
        tiles[ty][tx] = Tile.Park;
      }
    }
  }
}