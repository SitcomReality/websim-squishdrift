import { Tile } from './TileTypes.js';
import { rng } from '../utils/RNG.js';
import { CityLayout } from './generation/CityLayout.js';
import { BlockGenerator } from './generation/BlockGenerator.js';
import { RoadGenerator } from './generation/RoadGenerator.js';
import { BuildingGenerator } from './generation/BuildingGenerator.js';
import { GraphBuilder } from './generation/GraphBuilder.js';
import { sanitizeMap } from './MapPostProcess.js';

export function generateCity(seed = 'alpha-seed', blocksWide = 4, blocksHigh = 4) {
  const rand = rng(seed);
  const cityLayout = new CityLayout(blocksWide, blocksHigh);
  const tiles = cityLayout.createEmptyTiles();
  
  // Prepare building generator first so merged blocks can use its lot creation
  const buildingGenerator = new BuildingGenerator(cityLayout, rand);
  // Generate city blocks (pass buildingGenerator so merged blocks use the same lot template)
  const blockGenerator = new BlockGenerator(cityLayout, rand, buildingGenerator);
  blockGenerator.generateBlocks(tiles);
  
  // Generate roads and intersections
  const roadGenerator = new RoadGenerator(cityLayout, rand);
  roadGenerator.generateRoads(tiles);
  
  // Generate buildings and parks for standard blocks
  const buildings = buildingGenerator.generateBuildings(tiles);
  
  // Get trees from building generator
  const trees = buildingGenerator.getTrees();
  
  // Create a random tree for each roundabout center tile and append to trees list.
  // RoadGenerator already stored roundabout centers; we create a cosmetic tree per center.
  const roundabouts = roadGenerator.getRoundabouts();
  for (const rb of roundabouts) {
    // Only add if center tile is the special RoundaboutCenter (safety)
    if (tiles[rb.cy] && tiles[rb.cy][rb.cx] === Tile.RoundaboutCenter) {
      // Make roundabout trees ~50% taller than park trees while keeping same width
      trees.push({
        pos: { x: rb.cx + 0.5, y: rb.cy + 0.5 },
        trunkHeight: 30 + rand() * 22, // Increased from 20-35 to 30-52 (50% taller)
        leafHeight: (20 + rand() * 15) * 0.5, // Increased from 15-25 to 20-35 (50% taller)
        leafWidth: (1.5 + rand() * 0.5) * 0.5, // Keep same width as park trees
        leafColor: `hsl(${100 + rand() * 40}, 60%, ${35 + Math.floor(rand() * 20)}%)`,
        trunkColor: `hsl(${30 + Math.floor(rand() * 20)}, 40%, ${25 + Math.floor(rand() * 15)}%)`
      });
    }
  }
  
  // After all generators, add perimeter footpath
  addPerimeterFootpath(tiles, cityLayout.width, cityLayout.height);
  
  // After all generators, sanitize tiles so merged blocks override stray zebra crossings
  sanitizeMap(tiles, cityLayout.width, cityLayout.height, Tile, (t)=> (t>=Tile.RoadN && t<=Tile.RoadW) || (t>=Tile.ZebraCrossingN && t<=Tile.ZebraCrossingW));
  
  // Build road and pedestrian graphs
  const graphBuilder = new GraphBuilder();
  const roads = graphBuilder.buildRoadGraph(tiles, cityLayout.width, cityLayout.height, roadGenerator.getRoundabouts());
  const peds = graphBuilder.buildPedGraph(tiles, cityLayout.width, cityLayout.height, trees);
  
  return {
    tiles,
    width: cityLayout.width,
    height: cityLayout.height,
    W: cityLayout.W,
    MED: cityLayout.MED,
    seed,
    roads,
    peds,
    buildings,
    trees
  };
}

function addPerimeterFootpath(tiles, width, height) {
  // Ensure a protective outer ring of footpath so roads and zebra crossings never
  // overwrite the very edge. We will place footpath on the outermost row/column (0 and height-1 / width-1)
  // and place the perimeter road one tile inward (row/col = 1 and height-2 / width-2).
  // This prevents zebra/road tiles from occupying the final outside tile.
  // Outer footpath (top/bottom rows, left/right columns)
  for (let x = 0; x < width; x++) {
    tiles[0][x] = Tile.Footpath;
    tiles[height - 1][x] = Tile.Footpath;
  }
  for (let y = 0; y < height; y++) {
    tiles[y][0] = Tile.Footpath;
    tiles[y][width - 1] = Tile.Footpath;
  }

  // Place the perimeter road one tile inward so the final outside tile remains footpath.
  // Top inward road (going east)
  for (let x = 1; x < width - 1; x++) {
    tiles[1][x] = Tile.RoadE;
  }
  // Bottom inward road (going west)
  for (let x = 1; x < width - 1; x++) {
    tiles[height - 2][x] = Tile.RoadW;
  }
  // Left inward road (going north)
  for (let y = 1; y < height - 1; y++) {
    tiles[y][1] = Tile.RoadN;
  }
  // Right inward road (going south)
  for (let y = 1; y < height - 1; y++) {
    tiles[y][width - 2] = Tile.RoadS;
  }

  // Add zebra crossings immediately adjacent to the inward road (i.e., on the road tiles),
  // but never on the outermost footpath tile. We compute approximate intersection spacing
  // similarly to previous logic but ensure indexes are clamped within [1, width-2]/[1,height-2].
  // Top edge zebra crossings (on row 1, going east)
  for (let gx = 0; gx <= Math.floor(width / 12); gx++) {
    const intersectionX = 3 + gx * 12;
    if (intersectionX >= 3 && intersectionX < width - 3) {
      const x1 = Math.max(1, intersectionX - 2);
      const x2 = Math.max(1, intersectionX - 1);
      tiles[1][x1] = Tile.ZebraCrossingE;
      tiles[1][x2] = Tile.ZebraCrossingE;
    }
  }

  // Bottom edge zebra crossings (on row height-2, going west)
  for (let gx = 0; gx <= Math.floor(width / 12); gx++) {
    const intersectionX = 3 + gx * 12;
    if (intersectionX >= 3 && intersectionX < width - 3) {
      const x1 = Math.min(width - 2, intersectionX + 1);
      const x2 = Math.min(width - 2, intersectionX + 2);
      tiles[height - 2][x1] = Tile.ZebraCrossingW;
      tiles[height - 2][x2] = Tile.ZebraCrossingW;
    }
  }

  // Left edge zebra crossings (on column 1, going north)
  for (let gy = 0; gy <= Math.floor(height / 12); gy++) {
    const intersectionY = 3 + gy * 12;
    if (intersectionY >= 3 && intersectionY < height - 3) {
      const y1 = Math.min(height - 2, intersectionY + 1);
      const y2 = Math.min(height - 2, intersectionY + 2);
      tiles[y1][1] = Tile.ZebraCrossingN;
      tiles[y2][1] = Tile.ZebraCrossingN;
    }
  }

  // Right edge zebra crossings (on column width-2, going south)
  for (let gy = 0; gy <= Math.floor(height / 12); gy++) {
    const intersectionY = 3 + gy * 12;
    if (intersectionY >= 3 && intersectionY < height - 3) {
      const y1 = Math.max(1, intersectionY - 2);
      const y2 = Math.max(1, intersectionY - 1);
      tiles[y1][width - 2] = Tile.ZebraCrossingS;
      tiles[y2][width - 2] = Tile.ZebraCrossingS;
    }
  }
}