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
  const next = !game.debugOverlay.enabled;
  game.debugOverlay.enabled = next;
  debugEl.toggleAttribute('hidden', !next);
  toggleBtn.setAttribute('aria-pressed', String(next));
  console.log('Debug overlay enabled:', next);
});

// Add click handling for debug spawning
canvas.addEventListener('click', (e) => {
  if (!game.debugOverlay.enabled) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Convert screen coordinates to world coordinates
  const ts = game.state.world.tileSize;
  const cx = Math.floor(canvas.width / 2);
  const cy = Math.floor(canvas.height / 2);
  const worldX = (x - cx) / ts + game.state.camera.x;
  const worldY = (y - cy) / ts + game.state.camera.y;
  
  const tileX = Math.floor(worldX);
  const tileY = Math.floor(worldY);
  
  if (tileX < 0 || tileY < 0 || tileX >= game.state.world.map.width || tileY >= game.state.world.map.height) {
    return;
  }
  
  const tile = game.state.world.map.tiles[tileY][tileX];
  
  // Check tile type and spawn appropriate entity
  if (tile === 7) { // Footpath - spawn pedestrian
    const pedNodes = game.state.world.map.peds?.list || [];
    if (pedNodes.length > 0) {
      const nearestNode = pedNodes.reduce((nearest, node) => {
        const dist = Math.hypot(node.x - worldX, node.y - worldY);
        const nearestDist = Math.hypot(nearest.x - worldX, nearest.y - worldY);
        return dist < nearestDist ? node : nearest;
      });
      
      const next = (nearestNode.neighbors && nearestNode.neighbors.length) 
        ? nearestNode.neighbors[Math.floor(game.state.rand() * nearestNode.neighbors.length)]
        : { x: nearestNode.x, y: nearestNode.y };
      
      game.state.entities.push({
        type: 'npc',
        pos: new Vec2(worldX, worldY),
        from: { x: Math.floor(worldX), y: Math.floor(worldY) },
        to: next,
        t: 0,
        speed: 2 + game.state.rand() * 1.5
      });
    }
  } else if ([1, 2, 3, 4, 6].includes(tile)) { // Road tiles - spawn vehicle
    const roads = game.state.world.map.roads;
    const nearestNode = roads.nodes.reduce((nearest, node) => {
      const dist = Math.hypot(node.x - worldX, node.y - worldY);
      const nearestDist = Math.hypot(nearest.x - worldX, nearest.y - worldY);
      return dist < nearestDist ? node : nearest;
    });
    
    if (nearestNode && nearestNode.next && nearestNode.next.length > 0) {
      const next = nearestNode.next[Math.floor(game.state.rand() * nearestNode.next.length)];
      
      game.state.entities.push({
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
const zoomEl = document.getElementById('zoom-indicator');
function updateZoomUI(){
  if (zoomEl) zoomEl.textContent = `Zoom: ${game.state.camera.zoom?.toFixed(1)}x`;
}
setInterval(updateZoomUI, 200);

window.addEventListener('resize', () => game.renderer && game.renderer.resizeToDisplay());
if (game.renderer) {
  game.renderer.resizeToDisplay();
}
loop.start();