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
        case Tile.RoadN:
        case Tile.ZebraCrossingN: return 'N';
        case Tile.RoadE:
        case Tile.ZebraCrossingE: return 'E';
        case Tile.RoadS:
        case Tile.ZebraCrossingS: return 'S';
        case Tile.RoadW:
        case Tile.ZebraCrossingW: return 'W';
        default: return null;
      }
    };
    const keyOf = (x, y, d) => `${x},${y},${d}`;
    
    // Collect nodes including zebra crossings
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
        { xRange: [cx - 2, cx - 1], yRange: [cy - 2, cy - 1] },
        { xRange: [cx + 1, cx + 2], yRange: [cy - 2, cy - 1] },
        { xRange: [cx - 2, cx - 1], yRange: [cy + 1, cy + 2] },
        { xRange: [cx + 1, cx + 2], yRange: [cy + 1, cy + 2] }
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
    // Top-left quadrant
    if (quad.xRange[0] === x && quad.yRange[0] === y) {
      addExit(x, y, x, y + 1); // South
      addExit(x, y, x - 1, y); // West
    }
    // Top-right quadrant
    else if (quad.xRange[0] === x && quad.yRange[0] === y) {
      addExit(x, y, x - 1, y); // West
      addExit(x, y, x, y - 1); // North
    }
    // Bottom-left quadrant
    else if (quad.xRange[0] === x && quad.yRange[0] === y) {
      addExit(x, y, x + 1, y); // East
      addExit(x, y, x, y + 1); // South
    }
    // Bottom-right quadrant
    else {
      addExit(x, y, x, y - 1); // North
      addExit(x, y, x + 1, y); // East
    }
  }

  buildPedGraph(tiles, width, height) {
    const nodes = new Map();
    const key = (x, y) => `${x},${y}`;
    
    const walkable = (t) => {
      return t !== Tile.Median && t !== Tile.Intersection &&
             t !== Tile.BuildingWall && t !== Tile.BuildingFloor &&
             t !== Tile.RoadN && t !== Tile.RoadE && 
             t !== Tile.RoadS && t !== Tile.RoadW;
    };
    
    // Collect walkable nodes including zebra crossings
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!walkable(tiles[y][x]) && !isZebraCrossing(tiles[y][x])) continue;
        nodes.set(key(x, y), { x, y, neighbors: [] });
      }
    }
    
    // Link neighbors including diagonal connections for zebra crossings
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    for (const n of nodes.values()) {
      for (const [dx, dy] of dirs) {
        const neighborKey = key(n.x + dx, n.y + dy);
        const neighbor = nodes.get(neighborKey);
        if (neighbor) {
          // Only allow diagonal movement for zebra crossings
          const isDiagonal = Math.abs(dx) === 1 && Math.abs(dy) === 1;
          const currentTile = tiles[n.y][n.x];
          const neighborTile = tiles[n.y + dy][n.x + dx];
          
          if (!isDiagonal || (isZebraCrossing(currentTile) || isZebraCrossing(neighborTile))) {
            n.neighbors.push({ x: neighbor.x, y: neighbor.y });
          }
        }
      }
    }
    
    return { nodes, list: Array.from(nodes.values()) };
  }
}

function isZebraCrossing(t) {
  return t >= Tile.ZebraCrossingN && t <= Tile.ZebraCrossingW;
}