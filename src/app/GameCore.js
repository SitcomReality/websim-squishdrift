import { CanvasRenderer } from './CanvasRenderer.js';
import { InputSystem } from './InputSystem.js';
import { DebugOverlaySystem } from './DebugOverlaySystem.js';
import { createInitialState } from './state/createInitialState.js';
import { drawTiles } from '../render/drawTiles.js';
import { drawBuildings } from '../render/drawBuildings.js';
import { drawRoadDebug } from '../render/drawRoadDebug.js';
import { drawPlayer } from './entities/drawPlayer.js';
import { drawVehicle } from './entities/drawVehicle.js';
import { isWalkable } from '../map/TileTypes.js';

export class Game {
  constructor(canvas, { debugEl } = {}) {
    this.renderer = new CanvasRenderer(canvas);
    this.input = new InputSystem(canvas);
    this.debugOverlay = new DebugOverlaySystem(debugEl);
    this.state = createInitialState();
    this.state.control = { inVehicle: false, vehicle: null };
    this.hud = { vehicleStateEl: document.getElementById('vehicle-state') };
  }
  update(dt) {
    this.input.update();
    const s = this.state;
    const player = s.entities.find(e => e.type === 'player');
    
    // Enter/Exit vehicle (E)
    if (this.input.pressed.has('KeyE')) {
      if (!s.control.inVehicle) {
        const veh = s.entities.find(e => e.type === 'vehicle' && Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) < 1.25);
        if (veh) { 
          s.control.inVehicle = true; 
          s.control.vehicle = veh; 
          player.hidden = true; 
        }
      } else {
        const v = s.control.vehicle;
        const offsets = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
        const map = s.world.map;
        for (const [ox,oy] of offsets) {
          const tx = Math.floor(v.pos.x + ox), ty = Math.floor(v.pos.y + oy);
          if (tx >= 0 && ty >= 0 && tx < map.width && ty < map.height && isWalkable(map.tiles[ty][tx])) {
            player.pos.x = tx + 0.5; 
            player.pos.y = ty + 0.5; 
            player.hidden = false;
            s.control.inVehicle = false; 
            s.control.vehicle = null; 
            break;
          }
        }
      }
    }
    
    if (!s.control.inVehicle) {
      let dx = 0, dy = 0;
      if (this.input.keys.has('KeyW') || this.input.keys.has('ArrowUp')) dy -= 1;
      if (this.input.keys.has('KeyS') || this.input.keys.has('ArrowDown')) dy += 1;
      if (this.input.keys.has('KeyA') || this.input.keys.has('ArrowLeft')) dx -= 1;
      if (this.input.keys.has('KeyD') || this.input.keys.has('ArrowRight')) dx += 1;
      if (dx || dy) {
        const inv = 1 / Math.hypot(dx, dy); dx *= inv; dy *= inv;
        const p = player.pos, map = s.world.map;
        const tryMove = (nx, ny) => {
          const tx = Math.floor(nx + 0.5), ty = Math.floor(ny + 0.5);
          if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;
          return isWalkable(map.tiles[ty][tx]);
        };
        const nx = p.x + dx * player.moveSpeed * dt; if (tryMove(nx, p.y)) p.x = nx;
        const ny = p.y + dy * player.moveSpeed * dt; if (tryMove(p.x, ny)) p.y = ny;
        player.facing.x = dx; player.facing.y = dy;
      }
    }
    
    const cam = s.camera, target = s.control.inVehicle ? s.control.vehicle.pos : player.pos;
    cam.x += (target.x - cam.x) * Math.min(1, dt * 6);
    cam.y += (target.y - cam.y) * Math.min(1, dt * 6);
    const ts = s.world.tileSize, map = s.world.map;
    const halfX = (this.renderer.canvas.width / ts) / 2;
    const halfY = (this.renderer.canvas.height / ts) / 2;
    if (map.width <= 2 * halfX) cam.x = map.width / 2;
    else cam.x = Math.min(Math.max(cam.x, halfX), map.width - halfX);
    if (map.height <= 2 * halfY) cam.y = map.height / 2;
    else cam.y = Math.min(Math.max(cam.y, halfY), map.height - halfY);
    for (const veh of s.entities.filter(e => e.type === 'vehicle')) {
      if (veh.next) {
        veh.t += (veh.speed * dt);
        while (veh.t >= 1 && veh.node) {
          veh.node = veh.next;
          const choices = veh.node.next;
          veh.next = choices && choices.length ? choices[(Math.floor(s.rand()*choices.length))] : veh.node;
          veh.t -= 1;
        }
      }
    }
    const vehicle = s.entities.find(e => e.type === 'vehicle');
    this.debugOverlay.update({
      fps: this.renderer.fps, dt: dt,
      player: { x: player.pos.x.toFixed(2), y: player.pos.y.toFixed(2) },
      camera: { x: cam.x.toFixed(2), y: cam.y.toFixed(2) },
      roads: {
        nodes: s.world.map.roads.nodes.length,
        links: s.world.map.roads.nodes.reduce((a,n)=>a+n.next.length,0)
      },
      vehicle: vehicle ? { at: [vehicle.node.x, vehicle.node.y], speed: vehicle.speed } : null,
      control: { inVehicle: s.control.inVehicle }
    });
    if (this.hud.vehicleStateEl) {
      this.hud.vehicleStateEl.textContent = s.control.inVehicle ? 'In vehicle' : 'On foot';
    }
  }
  render() {
    const s = this.state;
    this.renderer.beginFrame(s);
    drawTiles(this.renderer, s, 'ground');
    drawTiles(this.renderer, s, 'floors');
    const sorted = s.entities.slice().sort((a, b) => a.pos.y - b.pos.y);
    for (const e of sorted) {
      if (e.type === 'player') drawPlayer(this.renderer, s, e);
      else if (e.type === 'vehicle') drawVehicle(this.renderer, s, e);
    }
    drawBuildings(this.renderer, s);
    if (this.debugOverlay.enabled) drawRoadDebug(this.renderer, s);
    this.renderer.endFrame();
  }
}