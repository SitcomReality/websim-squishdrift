# Lighting: System Integration

## Light types to support

- **Omnidirectional point** (street lamp, muzzle flash) with radial falloff.
- **Conical light** (headlights, flashlight) with inner “hot” region and angular falloff.
- **Pulsed/short-lived** (gunshots) to test perf spikes.
- **Large soft ambient volumes** (rare; expensive).

## Handling our 2.5D buildings

- Lights at ground level should primarily affect the floor plane and anything rendered at ground Z.
- Our walls/roofs are drawn late and represent vertical extrusion; they shouldn’t cast additional “ground-plane” occlusion beyond the footprint tile, unless we want to simulate wall-thickness specifically.
- **“Walls brighten when lit”**: After computing how much light hits the adjacent floor edge, modulate the wall face color:
    - **Approximation**: For each wall quad, sample the adjacent floor tile’s accumulated light (max of the tile corner samples facing that wall) and lerp wall color toward a lighter shade.
    - **More advanced**: Evaluate angle between the wall face normal and vector to the light to modulate intensity (cosine term), but keep it grounded on floor adjacency so we don’t need actual 3D.
- **Roofs**: If roofs are considered “above” ground lights, you can choose to leave them unaffected (keeps the 2.5D illusion coherent) unless a light source is on a roof.
- When buildings and trees are flattened, they won't block light.

## Entity ordering and lighting

- Current pipeline draws entities then walls/roofs. If we use a post darkness overlay, everything underneath is darkened equally.
- If we want “volumetric” feel (e.g., headlights lighting cars), we should apply lighting post over the entire composite. That keeps entity shading consistent.
- **Skidmarks and blood**: Being ground-level decals, they should be darkened when in shadow, revealed by light.

## Interaction with debug overlays and HUD

- Lighting should not affect HUD or the debug `<pre>`. Those are drawn in screen space after resetting the transform.
- Do darkness and light compositing strictly in world space before you reset transforms for overlays.

