# Squishdrift System Architecture / Duplication Audit

This document summarizes how the core systems are wired together, which variants are actually used at runtime, and which appear to be legacy/duplicate code that can be removed or consolidated.

---

## 1. High-level architecture

Entry points and main flow:

- index.html
  - Declares the canvas `#game` and HUD DOM.
  - Loads `main.js` as a module and sets up import map for three.js (3D not currently used in core 2D game loop).

- main.js
  - Creates a global `LoadingSystem` and kicks off `initializeWithLoading()`.
  - `LoadingSystem.loadAssets()` shows a loading overlay, preloads images & some audio (separate from AudioManager’s WebAudio buffers).
  - After assets load:
    - Instantiates `GameEngine` with the canvas and debug `<pre>`.
    - Attaches `window.game` = GameEngine instance.
    - Copies loadedAssets onto `game.stateManager.state`.
    - Configures audio controls to call methods on `game.audioManager`.
    - Starts the fixed-timestep loop via `createLoop({ update, render })`.
    - Exposes `window.__startGame()` that flips `gameStarted` and hides the title screen.
  - Adds global listeners for:
    - Debug toggle button
    - Restart button (if present)
    - Canvas click-based debug spawning
    - A small zoom indicator updater
    - Window resize → canvas resize.

- loading.js
  - Manages the loading overlay UI and progress bar.
  - Calls into `TitleScreen` (title-screen.js) to show the actual title UI after loading.
  - The “START” button and `game-start` custom event ultimately call `window.__startGame`, which just flips the `gameStarted` flag; the loop is already running.

- title-screen.js
  - Renders the Squishdrift title overlay, desktop controls, item icons, and “START” HTML button.
  - Dispatches `handleStart()` which:
    - Plays the main theme via `window.game.audioManager.playMainTheme()` (if available).
    - Calls `window.__startGame()` (if available).
    - Hides the title screen, reveals mobile controls.
  - Also sets up a pause overlay (P/Escape from title context) but the “real” in-game pause is handled inside `GameEngine.update`.

---

## 2. GameEngine and state wiring

- src/app/core/GameEngine.js
  - Owns:
    - GameStateManager
    - SystemManager
    - RenderingManager
    - InputManager
    - SpawnManager
    - HUDManager
    - DebugManager
    - DeathSystem
    - ScoringSystem
    - DamageTextSystem
    - ExplosionSystem
    - ParticleSystem
    - AudioManager
  - After construction:
    - `stateManager.initialize()` creates the initial state via `createInitialState`.
    - HUDManager initializes HUD DOM references (score/wanted/weapon UI etc.).
    - Sets `stateManager.inputManager = this.inputManager`.
    - Attaches canvas to state as `state.canvas`.
    - Plugs `scoringSystem`, `damageTextSystem`, `explosionSystem`, `particleSystem`, and `audio` onto the state:
      - This is how most systems access audio and particles (`state.audio`, `state.particleSystem`, etc.).
    - Loads explosion sprite image and vehicle/pickup/pedestrian sprites into state.
    - Seeds `state.stats` for death screen.

  - Game loop responsibilities:
    - `update(dt)`:
      - Gets input via `this.inputManager.getInput()`.
      - Calls `this.inputManager.update()` (which polls gamepad, touch, etc.).
      - Handles pause toggling (P/Escape) and death freeze.
      - If paused:
        - Still updates input, debug and HUD; skips simulation systems.
      - If not paused:
        - Delegates to `SystemManager.update(dt)` (simulation core).
        - SpawnManager.update(dt) for NPCs, vehicles, pickups.
        - DeathSystem.update, ScoringSystem.update, DamageTextSystem.update, ExplosionSystem.update.
        - HUDManager update (score, wanted, combo UI).
        - Clears `inputSystem.pressed` for next frame.
        - DebugManager.update.
    - `render(interp)`:
      - Delegates to RenderingManager, which uses RenderSystem to draw the world.

- src/app/core/GameStateManager.js
  - `initialize()`:
    - Creates a fresh state via `createInitialState(randomSeed)`.
    - Adds `state.control = { inVehicle: false, vehicle: null, equipped: null }`.
    - Creates `EmergencyServices` (src/app/systems/EmergencyServices.js) and `BloodManager`.
    - Attaches them into state.
  - `getState()` returns the current state.

Key takeaway: the single source of truth for “live” systems is `SystemManager` and the state created by `GameStateManager`. Any system file not referenced there is effectively unused.

