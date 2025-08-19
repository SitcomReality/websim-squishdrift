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
  
  // Return preliminary map (we will expand with border next)
  let map = {
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

  // --- NEW: expand map with 2-tile border (shift = 2)
  const shift = 2;
  const newWidth = map.width + shift * 2;
  const newHeight = map.height + shift * 2;
  
  // Create new tiles filled with Beach
  const newTiles = Array.from({ length: newHeight }, () => new Uint8Array(newWidth).fill(Tile.Beach));
  
  // Copy old tiles into center offset by shift
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      newTiles[y + shift][x + shift] = map.tiles[y][x];
    }
  }
  
  // Place a 1-cell footpath ring immediately outside the original map area (inside the beach)
  // Top & Bottom
  for (let x = shift; x < shift + map.width; x++) {
    newTiles[shift - 1][x] = Tile.Footpath;
    newTiles[shift + map.height][x] = Tile.Footpath;
  }
  // Left & Right
  for (let y = shift; y < shift + map.height; y++) {
    newTiles[y][shift - 1] = Tile.Footpath;
    newTiles[y][shift + map.width] = Tile.Footpath;
  }
  // Corners (ensure continuous ring)
  newTiles[shift - 1][shift - 1] = Tile.Footpath;
  newTiles[shift - 1][shift + map.width] = Tile.Footpath;
  newTiles[shift + map.height][shift - 1] = Tile.Footpath;
  newTiles[shift + map.height][shift + map.width] = Tile.Footpath;
  
  // Update map metadata and assign newTiles
  map.tiles = newTiles;
  map.width = newWidth;
  map.height = newHeight;
  
  // Shift all roads/ped nodes and rebuild roads.byKey and peds.nodes keys
  // Shift road nodes
  for (const n of map.roads.nodes) {
    n.x += shift;
    n.y += shift;
  }
  // Rebuild byKey with shifted coordinates
  const newByKey = new Map();
  for (const n of map.roads.nodes) {
    newByKey.set(`${n.x},${n.y},${n.dir}`, n);
  }
  map.roads.byKey = newByKey;
  
  // Shift peds nodes (Map keys)
  const shiftedPedMap = new Map();
  for (const [key, node] of map.peds.nodes) {
    const shifted = { ...node, x: node.x + shift, y: node.y + shift, neighbors: node.neighbors.map(nb => ({ x: nb.x + shift, y: nb.y + shift })) };
    shiftedPedMap.set(`${shifted.x},${shifted.y}`, shifted);
  }
  // Also update list
  const shiftedPedList = (map.peds.list || []).map(n => ({ x: n.x + shift, y: n.y + shift, neighbors: (n.neighbors || []).map(nb => ({ x: nb.x + shift, y: nb.y + shift })) }));
  map.peds.nodes = shiftedPedMap;
  map.peds.list = shiftedPedList;
  
  // Shift buildings' rects
  for (const b of map.buildings) {
    if (b.rect) {
      b.rect.x += shift;
      b.rect.y += shift;
    }
  }
  
  // Shift trees
  for (const t of map.trees) {
    if (t.pos) {
      t.pos.x += shift;
      t.pos.y += shift;
    }
  }
  
  return map;
}