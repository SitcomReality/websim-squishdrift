# Lighting: Roadmap and Pitfalls

## Roadmap proposal

1.  **MVP (looks good, easy to ship)**
    - Fullscreen darkness overlay (alpha ~0.93–0.97).
    - For each light:
        - Compute a conservative visible cone/sector (no occlusion), draw soft gradient (radial or cone) with `destination-out`.
    - Result: instant “night with lights” feel without blockers. Good baseline for performance and UX.

2.  **Add occlusion**
    - Build a lightweight occluder set from nearby tiles + trunks + vehicles + peds.
    - Per light, compute visibility polygon via vertex-angle raycasting; clip a soft light gradient to this polygon; `destination-out`.
    - Tune ray counts and culling; profile.

3.  **Wall brightening heuristic**
    - Compute a scalar “illumination” per floor edge segment (max of nearby light intensity samples).
    - In `drawBuildings` (walls step), modulate `sideWallColor`/`topWallColor` toward lighter values based on this scalar.

4.  **Quality and polish**
    - Add short-lived muzzle flash lights.
    - Headlights: paired cones with cutoff angle, slightly differing intensities; jitter brightness for realism.
    - Optional simple blur on the light buffer for softer penumbra; keep radius small to control cost.

## Potential pitfalls

- **Ray/edge precision**: epsilon tolerances required to avoid holes between rays.
- **Zoom/DPR**: keep offscreen buffer pixel sizes in sync with camera zoom and `devicePixelRatio`, or accept mild softness as an aesthetic tradeoff.
- **Sorting and multiple passes**: Ensure transforms are restored when switching to screen-space overlays.