---

## 3. SystemManager: which systems are actually active?

File: src/app/core/SystemManager.js

- Constructs the active systems:
  - `player: new PlayerSystem()`
  - `vehicle: new VehicleSystem()`
  - `bullet: new BulletSystem()`
  - `npc: new NPCSystem()`
  - `camera: new CameraSystem()`
  - `aiDrive: new AIDrivingSystem()`                  ← this is the active AI driving system
  - `vehicleMovement: new VehicleMovementSystem()`
  - `vehicleCollision: new VehicleCollisionSystem()`
  - `skidmarks: new SkidmarkSystem()`
  - `weapon: new WeaponSystem()`
  - `collision: new CollisionSystem()`                ← this is the active “general” collision system
  - `particles: new ParticleSystem()`
  - `engineAudio: new EngineAudioSystem()`
  - `animation: new AnimationSystem()`

- It wires:
  - `this.systems.collision.cameraSystem = this.systems.camera;`
  - `state.cameraSystem = this.systems.camera;`
  - `state.particleSystem = this.systems.particles;`

- `update(dt)` in SystemManager:
  - Fetches `state` and `input`.
  - Ensures `state.cameraSystem` is set.
  - Calls all systems in this order:
    - `player.update(state, input, dt)`
    - `vehicle.update(state, input, dt)` (player vehicle controls)
    - `bullet.update(state, dt)`
    - `npc.update(state, dt)`
    - `aiDrive.update(state, dt)` (NPC vehicle pathing)
    - `vehicleMovement.update(state, dt)`
    - `vehicleCollision.update(state, dt)`
    - `camera.update(state, input)`
    - `collision.update(state)` (player–vehicle, NPC death, bullet impacts in new-style system)
    - `stateManager.emergencyServices.update(state, dt)` (police/ambulance/fire)
    - `skidmarks.update(state, dt)`
    - `weapon.update(state, input, dt)` (player weapons)
    - `particles.update(state, dt)`
    - `engineAudio.update(state, dt)`
    - `animation.update(state)`

Conclusion: any system not constructed or called here is not part of the active simulation.

---

## 4. Collision systems: which one is used?

There are three CollisionSystem files:

1) src/app/core/systems/CollisionSystem.js  ← ACTIVE

- This is the CollisionSystem that SystemManager constructs and calls.
- Responsibilities:
  - `checkBulletCollisions(state)`:
    - Interacts with `type === 'bullet'` and living `npc`/`vehicle` with Health.
    - Applies damage and screen shake, and spawns blood/sparks on hit.
  - `checkVehiclePedestrianCollisions(state)`:
    - Vehicle vs `npc` collisions → blood stains, particle splatter.
  - `checkPlayerVehicleCollisions(state)`:
    - Vehicle vs player collisions with:
      - Invincibility window `invincibilityDuration = 1000` ms.
      - Detailed damage based on vehicle velocity and alignment.
      - Camera shake (`cameraSystem.addShake`).
      - Damage text and blood.
      - Possibly triggers vehicle destruction via `handleVehicleDestruction`.
  - `update(state)`:
    - Calls the three methods above in order.

This is tightly integrated with:
- `ExplosionSystem` for destruction.
- CameraSystem via `triggerShake`.
- BloodManager, ParticleSystem and ScoringSystem.

2) src/app/core/CollisionSystem.js  ← LEGACY / UNUSED

- Similar name but:
  - Has its own `checkBulletCollisions`, `handleNPCDeath`, `update` which:
    - Only checks bullets and tree collisions + a much simpler player-vehicle stub.
  - Its constructor has:
    - `this.cameraSystem = null;`
    - `this.invincibilityDuration = 1000;`
- It is NEVER imported or instantiated anywhere in the current code:
  - SystemManager imports from `../systems/CollisionSystem.js`, which resolves to src/app/core/systems/CollisionSystem.js.
  - No other modules import `../core/CollisionSystem.js` or similar.

This file appears to be an earlier version of the collision logic before the current, richer CollisionSystem was introduced in `core/systems`.

3) src/app/systems/CollisionSystem.js  ← LEGACY / UNUSED

- Very similar in name and function to the core one, but:
  - Has its own simple bullet collision logic.
  - `update(state)` only calls `checkBulletCollisions` and `checkPlayerVehicleCollisions`.
  - Uses `this.cameraSystem` not wired by SystemManager.
