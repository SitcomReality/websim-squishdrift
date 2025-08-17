import { generateCity } from '../../map/MapGen.js';
import { isWalkable, Tile } from '../../map/TileTypes.js';
import { rng } from '../../utils/RNG.js';
import { Vec2 } from '../../utils/Vec2.js';

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
  
  // Get trees from both building generator and road generator
  const buildingTrees = buildingGenerator.getTrees();
  const roadTrees = roadGenerator.getTrees();
  const trees = [...buildingTrees, ...roadTrees];
  
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