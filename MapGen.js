import { Tile } from './TileTypes.js';
import { rng } from '../utils/RNG.js';

// Add the missing import
import { isWalkable } from './TileTypes.js';

export function generateCity(seed = 'alpha-seed', blocksWide = 4, blocksHigh = 4) {
  const W = 11, MED = 1; // Per-block width and median width
  const ROAD_RING = 2;      // 2-tile road ring
  const FOOTPATH_RING = 1;  // 1-tile footpath ring
  const mapOffset = 2; // Space for new perimeter road
  const cityWidth = blocksWide * (W + MED) + MED;
  const cityHeight = blocksHigh * (W + MED) + MED;
  const width = cityWidth + mapOffset * 2;
  const height = cityHeight + mapOffset * 2;
  const tiles = Array.from({ length: height }, () => new Uint8Array(width).fill(Tile.Grass));
  const buildings = [];
  const rand = rng(seed);
  const roundabouts = []; // Track centers for exit graph augmentation

  // Per-block generation
  for (let by = 0; by < blocksHigh; by++) {
    for (let bx = 0; bx < blocksWide; bx++) {
      const ox = mapOffset + MED + bx * (W + MED);
      const oy = mapOffset + MED + by * (W + MED);

      // 2-tile road ring
      for (let t = 0; t < ROAD_RING; t++) {
        // Top/bottom rows (E/W lanes)
        for (let i = t; i < W - t; i++) {
          tiles[oy + t][ox + i] = Tile.RoadE;
          tiles[oy + W - 1 - t][ox + i] = Tile.RoadW;
        }
        // Left/right cols (N/S lanes)
        for (let i = t; i < W - t; i++) {
          tiles[oy + i][ox + t] = Tile.RoadN;
          tiles[oy + i][ox + W - 1 - t] = Tile.RoadS;
        }
      }

      // Footpaths inside road ring (1-tile border)
      const fpStart = ROAD_RING;
      const fpSize = W - ROAD_RING * 2;
      for (let i = 0; i < fpSize; i++) {
        tiles[oy + fpStart][ox + fpStart + i] = Tile.Footpath; // Top
        tiles[oy + fpStart + fpSize - 1][ox + fpStart + i] = Tile.Footpath; // Bottom
        tiles[oy + fpStart + i][ox + fpStart] = Tile.Footpath; // Left
        tiles[oy + fpStart + i][ox + fpStart + fpSize - 1] = Tile.Footpath; // Right
      }

      // 5x5 Interior: lots and alleys
      const interiorStart = ROAD_RING + FOOTPATH_RING; // 3
      const interiorSize = W - 2 * interiorStart; // 11 - 6 = 5

      // Generate 4 lots (2x2 each) with alleys between
      const lots = [
        { x: 0, y: 0 }, { x: 3, y: 0 },
        { x: 0, y: 3 }, { x: 3, y: 3 }
      ];

      // First fill with alleys (cross pattern)
      for (let y = 0; y < interiorSize; y++) {
        for (let x = 0; x < interiorSize; x++) {
          const isAlley = (x === 2 || y === 2);
          const tile = isAlley ? Tile.Footpath : Tile.Grass;
          tiles[oy + interiorStart + y][ox + interiorStart + x] = tile;
        }
      }

      // Then fill lots with buildings or parks
      for (const lot of lots) {
        const isBuilding = rand() < 0.7; // 70% buildings, 30% parks

        if (isBuilding) {
          const buildingRect = {
            x: ox + interiorStart + lot.x,
            y: oy + interiorStart + lot.y,
            width: 2,
            height: 2,
          };

          buildings.push({
            rect: buildingRect,
            height: 40 + rand() * 80, // Building height in pixels
            color: `hsl(${Math.floor(rand() * 40 + 190)}, 20%, ${Math.floor(rand() * 20 + 55)}%)`
          });

          // Create a building with floor and walls
          for (let ly = 0; ly < 2; ly++) {
            for (let lx = 0; lx < 2; lx++) {
              const tx = buildingRect.x + lx;
              const ty = buildingRect.y + ly;

              const isWall = (lx === 0 || lx === 1 || ly === 0 || ly === 1);
              tiles[ty][tx] = isWall ? Tile.BuildingWall : Tile.BuildingFloor;
            }
          }
        } else {
          // Create a park
          for (let ly = 0; ly < 2; ly++) {
            for (let lx = 0; lx < 2; lx++) {
              const tx = ox + interiorStart + lot.x + lx;
              const ty = oy + interiorStart + lot.y + ly;
              tiles[ty][tx] = Tile.Park;
            }
          }
        }
      }
    }
  }

  // Medians between blocks
  for (let gy = 0; gy <= blocksHigh; gy++) {
    const y = mapOffset + gy * (W + MED);
    if (y >= 0 && y < height) for (let x = 0; x < width; x++) tiles[y][x] = Tile.Median;
  }
  for (let gx = 0; gx <= blocksWide; gx++) {
    const x = mapOffset + gx * (W + MED);
    if (x >= 0 && x < width) for (let y = 0; y < height; y++) tiles[y][x] = Tile.Median;
  }

  // Outer perimeter road (clockwise)
  for (let i = 0; i < width; i++) {
    tiles[0][i] = Tile.RoadW;    // Top lanes should point West
    tiles[1][i] = Tile.RoadW;
    tiles[height - 2][i] = Tile.RoadE;  // Bottom lanes should point East
    tiles[height - 1][i] = Tile.RoadE;
  }
  for (let i = 0; i < height; i++) {
    tiles[i][0] = Tile.RoadS;    // Left lanes point South
    tiles[i][1] = Tile.RoadS;
    tiles[i][width - 2] = Tile.RoadN;   // Right lanes point North
    tiles[i][width - 1] = Tile.RoadN;
  }

  // Inter-block corridors are now formed by block road rings + medians
  // The logic that carved corridors explicitly has been removed.

  // Intersections: build 2-lane anti-clockwise roundabouts (5x5 area)
  for (let gy = 0; gy <= blocksHigh; gy++) {
    for (let gx = 0; gx <= blocksWide; gx++) {
      const cx = mapOffset + gx * (W + MED);
      const cy = mapOffset + gy * (W + MED);
      if (cy >= height || cx >= width) continue;

      const isPerimeter = (gx === 0 || gx === blocksWide || gy === 0 || gy === blocksHigh);

      tiles[cy][cx] = Tile.Median; // Central island
      roundabouts.push({ cx, cy, isPerimeter });
      const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < width && y < height) tiles[y][x] = t; };
      // Top (leftward)
      for (let x = cx - 2; x <= cx + 2; x++) {
        set(x, cy - 2, Tile.RoadW);
        set(x, cy - 1, Tile.RoadW);
      }
      // Bottom (rightward)
      for (let x = cx - 2; x <= cx + 2; x++) {
        set(x, cy + 2, Tile.RoadE);
        set(x, cy + 1, Tile.RoadE);
      }
      // Left (downward)
      for (let y = cy - 2; y <= cy + 2; y++) {
        set(cx - 2, y, Tile.RoadS);
        set(cx - 1, y, Tile.RoadS);
      }
      // Right (upward)
      for (let y = cy - 2; y <= cy + 2; y++) {
        set(cx + 1, y, Tile.RoadN);
        set(cx + 2, y, Tile.RoadN);
      }

      if (isPerimeter) {
        if (gy === 0) { // Top perimeter
          for (let x = cx - 2; x <= cx + 2; x++) {
            set(x, cy - 2, Tile.RoadW);
            set(x, cy - 1, Tile.RoadW);
          } // Keep W
          for (let y = cy - 1; y <= cy + 2; y++) {
            if (gx > 0) {
              set(cx - 2, y, Tile.RoadS);
              set(cx - 1, y, Tile.RoadS);
            }
            if (gx < blocksWide) {
              set(cx + 1, y, Tile.RoadN);
              set(cx + 2, y, Tile.RoadN);
            }
          }
        }
        if (gy === blocksHigh) { // Bottom perimeter
          for (let x = cx - 2; x <= cx + 2; x++) {
            set(x, cy + 2, Tile.RoadE);
            set(x, cy + 1, Tile.RoadE);
          } // Keep E
          for (let y = cy - 2; y <= cy + 1; y++) {
            if (gx > 0) {
              set(cx - 2, y, Tile.RoadS);
              set(cx - 1, y, Tile.RoadS);
            }
            if (gx < blocksWide) {
              set(cx + 1, y, Tile.RoadN);
              set(cx + 2, y, Tile.RoadN);
            }
          }
        }
        if (gx === 0) { // Left perimeter
          for (let y = cy - 2; y <= cy + 2; y++) {
            set(cx - 2, y, Tile.RoadS);
            set(cx - 1, y, Tile.RoadS);
          } // Keep S
          for (let x = cx - 1; x <= cx + 2; x++) {
            if (gy > 0) {
              set(x, cy - 2, Tile.RoadW);
              set(x, cy - 1, Tile.RoadW);
            }
            if (gy < blocksHigh) {
              set(x, cy + 2, Tile.RoadE);
              set(x, cy + 1, Tile.RoadE);
            }
          }
        }
        if (gx === blocksWide) { // Right perimeter
          for (let y = cy - 2; y <= cy + 2; y++) {
            set(cx + 1, y, Tile.RoadN);
            set(cx + 2, y, Tile.RoadN);
          } // Keep N
          for (let x = cx - 2; x <= cx + 1; x++) {
            if (gy > 0) {
              set(x, cy - 2, Tile.RoadW);
              set(x, cy - 1, Tile.RoadW);
            }
            if (gy < blocksHigh) {
              set(x, cy + 2, Tile.RoadE);
              set(x, cy + 1, Tile.RoadE);
            }
          }
        }
      }
    }
  }

  // After creating roundabouts, add zebra crossings
  const zebraCrossings = [];

  // Add zebra crossings at roundabout entrances
  for (let gy = 0; gy <= blocksHigh; gy++) {
    for (let gx = 0; gx <= blocksWide; gx++) {
      const cx = mapOffset + gx * (W + MED);
      const cy = mapOffset + gy * (W + MED);
      if (cy >= height || cx >= width) continue;

      // Zebra crossings at roundabout corners
      // Top-left corner of roundabout
      if (gx > 0 && gy > 0) {
        // Horizontal zebra crossing (east-west traffic)
        for (let x = cx - 2; x <= cx + 2; x++) {
          if (x >= 0 && x < width) {
            if (tiles[cy - 2][x] === Tile.RoadW && tiles[cy - 1][x] === Tile.RoadW) {
              tiles[cy - 2][x] = 11; // Zebra crossing west
              tiles[cy - 1][x] = 11; // Zebra crossing west
              zebraCrossings.push({ x, y: cy - 2, dir: 'W', type: 'zebra' });
              zebraCrossings.push({ x, y: cy - 1, dir: 'W', type: 'zebra' });
            }
            if (tiles[cy + 2][x] === Tile.RoadE && tiles[cy + 1][x] === Tile.RoadE) {
              tiles[cy + 2][x] = 12; // Zebra crossing east
              tiles[cy + 1][x] = 12; // Zebra crossing east
              zebraCrossings.push({ x, y: cy + 2, dir: 'E', type: 'zebra' });
              zebraCrossings.push({ x, y: cy + 1, dir: 'E', type: 'zebra' });
            }
          }
        }

        // Vertical zebra crossing (north-south traffic)
        for (let y = cy - 2; y <= cy + 2; y++) {
          if (y >= 0 && y < height) {
            if (tiles[y][cx - 2] === Tile.RoadS && tiles[y][cx - 1] === Tile.RoadS) {
              tiles[y][cx - 2] = 13; // Zebra crossing south
              tiles[y][cx - 1] = 13; // Zebra crossing south
              zebraCrossings.push({ x: cx - 2, y, dir: 'S', type: 'zebra' });
              zebraCrossings.push({ x: cx - 1, y, dir: 'S', type: 'zebra' });
            }
            if (tiles[y][cx + 2] === Tile.RoadN && tiles[y][cx + 1] === Tile.RoadN) {
              tiles[y][cx + 2] = 14; // Zebra crossing north
              tiles[y][cx + 1] = 14; // Zebra crossing north
              zebraCrossings.push({ x: cx + 2, y, dir: 'N', type: 'zebra' });
              zebraCrossings.push({ x: cx + 1, y, dir: 'N', type: 'zebra' });
            }
          }
        }
      }
    }
  }

  const roads = buildRoadGraph(tiles, width, height, roundabouts);
  const peds = buildPedGraph(tiles, width, height, zebraCrossings);
  return { tiles, width, height, W, MED, seed, roads, peds, buildings, zebraCrossings };
}

