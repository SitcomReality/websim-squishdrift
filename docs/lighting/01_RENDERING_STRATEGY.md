# Lighting: Rendering Strategy

## High-level Rendering Strategies

1.  **Full-screen darkness + additive light masks (recommended first pass)**
    - Draw scene as usual or simplified, then draw a fullscreen dark overlay.
    - For each light, draw a light “mask” in `multiply` or `destination-out`/`lighter` composite to “undarken” lit pixels.
    - **Pros**: Simple and flexible. Easy to tune. Works with existing pipeline. Lights can be soft via radial gradients and cone gradients.
    - **Cons**: Without occlusion it looks fake. With occlusion you need shadow polygons per light.

2.  **Offscreen light buffer (lightmap) composed in post**
    - Render a black offscreen canvas the size of the viewport in world space.
    - For each light, compute visible polygon (shadow-caster aware) and fill with radial gradient (cone if needed).
    - Then composite this buffer onto the main canvas using a blend mode (e.g., `destination-out` on dark overlay, or `multiply` against the scene).
    - **Pros**: Control, caching, separable quality. Easy to debug and profile separately.
    - **Cons**: Extra canvas management; careful scaling with zoom and DPR.

3.  **Tile-based light grid (coarse)**
    - Maintain a grid (aligned to tiles or subtiles) storing accumulated illumination (float 0–1).
    - For each light, scan or “raymarch” into the grid until occlusion; accumulate falloff per cell.
    - Composite by drawing ground tiles normally, then a darkness overlay modulated per-cell (nearest-neighbor) or by filling translucent quads.
    - **Pros**: Predictable cost; trivially integrates with map; good with many small lights.
    - **Cons**: Aliasing/blocky look unless high-resolution; reprojecting over rotations causes artifacts; needs careful LOD.

4.  **Hybrid: polygonal shadows + screen-space blur**
    - Build hard-edged shadow polygons per light via ray casting to occluder edges/corners; render light fill; then blur the light buffer slightly.
    - **Pros**: Crisp occlusion with configurable softness; looks “premium.”
    - **Cons**: More CPU per light; blur cost on mobile.

## Compositing options on Canvas 2D

- **Scene, then darkness overlay**:
    - Fill a black rect over the viewport; set `ctx.globalAlpha = nightAlpha` (e.g., 0.9–0.98).
    - For each light, set composite op to `destination-out`; draw the light polygon filled with gradient. This “cuts holes” in darkness.
    - **Pros**: Intuitive mental model; soft edges easy with radial gradient; cones via gradient clipped to polygon.
    - **Caveat**: You must draw occluder-aware polygons to avoid illuminating behind blockers.

- **Scene in multiply with a light buffer**:
    - Draw the scene normally.
    - Build a lightmap where white=lit, black=dark; then multiply scene by lightmap (requires drawing lightmap on top with `globalCompositeOperation='multiply'`).
    - In practice on Canvas 2D, the “erase darkness” approach tends to be simpler.

