import { GameEngine } from './core/GameEngine.js';
import { createInitialState } from './state/createInitialState.js';

export class Game {
  constructor(canvas) {
    this.engine = new GameEngine(canvas);
  }
  
  update(dt) { this.engine.update(dt); }
  render(interp) { this.engine.render(interp); }
}

