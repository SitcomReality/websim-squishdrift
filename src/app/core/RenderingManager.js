import { CanvasRenderer } from '../CanvasRenderer.js';
import { RenderSystem } from './systems/RenderSystem.js';

export class RenderingManager {
  constructor(canvas) {
    this.renderer = new CanvasRenderer(canvas);
    this.renderSystem = new RenderSystem();
  }

  render(state, interp) {
    this.renderer.beginFrame(state);
    this.renderSystem.render(state, this.renderer, state.debugManager?.debugOverlay);
    this.renderer.endFrame();
  }
}

