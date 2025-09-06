# Flatten Ability Implementation Plan

This document outlines the steps to implement the "flatten" ability, which allows the player to toggle the 2.5D perspective effect on and off.

## Feature Overview

- **Toggle Key:** `Q`
- **Flatten Effect (2.5D -> 2D):**
    - Buildings and trees will animate shrinking until they are flat 2D representations on the ground.
    - Collision with building walls and tree trunks will be disabled.
    - The camera remains top-down, but the 3D extrusion effect is removed.
- **Restore Effect (2D -> 2.5D):**
    - Buildings and trees will animate popping back up to their original 2.5D state.
    - This animation will feature a "jiggle" or "bounce" effect, where the height overshoots and settles.
    - Collision will be re-enabled.

---

## Implementation Steps

The implementation is broken down into four main steps to ensure a smooth and error-free development process.

### Step 1: State Management & Input Handling

The first step is to set up the underlying state and player controls for the new ability.

1.  **Introduce Global State:**
    - In `src/app/state/createInitialState.js`, add a new boolean flag to the main game state: `isFlattened: false`. This will globally track whether the world is in a flattened state.

2.  **Handle Input:**
    - In `src/app/core/systems/PlayerSystem.js`, within the `update` method, add logic to detect when the 'Q' key is pressed using `input.pressed.has('KeyQ')`.
    - When pressed, toggle the `state.isFlattened` value.

3.  **Prepare Buildings and Trees for Animation:**
    - We need to store the original height of each object and track its current animated height.
    - In `src/map/generation/BuildingGenerator.js`:
        - When creating a `building` object, add:
            - `originalHeight: building.height`
            - `currentHeight: building.height`
            - `animationState: null`
        - When creating a `tree` object, do the same for its height properties:
            - `originalTrunkHeight: tree.trunkHeight`
            - `currentTrunkHeight: tree.trunkHeight`
            - `originalLeafHeight: tree.leafHeight`
            - `currentLeafHeight: tree.leafHeight`
            - `animationState: null`

### Step 2: Animation System

This step involves creating a dedicated system to handle the animations and updating the rendering to respect the animated values.

1.  **Create a new `AnimationSystem.js`:**
    - Create a new file: `src/app/core/systems/AnimationSystem.js`.
    - This system's `update` method will iterate through all buildings and trees.
    - It will check their `animationState` and update their `currentHeight` properties frame-by-frame.

2.  **Trigger Animations:**
    - Back in `PlayerSystem.js`, when `state.isFlattened` is toggled, iterate through all buildings and trees in `state.world.map` and set up their `animationState`.
    - **On Flatten:** Set `targetHeight` to 0 and `animationState` to something like `{ type: 'shrink', startTime: Date.now(), duration: 300 }`.
    - **On Restore:** Set `targetHeight` to `originalHeight` and `animationState` to `{ type: 'grow', startTime: Date.now(), duration: 600 }`.

3.  **Implement Animation Logic in `AnimationSystem.js`:**
    - **Shrink:** Use a simple linear or ease-out interpolation to decrease `currentHeight` to 0.
    - **Grow (Jiggle/Bounce):** Implement a spring or elastic easing function. The function should cause the `currentHeight` to overshoot `originalHeight`, then dip below it, and finally settle. A mathematical function like `easeOutElastic` is ideal for this.

4.  **Update Rendering Logic:**
    - In `src/render/drawBuildings.js`, modify the drawing functions for buildings and trees.
    - Replace all instances of `b.height`, `tree.trunkHeight`, and `tree.leafHeight` with their animated counterparts (`b.currentHeight`, `tree.currentTrunkHeight`, `tree.currentLeafHeight`).
    - When `currentHeight` is near zero, the logic should result in only a flat roof/canopy being drawn on the ground.

### Step 3: Disabling Collision

With the visual animation in place, we'll now disable collision for flattened objects.

1.  **Modify Collision Handlers:**
    - The primary files to change are:
        - `src/app/vehicles/physics/handlers/VehicleEnvironmentCollisionHandler.js` (vehicle vs. buildings/trees)
        - `src/app/core/systems/weapons/CollisionHandler.js` (projectiles vs. trees)
        - `src/app/core/systems/CollisionSystem.js` (player vs. trees)

2.  **Make Collision Conditional:**
    - The most robust way to handle this is to tie collision to the animation state.
    - In each of the files above, before performing a collision check against a building or tree, check its `currentHeight`.
    - If the `currentHeight` is below a small threshold (e.g., `0.1`), skip the collision detection and resolution for that object. This ensures collision is only active when the objects are physically present in 2.5D.

### Step 4: Sound Effects & Refinement

The final step is to add audio feedback and polish the feature.

1.  **Create Sound Assets:**
    - Generate two new sound effects:
        - `flatten_down.mp3`: A quick "whoosh" or "power-down" sound.
        - `flatten_up.mp3`: A "boing" or springy "pop-up" sound.

2.  **Play Sounds on Toggle:**
    - In `PlayerSystem.js`, where the 'Q' key press is handled, use `state.audio.playSfx()` to play the corresponding sound effect when the state changes.

3.  **Tune and Polish:**
    - Adjust the duration of the shrink and grow animations.
    - Tweak the parameters of the `easeOutElastic` function to get the desired jiggle effect.
    - Test thoroughly to ensure that collision toggles correctly and that there are no visual or physics glitches.

