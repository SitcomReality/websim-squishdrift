# Plan for Consistent Building and Tree Shading

## 1. The Problem

Our game uses a 2.5D perspective where building walls and roofs are projected from their 2D floor plans. This creates a visual inconsistency with our dynamic lighting system:

-   **Occlusion:** Building and tree trunk floors correctly block light, causing the floor tiles to appear dark (in shadow).
-   **Projection:** The projected walls and roofs are drawn *after* the main scene and lighting are rendered. This causes them to appear at full brightness, creating a jarring effect where illuminated walls jut out from a dark, shadowed floor.

An initial attempt to fix this by modifying `RenderSystem.js` and `drawBuildings.js` resulted in the walls and roofs disappearing entirely. The goal is to find a robust solution that makes buildings and trees appear as unified, consistently lit objects.

## 2. The Core Challenge

The lighting is calculated for a 2D top-down view of the world (the floor). The walls and roof, however, exist in a pseudo-3D space created by the 2.5D projection. We need a way to make these projected surfaces respect the lighting that is calculated for the ground beneath them.

## 3. Proposed Solution: Use the Pre-Computed Light Map

Instead of re-implementing lighting logic inside `drawBuildings.js` (which is complex and inefficient), we should leverage the light map that the `LightingSystem` already generates. The `LightingSystem` renders a complete map of light and shadow onto an offscreen canvas. We can use this canvas as a data source to determine how bright the building walls and roof should be.

This approach ensures that the shading on the walls is perfectly consistent with the lighting on the ground around them.

### Implementation Steps

#### Step 3.1: Pass the Light Map to the Renderer

The `RenderSystem` manages the `lightingCanvas`, where the final light map is drawn. We need to make this canvas accessible to the `drawBuildings` function.

-   **Action:** In `RenderSystem.js`, after the `lightingSystem.render()` call completes, pass the `lightingCanvas` as a new argument to the `drawBuildings` function.

#### Step 3.2: Modify `drawBuildings` to Use the Light Map

The `drawBuildings` function will be updated to use the light map to shade the walls and roof. Since the light map contains the final, combined illumination from all light sources (including shadows), this will provide a perfectly consistent look.

-   **Action:** In `drawBuildings.js`, modify the function signature to accept the `lightingCanvas`.
-   **Action:** When drawing a wall face or a roof polygon, instead of filling it with a solid color, we will create a `CanvasPattern` from the `lightingCanvas`.
-   **Action:** We will set this pattern as the `fillStyle`. This will effectively "paint" the building's surfaces with the light and shadow from the ground, as if the light was being projected up onto them.
-   **Action:** Because the `lightingCanvas` is a map of *light*, we will first fill the polygon with the building's base color and then draw the light map pattern on top using a `screen` or `lighter` composite operation to brighten it. This gives us more artistic control than a simple `multiply`.

This technique will apply to both buildings and the 2.5D representation of tree trunks and leaves, solving the inconsistency for all projected elements.

### Example of the Pattern Technique

```javascript
// Inside drawBuildings.js, when drawing a wall polygon

// 1. Create a pattern from the light map.
// The pattern needs to be offset by the main canvas transform to align correctly.
const transform = ctx.getTransform();
const pattern = ctx.createPattern(lightingCanvas, 'no-repeat');
pattern.setTransform(transform.inverse()); // Align pattern with the world

// 2. Fill the wall with its base color first.
ctx.fillStyle = building.color; // Or calculated wall color
ctx.fill(); // Fills the wall path

// 3. Apply the light pattern on top to illuminate it.
ctx.globalCompositeOperation = 'screen'; // Or 'lighter'
ctx.fillStyle = pattern;
ctx.fill(); // Fills the wall path again, applying light
ctx.globalCompositeOperation = 'source-over'; // Reset
```

Output the updated code for docs/lighting/building_shading_plan.md. Do not wrap it in <current-code> tags, wrap it in ```. If something conflicts between current code and the plan (e.g. function signature), prefer the plan's version.