// Helpers
function rectLine(tiles, x, y, len, type) {
  for (let i = 0; i < len; i++) tiles[y] && (tiles[y][x + i] = type);
}
function colLine(tiles, x, y, len, type) {
  for (let i = 0; i < len; i++) tiles[y + i] && (tiles[y + i][x] = type);
}

function buildRoadGraph(tiles, width, height, roundabouts) {
  const dirVec = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } };
  const leftOf = { N: 'W', E: 'N', S: 'E', W: 'S' }, rightOf = { N: 'E', E: 'S', S: 'W', W: 'N' };
  const nodes = []; const byKey = new Map();
  const get = (x, y) => (x >= 0 && y >= 0 && x < width && y < height) ? tiles[y][x] : 255;
  const tileDir = (t) => t === Tile.RoadN ? 'N' : t === Tile.RoadE ? 'E' : t === Tile.RoadS ? 'S' : t === Tile.RoadW ? 'W' : null;
  const keyOf = (x, y, d) => `${x},${y},${d}`;

  // Define mapOffset here since it's used below
  const mapOffset = 2;

  // Collect nodes
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const d = tileDir(get(x, y)); if (!d) continue;
    const node = { x, y, dir: d, next: [] }; nodes.push(node); byKey.set(keyOf(x, y, d), node);
  }

  // Link
  for (const n of nodes) {
    const v = dirVec[n.dir], a1x = n.x + v.x, a1y = n.y + v.y, t1 = get(a1x, a1y);
    const td = tileDir(t1);
    if (td) { n.next.push({ x: a1x, y: a1y, dir: td }); } // Allow turning through corners
  }

  // Augment exits for roundabouts (outer lanes provide optional exits)
  for (const { cx, cy, isPerimeter } of roundabouts) {
    const addExit = (x, y, ex, ey) => {
      const fromNode = byKey.get(keyOf(x, y, tileDir(get(x, y))));
      const toDir = tileDir(get(ex, ey));
      if (fromNode && toDir) {
        const alreadyExists = fromNode.next.some(n => n.x === ex && n.y === ey);
        if (!alreadyExists) {
          fromNode.next.push({ x: ex, y: ey, dir: toDir });
        }
      }
    };

    // Add turning links for all four quadrants
    // Top-left (S/W)
    for (let x = cx - 2; x <= cx - 1; x++) {
      for (let y = cy - 2; y <= cy - 1; y++) {
        addExit(x, y, x, y + 1); // Go South
        addExit(x, y, x - 1, y); // Go West
      }
    }
    // Top-right (N/W)
    for (let x = cx + 1; x <= cx + 2; x++) {
      for (let y = cy - 2; y <= cy - 1; y++) {
        addExit(x, y, x - 1, y); // Go West
        addExit(x, y, x, y - 1); // Go North
      }
    }
    // Bottom-left (S/E)
    for (let x = cx - 2; x <= cx - 1; x++) {
      for (let y = cy + 2; y <= cy + 1; y++) {
        addExit(x, y, x + 1, y); // Go East
        addExit(x, y, x, y + 1); // Go South
      }
    }
    // Bottom-right (N/E)
    for (let x = cx + 1; x <= cx + 2; x++) {
      for (let y = cy + 2; y <= cy + 1; y++) {
        addExit(x, y, x, y - 1); // Go North
        addExit(x, y, x + 1, y); // Go East
      }
    }
  }

  return { nodes, byKey };
}

