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
    
    // Augment exits for roundabouts
    this.augmentRoundaboutExits(byKey, roundabouts);
    
    return { nodes, byKey };
  }

  augmentRoundaboutExits(byKey, roundabouts) {
    for (const { cx, cy, isPerimeter } of roundabouts) {
      const addExit = (x, y, ex, ey) => {
        const fromKey = `${x},${y},${roadDir(byKey.get(`${x},${y}`)?.dir)}`;
        const fromNode = byKey.get(fromKey);
        const toDir = roadDir(byKey.get(`${ex},${ey}`)?.dir);
        
        if (fromNode && toDir) {
          const alreadyExists = fromNode.next.some(n => n.x === ex && n.y === ey);
          if (!alreadyExists) {
            fromNode.next.push({ x: ex, y: ey, dir: toDir });
          }
        }
      };

      // Add turning links for all four quadrants
      const quadrants = [
        { xRange: [cx - 2, cx - 1], yRange: [cy - 2, cy - 1], dir: 'NW' },
        { xRange: [cx + 1, cx + 2], yRange: [cy - 2, cy - 1], dir: 'NE' },
        { xRange: [cx - 2, cx - 1], yRange: [cy + 1, cy + 2], dir: 'SW' },
        { xRange: [cx + 1, cx + 2], yRange: [cy + 1, cy + 2], dir: 'SE' }
      ];

      for (const quad of quadrants) {
        for (let x = quad.xRange[0]; x <= quad.xRange[1]; x++) {
          for (let y = quad.yRange[0]; y <= quad.yRange[1]; y++) {
            // Add appropriate exit directions based on quadrant
            this.addQuadrantExits(addExit, x, y, quad);
          }
        }
      }
    }
  }

  addQuadrantExits(addExit, x, y, quad) {
    // Each quadrant needs to provide exits in multiple directions
    switch(quad.dir) {
      case 'NW':
        // Top-left quadrant: can go south or east
        if (y === quad.yRange[0] && x === quad.xRange[0]) {
          addExit(x, y, x, y + 1); // South
          addExit(x, y, x + 1, y); // East
        }
        break;
      case 'NE':
        // Top-right quadrant: can go south or west
        if (y === quad.yRange[0] && x === quad.xRange[1]) {
          addExit(x, y, x, y + 1); // South
          addExit(x, y, x - 1, y); // West
        }
        break;
      case 'SW':
        // Bottom-left quadrant: can go north or east
        if (y === quad.yRange[1] && x === quad.xRange[0]) {
          addExit(x, y, x, y - 1); // North
          addExit(x, y, x + 1, y); // East
        }
        break;
      case 'SE':
        // Bottom-right quadrant: can go north or west
        if (y === quad.yRange[1] && x === quad.xRange[1]) {
          addExit(x, y, x, y - 1); // North
          addExit(x, y, x - 1, y); // West
        }
        break;
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