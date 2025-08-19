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
  
  // Add the perimeter border (footpath + beach)
  const result = addPerimeterBorder(tiles, cityLayout.width, cityLayout.height);
  
  return {
    tiles: result.tiles,
    width: result.width,
    height: result.height,
    W: cityLayout.W,
    MED: cityLayout.MED,
    seed,
    roads,
    peds,
    buildings,
    trees
  };
}

function addPerimeterBorder(originalTiles, originalWidth, originalHeight) {
  const borderWidth = 2;
  const newWidth = originalWidth + borderWidth * 2;
  const newHeight = originalHeight + borderWidth * 2;
  
  // Create new tiles array with expanded dimensions
  const newTiles = Array.from({ length: newHeight }, () => 
    new Uint8Array(newWidth).fill(Tile.Grass)
  );
  
  // Copy original map into center
  for (let y = 0; y < originalHeight; y++) {
    for (let x = 0; x < originalWidth; x++) {
      newTiles[y + borderWidth][x + borderWidth] = originalTiles[y][x];
    }
  }
  
  // Add the perimeter layers
  // Layer 1: Footpath (1 tile wide)
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const isBorderLayer1 = 
        (y === borderWidth - 1 || y === newHeight - borderWidth) || // Top/bottom footpath
        (x === borderWidth - 1 || x === newWidth - borderWidth);   // Left/right footpath
      
      if (isBorderLayer1) {
        newTiles[y][x] = Tile.Footpath;
      }
    }
  }
  
  // Layer 2: Beach (outermost layer)
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const isBeach = 
        y < borderWidth - 1 || 
        y >= newHeight - borderWidth + 1 || 
        x < borderWidth - 1 || 
        x >= newWidth - borderWidth + 1;
      
      if (isBeach) {
        newTiles[y][x] = Tile.Park; // Using Park tile for beach/sand
      }
    }
  }
  
  return {
    tiles: newTiles,
    width: newWidth,
    height: newHeight
  };
}