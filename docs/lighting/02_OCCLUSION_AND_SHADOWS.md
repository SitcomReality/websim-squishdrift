# Lighting: Occlusion and Shadows

## Candidate Occluders

- **Ground solids**: `BuildingFloor` (8) and `BuildingWall` (9) tiles as full-tile blockers (or per-edge for wall-side nuances).
- **Tree trunks**: use the tight trunk AABB (`aabbForTrunk`) for proper ground occlusion.
- **Vehicles**: use their OBB (`entityOBB`).
- **Pedestrians**: small discs or tiny AABBs; cheap approximation is fine.
- **Optional**: roundabout center grass, medians—usually not occluders unless you want light blocked by any tile above ground.

## How to build shadow geometry (per light)

- **Raycast to convex occluders’ feature points** (edges/corners) to find visibility polygon:
    - Sample angles to every occluder vertex (and ±epsilon) from the light center.
    - Cast a ray in each angle; find nearest intersection with any occluder.
    - Sort hit points by angle; form a fan polygon.
    - Fill this polygon with the light gradient using canvas `globalCompositeOperation` to “erase” darkness (`destination-out`) or “add light” (`lighter`).
- **Complexity**: O(L · (V log V + R·O)) where:
    - L = lights per frame
    - V = number of occluder vertices considered in light’s radius
    - O = number of occluders near the light
    - R = rays cast (often ~2*V; per vertex ±epsilon)
- **Optimization essentials**:
    - **Spatial acceleration**: Broaden/narrow occluder set by tile grid (neighbor tiles in light radius).
    - **Clamp ray distance** to light radius.
    - **Cache occluder geometry** per frame (you already compute many OBB/AABB for collisions).
    - **Only consider occluders** within the light’s AABB.
    - **Downsample**: cast fewer rays for small/short-lived lights; adaptive ray count by radius.

