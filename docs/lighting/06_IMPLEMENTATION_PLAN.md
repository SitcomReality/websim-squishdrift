# Lighting System: Incremental Implementation Plan

This document outlines the step-by-step process for implementing the dynamic 2D ray-casted lighting system. Each step is designed to modify only a single file to ensure stability and compatibility with project constraints.

## Part 1: Foundational System & MVP (Darkness + Simple Lights)

The goal of this phase is to establish the core lighting system, render a "night-time" overlay, and add basic, non-occluded light sources like street lamps.

-   **Step 1.1: Create the Core Lighting System**
    -   **Action**: Create the main `LightingSystem` class. Initially, it will only be responsible for drawing a semi-transparent "darkness" overlay on the canvas.
    -   **File**: `src/app/core/systems/LightingSystem.js` (new file)
    -   **Status**: ✅ Done

-   **Step 1.2: Integrate the Lighting System**
    -   **Action**: Instantiate the `LightingSystem` within the `SystemManager` and make it accessible on the global game state.
    -   **File**: `src/app/core/SystemManager.js` (modify)

-   **Step 1.3: Render the Darkness Overlay**
    -   **Action**: Modify the main `RenderSystem` to call the new `LightingSystem`'s render method at the correct point in the rendering pipeline (after the world, before the HUD).
    -   **File**: `src/app/core/systems/RenderSystem.js` (modify)

-   **Step 1.4: Add a Light Source Component**
    -   **Action**: Create a simple component definition for light sources. This will define properties like position, color, radius, and intensity. Lights will be treated as entities.
    -   **File**: `src/app/components/LightSource.js` (new file)

-   **Step 1.5: Spawn Static Street Lights**
    -   **Action**: Modify the map generation process to procedurally place static `LightSource` entities at intersections to act as street lamps.
    -   **File**: `src/map/generation/RoadGenerator.js` (modify)

-   **Step 1.6: Render Basic Light Sources**
    -   **Action**: Update the `LightingSystem` to find all `LightSource` entities and render them as simple radial gradients using `destination-out` compositing to "cut holes" in the darkness overlay.
    -   **File**: `src/app/core/systems/LightingSystem.js` (modify)

## Part 2: Dynamic Lights & Occlusion

This phase focuses on adding dynamic lights (headlights) and implementing shadow casting based on world geometry.

-   **Step 2.1: Add Headlights to Vehicles**
    -   **Action**: Update the vehicle archetypes to include definitions for headlights. This will specify their position relative to the vehicle, direction, and cone angle.
    -   **File**: `src/app/vehicles/VehicleTypes.js` (modify)

-   **Step 2.2: Add Headlight Logic to Lighting System**
    -   **Action**: Update the `LightingSystem` to find vehicles and render their headlights as conical gradients, respecting the vehicle's position and rotation.
    -   **File**: `src/app/core/systems/LightingSystem.js` (modify)

-   **Step 2.3: Create Occluder Geometry Logic**
    -   **Action**: Create a new helper module for calculating shadow geometry. This will contain functions for finding occluder vertices from buildings, trees, and vehicles.
    -   **File**: `src/render/occlusion.js` (new file)

-   **Step 2.4: Implement Raycasting and Visibility Polygon**
    -   **Action**: Add the core raycasting logic to the `occlusion.js` helper. This function will take a light source and a set of occluders and return a visibility polygon.
    -   **File**: `src/render/occlusion.js` (modify)

-   **Step 2.5: Integrate Occlusion into Lighting System**
    -   **Action**: Modify the `LightingSystem` to use the new occlusion helper. For each light, it will gather nearby occluders, compute the visibility polygon, and clip the light rendering to that polygon.
    -   **File**: `src/app/core/systems/LightingSystem.js` (modify)

## Part 3: Quality of Life & Polish

This final phase will add smaller, high-impact features like muzzle flashes and aesthetic improvements.

-   **Step 3.1: Add Muzzle Flash Lights**
    -   **Action**: Modify the `WeaponSystem` to create temporary, short-lived `LightSource` entities at the player's position whenever a weapon is fired.
    -   **File**: `src/app/core/systems/WeaponSystem.js` (modify)

-   **Step 3.2: Brighten Walls Based on Adjacent Light**
    -   **Action**: Update the `drawBuildings` function to check for nearby light sources and brighten the color of wall faces that are illuminated.
    -   **File**: `src/render/drawBuildings.js` (modify)

-   **Step 3.3: Final Tuning and Performance Optimizations**
    -   **Action**: Make final adjustments to light properties, ray counts, and culling strategies within the `LightingSystem` to balance visual quality with performance.
    -   **File**: `src/app/core/systems/LightingSystem.js` (modify)