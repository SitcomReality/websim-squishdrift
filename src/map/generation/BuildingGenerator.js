import { Tile } from '../TileTypes.js';

export class BuildingGenerator {
  constructor(cityLayout, rand) {
    this.cityLayout = cityLayout;
    this.rand = rand;
    this.buildings = [];
    this.trees = []; // Store tree data
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
        width: 2,
        height: 2,
      };

      if (isBuilding) {
        this.createBuilding(tiles, buildingRect);
      } else {
        this.createPark(tiles, buildingRect);
      }
    }
  }

  createBuilding(tiles, rect) {
    const building = {
      rect,
      height: 40 + this.rand() * 80, // Increased from 40 + this.rand() * 80 to allow up to 3x higher buildings
      color: `hsl(${Math.floor(this.rand() * 40 + 190)}, 20%, ${Math.floor(this.rand() * 20 + 55)}%)`,
      // Add properties for animation
      originalHeight: 0,
      currentHeight: 0,
      animationState: null
    };
    building.originalHeight = building.height;
    building.currentHeight = building.height;
    this.buildings.push(building);

    // Create building with floor and walls
    for (let ly = 0; ly < rect.height; ly++) {
      for (let lx = 0; lx < rect.width; lx++) {
        const tx = rect.x + lx;
        const ty = rect.y + ly;
        
        const isWall = (lx === 0 || lx === rect.width - 1 || 
                       ly === 0 || ly === rect.height - 1);
        tiles[ty][tx] = isWall ? Tile.BuildingWall : Tile.BuildingFloor;
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

    // Randomly place 1-3 trees in any cell of this park
    const treeCount = Math.floor(this.rand() * 3) + 1;
    const occupiedCells = new Set();
    
    for (let i = 0; i < treeCount; i++) {
      // Find an unoccupied cell
      let attempts = 0;
      let cellX, cellY;
      
      do {
        cellX = Math.floor(rect.x + this.rand() * rect.width);
        cellY = Math.floor(rect.y + this.rand() * rect.height);
        attempts++;
      } while (occupiedCells.has(`${cellX},${cellY}`) && attempts < 10);
      
      // Mark cell as occupied
      occupiedCells.add(`${cellX},${cellY}`);
      
      const tree = {
        pos: { x: cellX + 0.5, y: cellY + 0.5 },
        trunkHeight: 20 + this.rand() * 15,
        leafHeight: (15 + this.rand() * 10) * 0.5,
        leafWidth: (1.5 + this.rand() * 0.5) * 0.5,
        leafColor: `hsl(${100 + this.rand() * 40}, 60%, ${35 + this.rand() * 20}%)`,
        trunkColor: `hsl(${30 + this.rand() * 20}, 40%, ${25 + this.rand() * 15}%)`,
        // Add properties for animation
        originalTrunkHeight: 0,
        currentTrunkHeight: 0,
        originalLeafHeight: 0,
        currentLeafHeight: 0,
        animationState: null
      };
      
      tree.originalTrunkHeight = tree.trunkHeight;
      tree.currentTrunkHeight = tree.trunkHeight;
      tree.originalLeafHeight = tree.leafHeight;
      tree.currentLeafHeight = tree.leafHeight;
      
      // Place tree at center of cell
      this.trees.push(tree);
    }
  }

  getTrees() {
    return this.trees;
  }
}