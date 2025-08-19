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
  
  // After all generators, sanitize tiles so merged blocks override stray zebra crossings
  sanitizeMap(tiles, cityLayout.width, cityLayout.height, Tile, (t)=> (t>=Tile.RoadN && t<=Tile.RoadW) || (t>=Tile.ZebraCrossingN && t<=Tile.ZebraCrossingW));
  
  // Build road and pedestrian graphs
  const graphBuilder = new GraphBuilder();
  const roads = graphBuilder.buildRoadGraph(tiles, cityLayout.width, cityLayout.height, roadGenerator.getRoundabouts());
  const peds = graphBuilder.buildPedGraph(tiles, cityLayout.width, cityLayout.height, trees);
  
  // Add beach border around the entire map
  const borderedTiles = addBeachBorder(tiles);
  
  return {
    tiles: borderedTiles,
    width: borderedTiles[0].length,
    height: borderedTiles.length,
    W: cityLayout.W,
    MED: cityLayout.MED,
    seed,
    roads,
    peds,
    buildings,
    trees,
    originalWidth: cityLayout.width,
    originalHeight: cityLayout.height
  };
}

function addBeachBorder(tiles) {
  const originalHeight = tiles.length;
  const originalWidth = tiles[0].length;
  const newHeight = originalHeight + 4; // +2 top, +2 bottom
  const newWidth = originalWidth + 4;   // +2 left, +2 right
  
  const newTiles = Array.from({ length: newHeight }, () => new Uint8Array(newWidth));
  
  // Fill the new map with grass
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      newTiles[y][x] = Tile.Grass;
    }
  }
  
  // Copy original map into center
  for (let y = 0; y < originalHeight; y++) {
    for (let x = 0; x < originalWidth; x++) {
      newTiles[y + 2][x + 2] = tiles[y][x];
    }
  }
  
  // Add footpath ring (1 tile from edge)
  for (let x = 1; x < newWidth - 1; x++) {
    newTiles[1][x] = Tile.Footpath; // Top footpath
    newTiles[newHeight - 2][x] = Tile.Footpath; // Bottom footpath
  }
  for (let y = 1; y < newHeight - 1; y++) {
    newTiles[y][1] = Tile.Footpath; // Left footpath
    newTiles[y][newWidth - 2] = Tile.Footpath; // Right footpath
  }
  
  // Add beach tiles (outer edge)
  for (let x = 0; x < newWidth; x++) {
    newTiles[0][x] = Tile.Park; // Top beach (using Park as beach)
    newTiles[newHeight - 1][x] = Tile.Park; // Bottom beach
  }
  for (let y = 0; y < newHeight; y++) {
    newTiles[y][0] = Tile.Park; // Left beach
    newTiles[y][newWidth - 1] = Tile.Park; // Right beach
  }
  
  return newTiles;
}