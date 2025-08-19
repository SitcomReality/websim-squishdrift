import { Tile, roadDir } from '../TileTypes.js';
import { findPath } from '../../utils/pathfinding.js';

export class GraphBuilder {
  buildRoadGraph(tiles, width, height, roundabouts = []) {
    const dirVec = { 
      N: { x: 0, y: -1 }, 
      E: { x: 1, y: 0 }, 
      S: { x: 0, y: 1 }, 
      W: { x: -1, y: 0 } 
    };
    
    const nodes = [];
    const byKey = new Map();
    
    const get = (x, y) => (x >= 0 && y >= 0 && x < width && y < height) ? tiles[y][x] : 255;
    const tileDir = (t) => roadDir(t);
    const keyOf = (x, y, d) => `${x},${y},${d}`;
    
    // Collect nodes
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const d = tileDir(get(x, y));
        if (!d) continue;
        
        const node = { x, y, dir: d, next: [] };
        nodes.push(node);
        byKey.set(keyOf(x, y, d), node);
      }
    }
    
    // Link nodes
    for (const n of nodes) {
      const v = dirVec[n.dir];
      const nextX = n.x + v.x;
      const nextY = n.y + v.y;
      const nextTile = get(nextX, nextY);
      const nextDir = tileDir(nextTile);
      
      if (nextDir) {
        n.next.push({ x: nextX, y: nextY, dir: nextDir });
      }
    }
    
    // Augment exits for roundabouts
    this.augmentRoundaboutExits(tiles, byKey, roundabouts, width, height);
    
    return { nodes, byKey };
  }

  augmentRoundaboutExits(tiles, byKey, roundabouts, width, height) {
    const get = (x, y) => (x >= 0 && y >= 0 && x < width && y < height) ? tiles[y][x] : 255;
    const tryLink = (fx, fy, fdir, tx, ty) => {
      const fromNode = byKey.get(`${fx},${fy},${fdir}`); if (!fromNode) return;
      const toTile = get(tx, ty); const toDir = this.tileDirFor(toTile); if (!toDir) return;
      const exists = fromNode.next.some(n => n.x === tx && n.y === ty && n.dir === toDir);
      if (!exists) fromNode.next.push({ x: tx, y: ty, dir: toDir });
    };
    const dirAt = (x, y) => this.tileDirFor(get(x, y));
    for (const { cx, cy } of roundabouts) {
      // NW quadrant: S/W optional turn
      for (let x = cx - 2; x <= cx - 1; x++) for (let y = cy - 2; y <= cy - 1; y++) {
        const d = dirAt(x, y); if (!d) continue;
        if (d === 'S') tryLink(x, y, d, x - 1, y); // Option to turn West
        if (d === 'W') tryLink(x, y, d, x, y + 1); // Option to turn South
      }
      // NE quadrant: N/W optional turn
      for (let x = cx + 1; x <= cx + 2; x++) for (let y = cy - 2; y <= cy - 1; y++) {
        const d = dirAt(x, y); if (!d) continue;
        if (d === 'N') tryLink(x, y, d, x - 1, y); // Option to turn West
        if (d === 'W') tryLink(x, y, d, x, y - 1); // Option to turn North
      }
      // SW quadrant: S/E optional turn
      for (let x = cx - 2; x <= cx - 1; x++) for (let y = cy + 1; y <= cy + 2; y++) {
        const d = dirAt(x, y); if (!d) continue;
        if (d === 'S') tryLink(x, y, d, x + 1, y); // Option to turn East
        if (d === 'E') tryLink(x, y, d, x, y + 1); // Option to turn South
      }
      // SE quadrant: N/E optional turn
      for (let x = cx + 1; x <= cx + 2; x++) for (let y = cy + 1; y <= cy + 2; y++) {
        const d = dirAt(x, y); if (!d) continue;
        if (d === 'N') tryLink(x, y, d, x + 1, y); // Option to turn East
        if (d === 'E') tryLink(x, y, d, x, y - 1); // Option to turn North
      }
    }
  }

  tileDirFor(t) {
    return roadDir(t);
  }

  buildPedGraph(tiles, width, height, trees = []) {
    const nodes = new Map();
    const key = (x, y) => `${x},${y}`;
    
    const isZebraCrossing = (t) => t >= Tile.ZebraCrossingN && t <= Tile.ZebraCrossingW;
    
    const walkable = (t) => {
      return t === Tile.Footpath || t === Tile.Grass || t === Tile.Park || isZebraCrossing(t) || t === Tile.Median;
    };
    
    const baseWalkable = (t) => {
      return t === Tile.Footpath || t === Tile.Grass || t === Tile.Park;
    };
    
    // Collect tree positions for collision checking
    const treePositions = new Set();
    for (const tree of (trees || [])) {
      treePositions.add(`${Math.floor(tree.pos.x)},${Math.floor(tree.pos.y)}`);
    }
    
    // Check if this is a tree trunk position
    const isTreeTrunk = (x, y) => treePositions.has(`${x},${y}`);
    
    // Collect walkable nodes, avoiding tree trunks
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Skip tree trunk positions (don't create ped nodes where a tree trunk exists)
        if (isTreeTrunk(x, y)) continue;
        
        if (!walkable(tiles[y][x])) continue;
        nodes.set(key(x, y), { x, y, neighbors: [] });
      }
    }
    
    // Add perimeter footpath nodes
    const PERIMETER_START = 2; // Where perimeter footpath starts
    const PERIMETER_END_X = width - PERIMETER_START - 1;
    const PERIMETER_END_Y = height - PERIMETER_START - 1;
    
    // Top and bottom perimeter footpaths
    for (let x = 0; x < width; x++) {
      if (x >= PERIMETER_START && x <= PERIMETER_END_X) {
        // Top perimeter footpath
        if (tiles[PERIMETER_START - 1] && tiles[PERIMETER_START - 1][x] === Tile.Footpath) {
          nodes.set(key(x, PERIMETER_START - 1), { x, y: PERIMETER_START - 1, neighbors: [] });
        }
        // Bottom perimeter footpath
        if (tiles[PERIMETER_END_Y + 1] && tiles[PERIMETER_END_Y + 1][x] === Tile.Footpath) {
          nodes.set(key(x, PERIMETER_END_Y + 1), { x, y: PERIMETER_END_Y + 1, neighbors: [] });
        }
      }
    }
    
    // Left and right perimeter footpaths
    for (let y = 0; y < height; y++) {
      if (y >= PERIMETER_START && y <= PERIMETER_END_Y) {
        // Left perimeter footpath
        if (tiles[y][PERIMETER_START - 1] === Tile.Footpath) {
          nodes.set(key(PERIMETER_START - 1, y), { x: PERIMETER_START - 1, y, neighbors: [] });
        }
        // Right perimeter footpath
        if (tiles[y][PERIMETER_END_X + 1] === Tile.Footpath) {
          nodes.set(key(PERIMETER_END_X + 1, y), { x: PERIMETER_END_X + 1, y, neighbors: [] });
        }
      }
    }
    
    // Link neighbors for all nodes
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [keyStr, node] of nodes) {
      for (const [dx, dy] of dirs) {
        const nx = node.x + dx;
        const ny = node.y + dy;
        const neighborKey = key(nx, ny);
        
        if (nodes.has(neighborKey)) {
          const neighbor = nodes.get(neighborKey);
          
          // Don't link if blocked by tree
          if (!isTreeTrunk(nx, ny)) {
            node.neighbors.push({ x: nx, y: ny });
          }
        }
      }
    }
    
    return { nodes, list: Array.from(nodes.values()) };
  }
}