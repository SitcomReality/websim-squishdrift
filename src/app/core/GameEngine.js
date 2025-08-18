import { GameStateManager } from './GameStateManager.js';
import { SystemManager } from './SystemManager.js';
import { RenderingManager } from './RenderingManager.js';
import { InputManager } from './InputManager.js';
import { SpawnManager } from './SpawnManager.js';
import { HUDManager } from './HUDManager.js';
import { DebugManager } from './DebugManager.js';

export class GameEngine {
  constructor(canvas, { debugEl } = {}) {
    this.stateManager = new GameStateManager();
    this.systemManager = new SystemManager(this.stateManager);
    this.renderingManager = new RenderingManager(canvas);
    this.inputManager = new InputManager(canvas);
    this.spawnManager = new SpawnManager(this.stateManager);
    this.hudManager = new HUDManager();
    this.debugManager = new DebugManager(debugEl, this.stateManager);
    
    this.stateManager.initialize();
    this.hudManager.initialize();

    // Expose input manager to stateManager so systems can read input via stateManager
    this.stateManager.inputManager = this.inputManager;

    // Ensure state knows about the canvas for systems that reference it
    if (this.stateManager.state) this.stateManager.state.canvas = canvas;

    // Expose commonly used references for external code (main.js expects these)
    this.debugOverlay = this.debugManager.debugOverlay;
    this.renderer = this.renderingManager.renderer;
    // Make debugOverlay available on state for renderer/debug visuals
    if (this.stateManager.state) this.stateManager.state.debugOverlay = this.debugOverlay;
  }

  update(dt) {
    // Run game systems which may read input.pressed; clear pressed AFTER systems run.
    this.systemManager.update(dt);
    this.spawnManager.update(dt);

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
}