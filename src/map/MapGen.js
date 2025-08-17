import { Tile } from './TileTypes.js';
import { rng } from '../utils/RNG.js';
import { CityLayout } from './generation/CityLayout.js';
import { BlockGenerator } from './generation/BlockGenerator.js';
import { RoadGenerator } from './generation/RoadGenerator.js';
import { BuildingGenerator } from './generation/BuildingGenerator.js';
import { GraphBuilder } from './generation/GraphBuilder.js';

export function generateCity(seed = 'alpha-seed', blocksWide = 4, blocksHigh = 4) {
  const rand = rng(seed);
  const cityLayout = new CityLayout(blocksWide, blocksHigh);
  const tiles = cityLayout.createEmptyTiles();
  
  // Generate city blocks
  const blockGenerator = new BlockGenerator(cityLayout, rand);
  blockGenerator.generateBlocks(tiles);
  
  // Generate roads and intersections
  const roadGenerator = new RoadGenerator(cityLayout, rand);
  roadGenerator.generateRoads(tiles);
  
  // Generate buildings and parks
  const buildingGenerator = new BuildingGenerator(cityLayout, rand);
  const buildings = buildingGenerator.generateBuildings(tiles);
  
  // Get trees from building generator
  const trees = buildingGenerator.getTrees();
  
  // Create a random tree for each roundabout center tile and append to trees list.
  // RoadGenerator already stored roundabout centers; we create a cosmetic tree per center.
  const roundabouts = roadGenerator.getRoundabouts();
  for (const rb of roundabouts) {
    // Only add if center tile is the special RoundaboutCenter (safety)
    if (tiles[rb.cy] && tiles[rb.cy][rb.cx] === Tile.RoundaboutCenter) {
      // Use the same (larger) size range as park trees so roundabout trees are significantly bigger
      trees.push({
        pos: { x: rb.cx + 0.5, y: rb.cy + 0.5 },
        trunkHeight: 20 + rand() * 15, // match park trunk min/max
        leafHeight: (15 + rand() * 10) * 0.5, // match park leaf height scaling
        leafWidth: (1.5 + rand() * 0.5) * 0.5, // match park leaf width scaling
        leafColor: `hsl(${100 + rand() * 40}, 60%, ${35 + Math.floor(rand() * 20)}%)`,
        trunkColor: `hsl(${30 + Math.floor(rand() * 20)}, 40%, ${25 + Math.floor(rand() * 15)}%)`
      });
    }
  }
  
  // Build road and pedestrian graphs
  const graphBuilder = new GraphBuilder();
  const roads = graphBuilder.buildRoadGraph(tiles, cityLayout.width, cityLayout.height, roadGenerator.getRoundabouts());
  const peds = graphBuilder.buildPedGraph(tiles, cityLayout.width, cityLayout.height);
  
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