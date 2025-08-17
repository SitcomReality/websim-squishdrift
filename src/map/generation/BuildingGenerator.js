import { Tile } from '../TileTypes.js';

export class BuildingGenerator {
  constructor(cityLayout, rand) {
    this.cityLayout = cityLayout;
    this.rand = rand;
    this.buildings = [];
  }

  generateBuildings(tiles) {
    // Generate buildings and parks in each block
    for (let by = 0; by < this.cityLayout.blocksHigh; by++) {
      for (let bx = 0; bx < this.cityLayout.blocksWide; bx++) {
        const origin = this.cityLayout.getBlockOrigin(bx, by);
        this.generateBlockBuildings(tiles, origin.x, origin.y, bx, by);
      }
    }
    return this.buildings;
  }

  generateBlockBuildings(tiles, ox, oy, bx, by) {
    const ROAD_RING = 2;
    const FOOTPATH_RING = 1;
    const interiorStart = ROAD_RING + FOOTPATH_RING;
    const interiorSize = this.cityLayout.W - 2 * interiorStart;

    // Define 4 lots (2x2 each)
    const lots = [
      { x: 0, y: 0 }, { x: 3, y: 0 },
      { x: 0, y: 3 }, { x: 3, y: 3 }
    ];

    // Fill lots with buildings or parks
    for (const lot of lots) {
      const isBuilding = this.rand() < 0.7; // 70% buildings, 30% parks
      
      const buildingRect = {
        x: ox + interiorStart + lot.x,
        y: oy + interiorStart + lot.y,
        width: 2 + 2,
        height: 2,
      };

      if (isBuilding) {
        // 30% chance for octagonal building
        const isOctagon = this.rand() < 0.3;
        
        this.createBuilding(tiles, buildingRect, isOctagon);
      } else {
        this.createPark(tiles, buildingRect);
      }
    }
  }

  createBuilding(tiles, rect, isOctagon = false) {
    const building = {
      rect,
      height: 40 + this.rand() * 80,
      color: `hsl(${Math.floor(this.rand() * 40 + 190)}, 20%, ${Math.floor(this.rand() * 20 + 55)}%)`,
      shape: isOctagon ? 'octagon' : 'rectangle'
    };
    this.buildings.push(building);

    // Create building floor
    for (let ly = 0; ly < rect.height; ly++) {
      for (let lx = 0; lx < rect.width; lx++) {
        const tx = rect.x + lx;
        const ty = rect.y + ly;
        tiles[ty][tx] = Tile.BuildingFloor;
      }
    }
  }

  createPark(tiles, rect) {
    // Create park tiles
    for (let ly = 0; ly < rect.height; ly++) {
      for (let lx = 0; lx < rect.width; lx++) {
        const tx = rect.x + lx;
        const ty = rect.y + ly;
        tiles[ty][tx] = Tile.Park;
      }
    }
  }
}