- Not imported anywhere:
  - No `import { CollisionSystem } from '../systems/CollisionSystem.js'` outside core/SystemManager.
  - File path does not match any other import path.

Conclusion:

- In-use collision system:
  - src/app/core/systems/CollisionSystem.js (used via SystemManager).
- Safe to remove (or mark deprecated) from runtime perspective:
  - src/app/core/CollisionSystem.js
  - src/app/systems/CollisionSystem.js

Recommendation: delete these two legacy files after confirming no external tools/tests rely on them, and rename the active one to something more specific if desired (e.g., `WorldCollisionSystem`).

---

## 5. AI driving systems: which one is used?

There are three AIDrivingSystem files:

1) src/app/core/systems/AIDrivingSystem.js  ← ACTIVE

- This is the one instantiated in SystemManager as `aiDrive`.
- Responsibilities:
  - Path-following for all non-player vehicles (including police/emergency vehicles).
  - Driving style logic:
    - `drivingStyle` ∈ { 'normal', 'reckless' }.
    - `impatience` accumulation when blocked by obstacles.
  - Obstacle detection:
    - Looks ahead a few nodes along the planned route for vehicles/NPCs/player.
    - Adjusts target speed and brake/handbrake based on distance and traffic.
  - Hazard awareness:
    - Slows around zebra crossings and intersections depending on style/impatience.
  - Route extension:
    - Uses `roads.byKey` and node `next` lists to keep a rolling plannedRoute.
  - Retreat / reverse logic:
    - Detects when vehicle is stuck at low speed while trying to move forward.
    - Starts a retreat state:
      - Plans a small backward distance (0.5–2 tiles) and reverses.
      - Tracks a give-up timer, deactivates retreat if backward progress is blocked.
  - Updates `v.ctrl.throttle`, `v.ctrl.brake`, `v.ctrl.handbrake`, and `v.ctrl.steer` for VehicleMovementSystem to use.

2) src/app/systems/AIDrivingSystem.js  ← DUPLICATE / UNUSED

- Essentially contains the same logic as core/systems/AIDrivingSystem.js.
- Different path:
  - Not imported anywhere (SystemManager uses the core path).
- Appears to be a copy from when systems lived under `src/app/systems` rather than `src/app/core/systems`.

3) src/app/systems/player/AIDrivingSystem.js  ← DUPLICATE / UNUSED

- Also contains almost identical logic (including retreat/give-up logic).
- Not imported anywhere.
- Located under `systems/player`, which is otherwise used for player-centric systems (MovementSystem, StaminaSystem, etc.), so this looks like an intermediate refactor artifact.

Conclusion:

- In-use AI driving system:
  - src/app/core/systems/AIDrivingSystem.js (used via SystemManager).
- Safe to remove (or mark deprecated):
  - src/app/systems/AIDrivingSystem.js
  - src/app/systems/player/AIDrivingSystem.js

Recommendation: delete the duplicate AIDrivingSystem files; they provide no additional behavior and introduce confusion.

---

## 6. Emergency services: which module is active?

There are two EmergencyServices modules:

1) src/app/systems/EmergencyServices.js  ← ACTIVE

- Imported in GameStateManager:
  - `import { EmergencyServices } from '../systems/EmergencyServices.js';`
  - Constructed in GameStateManager.initialize() and stored as:
    - `this.emergencyServices`, and `state.emergencyServices`.
- Responsibilities:
  - Manages crime incidents, wanted level, and emergency vehicle spawns.
  - Uses road graph and pathfinding (via `findPath` from utils).
  - Owns a `PoliceChaseManager` which spawns police chasers based on wanted level.
  - Provides:
    - `findValidSpawnPoints`
    - `findNearestRoadNode`
    - `createChaserVehicle`
  - SystemManager calls `this.stateManager.emergencyServices.update(state, dt)` each frame.

2) src/app/core/EmergencyServices.js  ← LEGACY / UNUSED

- Similar concept but:
  - Different constructor signature.
  - No PoliceChaseManager integration.
  - Not imported anywhere in current code.
- Looks like a prior version that was superseded by `src/app/systems/EmergencyServices.js`.

Conclusion:

- Active emergency system:
  - src/app/systems/EmergencyServices.js
- Safe to remove:
  - src/app/core/EmergencyServices.js

---

## 7. Debug overlay: which one is used?

