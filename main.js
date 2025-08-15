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
  const next = !game.debugOverlay.enabled;
  game.debugOverlay.enabled = next;
  debugEl.toggleAttribute('hidden', !next);
  toggleBtn.setAttribute('aria-pressed', String(next));
  console.log('Debug overlay enabled:', next);
});

window.addEventListener('resize', () => game.renderer && game.renderer.resizeToDisplay());
if (game.renderer) {
  game.renderer.resizeToDisplay();
}
loop.start();