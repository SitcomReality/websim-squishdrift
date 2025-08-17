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
    // Use shared roadDir so zebra crossings are included as directed road nodes
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
    // Delegate to shared roadDir so both roads and zebra crossings resolve
    return roadDir(t);
  }

  buildPedGraph(tiles, width, height) {
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
    const map = { tiles, width, height };
    
    // Check if this is a tree trunk position
    const isTreeTrunk = (x, y) => {
      if (!map.trees) return false;
      return map.trees.some(tree => 
        Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
      );
    };
    
    // Collect walkable nodes, avoiding tree trunks
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Skip tree trunk positions
        if (isTreeTrunk(x, y)) continue;
        
        if (!walkable(tiles[y][x])) continue;
        nodes.set(key(x, y), { x, y, neighbors: [] });
      }
    }
    
    // Link neighbors
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const n of nodes.values()) {
      const n_tile = tiles[n.y][n.x];

      for (const [dx, dy] of dirs) {
        const nx = n.x + dx, ny = n.y + dy;
        const neighborKey = key(nx, ny);
        const neighbor = nodes.get(neighborKey);

        if (neighbor) {
          const neighbor_tile = tiles[ny][nx];
          
          let connect = false;

          // Standard walkable connections
          if (baseWalkable(n_tile) && baseWalkable(neighbor_tile)) {
            connect = true;
          }
          // Footpath to Zebra crossing (start of crosswalk)
          else if (n_tile === Tile.Footpath && isZebraCrossing(neighbor_tile)) {
            connect = true;
          }
          // Zebra crossing to Median (middle of crosswalk)
          else if (isZebraCrossing(n_tile) && neighbor_tile === Tile.Median) {
            connect = true;
          }
          // Zebra crossing to Zebra crossing (same direction)
          else if (isZebraCrossing(n_tile) && isZebraCrossing(neighbor_tile)) {
             // Only connect if perpendicular to road direction
             const dir = roadDir(n_tile);
             if((dir === 'N' || dir === 'S') && dx !== 0 && dy === 0) connect = true; // Horizontal connection for N/S road
             if((dir === 'E' || dir === 'W') && dy !== 0 && dx === 0) connect = true; // Vertical connection for E/W road
          }
          // Median to Zebra crossing (resuming crosswalk)
          else if (n_tile === Tile.Median && isZebraCrossing(neighbor_tile)) {
            connect = true;
          }
          
          if(connect) {
             // Symmetrical connection
             const alreadyExists = n.neighbors.some(node => node.x === nx && node.y === ny);
             if(!alreadyExists) {
                n.neighbors.push({ x: neighbor.x, y: neighbor.y });
             }
             const neighborAlreadyExists = neighbor.neighbors.some(node => node.x === n.x && node.y === n.y);
             if(!neighborAlreadyExists) {
                neighbor.neighbors.push({ x: n.x, y: n.y });
             }
          }
        }
      }
    }
    
    return { nodes, list: Array.from(nodes.values()) };
  }
}