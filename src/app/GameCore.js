import { CanvasRenderer } from './CanvasRenderer.js';
import { InputSystem } from './InputSystem.js';
import { DebugOverlaySystem } from './DebugOverlaySystem.js';
import { createInitialState } from './state/createInitialState.js';
import { drawTiles } from '../render/drawTiles.js';
import { drawBuildings } from '../render/drawBuildings.js';
import { drawRoadDebug } from '../render/drawRoadDebug.js';
import { drawPlayer } from './entities/drawPlayer.js';
import { drawVehicle } from './entities/drawVehicle.js';
import { drawNPC } from './entities/drawNPC.js';
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
          s.control.inVehicle = true; s.control.vehicle = veh; player.hidden = true;
          veh.controlled = true; // init physics params
          const dir = (veh.next?.dir || veh.node?.dir || 'E');
          veh.rot = dir==='N'?-Math.PI/2:dir==='E'?0:dir==='S'?Math.PI/2:Math.PI;
          veh.speed = veh.speed || 0; veh.accel = 10; veh.maxSpeed = 12; veh.drag = 2.5; veh.turnRate = 2.4;
          veh.pos.x = (veh.node?.x ?? veh.pos.x) + 0.5; veh.pos.y = (veh.node?.y ?? veh.pos.y) + 0.5;
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
            v.controlled = false;
            // snap vehicle back to nearest road node and resume AI
            const map = s.world.map; let best = null;
            for (const n of map.roads.nodes) {
              const dx = n.x + 0.5 - v.pos.x, dy = n.y + 0.5 - v.pos.y, d2 = dx*dx+dy*dy;
              if (!best || d2 < best.d2) best = { n, d2 };
            }
            if (best) { v.node = best.n; v.next = v.node.next[0] || v.node; v.t = 0; }
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
    } else {
      // Player driving physics
      const v = s.control.vehicle;
      const throttle = (this.input.keys.has('KeyW') || this.input.keys.has('ArrowUp') ? 1 : 0) +
                       (this.input.keys.has('KeyS') || this.input.keys.has('ArrowDown') ? -1 : 0);
      const steer = (this.input.keys.has('KeyA') || this.input.keys.has('ArrowLeft') ? -1 : 0) +
                    (this.input.keys.has('KeyD') || this.input.keys.has('ArrowRight') ? 1 : 0);
      const brake = this.input.keys.has('Space') ? 1 : 0;

      // Longitudinal
      v.speed += throttle * v.accel * dt;
      const drag = v.drag + (brake ? 8 : 0);
      const sign = Math.sign(v.speed); v.speed -= sign * drag * dt; if (Math.sign(v.speed) !== sign) v.speed = 0;
      v.speed = Math.max(-v.maxSpeed*0.4, Math.min(v.maxSpeed, v.speed));

      // Yaw (scale by speed factor)
      const speedFactor = Math.min(1, Math.abs(v.speed) / v.maxSpeed);
      v.rot += steer * v.turnRate * (speedFactor || 0) * dt * (v.speed>=0 ? 1 : -1);

      // Integrate position in tile units
      v.pos.x += Math.cos(v.rot) * v.speed * dt;
      v.pos.y += Math.sin(v.rot) * v.speed * dt;
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
      if (veh.controlled) continue;
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
    // NPC pedestrian movement
    for (const ped of s.entities.filter(e=>e.type==='npc')) {
      ped.t += ped.speed * dt * (1/1); // 1 tile per unit time scaled by speed
      if (ped.t >= 1) {
        ped.from = { x: ped.to.x, y: ped.to.y };
        const key = `${ped.from.x},${ped.from.y}`;
        const node = s.world.map.peds.nodes.get(key);
        const options = (node?.neighbors||[]).filter(n=> !(n.x===ped.from.x && n.y===ped.from.y && n.x===ped.to.x && n.y===ped.to.y));
        const notBack = options.filter(n=> !(n.x===ped.to.x && n.y===ped.to.y));
        const pool = (notBack.length?notBack:options.length?options:[{x:ped.from.x,y:ped.from.y}]);
        ped.to = pool[Math.floor(s.rand()*pool.length)];
        ped.t = 0;
      }
      const ax = ped.from.x + 0.5, ay = ped.from.y + 0.5;
      const bx = ped.to.x + 0.5, by = ped.to.y + 0.5;
      ped.pos.x = ax*(1-ped.t) + bx*ped.t; ped.pos.y = ay*(1-ped.t) + by*ped.t;
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
      vehicle: vehicle ? { at: vehicle.node ? [vehicle.node.x, vehicle.node.y] : [vehicle.pos.x, vehicle.pos.y], speed: Number((vehicle.speed||0).toFixed(2)) } : null,
      npcs: this.state.entities.filter(e=>e.type==='npc').length,
      control: { inVehicle: s.control.inVehicle }
    });
    if (this.hud.vehicleStateEl) {
      this.hud.vehicleStateEl.textContent = s.control.inVehicle ? `In vehicle — ${Math.abs(s.control.vehicle.speed).toFixed(1)} u/s` : 'On foot';
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
      else if (e.type === 'npc') drawNPC(this.renderer, s, e);
      else if (e.type === 'vehicle') drawVehicle(this.renderer, s, e);
    }
    drawBuildings(this.renderer, s);
    if (this.debugOverlay.enabled) drawRoadDebug(this.renderer, s);
    this.renderer.endFrame();
  }
}