Two DebugOverlaySystem implementations:

1) src/app/DebugOverlaySystem.js  ← ACTIVE

- Imported by src/app/core/DebugManager.js:
  - `import { DebugOverlaySystem } from '../DebugOverlaySystem.js';`
- Simple overlay:
  - Toggles visibility of a `<pre>` element.
  - When enabled, prints a JSON summary:
    - Player position, camera, counts of NPCs/vehicles/bullets/projectiles, and emergency stats.

2) DebugOverlaySystem.js at project root (note: different path)  ← LEGACY / UNUSED

- At path `/DebugOverlaySystem.js` (root-level).
- Different implementation:
  - Has `toggle(enabled)` and `render(renderer, state)` that calls:
    - drawRoadDebug, drawPedestrianDebug, drawSpawnDebug.
  - Not imported anywhere:
    - core/DebugManager imports only `../DebugOverlaySystem.js` from src/app, not this root file.
- Likely an older version that drew on-canvas debug overlays instead of a text JSON block.

Conclusion:

- Active debug overlay:
  - src/app/DebugOverlaySystem.js (wrapped by core/DebugManager).
- Safe to remove:
  - /DebugOverlaySystem.js (root-level file).

---

## 8. Explosion and collision overlap

There is some duplication in how vehicle destruction is handled:

- VehicleEnvironmentCollisionHandler and VehicleVehicleCollisionHandler:
  - Use helpers from src/app/vehicles/physics/handlers/VehicleCollisionUtils.js:
    - `handleVehicleDestruction` and `addDamageIndicator`.
  - That helper:
    - Triggers ExplosionSystem.createExplosion, updates scoring, removes the vehicle, and checks for player death.

- src/app/core/systems/CollisionSystem.js (active general collisions):
  - Has `handleVehicleDestruction(state, vehicle)` which:
    - Also calls `state.explosionSystem.createExplosion` if available.
    - Registers crime with `state.scoringSystem`.
    - Removes the vehicle and handles player death if the destroyed vehicle is the player’s.

Implications:

- There are TWO conceptually similar “vehicle destruction” paths:
  - One in `VehicleCollisionUtils.handleVehicleDestruction`.
  - One in `src/app/core/systems/CollisionSystem.handleVehicleDestruction`.
- This is not dead code (both are used in different contexts), but it’s architectural duplication:
  - Same conceptual behavior split into two modules.

Recommendation:

- Refactor into a single vehicle-destruction utility module:
  - e.g., `VehicleDestruction.js` called by both physics collision handlers and the high-level CollisionSystem.
  - This reduces the chance of logic drifting apart (e.g., scoring, stats, explosion behavior).

---

## 9. Bullet vs projectile systems

The project has:

- BulletSystem (src/app/core/systems/BulletSystem.js)
  - Updates entities where `type === 'bullet'`.
  - Very simple; does not handle impacts (just lifetime and movement).

- CollisionSystem (active) and core/CollisionHandler for weapons:
  - src/app/core/systems/weapons/CollisionHandler.js deals with `type === 'projectile'` for weapon projectiles.
  - Bullet collisions (for the older bullet model) are also handled in the active CollisionSystem.

- WeaponSystem / ProjectileManager:
  - Newer weapons use entities of `type === 'projectile'`.
  - ProjectileManager handles grenade logic, shrapnel, etc.

Observation:

- There appears to be a legacy “bullet” model (`type === 'bullet'`) and a newer “projectile” model (`type === 'projectile'`).
- Both paths are still wired:
  - SystemManager constructs BulletSystem and CollisionSystem (which references bullets).
  - WeaponSystem uses ProjectileManager and weapon-specific CollisionHandler.

Inference:

- The bullet path looks like an older system (simple bullets and collisions), while the projectile path is the newer, more complete one.
- However, some game debug code still spawns `type: 'bullet'` entities, so BulletSystem and the bullet branch in CollisionSystem are not dead.
  - Example: debug spawning via main.js uses `type: 'vehicle'`/`npc` but bullets can be created elsewhere; the code still expects them.

Recommendation:

- Decide on a single projectile representation:
  - Either fully migrate any remaining `bullet` usage to `projectile`, or clearly keep bullets as a separate “legacy” weapon type.
- Once the migration is confirmed, you can:
  - Remove BulletSystem and bullet-specific paths from CollisionSystem.
  - Or, at least rename them to make the distinction obvious (e.g., `LegacyBulletSystem`).

