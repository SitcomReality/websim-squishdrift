import { GameEngine } from './core/GameEngine.js';
import { createInitialState } from './state/createInitialState.js';

export class Game {
  constructor(canvas, { debugEl } = {}) {
    this.engine = new GameEngine(canvas, debugEl);
  }
  
  update(dt) { this.engine.update(dt); }
  render(interp) { this.engine.render(interp); }
}

