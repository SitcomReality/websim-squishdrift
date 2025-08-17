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
    const tileDir = (t) => {
      switch (t) {
        case Tile.RoadN: return 'N';
        case Tile.RoadE: return 'E';
        case Tile.RoadS: return 'S';
        case Tile.RoadW: return 'W';
        default: return null;
      }
    };
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
    
    // Handle roundabout special cases
    this.createRoundaboutConnections(byKey, roundabouts, nodes);
    
    return { nodes, byKey };
  }

  createRoundaboutConnections(byKey, roundabouts, nodes) {
    for (const { cx, cy } of roundabouts) {
      // Define the 2x2 quadrants for each corner
      const quadrants = [
        { xRange: [cx - 2, cx - 1], yRange: [cy - 2, cy - 1], dirs: ['S', 'W'] }, // Top-left
        { xRange: [cx + 1, cx + 2], yRange: [cy - 2, cy - 1], dirs: ['S', 'E'] }, // Top-right
        { xRange: [cx - 2, cx - 1], yRange: [cy + 1, cy + 2], dirs: ['N', 'W'] }, // Bottom-left
        { xRange: [cx + 1, cx + 2], yRange: [cy + 1, cy + 2], dirs: ['N', 'E'] }  // Bottom-right
      ];

      for (const quad of quadrants) {
        for (let x = quad.xRange[0]; x <= quad.xRange[1]; x++) {
          for (let y = quad.yRange[0]; y <= quad.yRange[1]; y++) {
            const key = `${x},${y},${quad.dirs[0]}`;
            const node = byKey.get(key);
            if (node) {
              // Add connections for both directions
              const dir1 = quad.dirs[0];
              const dir2 = quad.dirs[1];
              
              // Create bidirectional movement
              node.dir = dir1; // Primary direction
              
              // Add both directional connections
              const dirVec = {
                N: { x: 0, y: -1 },
                E: { x: 1, y: 0 },
                S: { x: 0, y: 1 },
                W: { x: -1, y: 0 }
              };
              
              // Add connections in both directions
              for (const dir of [dir1, dir2]) {
                const vec = dirVec[dir];
                const nextX = x + vec.x;
                const nextY = y + vec.y;
                
                // Check if next tile is valid road
                if (nextX >= 0 && nextY >= 0 && nextX < 100 && nextY < 100) {
                  node.next.push({ x: nextX, y: nextY, dir });
                }
              }
            }
          }
        }
      }
    }
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
    
    // Collect walkable nodes
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
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