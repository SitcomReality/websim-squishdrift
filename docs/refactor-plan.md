# Squishdrift Refactor & Cleanup Plan

This document provides a concise action plan for cleaning up the codebase, based on the findings in `system-architecture.md`.

---

## 1. Files to Delete

The following files are duplicates, legacy code, or deprecated wrappers that are not used in the active game loop. They can be safely removed.

### Collision Systems
- `src/app/core/CollisionSystem.js`
- `src/app/systems/CollisionSystem.js`
> **Reason:** Legacy versions. The active system is `src/app/core/systems/CollisionSystem.js`.

### AI Driving Systems
- `src/app/systems/AIDrivingSystem.js`
- `src/app/systems/player/AIDrivingSystem.js`
> **Reason:** Duplicates. The active system is `src/app/core/systems/AIDrivingSystem.js`.

### Emergency Services
- `src/app/core/EmergencyServices.js`
> **Reason:** Legacy version. The active system is `src/app/systems/EmergencyServices.js`.

### Debug Overlay
- `DebugOverlaySystem.js` (from the project root directory)
> **Reason:** Legacy version. The active system is `src/app/DebugOverlaySystem.js`.

### Vehicle Physics
- `src/app/core/systems/VehiclePhysicsSystem.js`
> **Reason:** Deprecated wrapper. The engine directly uses `VehicleMovementSystem` and `VehicleCollisionSystem` instead.

---

## 2. Areas for Refactoring

The following areas contain architectural duplication that should be addressed to improve maintainability.

### A. Unify Vehicle Destruction Logic
- **Issue:** The code for handling a vehicle's destruction (creating explosions, adding score, handling player death) is duplicated in two places:
  1. `src/app/vehicles/physics/handlers/VehicleCollisionUtils.js`
  2. `src/app/core/systems/CollisionSystem.js`
- **Action:** Refactor this logic into a single, shared utility function or module that both systems can call. This ensures destruction behavior is consistent everywhere.

### B. Standardize on a Single Projectile Model
- **Issue:** The game has two types of projectiles: `bullet` (legacy) and `projectile` (modern). This results in two separate update and collision-handling pathways (`BulletSystem` vs. `WeaponSystem`/`ProjectileManager`).
- **Action:** Migrate all weapons and projectile logic to use the `projectile` type. After migration, the `BulletSystem` and any code specific to `type === 'bullet'` can be removed.

### C. Consolidate Death Music Playback
- **Issue:** Both the `DeathSystem` and `AudioManager` contain separate logic for creating and playing the death screen music.
- **Action:** Centralize all music playback, including the death theme, within the `AudioManager`. The `DeathSystem` should simply make a call to `state.audio.playDeathMusic()` instead of managing its own `<audio>` element. This will ensure consistent volume, mute, and state handling.

