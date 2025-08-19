import { GameStateManager } from './GameStateManager.js';
import { SystemManager } from './SystemManager.js';
import { RenderingManager } from './RenderingManager.js';
import { InputManager } from './InputManager.js';
import { SpawnManager } from './SpawnManager.js';
import { HUDManager } from './HUDManager.js';
import { DebugManager } from './DebugManager.js';
import { DeathSystem } from './systems/DeathSystem.js';

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
    
    this.stateManager.initialize();
    this.hudManager.initialize();

    // Expose input manager to stateManager so systems can read input via stateManager
    this.stateManager.inputManager = this.inputManager;

    // Ensure state knows about the canvas for systems that reference it
    if (this.stateManager.state) this.stateManager.state.canvas = canvas;

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

  update(dt) {
    // Skip updates if player is dead
    if (this.deathSystem.isDead) return;

    // Run game systems which may read input.pressed; clear pressed AFTER systems run.
    this.systemManager.update(dt);
    this.spawnManager.update(dt);
    this.deathSystem.update(this.stateManager.state, dt);

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
    this.stateManager.inputManager = this.inputManager;
    
    // Reset HUD elements
    this.resetHUD();
  }

  resetHUD() {
    // Reset item display
    const itemNameEl = document.getElementById('item-name');
    if (itemNameEl) {
      itemNameEl.textContent = 'None';
    }
    
    // Reset vehicle state display
    const vehicleStateEl = document.getElementById('vehicle-state');
    if (vehicleStateEl) {
      vehicleStateEl.textContent = 'on foot';
    }
    
    // Remove ammo bar if it exists
    const ammoContainer = document.getElementById('ammo-container');
    if (ammoContainer) {
      ammoContainer.remove();
    }
  }
}