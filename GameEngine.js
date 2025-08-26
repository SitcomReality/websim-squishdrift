import { CanvasRenderer } from '../CanvasRenderer.js';
import { InputSystem } from '../InputSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { EmergencyServices } from '../systems/EmergencyServices.js';
import { PlayerSystem } from '../systems/PlayerSystem.js';
import { VehicleSystem } from '../systems/VehicleSystem.js';
import { BulletSystem } from '../systems/BulletSystem.js';
import { NPCSystem } from '../systems/NPCSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { AIDrivingSystem } from '../systems/AIDrivingSystem.js';
import { VehicleMovementSystem } from '../vehicles/physics/VehicleMovementSystem.js';
import { VehicleCollisionSystem } from '../vehicles/physics/VehicleCollisionSystem.js';
import { SkidmarkSystem } from '../systems/SkidmarkSystem.js';
import { createInitialState } from '../state/createInitialState.js';
import { DebugOverlaySystem } from '../systems/DebugOverlaySystem.js';
import { GameStateManager } from './GameStateManager.js';
import { SystemManager } from './SystemManager.js';
import { RenderingManager } from './RenderingManager.js';
import { InputManager } from './InputManager.js';
import { SpawnManager } from './SpawnManager.js';
import { HUDManager } from './HUDManager.js';
import { DebugManager } from './DebugManager.js';
import { DeathSystem } from './systems/DeathSystem.js';
import { ScoringSystem } from './systems/ScoringSystem.js';
import { DamageTextSystem } from './systems/DamageTextSystem.js';
import { ExplosionSystem } from './systems/ExplosionSystem.js';

export class GameEngine {
  constructor(canvas, { debugEl } = {}) {
    this.stateManager = new GameStateManager();
    this.systemManager = new SystemManager(this.stateManager);
    this.renderingManager = new RenderingManager(canvas);
    this.inputManager = new InputManager(canvas);
    this.spawnManager = new SpawnManager(this.stateManager);
    this.hudManager = new HUDManager();
    this.debugManager = new DebugManager(debugEl, this.stateManager);
    this.deathSystem = new DeathSystem();
    this.scoringSystem = new ScoringSystem();
    this.damageTextSystem = new DamageTextSystem();
    this.explosionSystem = new ExplosionSystem();
    
    this.stateManager.initialize();
    this.hudManager.initialize();

    // Expose input manager to stateManager so systems can read input via stateManager
    this.stateManager.inputManager = this.inputManager;

    // Ensure state knows about the canvas for systems that reference it
    if (this.stateManager.state) this.stateManager.state.canvas = canvas;

    // Add scoring system to state
    if (this.stateManager.state) {
      this.stateManager.state.scoringSystem = this.scoringSystem;
    }

    // Add damage text system to state
    if (this.stateManager.state) {
      this.stateManager.state.damageTextSystem = this.damageTextSystem;
    }

    // Add explosion system to state
    if (this.stateManager.state) {
      this.stateManager.state.explosionSystem = this.explosionSystem;
    }

    // Load explosion image
    if (this.stateManager.state) {
      const explosionImage = new Image();
      explosionImage.src = '/Explosion_001_Tile_8x8_256x256.png';
      explosionImage.onload = () => {
        this.stateManager.state.explosionImage = explosionImage;
      };
    }

    // Load vehicle images
    this.loadVehicleImages();

    // Add start time for death screen stats
    if (this.stateManager.state) {
      this.stateManager.state.startTime = Date.now();
      this.stateManager.state.stats = {
        enemiesKilled: 0,
        vehiclesDestroyed: 0
      };
    }

    // Expose commonly used references for external code (main.js expects these)
    this.debugOverlay = this.debugManager.debugOverlay;
    this.renderer = this.renderingManager.renderer;
    // Make debugOverlay available on state for renderer/debug visuals
    if (this.stateManager.state) this.stateManager.state.debugOverlay = this.debugOverlay;

    // Listen for restart events
    window.addEventListener('game-restart', () => {
      this.restart();
    });
  }

