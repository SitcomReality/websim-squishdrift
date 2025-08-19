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
  // Add outer perimeter footpath (counter-clockwise)
  // Top edge - going east (counter-clockwise)
  for (let x = 0; x < width; x++) {
    tiles[0][x] = Tile.RoadE;
  }
  
  // Bottom edge - going west (counter-clockwise)
  for (let x = 0; x < width; x++) {
    tiles[height - 1][x] = Tile.RoadW;
  }
  
  // Left edge - going north (counter-clockwise)
  for (let y = 0; y < height; y++) {
    tiles[y][0] = Tile.RoadN;
  }
  
  // Right edge - going south (counter-clockwise)
  for (let y = 0; y < height; y++) {
    tiles[y][width - 1] = Tile.RoadS;
  }
  
  // Add zebra crossings before intersections on the outer perimeter
  // We need to place zebra crossings just before each intersection center
  // Top edge zebra crossings (going east, so zebra crossings are RoadE type)
  for (let gx = 0; gx <= Math.floor(width / 12); gx++) { // approximate intersection spacing
    const intersectionX = 3 + gx * 12; // approximate intersection positions
    if (intersectionX >= 3 && intersectionX < width - 3) {
      // Place zebra crossing 2 tiles before intersection
      if (intersectionX - 2 >= 0) tiles[0][intersectionX - 2] = Tile.ZebraCrossingE;
      if (intersectionX - 1 >= 0) tiles[0][intersectionX - 1] = Tile.ZebraCrossingE;
    }
  }
  
  // Bottom edge zebra crossings (going west, so zebra crossings are RoadW type)
  for (let gx = 0; gx <= Math.floor(width / 12); gx++) {
    const intersectionX = 3 + gx * 12;
    if (intersectionX >= 3 && intersectionX < width - 3) {
      if (intersectionX + 1 < width) tiles[height - 1][intersectionX + 1] = Tile.ZebraCrossingW;
      if (intersectionX + 2 < width) tiles[height - 1][intersectionX + 2] = Tile.ZebraCrossingW;
    }
  }
  
  // Left edge zebra crossings (going north, so zebra crossings are RoadN type)
  for (let gy = 0; gy <= Math.floor(height / 12); gy++) {
    const intersectionY = 3 + gy * 12;
    if (intersectionY >= 3 && intersectionY < height - 3) {
      if (intersectionY + 1 < height) tiles[intersectionY + 1][0] = Tile.ZebraCrossingN;
      if (intersectionY + 2 < height) tiles[intersectionY + 2][0] = Tile.ZebraCrossingN;
    }
  }
  
  // Right edge zebra crossings (going south, so zebra crossings are RoadS type)
  for (let gy = 0; gy <= Math.floor(height / 12); gy++) {
    const intersectionY = 3 + gy * 12;
    if (intersectionY >= 3 && intersectionY < height - 3) {
      if (intersectionY - 2 >= 0) tiles[intersectionY - 2][width - 1] = Tile.ZebraCrossingS;
      if (intersectionY - 1 >= 0) tiles[intersectionY - 1][width - 1] = Tile.ZebraCrossingS;
    }
  }
}