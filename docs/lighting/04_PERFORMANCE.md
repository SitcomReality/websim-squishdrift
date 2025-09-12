# Lighting: Performance Considerations

- **Budget**:
    - Aim for <= 2 ms per frame on mid-tier desktop for lighting at 60 FPS; on mobile, more constrained.
    - With 3–6 dynamic lights, a simple visibility polygon per light can be OK if occluders are culled aggressively.

- **Acceleration**:
    - Use tile grid to fetch occluders inside light radius (reuse map width/height and `world.tileSize`).
    - Maintain a per-frame “occluder cache” (vehicles, peds) with simplified shapes (AABB for peds, OBB for vehicles, trunk AABB, tile AABB for floors).
    - Early out lights fully off-screen (after camera transform).
    - Level-of-detail for far lights (fewer rays; lower blur).

- **Temporal reuse**:
    - Static occluders (floors/trees) don’t change; their geometry can be pre-indexed by tile chunks.
    - For moving occluders (vehicles/peds), limit ray angular resolution; optionally update subsets of lights per frame (round-robin) and interpolate (risk of visible popping).

