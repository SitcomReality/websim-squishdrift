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
  }
  
  update(dt) {
    this.input.update();
    const s = this.state;
    const player = s.entities.find(e => e.type === 'player');
    let dx = 0, dy = 0;
    
    // Handle enter/exit vehicle
    if (this.input.keys.has('KeyE') && !this.input.ePressed) {
      this.handleVehicleInteraction(s, player);
      this.input.ePressed = true;
    } else if (!this.input.keys.has('KeyE')) {
      this.input.ePressed = false;
    }
    
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
    
    const cam = s.camera, p = player.pos;
    cam.x += (p.x - cam.x) * Math.min(1, dt * 6);
    cam.y += (p.y - cam.y) * Math.min(1, dt * 6);
    const ts = s.world.tileSize, map = s.world.map;
    const halfX = (this.renderer.canvas.width / ts) / 2;
    const halfY = (this.renderer.canvas.height / ts) / 2;
    if (map.width <= 2 * halfX) cam.x = map.width / 2;
    else cam.x = Math.min(Math.max(cam.x, halfX), map.width - halfX);
    if (map.height <= 2 * halfY) cam.y = map.height / 2;
    else cam.y = Math.min(Math.max(cam.y, halfY), map.height - halfY);
    
    // Update vehicle movement only for controlled vehicle
    const controlledVehicle = s.entities.find(e => e.type === 'vehicle' && e.controlled);
    if (controlledVehicle) {
      this.updateVehicleControl(controlledVehicle, dt);
    } else {
      // Update AI vehicles
      for (const veh of s.entities.filter(e => e.type === 'vehicle' && !e.controlled)) {
        veh.t += (veh.speed * dt);
        while (veh.t >= 1 && veh.node) {
          veh.node = veh.next;
          const choices = veh.node.next;
          veh.next = choices && choices.length ? choices[(Math.floor(s.rand()*choices.length))] : veh.node;
          veh.t -= 1;
        }
      }
    }
    
    this.debugOverlay.update({
      fps: this.renderer.fps, dt: dt,
      player: { x: player.pos.x.toFixed(2), y: player.pos.y.toFixed(2) },
      camera: { x: cam.x.toFixed(2), y: cam.y.toFixed(2) },
      roads: {
        nodes: s.world.map.roads.nodes.length,
        links: s.world.map.roads.nodes.reduce((a,n)=>a+n.next.length,0)
      },
      vehicle: controlledVehicle ? { at: [controlledVehicle.node.x, controlledVehicle.node.y], speed: controlledVehicle.speed } : null
    });
  }

  handleVehicleInteraction(state, player) {
    const vehicle = state.entities.find(e => 
      e.type === 'vehicle' && 
      !e.controlled && 
      Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) < 2
    );
    
    if (vehicle) {
      // Enter vehicle
      player.inVehicle = vehicle;
      vehicle.controlled = true;
      vehicle.player = player;
      player.visible = false;
      document.getElementById('vehicle-state').textContent = 'In vehicle';
    } else if (player.inVehicle) {
      // Exit vehicle
      const v = player.inVehicle;
      v.controlled = false;
      v.player = null;
      player.pos.x = v.pos.x;
      player.pos.y = v.pos.y + 1;
      player.visible = true;
      player.inVehicle = null;
      document.getElementById('vehicle-state').textContent = 'On foot';
    }
  }

  updateVehicleControl(vehicle, dt) {
    const s = this.state;
    let dx = 0, dy = 0;
    
    if (this.input.keys.has('KeyW') || this.input.keys.has('ArrowUp')) dy -= 1;
    if (this.input.keys.has('KeyS') || this.input.keys.has('ArrowDown')) dy += 1;
    if (this.input.keys.has('KeyA') || this.input.keys.has('ArrowLeft')) dx -= 1;
    if (this.input.keys.has('KeyD') || this.input.keys.has('ArrowRight')) dx += 1;
    
    if (dx || dy) {
      const inv = 1 / Math.hypot(dx, dy);
      dx *= inv * vehicle.speed * dt;
      dy *= inv * vehicle.speed * dt;
      
      const newX = vehicle.pos.x + dx;
      const newY = vehicle.pos.y + dy;
      
      // Check if new position is on road
      const tx = Math.floor(newX + 0.5);
      const ty = Math.floor(newY + 0.5);
      const map = s.world.map;
      
      if (tx >= 0 && ty >= 0 && tx < map.width && ty < map.height) {
        const tile = map.tiles[ty][tx];
        if (tile >= 1 && tile <= 4) { // Road tiles
          vehicle.pos.x = newX;
          vehicle.pos.y = newY;
        }
      }
    }
  }
  
  render() {
    const s = this.state;
    this.renderer.beginFrame(s);
    drawTiles(this.renderer, s, 'ground');
    drawTiles(this.renderer, s, 'floors');
    
    const visibleEntities = s.entities.filter(e => e.visible !== false);
    const sorted = visibleEntities.slice().sort((a, b) => a.pos.y - b.pos.y);
    
    for (const e of sorted) {
      if (e.type === 'player') drawPlayer(this.renderer, s, e);
      else if (e.type === 'vehicle') drawVehicle(this.renderer, s, e);
    }
    drawBuildings(this.renderer, s);
    if (this.debugOverlay.enabled) drawRoadDebug(this.renderer, s);
    this.renderer.endFrame();
  }
}