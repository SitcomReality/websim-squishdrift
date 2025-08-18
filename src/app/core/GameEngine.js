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
  }

  update(dt) {
    this.inputManager.update();
    this.systemManager.update(dt);
    this.spawnManager.update(dt);
    this.debugManager.update();
    this.hudManager.update();
  }

  render(interp) {
    this.renderingManager.render(this.stateManager.state, interp);
  }
}

