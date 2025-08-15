Top-down 2.5D Open World Action Webgame — Technical Design

Overview
- Scope: Single-player top-down 2.5D action prototype. Tile-based city, pedestrians and traffic, basic vehicles, items, emergency responses, random events. Web-first build.
- Out of scope (for prototype): Persistence, inventories, deep RPG systems, passengers, multiplayer.

Goals
- Modular: Each feature in its own directory with granular files.
- Road-first map generation with consistent pathing.
- Familiar GTA 1/2-style faux 3D buildings; 2D characters.
- Streaming NPCs/vehicles around player; simple AI.
- Clean ECS-style systems for flexibility and future scaling.

Tech Stack (recommended)
- Renderer: Canvas 2D (start) with option to swap to PixiJS/WebGL later
- Data: JSON for map seeds/config, simple procedural generator
- Dev tools: Debug overlays toggled via keys

Project Structure (granular files)
- /src
  - /app
    - index.js
    - Game.js
    - loop.js
    - config.js
  - /core
    - ecs/
      - World.js
      - Entity.js
      - Component.js
      - System.js
    - events/
      - EventBus.js
      - GameEvents.js
    - math/
      - Vec2.js
      - Rect.js
      - RNG.js
      - Quadtree.js
    - time/
      - FixedTimestep.js
  - /components
    - Transform.js
    - Renderable.js
    - Kinetics.js
    - Health.js
    - Character.js
    - Vehicle.js
    - Item.js
    - AI.js
    - Collider.js
    - Building.js
    - TileOccupant.js
  - /systems
    - InputSystem.js
    - CameraSystem.js
    - VehicleControlSystem.js
    - ItemSystem.js
    - SpawnerSystem.js
    - CullingSystem.js
    - MapStreamingSystem.js	
    - DebugOverlaySystem.js
    - /physics
	  - PhysicsSystemCore.js
	- /ai
	  - PedestrianAISystem.js
	  - VehicleAISystem.js
	- /events
	  - EventSystemCore.js
	  - EmergencyServicesSystem.js
	  - RandomEventSystem.js
    - /renderer
	  - RenderingSystemCore.js
  - /render
    - CanvasRenderer.js
    - layers/
      - drawTiles.js
      - drawEntities.js
      - drawBuildings.js
      - zSort.js
  - /map
    - MapGen.js
    - TileTypes.js
    - RoadRules.js
    - PathGraph.js
    - BlockLayout.js
    - seed/
      - CityParams.json
  - /ui
    - HUD.js
    - overlays/
      - Minimap.js (future)
  - /data
    - Items.json
    - Vehicles.json
    - EmergencyResponses.json
  - /utils
    - Assertions.js
    - ObjectPool.js
    - Id.js
- /tests
- /public
  - index.html
  - styles.css
- DESIGN.md (this doc)
- NOTES_FOR_LEAD_DESIGNER_FROM_PROGRAMMER.md

Core Game Loop
- Rendering: requestAnimationFrame at 60 FPS target.
- Simulation: fixed timestep (e.g., 60 Hz) with accumulator; cap catch-up steps to avoid spiral of death.
- Order per tick:
  1) InputSystem
  2) VehicleControlSystem (player)
  3) PedestrianAISystem, VehicleAISystem
  4) PhysicsSystem (movement, simple collisions)
  5) SpawnerSystem, CullingSystem, MapStreamingSystem
  6) EventSystem (emit), EmergencyServicesSystem, RandomEventSystem (consume/produce)
  7) RenderingSystem (layered draw)

Coordinate Systems
- World grid: integer tile coords (x, y), y grows down.
- World units: 1 tile = 1 unit (constant TILE_SIZE in pixels for rendering).
- Entities move in continuous world coordinates; pathing/lanes derive from tile graph.

Tile Types and Passability
- TileType enum:
  - Grass (walkable)
  - Footpath (walkable)
  - ZebraCrossing (walkable)
  - RoadLane(N, E, S, W) (driveable; peds avoid but allowed)
  - Median (non-walkable, non-driveable)
  - BuildingFloor (walkable)
  - BuildingWall (render-only, not walkable)
  - Water (non-walkable, non-driveable)
- Ped passable: Grass, Footpath, ZebraCrossing, BuildingFloor (roads discouraged)
- Vehicle passable: RoadLane only (if off-road, steer back to nearest RoadLane)

