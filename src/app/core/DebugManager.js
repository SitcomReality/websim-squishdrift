import { DebugOverlaySystem } from '../DebugOverlaySystem.js';

export class DebugManager {
  constructor(debugEl, stateManager) {
    this.debugOverlay = new DebugOverlaySystem(debugEl);
    this.stateManager = stateManager;
  }

  update() {
    const state = this.stateManager.getState();
    this.debugOverlay.update(state);
  }
}

