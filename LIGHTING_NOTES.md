# Dynamic 2D Raycasted Lighting — Feasibility Notes

Context recap
- Renderer: HTML5 Canvas 2D, single canvas, world-space transform applied per frame.
- Layers: ground tiles, floors, skidmarks, entities (sorted by y), then building walls and roofs with simple 2.5D projection, then debug overlays and HUD-like reticules.
- Occludable things at ground level: map floor tiles (BuildingFloor), tree trunks (tight AABB 0.3x0.3), pedestrians (disks ~0.15), vehicles (OBB ~0.9x0.5 at rotation).
- Walls are vertical faces extruded from building floors, visually drawn as quads between floor and roof; logically the “solid” ground footprint is the floor/wall tiles.
- Camera: zoomable, clamped to map; transforms applied before drawTiles et al.

Goal in plain terms
- World defaults to “night” (dark), and specific light sources brighten regions (flashlights, headlights, street lamps, muzzle flashes).
- Light is blocked by occluders (floors/walls/trees/peds/vehicles) at ground level.
- Walls can respond to nearby light by brightening the faces that correspond to floor edges that are hit.
- Performance must support multiple lights and continuous camera motion on a single 2D canvas.

High-level rendering strategies
1) Full-screen darkness + additive light masks (recommended first pass)
   - Draw scene as usual or simplified, then draw a fullscreen dark overlay.
   - For each light, draw a light “mask” in multiply or destination-out/ lighter-composite to “undarken” lit pixels.
   - Pros: Simple and flexible. Easy to tune. Works with existing pipeline. Lights can be soft via radial gradients and cone gradients.
   - Cons: Without occlusion it looks fake. With occlusion you need shadow polygons per light.

2) Offscreen light buffer (lightmap) composed in post
   - Render a black offscreen canvas the size of the viewport in world space.
   - For each light, compute visible polygon (shadow-caster aware) and fill with radial gradient (cone if needed).
   - Then composite this buffer onto the main canvas using a blend mode (e.g., destination-out on dark overlay, or multiply against the scene).
   - Pros: Control, caching, separable quality. Easy to debug and profile separately.
   - Cons: Extra canvas management; careful scaling with zoom and DPR.

3) Tile-based light grid (coarse)
   - Maintain a grid (aligned to tiles or subtiles) storing accumulated illumination (float 0–1).
   - For each light, scan or “raymarch” into the grid until occlusion; accumulate falloff per cell.
   - Composite by drawing ground tiles normally, then a darkness overlay modulated per-cell (nearest-neighbor) or by filling translucent quads.
   - Pros: Predictable cost; trivially integrates with map; good with many small lights.
   - Cons: Aliasing/blocky look unless high-resolution; reprojecting over rotations causes artifacts; needs careful LOD.

4) Hybrid: polygonal shadows + screen-space blur
   - Build hard-edged shadow polygons per light via ray casting to occluder edges/corners; render light fill; then blur the light buffer slightly.
   - Pros: Crisp occlusion with configurable softness; looks “premium.”
   - Cons: More CPU per light; blur cost on mobile.

Candidate occluders
- Ground solids: BuildingFloor (8) and BuildingWall (9) tiles as full-tile blockers (or per-edge for wall-side nuances).
- Tree trunks: use the tight trunk AABB (aabbForTrunk) for proper ground occlusion.
- Vehicles: use their OBB (entityOBB).
- Pedestrians: small discs or tiny AABBs; cheap approximation is fine.
- Optional: roundabout center grass, medians—usually not occluders unless you want light blocked by any tile above ground.

Light types to support
- Omnidirectional point (street lamp, muzzle flash) with radial falloff.
- Conical light (headlights, flashlight) with inner “hot” region and angular falloff.
- Pulsed/short-lived (gunshots) to test perf spikes.
- Large soft ambient volumes (rare; expensive).

How to build shadow geometry (per light)
- Raycast to convex occluders’ feature points (edges/corners) to find visibility polygon:
  - Sample angles to every occluder vertex (and ±epsilon) from the light center.
  - Cast a ray in each angle; find nearest intersection with any occluder.
  - Sort hit points by angle; form a fan polygon.
  - Fill this polygon with the light gradient using canvas globalCompositeOperation to “erase” darkness (destination-out) or “add light” (lighter).
- Complexity: O(L · (V log V + R·O)) where:
  - L = lights per frame
  - V = number of occluder vertices considered in light’s radius
  - O = number of occluders near the light
  - R = rays cast (often ~2*V; per vertex ±epsilon)
- Optimization essentials:
  - Spatial acceleration: Broaden/narrow occluder set by tile grid (neighbor tiles in light radius).
  - Clamp ray distance to light radius.
  - Cache occluder geometry per frame (you already compute many OBB/AABB for collisions).
  - Only consider occluders within the light’s AABB.
  - Downsample: cast fewer rays for small/short-lived lights; adaptive ray count by radius.