World/Map Generation
- Input params:
  - blocksWide, blocksHigh: integer
  - seed: string/number
  - lotTypeWeights: { building, park, … }
- Block layout (per block):
  - 2x2 lots, each lot 2x2 tiles
  - 1-tile alleys between lots, forming a plus (+)
  - Total “interior” (lots + alleys): 5x5 tiles
  - Footpaths: 1-tile border around interior => now 7x7
  - Owned road lanes: 2-tile border outside footpaths => now 11x11 footprint per block
- Between blocks:
  - A shared 5-tile-wide road corridor: 2 lanes (this block’s clockwise), 1 median, 2 lanes (neighbor’s clockwise, opposite direction to this block). At intersections, median is replaced with road.
  - Edge of map (ocean side): still 4 lanes + median around city.
- Lane directions (Left-hand drive, block-owned lanes clockwise):
  - On a block’s top edge: lanes go East
  - Right edge: South
  - Bottom edge: West
  - Left edge: North
  - The opposite side of the median runs counter to these.
- Intersections:
  - Where horizontal and vertical corridors cross, remove median tiles, retain lanes.
  - Build a directed adjacency list for each lane tile connecting to next tile(s).
- Algorithm (road-first):
  1) Lay out a grid of block footprints (11x11) separated by 1-tile medians (horiz/vert).
  2) Carve 5-tile-wide corridors between blocks: [2 clockwise lanes | 1 median | 2 opposite lanes].
  3) At every crossing of corridors, replace median with road to form intersections.
  4) Within each block footprint, fill:
     - 2-lane border (owned) + 1-tile footpath
     - 5x5 interior with 4x lots (2x2 each) and 1-tile plus-shaped alleys
     - For each lot, choose: Building or Park per RNG weights.
  5) Build path graphs for:
     - Road lanes (directed)
     - Footpaths/grass/building floors (undirected 4-neighbors)
  6) Precompute spawn points:
     - Pedestrian: footpaths, alleys, parks; curb-adjacent points
     - Vehicle: lane tiles with clear forward path
- Tile addressing:
  - For block (bx, by), its top-left world tile is:
    - tlx = bx * (11 + 1) + 2; tly = by * (11 + 1) + 2
    - Explanation: 11 tile block + 1 median between blocks; +2 if you reserve a surrounding city road ring. Adjust per implementation; provide helpers to compute precise offsets.
  - Provide MapIndex helpers: toWorldTile(blockCoord, localInBlock), neighborsOf(tile), isIntersection(tile).

Path Graph Details
- Road graph node: each RoadLane tile (x, y, dir) with:
  - next: the tile you move into (straight)
  - at intersections/corners: next options [left, straight, right] as available
  - vehicles pick randomly at intersections, excluding the tile they came from (if applicable)
- Ped graph node: any walkable tile; connect N/E/S/W neighbors.
- Median: no edges.
- Intersections: mark special nodes; for cars, allow turning lanes abstractly (no lane markings at prototype).

Rendering (Faux 3D 2.5D)
- Layers (painter’s algorithm): Water → Grass/Parks → Roads → Footpaths → Building floors → Items → Peds → Vehicles → Building walls → Building roofs → UI
- Building projection:
  - Each building is an axis-aligned rectangle footprint in tile space with a height H (pixels).
  - Camera has a position (cx, cy) in world units and a screen-space projection vector vCam = normalize(screen(cx, cy) → up-screen). For a top-down with north-up screen, choose vCam = (0, -1) or compute from player-screen offset for small parallax.
  - Roof offset:
    - If player/camera is inside the building footprint ⇒ roofOffset = (0, 0) (roof directly above floor)
    - Else roofOffset = vCam * H * perspectiveScale
      - perspectiveScale ∈ [0.8, 1.2] tweakable
  - Roof polygon = floor polygon translated by roofOffset.
  - Walls: four quads (west, east, north, south) are trapezoids connecting corresponding floor and roof edges:
    - West wall: connect floor minX edge to roof minX edge
    - East wall: connect floor maxX edge to roof maxX edge
    - North wall: connect floor minY edge to roof minY edge
    - South wall: connect floor maxY edge to roof maxY edge
  - Visibility: draw all walls in fixed order (W, E, N, S) or sort by projected depth if needed; keep heights modest to avoid overlap artifacts in prototype.
- Sprites:
  - Peds: filled circles with pseudo-shadow; random body color
  - Vehicles: colored rectangles with heading indicator
