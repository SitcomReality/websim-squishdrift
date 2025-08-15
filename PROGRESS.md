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

# Next Step
- Implement proper footpaths and pedestrian spawn points inside block interiors