Compositing options on Canvas 2D
- Scene, then darkness overlay:
  - Fill a black rect over the viewport; set ctx.globalAlpha = nightAlpha (e.g., 0.9–0.98).
  - For each light, set composite op to destination-out; draw the light polygon filled with gradient. This “cuts holes” in darkness.
  - Pros: Intuitive mental model; soft edges easy with radial gradient; cones via gradient clipped to polygon.
  - Caveat: You must draw occluder-aware polygons to avoid illuminating behind blockers.
- Scene in multiply with a light buffer:
  - Draw the scene normally.
  - Build a lightmap where white=lit, black=dark; then multiply scene by lightmap (requires drawing lightmap on top with globalCompositeOperation='multiply').
  - In practice on Canvas 2D, the “erase darkness” approach tends to be simpler.

Handling our 2.5D buildings
- Lights at ground level should primarily affect the floor plane and anything rendered at ground Z.
- Our walls/roofs are drawn late and represent vertical extrusion; they shouldn’t cast additional “ground-plane” occlusion beyond the footprint tile, unless we want to simulate wall-thickness specifically.
- “Walls brighten when lit”: After computing how much light hits the adjacent floor edge, modulate the wall face color:
  - Approximation: For each wall quad, sample the adjacent floor tile’s accumulated light (max of the tile corner samples facing that wall) and lerp wall color toward a lighter shade.
  - More advanced: Evaluate angle between the wall face normal and vector to the light to modulate intensity (cosine term), but keep it grounded on floor adjacency so we don’t need actual 3D.
- Roofs: If roofs are considered “above” ground lights, you can choose to leave them unaffected (keeps the 2.5D illusion coherent) unless a light source is on a roof.

Entity ordering and lighting
- Current pipeline draws entities then walls/roofs. If we use a post darkness overlay, everything underneath is darkened equally.
- If we want “volumetric” feel (e.g., headlights lighting cars), we should apply lighting post over the entire composite. That keeps entity shading consistent.
- Skidmarks and blood: Being ground-level decals, they should be darkened when in shadow, revealed by light.

Performance considerations
- Budget:
  - Aim for <= 2 ms per frame on mid-tier desktop for lighting at 60 FPS; on mobile, more constrained.
  - With 3–6 dynamic lights, a simple visibility polygon per light can be OK if occluders are culled aggressively.
- Acceleration:
  - Use tile grid to fetch occluders inside light radius (reuse map width/height and world.tileSize).
  - Maintain a per-frame “occluder cache” (vehicles, peds) with simplified shapes (AABB for peds, OBB for vehicles, trunk AABB, tile AABB for floors).
  - Early out lights fully off-screen (after camera transform).
  - Level-of-detail for far lights (fewer rays; lower blur).
- Temporal reuse:
  - Static occluders (floors/trees) don’t change; their geometry can be pre-indexed by tile chunks.
  - For moving occluders (vehicles/peds), limit ray angular resolution; optionally update subsets of lights per frame (round-robin) and interpolate (risk of visible popping).

Interaction with debug overlays and HUD
- Lighting should not affect HUD or the debug <pre>. Those are drawn in screen space after resetting the transform. Do darkness and light compositing strictly in world space before you reset transforms for overlays.

Roadmap proposal
1) MVP (looks good, easy to ship)
   - Fullscreen darkness overlay (alpha ~0.93–0.97).
   - For each light:
     - Compute a conservative visible cone/sector (no occlusion), draw soft gradient (radial or cone) with destination-out.
   - Result: instant “night with lights” feel without blockers. Good baseline for performance and UX.

2) Add occlusion
   - Build a lightweight occluder set from nearby tiles + trunks + vehicles + peds.
   - Per light, compute visibility polygon via vertex-angle raycasting; clip a soft light gradient to this polygon; destination-out.
   - Tune ray counts and culling; profile.

3) Wall brightening heuristic
   - Compute a scalar “illumination” per floor edge segment (max of nearby light intensity samples).
   - In drawBuildings (walls step), modulate sideWallColor/topWallColor toward lighter values based on this scalar.

4) Quality and polish
   - Add short-lived muzzle flash lights.
   - Headlights: paired cones with cutoff angle, slightly differing intensities; jitter brightness for realism.
   - Optional simple blur on the light buffer for softer penumbra; keep radius small to control cost.

Potential pitfalls
- Canvas composite modes vary slightly across browsers; test destination-out and multiply thoroughly.
- Ray/edge precision: epsilon tolerances required to avoid holes between rays.
- Zoom/DPR: keep offscreen buffer pixel sizes in sync with camera zoom and devicePixelRatio, or accept mild softness as an aesthetic tradeoff.
- Sorting and multiple passes: Ensure transforms are restored when switching to screen-space overlays.

How “bad” of an idea is this?
- It’s ambitious but feasible. With careful culling and modest ray counts, 3–6 lights with occlusion should run well on desktop and decently on modern mobile.
- Visual payoff is large (night mood, headlights, flashlights, muzzle flashes).
- The simplest non-occluded darkness+light gradients already give a strong effect at minimal cost; occlusion can be added iteratively.

Decision
- Start with the MVP “darkness + additive masks” to prove the look and measure cost.
- Add occlusion polygons per light where it matters (player flashlight, vehicle headlights).
- Keep wall brightening as a separate heuristic pass to avoid binding lighting math directly into building rendering complexity.