- Z-sorting within a layer: sort by (y + zBias) to reduce overlaps; buildings can add zBias = height.

Input and Camera
- Movement: WASD/Arrow keys; hold to move; diagonals allowed (normalize speed)
- Camera: follow player; keep player near screen center; smooth damping
- Enter/Exit vehicles: interaction key (E). When entering, player entity is hidden; control transfers to Vehicle component. When exiting, spawn player at a safe adjacent tile.

Movement and Physics
- Ped kinematics: velocity with damping; max speed ≈ 2–3 tiles/sec
- Vehicle kinematics: simple top-down model
  - Inputs: throttle/brake, left/right
  - State: speed with accel/decel, max speed, turn rate scaled by speed
  - Friction/drag to settle to rest off-input
- Collisions (prototype):
  - Broad-phase: quadtree per frame for entity proximity
  - Narrow-phase: AABB vs AABB
  - Resolve: simple separation and velocity damping; cars deflect rather than pile up
  - Static collision with non-walkable tiles for peds; vehicles blocked by non-road except soft correction when off-road.

AI (NPCs)
- Pedestrians:
  - Spawn heading = direction of nearby path segment at spawn
  - Walk along footpaths/grass/building floors; avoid roads by weight
  - At junctions: pick random non-backtracking neighbor
  - Flee behavior: if threat nearby (gunfire, fire, fast car), set target vector away from threat until safe
- Vehicles:
  - Follow lane graph; maintain speed target
  - At intersection: choose random turn not equal to backwards; slight randomness in turn probability
  - If off-road: steer toward nearest lane centerline using A* or greedy projection
- Streaming (Spawner/Culling):
  - Maintain budgets, e.g., maxPeds ~ 100, maxVehicles ~ 50
  - Spawn ring ahead of camera (biased forward), radius Rspawn; despawn beyond Rdespawn
  - Reuse entities via object pools

Items
- Player and NPCs can equip one item (e.g., pistol)
- Use fires a projectile in facing direction with speed and lifetime
- Projectiles: simple straight-line ray or discrete bullets; collide with peds/vehicles/buildings

Emergency Services System
- Triggers (examples):
  - Dead or downed entity ⇒ Ambulance
  - Fire tile/event ⇒ Fire truck
  - Wanted level > 0 ⇒ Police units
- Wanted system:
  - Infractions (shots fired, vehicle hits) increment wanted; decays over time without infractions
  - Spawn police near player along roads; escalate unit types with wanted
- Responses:
  - Units path along lanes toward incident; behaviors: revive, extinguish, pursue
  - Continue spawning while conditions persist

Random Event System
- Periodic checks near player with cooldowns
- Sample events:
  - Arson: an NPC starts a fire on a tile ⇒ Fire response
  - Car theft: NPC enters nearest empty car ⇒ Police response
- Event definition:
  - Preconditions (time since last event, density available)
  - Effects (spawn actors, set goals)
  - Duration/cooldown
- Use EventBus to publish/subscribe; ensure deterministic RNG per-seed

UI/HUD
- Health bar
- Equipped item icon/name
- Vehicle indicator (vehicle type/speed)
- Optional debug HUD: FPS, entity counts, RNG seed, toggles (grid, lanes, spawn zones)

Data Structures Example
- Directions
  - type Dir = 'N' | 'E' | 'S' | 'W'
- TileType
  - enum TileType { Grass, Footpath, Zebra, RoadN, RoadE, RoadS, RoadW, Median, BuildingFloor, Water }
  - function isRoad(type): boolean; roadDir(type): Dir | null
- Road graph
  - interface RoadNode { x: number; y: number; dir: Dir; next: Array<{ x: number; y: number; dir: Dir }> }
- Components (examples)
  - Transform { pos: Vec2; rot: number }
  - Kinetics { vel: Vec2; maxSpeed: number }
  - Character { isPlayer: boolean; equippedItem?: EntityId }
  - Vehicle { speed: number; accel: number; maxSpeed: number; turnRate: number; onRoad: boolean }
  - AI { state: 'wander' | 'flee' | 'pursuit' | 'service'; target?: Vec2 }
  - Health { hp: number; max: number }
  - Building { footprint: Rect; height: number }
  - Renderable { sprite?: SpriteId; color?: string; layer: number; zBias?: number }