  loadVehicleImages() {
    // Map internal vehicle types to their corresponding image asset names
    const assetMap = {
      'compact': 'vehicle_compact.png',
      'sedan': 'vehicle_sedan.png',
      'truck': 'vehicle_truck.png',
      'sports': 'vehicle_sport.png', // Corrected: maps 'sports' type to 'vehicle_sport.png'
      'emergency': 'vehicle_police.png', // Emergency vehicles use police sprite as default
      'firetruck': 'vehicle_firetruck.png',
      'ambulance': 'vehicle_ambulance.png',
      'police': 'vehicle_police.png'
    };

    // Use a Set to ensure each unique image asset is loaded only once
    const loadedAssetKeys = new Set();

    for (const vehicleTypeName in assetMap) {
      const assetFileName = assetMap[vehicleTypeName];
      // Extract the key name for storage in state.vehicleImages (e.g., 'sport' from 'vehicle_sport.png')
      const assetKey = assetFileName.replace('vehicle_', '').replace('.png', '');
      
      if (loadedAssetKeys.has(assetKey)) {
        continue; // Skip if this asset has already been queued for loading
      }
      loadedAssetKeys.add(assetKey);

      const img = new Image();
      img.src = `/${assetFileName}`; // Construct the full path
      img.onload = () => {
        if (this.stateManager.state) {
          if (!this.stateManager.state.vehicleImages) {
            this.stateManager.state.vehicleImages = {};
          }
          // Store the loaded image under the derived assetKey (e.g., 'sport')
          this.stateManager.state.vehicleImages[assetKey] = img;
        }
      };
    }

    // Load pistol pickup image
    const pistolImg = new Image();
    pistolImg.src = '/pickup_pistol.png';
    pistolImg.onload = () => {
      if (this.stateManager.state) {
        if (!this.stateManager.state.vehicleImages) {
          this.stateManager.state.vehicleImages = {};
        }
        this.stateManager.state.vehicleImages.pistol = pistolImg;
      }
    };
  }

  update(dt) {
    // Skip updates if player is dead
    if (this.deathSystem.isDead) return;

    // Run game systems which may read input.pressed; clear pressed AFTER systems run.
    this.systemManager.update(dt);
    this.spawnManager.update(dt);
    this.deathSystem.update(this.stateManager.state, dt);
    
    // Always update damage text system regardless of player state
    this.damageTextSystem.update(this.stateManager.state, dt);
    
    // Update explosion system
    this.explosionSystem.update(this.stateManager.state, dt);
    
    // Update HUD with scoring info
    this.updateHUD();

    // Now update input manager to perform any end-of-frame housekeeping.
    // Note: InputSystem.update() is intentionally a no-op; we need to clear the
    // one-frame 'pressed' set so presses are only valid for a single update cycle.
    this.inputManager.update();
    if (this.inputManager?.inputSystem?.clearPressed) {
      this.inputManager.inputSystem.clearPressed();
    }

    this.debugManager.update();
    this.hudManager.update();
  }

  render(interp) {
    this.renderingManager.render(this.stateManager.state, interp);
  }

  updateHUD() {
    const state = this.stateManager.getState();
    if (!state || !state.scoringSystem) return;
    
    const wantedLevelEl = document.getElementById('wanted-level');
    const scoreEl = document.getElementById('score');
    
    if (wantedLevelEl) {
      wantedLevelEl.textContent = state.scoringSystem.getWantedLevel();
    }
    
    if (scoreEl) {
      scoreEl.textContent = state.scoringSystem.getScore();
    }
  }

  restart() {
    // Reinitialize everything
    this.stateManager.initialize();
    this.stateManager.state.canvas = this.renderingManager.renderer.canvas;
    this.stateManager.state.startTime = Date.now();
    this.stateManager.state.stats = {
      enemiesKilled: 0,
      vehiclesDestroyed: 0
    };
    this.stateManager.state.debugOverlay = this.debugOverlay;
    this.stateManager.state.scoringSystem = this.scoringSystem;
    this.stateManager.inputManager = this.inputManager;
    
    // Reset scoring system
    this.scoringSystem.reset();
    
    // Reset HUD elements
    this.resetHUD();
    
    // Reload vehicle images
    this.loadVehicleImages();
  }

  resetHUD() {
    // Reset weapon UI
    const ammoContainer = document.getElementById('ammo-container');
    if (ammoContainer) {
      ammoContainer.remove();
    }
    
    // Reset item display
    const itemNameEl = document.getElementById('item-name');
    if (itemNameEl) {
      itemNameEl.textContent = 'None';
    }
    
    // Reset vehicle state
    const vehicleStateEl = document.getElementById('vehicle-state');
    if (vehicleStateEl) {
      vehicleStateEl.textContent = 'on foot';
    }
    
    // Reset score display
    const scoreEl = document.getElementById('score');
    if (scoreEl) {
      scoreEl.textContent = '0';
    }
    
    // Reset wanted level
    const wantedEl = document.getElementById('wanted-level');
    if (wantedEl) {
      wantedEl.textContent = '0';
    }
  }
}