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
      const tree = {
        pos: { x: rb.cx + 0.5, y: rb.cy + 0.5 },
        trunkHeight: 30 + rand() * 22, // Increased from 20-35 to 30-52 (50% taller)
        leafHeight: (20 + rand() * 15) * 0.5, // Increased from 15-25 to 20-35 (50% taller)
        leafWidth: (1.5 + rand() * 0.5) * 0.5, // Keep same width as park trees
        leafColor: `hsl(${100 + rand() * 40}, 60%, ${35 + Math.floor(rand() * 20)}%)`,
        trunkColor: `hsl(${30 + Math.floor(rand() * 20)}, 40%, ${25 + Math.floor(rand() * 15)}%)`,
        // Add missing properties for animation
        originalTrunkHeight: 0,
        currentTrunkHeight: 0,
        originalLeafHeight: 0,
        currentLeafHeight: 0,
        animationState: null
      };
      
      // Initialize animation properties correctly
      tree.originalTrunkHeight = tree.trunkHeight;
      tree.currentTrunkHeight = tree.trunkHeight;
      tree.originalLeafHeight = tree.leafHeight;
      tree.currentLeafHeight = tree.leafHeight;

      trees.push(tree);
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
  // ALSO shift each node's 'next' targets so links remain correct after the map shift
  for (const n of map.roads.nodes) {
    if (n.next && n.next.length) {
      for (const nx of n.next) {
        nx.x += shift;
        nx.y += shift;
      }
    }
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
  
  // Add the perimeter footpath to the pedestrian graph
  const perimeterNodes = [];
  
  // Top perimeter path
  for (let x = 1; x < newWidth - 1; x++) {
    if (newTiles[1][x] === Tile.Footpath) {
      perimeterNodes.push({ x: x, y: 1 });
    }
  }
  
  // Bottom perimeter path
  for (let x = 1; x < newWidth - 1; x++) {
    if (newTiles[newHeight - 2][x] === Tile.Footpath) {
      perimeterNodes.push({ x: x, y: newHeight - 2 });
    }
  }
  
  // Left perimeter path
  for (let y = 1; y < newHeight - 1; y++) {
    if (newTiles[y][1] === Tile.Footpath) {
      perimeterNodes.push({ x: 1, y: y });
    }
  }
  
  // Right perimeter path
  for (let y = 1; y < newHeight - 1; y++) {
    if (newTiles[y][newWidth - 2] === Tile.Footpath) {
      perimeterNodes.push({ x: newWidth - 2, y: y });
    }
  }
  
  // Add perimeter nodes to the pedestrian graph
  for (const node of perimeterNodes) {
    const key = `${node.x},${node.y}`;
    if (!map.peds.nodes.has(key)) {
      const newNode = { x: node.x, y: node.y, neighbors: [] };
      map.peds.nodes.set(key, newNode);
      map.peds.list.push(newNode);
    }
  }
  
  // Connect perimeter nodes to form a continuous path
  const perimeterMap = new Map();
  for (const node of perimeterNodes) {
    perimeterMap.set(`${node.x},${node.y}`, node);
  }
  
  // Connect adjacent perimeter nodes
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const node of perimeterNodes) {
    const currentKey = `${node.x},${node.y}`;
    const currentNode = map.peds.nodes.get(currentKey);
    
    for (const [dx, dy] of directions) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      
      if (nx >= 0 && nx < newWidth && ny >= 0 && ny < newHeight) {
        if (newTiles[ny][nx] === Tile.Footpath) {
          const neighborKey = `${nx},${ny}`;
          const neighborNode = map.peds.nodes.get(neighborKey);
          
          if (neighborNode && currentNode) {
            // Add bidirectional connections
            if (!currentNode.neighbors.some(n => n.x === nx && n.y === ny)) {
              currentNode.neighbors.push({ x: nx, y: ny });
            }
            if (!neighborNode.neighbors.some(n => n.x === node.x && n.y === node.y)) {
              neighborNode.neighbors.push({ x: node.x, y: node.y });
            }
          }
        }
      }
    }
  }
  
  // Connect perimeter to internal footpaths AND zebra crossings at intersections
  const cornerConnections = [
    { px: 1, py: 1, ix: 2, iy: 2 }, // Top-left corner
    { px: newWidth - 2, py: 1, ix: newWidth - 3, iy: 2 }, // Top-right corner
    { px: 1, py: newHeight - 2, ix: 2, iy: newHeight - 3 }, // Bottom-left corner
    { px: newWidth - 2, py: newHeight - 2, ix: newWidth - 3, iy: newHeight - 3 } // Bottom-right corner
  ];
  
  // Additional connections for zebra crossings
  const zebraCrossingTypes = [11, 12, 13, 14]; // Zebra crossing tile types
  
  // Find zebra crossings near perimeter and connect them
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      if (zebraCrossingTypes.includes(newTiles[y][x])) {
        // Check if this zebra crossing is adjacent to perimeter footpath
        for (const [dx, dy] of directions) {
          const px = x + dx;
          const py = y + dy;
          
          if (px >= 0 && px < newWidth && py >= 0 && py < newHeight) {
            if (newTiles[py][px] === Tile.Footpath) {
              // Check if the footpath is part of the perimeter
              if (px === 1 || px === newWidth - 2 || py === 1 || py === newHeight - 2) {
                // Connect the zebra crossing to the perimeter
                const zebraKey = `${x},${y}`;
                const perimeterKey = `${px},${py}`;
                
                const zebraNode = map.peds.nodes.get(zebraKey);
                const perimeterNode = map.peds.nodes.get(perimeterKey);
                
                if (zebraNode && perimeterNode) {
                  // Connect perimeter to zebra crossing
                  if (!perimeterNode.neighbors.some(n => n.x === x && n.y === y)) {
                    perimeterNode.neighbors.push({ x: x, y: y });
                  }
                  if (!zebraNode.neighbors.some(n => n.x === px && n.y === py)) {
                    zebraNode.neighbors.push({ x: px, y: py });
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Connect corners to internal footpaths
  for (const { px, py, ix, iy } of cornerConnections) {
    const perimeterKey = `${px},${py}`;
    const internalKey = `${ix},${iy}`;
    
    const perimeterNode = map.peds.nodes.get(perimeterKey);
    const internalNode = map.peds.nodes.get(internalKey);
    
    if (perimeterNode && internalNode) {
      // Connect perimeter to internal footpaths
      if (!perimeterNode.neighbors.some(n => n.x === ix && n.y === iy)) {
        perimeterNode.neighbors.push({ x: ix, y: iy });
      }
      if (!internalNode.neighbors.some(n => n.x === px && n.y === py)) {
        internalNode.neighbors.push({ x: px, y: py });
      }
    }
  }
  
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