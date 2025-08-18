import { GameEngine } from './src/app/core/GameEngine.js';
import { createLoop } from './src/app/loop.js';
import { Vec2 } from './src/utils/Vec2.js';

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
  const next = !game.debugOverlay?.enabled;
  if (game.debugOverlay) {
    game.debugOverlay.enabled = next;
  }
  if (debugEl) {
    debugEl.toggleAttribute('hidden', !next);
  }
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-pressed', String(next));
  }
  console.log('Debug overlay enabled:', next);
});

// Add click handling for debug spawning
canvas.addEventListener('click', (e) => {
  if (!game.debugOverlay?.enabled) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Convert screen coordinates to world coordinates
  const ts = game.stateManager?.getState?.()?.world?.tileSize || 24;
  const cx = Math.floor(canvas.width / 2);
  const cy = Math.floor(canvas.height / 2);
  const state = game.stateManager?.getState?.();
  
  if (!state) return;
  
  const worldX = (x - cx) / ts + state.camera.x;
  const worldY = (y - cy) / ts + state.camera.y;
  
  const tileX = Math.floor(worldX);
  const tileY = Math.floor(worldY);
  
  if (tileX < 0 || tileY < 0 || tileX >= state.world.map.width || tileY >= state.world.map.height) {
    return;
  }
  
  const tile = state.world.map.tiles[tileY][tileX];
  
  // Check tile type and spawn appropriate entity
  if (tile === 7) { // Footpath - spawn pedestrian
    const pedNodes = state.world.map.peds?.list || [];
    if (pedNodes.length > 0) {
      const nearestNode = pedNodes.reduce((nearest, node) => {
        const dist = Math.hypot(node.x - worldX, node.y - worldY);
        const nearestDist = Math.hypot(nearest.x - worldX, nearest.y - worldY);
        return dist < nearestDist ? node : nearest;
      });
      
      const next = (nearestNode.neighbors && nearestNode.neighbors.length) 
        ? nearestNode.neighbors[Math.floor(state.rand() * nearestNode.neighbors.length)]
        : { x: nearestNode.x, y: nearestNode.y };
      
      state.entities.push({
        type: 'npc',
        pos: new Vec2(worldX, worldY),
        from: { x: Math.floor(worldX), y: Math.floor(worldY) },
        to: next,
        t: 0,
        speed: 2 + state.rand() * 1.5
      });
    }
  } else if ([1, 2, 3, 4, 6].includes(tile)) { // Road tiles - spawn vehicle
    const roads = state.world.map.roads;
    const nearestNode = roads.nodes.reduce((nearest, node) => {
      const dist = Math.hypot(node.x - worldX, node.y - worldY);
      const nearestDist = Math.hypot(nearest.x - worldX, nearest.y - worldY);
      return dist < nearestDist ? node : nearest;
    });
    
    if (nearestNode && nearestNode.next && nearestNode.next.length > 0) {
      const next = nearestNode.next[Math.floor(state.rand() * nearestNode.next.length)];
      
      state.entities.push({
        type: 'vehicle',
        pos: new Vec2(worldX, worldY),
        node: nearestNode,
        next,
        t: 0,
        speed: 6,
        rot: 0,
        vel: { x: 0, y: 0 },
        angularVel: 0,
        ctrl: { throttle: 0, brake: 0, steer: 0 },
        mass: 1200, maxSpeed: 4, engineForce: 900, brakeForce: 1600,
        rollingRes: 1.0, drag: 0.25, grip: 6.0, steerRate: 2.5
      });
    }
  }
});

// Show zoom indicator (optional unobtrusive)
function updateZoomUI(){
  const zoomEl = document.getElementById('zoom-indicator');
  if (!zoomEl || !game.stateManager) return;
  
  const state = game.stateManager.getState?.();
  if (state?.camera) {
    zoomEl.textContent = `Zoom: ${(state.camera.zoom || 1).toFixed(1)}x`;
  }
}

setInterval(updateZoomUI, 200);

window.addEventListener('resize', () => {
  if (game.renderer && game.renderer.resizeToDisplay) {
    game.renderer.resizeToDisplay();
  }
});

if (game.renderer && game.renderer.resizeToDisplay) {
  game.renderer.resizeToDisplay();
}

loop.start();