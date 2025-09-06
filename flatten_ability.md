# Flatten Ability Implementation Plan

This document outlines the remaining steps to finalize the "flatten" ability.

## Feature Overview

- **Toggle Key:** `Q`
- **Flatten Effect (2.5D -> 2D):**
    - Buildings and trees animate shrinking until they are flat.
    - Collision with building walls and tree trunks is disabled for all entities (player, vehicles, projectiles).
    - Flattened roofs and trees are rendered on the ground layer, behind vehicles and other entities.
- **Restore Effect (2D -> 2.5D):**
    - Buildings and trees animate popping back up with a "jiggle" effect.
    - Collision is re-enabled.

---

## Remaining Implementation Steps

Most of the foundational work (state, input, animation system, sounds) is complete. The focus is now on fixing bugs related to collision and rendering layer order.

### Step 1: Fix Rendering Order (Z-Ordering)

The primary issue is that when buildings are flattened, entities like vehicles are drawn behind the flat roofs. We need to change the rendering order based on the `isFlattened` state.

1.  **Modify `RenderSystem.js`:**
    - In the `render` method, locate the drawing calls for ground tiles, entities, and buildings.
    - Add a conditional check for `state.isFlattened`.
    - **If `true` (flattened):**
        - Draw ground tiles.
        - Draw flattened building roofs and trees *immediately after* the ground.
        - Then, draw all entities (vehicles, player, etc.) on top.
    - **If `false` (normal 2.5D):**
        - Keep the existing rendering order: ground, then entities sorted by Y-position, then building walls and roofs on top.

### Step 2: Fix Player/Projectile Collision

Projectiles and the player character are still colliding with flattened buildings because their collision logic relies on the static tile map, which doesn't know about building animation states.

1.  **Modify `PlayerSystem.js`:**
    - The `isWalkableTile` method currently checks the tile type.
    - Update this method so if it detects a building tile (`BuildingWall` or `BuildingFloor`), it then finds the corresponding `building` object from `state.world.map.buildings`.
    - It should then check the `building.currentHeight`. If the height is below a small threshold (e.g., `0.1`), the tile should be considered walkable.

2.  **Modify `CollisionHandler.js` (for projectiles):**
    - The projectile collision logic also uses the static tile map.
    - Apply the same logic as above: when a projectile hits a building tile, find the `building` object and check its `currentHeight`.
    - Only register a collision if the building's height is greater than the threshold.

### Step 3: Final Polish and Testing

With the core logic fixed, the final step is to test all interactions and ensure the feature is robust.

1.  **Test Player Movement:**
    - Verify the player can walk freely over flattened buildings and trees.
    - Ensure collision is restored correctly when toggling back to 2.5D.
2.  **Test Projectiles:**
    - Fire all weapon types at flattened buildings and trees to ensure projectiles pass through them.
    - Check that projectiles collide correctly when 2.5D is restored.
3.  **Test Vehicles:**
    - Drive vehicles over flattened buildings to confirm they render on top and collision is disabled.
    - Check for any visual glitches with shadows or skidmarks on flattened roofs.
4.  **Review Sound and Animation:**
    - Confirm the sound effects play correctly on toggle.
    - Watch the animations closely to ensure they are smooth.