function buildPedGraph(tiles, width, height, zebraCrossings) {
  const nodes = new Map();
  const key = (x, y) => `${x},${y}`;

  // Walkable includes zebra crossings
  const walkable = (t) => t !== Tile.Median && t !== Tile.Intersection && t !== Tile.BuildingWall && (t === 11 || t === 12 || t === 13 || t === 14 || isWalkable(t));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!walkable(tiles[y][x])) continue;
      nodes.set(key(x, y), { x, y, neighbors: [] });
    }
  }

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const n of nodes.values()) {
    for (const [dx, dy] of dirs) {
      const k = key(n.x + dx, n.y + dy);
      const m = nodes.get(k);
      if (m) n.neighbors.push({ x: m.x, y: m.y });
    }
  }

  // Add special zebra crossing connections
  for (const crossing of zebraCrossings) {
    // Allow pedestrians to cross zebra crossings
    if (crossing.type === 'zebra') {
      // Find connected footpaths
      const footpaths = [];
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        const nx = crossing.x + dx;
        const ny = crossing.y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && tiles[ny][nx] === Tile.Footpath) {
          footpaths.push({ x: nx, y: ny });
        }
      }

      // Connect zebra crossing to adjacent footpaths
      const crossingNode = nodes.get(key(crossing.x, crossing.y));
      if (crossingNode) {
        for (const fp of footpaths) {
          const fpNode = nodes.get(key(fp.x, fp.y));
          if (fpNode) {
            crossingNode.neighbors.push({ x: fp.x, y: fp.y });
            fpNode.neighbors.push({ x: crossing.x, y: crossing.y });
          }
        }
      }
    }
  }

  return { nodes, list: Array.from(nodes.values()) };
}