---

## 10. Audio systems

- AudioManager (src/app/core/AudioManager.js)
  - Uses WebAudio buffers for SFX, plus `<audio>` tags for main theme and death music.
  - Exposed as `state.audio`.
  - Used by many systems via `playSfx`, `playSfxAt`, `startOrUpdateLoopAt`, `stopLoop`, `playMainTheme`, and `playDeathMusic`.
- EngineAudioSystem (src/app/core/systems/EngineAudioSystem.js)
  - Active via SystemManager.
  - Uses `audio.startOrUpdateLoopAt` to control engine loops and sirens.
- SkidmarkSystem also triggers a looping `tire_skid_loop`.
  
No obvious dead-code duplication here; the architecture is consistent albeit a bit complex due to:
- `AudioManager.playDeathMusic` vs DeathSystem’s own `playDeathMusic` function (which uses a separate `<audio>` instance).
This is duplication of responsibility, not unused code.

Recommendation:

- Consolidate death music playback through AudioManager only:
  - So that volume/mute behavior and audio lifecycle is managed consistently.
- That would let you remove or simplify DeathSystem’s inline `<audio>` handling.

---

## 11. Miscellaneous duplication / legacy artifacts

- VehiclePhysicsSystem (src/app/core/systems/VehiclePhysicsSystem.js)
  - A deprecated wrapper around VehicleMovementSystem and VehicleCollisionSystem.
  - Not used:
    - SystemManager uses `vehicleMovement` and `vehicleCollision` directly.
  - Marked in a comment as “deprecated”.

  Recommendation: you can safely delete this file after confirming no external references.

- EmergencyServices (two modules):
  - Already covered; keep src/app/systems/EmergencyServices.js and delete src/app/core/EmergencyServices.js.

- ExplosionSystem:
  - Only one core version in src/app/core/systems/ExplosionSystem.js and one renderer in src/app/entities/drawExplosion.js.
  - No unused variants.

- FlattenSystem:
  - Only one implementation in src/app/systems/player/FlattenSystem.js.
  - Active via PlayerSystem. No duplicates.

- Input and mobile controls:
  - There is a single InputSystem (src/app/InputSystem.js) and InputManager (core).
  - MobileControls and DesktopPrompts exist but are uniquely referenced from InteractionSystem; no duplicates.

---

## 12. Summary of likely-removable files

Based strictly on imports and wiring (no references from main.js or SystemManager), the following files appear unused at runtime:

- Collision-related:
  - src/app/core/CollisionSystem.js
  - src/app/systems/CollisionSystem.js

- AI driving:
  - src/app/systems/AIDrivingSystem.js
  - src/app/systems/player/AIDrivingSystem.js

- Emergency services:
  - src/app/core/EmergencyServices.js

- Debug overlay:
  - /DebugOverlaySystem.js (root-level)

- Vehicle physics:
  - src/app/core/systems/VehiclePhysicsSystem.js (explicitly marked deprecated and not used in SystemManager)

Before deleting, you may want to:

- Run a full-text search in your editor to confirm no external tooling (tests, scripts) reference these paths.
- Optionally comment them as “legacy / unused” in a transitional commit, then delete in a follow-up once you’re confident.

---

## 13. Suggested next steps

1) Clean out obvious unused systems:
   - Remove the files listed in the previous section, or move them into a `legacy/` folder if you want to keep them around temporarily.

2) Normalize naming and locations:
   - All active systems now live under src/app/core/systems/ (plus a few under src/app/systems/player for strictly player-local logic).
   - Consider:
     - Moving EmergencyServices into core/systems for symmetry, or
     - Documenting why EmergencyServices lives in src/app/systems while others are under core.

3) Unify destruction logic:
   - Extract a shared “vehicle destruction” helper used by:
     - VehicleCollisionUtils, and
     - core/systems/CollisionSystem.
   - This avoids behavior drift.

4) Decide on bullet vs projectile:
   - Either:
     - Migrate fully to the newer `projectile` path and remove BulletSystem, or
     - Clearly mark BulletSystem and `type === 'bullet'` as a separate, limited feature.

5) Consolidate death music handling:
   - Route all death music through AudioManager for consistent volume/mute behavior and to avoid duplicate `<audio>` instances.

This cleanup should significantly reduce confusion around which “systems” are truly live and make it clearer where to plug in any new features.


