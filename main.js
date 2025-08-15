import { GameEngine } from './src/app/core/GameEngine.js';
import { createLoop } from './src/app/loop.js';

// Game elements
const canvas = document.getElementById('game');
const debugEl = document.getElementById('debug');
const toggleBtn = document.getElementById('toggle-debug');

const game = new GameEngine(canvas, { debugEl });
const loop = createLoop({
  update: (dt) => game.update(dt),
  render: (interp) => game.render(interp),
});

toggleBtn.addEventListener('click', () => {
  console.log('Debug button clicked');
  const on = debugEl.hasAttribute('hidden');
  debugEl.toggleAttribute('hidden', !on ? false : true);
  toggleBtn.setAttribute('aria-pressed', String(!on));
  if (game.debugOverlay) {
    game.debugOverlay.enabled = !on;
  }
});

window.addEventListener('resize', () => game.renderer && game.renderer.resizeToDisplay());
if (game.renderer) {
  game.renderer.resizeToDisplay();
}
loop.start();