# Progress Log (Concise)

- 2025-08-15: Map foundation
  - Deterministic RNG, tile types, road/median grid generator
  - Tile renderer, camera/player movement

- 2025-08-15: Road lanes + directed graph
  - Directional road tiles (N/E/S/W), intersections, basic directed road graph

- 2025-08-15: Debug lane overlay
  - Canvas overlay draws lane direction arrows; debug shows FPS + road node/link counts

- 2025-08-15: Simple autonomous vehicle
  - Spawns at nearest road node to player and follows directed lane graph, validating path continuity

- 2025-08-15: Inter-block corridors + larger map
  - Carved continuous 2-lane corridors adjacent to medians to connect blocks; doubled city to 4x4 blocks for better testing

- 2025-08-15: Upgraded corridors to 4-lane + median
  - Corridors now have 4 lanes (2 each direction) with median divider
  - Added basic footpaths inside blocks (1-tile border around interior)

- 2025-08-16: Implement block interiors
  - Added `Footpath` tile type.
  - Refactored map generator to create proper 5x5 block interiors with lots and alleys, surrounded by footpaths, as per design spec.

- 2025-08-16: Fix player spawn
  - Player now spawns on walkable tiles (footpath/grass) instead of potentially spawning on roads/medians
  - Added search algorithm to find nearest walkable tile to map center

- 2025-08-16: Buildings and parks in lots
  - Added BuildingFloor, BuildingWall, and Park tile types
  - Implemented lot-based building/park generation (70% buildings, 30% parks)
  - Added basic building wall shading in renderer
  - Updated walkability rules to exclude building walls

- 2025-08-16: Color scheme update
  - Updated tile colors for better visual distinction during testing
  - Changed roads to very dark grey, footpaths to light grey, parks to dark green
  - Updated player to red, vehicles to violet

- 2025-08-16: 2.5D Building Rendering
  - Implemented faux 3D buildings with height and roof offset based on camera position.
  - Map generator now creates building data structures (footprint, height).
  - Renderer updated to use painter's algorithm for correct z-ordering of tiles, entities, and building layers.

# Next Step
- Implement player entering/exiting vehicles. Player character should be hidden and control transferred to the vehicle.