Map Generation Pseudocode
```
function generateCity(seed, blocksWide, blocksHigh): City {
  const rng = new RNG(seed);
  const W = 11, MED = 1; // per-block width, median width
  const cityWidth = blocksWide * (W + MED) + MED; // include outer median
  const cityHeight = blocksHigh * (W + MED) + MED;

  const tiles = make2D(cityWidth, cityHeight, TileType.Water);

  // 1) Lay roads and medians between blocks
  for (let by = 0; by < blocksHigh; by++) {
    for (let bx = 0; bx < blocksWide; bx++) {
      const ox = MED + bx * (W + MED);
      const oy = MED + by * (W + MED);

      // Place owned road ring (2 tiles) + footpath (1) + interior (5x5) centered
      paintOwnedRoadAndFootpath(tiles, ox, oy, W);

      // Insert medians around block bounding ring
      paintMediansAround(tiles, ox, oy, W);
    }
  }

  // 2) At crossings, replace medians with road to form intersections
  fixIntersections(tiles);

  // 3) Fill interiors with lots + alleys, buildings/parks
  for each block:
    fillInterior(tiles, block, rng);

  // 4) Build path graphs
  const roads = buildRoadGraph(tiles);       // directed
  const peds  = buildPedGraph(tiles);        // undirected

  // 5) Spawn points
  const spawns = collectSpawnPoints(tiles, roads, peds);

  return { tiles, roads, peds, spawns };
}
```

Lane Direction Assignment
- For each block’s owned road ring:
  - Top edge ring tiles ⇒ RoadE
  - Right edge ⇒ RoadS
  - Bottom edge ⇒ RoadW
  - Left edge ⇒ RoadN
- For the opposite side of the median (neighbor-owned), directions are inverse.
- At corners/intersections, continue directions smoothly; add adjacency fan-out for turns.

Spawning/Culling
- Define:
  - spawnRadiusTiles ≈ 40–60
  - softDespawnRadiusTiles ≈ 70–90
  - hardDespawnRadiusTiles ≈ 100+
- Peds: choose footpath nodes ahead of player’s facing vector; bias to visible streets
- Vehicles: choose lane nodes ≥ N tiles ahead; ensure path continuity before spawning
- Use object pools to avoid GC spikes

Event Bus (examples)
- Events:
  - 'Ped.Died' { pedId, at: Vec2 }
  - 'Gunshot' { at: Vec2 }
  - 'Fire.Started' { at: Vec2 }
  - 'Wanted.Changed' { level: number }
- Systems subscribe/publish; keep payloads small; avoid direct system coupling

Performance Targets
- 60 FPS on mid-tier laptop
- Entities (prototype budgets): up to ~300 peds, ~150 vehicles on desktop; start smaller and scale
- Use quadtree for proximity queries; avoid per-entity allocations in tick; reuse arrays/buffers

Testing/Debug
- Unit tests: road graph correctness, intersection rules, adjacency consistency
- Golden seed maps: snapshot counts of tiles/lanes/intersections
- Debug overlays:
  - Toggle grid, lane directions (arrows), medians
  - Show spawn rings and entity counts
  - Draw building roof vectors

UI/HUD Implementation
- Canvas overlay or simple DOM HUD:
  - Health bar
  - Equipped item name
  - Vehicle state (speed)
- Debug: FPS, dt, counts

Future-Proofing for Deeper Sim
- ECS already supports new components (Inventory, Faction, Routine)
- Keep map gen deterministic by seed to allow persistence later
- Avoid hardcoding limits that prevent named NPCs or routines

Prototype Acceptance Criteria
- Map:
  - City generated with road-first rules; all roads contiguous
  - Between every two blocks: 4 lanes + 1 median; intersections remove median
- Rendering:
  - Buildings render with moving roof offset dependent on camera; walls connect floor/roof cleanly
  - 2D peds/vehicles visible with correct z-order
- Player:
  - WASD movement; enter/exit vehicles; drive with simple physics; shoot item
- NPCs:
  - Peds and cars spawn around player; despawn out of range; path correctly
  - Basic flee behavior on danger
- Systems:
  - Random events (arson, car theft) can occur
  - Emergency services respond appropriately
  - HUD shows health, item, vehicle

Milestones
- M1: Engine skeleton, ECS, loop, input, basic renderer, grid and tile draw
- M2: Road-first map gen with lanes/medians/intersections, path graphs, HUD
- M3: Peds and vehicles AI, spawning/culling, enter/exit vehicles, items/projectiles
- M4: Random events + emergency services, debug overlays, performance pass