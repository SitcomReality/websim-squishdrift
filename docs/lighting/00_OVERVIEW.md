# Dynamic 2D Raycasted Lighting: Overview

## Context Recap

- **Renderer**: HTML5 Canvas 2D, single canvas, world-space transform applied per frame.
- **Layers**: Ground tiles, floors, skidmarks, entities (sorted by y), then building walls and roofs with simple 2.5D projection, then debug overlays and HUD-like reticules.
- **Occludable things at ground level**: map floor tiles (`BuildingFloor`), tree trunks (tight AABB 0.3x0.3), pedestrians (disks ~0.15), vehicles (OBB ~0.9x0.5 at rotation).
- **Walls**: Vertical faces extruded from building floors, visually drawn as quads between floor and roof; logically the “solid” ground footprint is the floor/wall tiles.
- **Camera**: Zoomable, clamped to map; transforms applied before `drawTiles` et al.

## Goal in Plain Terms

- The world defaults to “night” (dark), and specific light sources brighten regions (flashlights, headlights, street lamps, muzzle flashes).
- Light is blocked by occluders (floors/walls/trees/peds/vehicles) at ground level.
- Walls can respond to nearby light by brightening the faces that correspond to floor edges that are hit.
- Performance must support multiple lights and continuous camera motion on a single 2D canvas.

