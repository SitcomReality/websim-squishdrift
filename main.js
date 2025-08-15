// ...existing code...
import { Game } from './src/app/Game.js';
import { createLoop } from './src/app/loop.js';

// Game elements
const canvas = document.getElementById('game');
const debugEl = document.getElementById('debug');
const toggleBtn = document.getElementById('toggle-debug');

const game = new Game(canvas, { debugEl });
const loop = createLoop({
  update: (dt) => game.update(dt),
  render: (interp) => game.render(interp),
});

toggleBtn.addEventListener('click', () => {
  const on = debugEl.hasAttribute('hidden');
  debugEl.toggleAttribute('hidden', !on ? false : true);
  toggleBtn.setAttribute('aria-pressed', String(!on));
  game.debugOverlay.enabled = !on;
});

window.addEventListener('resize', () => game.renderer.resizeToDisplay());
game.renderer.resizeToDisplay();
loop.start();