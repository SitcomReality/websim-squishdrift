import { generateCity } from '../map/MapGen.js';
import { Tile, TileColor, isRoad, roadDir } from '../map/TileTypes.js';
import { isWalkable } from '../map/TileTypes.js';
import { rng } from '../utils/RNG.js';

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

    // Movement (WASD), normalized diagonals
    let dx = 0, dy = 0;
    if (this.input.keys.has('KeyW') || this.input.keys.has('ArrowUp')) dy -= 1;
    if (this.input.keys.has('KeyS') || this.input.keys.has('ArrowDown')) dy += 1;
    if (this.input.keys.has('KeyA') || this.input.keys.has('ArrowLeft')) dx -= 1;
    if (this.input.keys.has('KeyD') || this.input.keys.has('ArrowRight')) dx += 1;
    if (dx || dy) {
      const inv = 1 / Math.hypot(dx, dy);
      dx *= inv; dy *= inv;
      const p = player.pos, map = s.world.map;
      const tryMove = (nx, ny) => {
        const tx = Math.floor(nx + 0.5), ty = Math.floor(ny + 0.5);
        if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;
        return isWalkable(map.tiles[ty][tx]);
      };
      // separate-axis collision against non-walkable tiles
      const nx = p.x + dx * player.moveSpeed * dt;
      if (tryMove(nx, p.y)) p.x = nx;
      const ny = p.y + dy * player.moveSpeed * dt;
      if (tryMove(p.x, ny)) p.y = ny;
      player.facing.x = dx; player.facing.y = dy;
    }

    // Camera follow (smooth)
    const cam = s.camera, p = player.pos;
    cam.x += (p.x - cam.x) * Math.min(1, dt * 6);
    cam.y += (p.y - cam.y) * Math.min(1, dt * 6);
    // Clamp camera to map bounds
    const ts = s.world.tileSize, map = s.world.map;
    const halfX = (this.renderer.canvas.width / ts) / 2;
    const halfY = (this.renderer.canvas.height / ts) / 2;
    if (map.width <= 2 * halfX) cam.x = map.width / 2;
    else cam.x = Math.min(Math.max(cam.x, halfX), map.width - halfX);
    if (map.height <= 2 * halfY) cam.y = map.height / 2;
    else cam.y = Math.min(Math.max(cam.y, halfY), map.height - halfY);

    // Vehicle follow-lane update
    for (const veh of s.entities.filter(e => e.type === 'vehicle')) {
      if (veh.next) {
        veh.t += (veh.speed * dt) / 1; // 1 tile per segment
        while (veh.t >= 1 && veh.node) {
          veh.node = veh.next;
          const choices = veh.node.next;
          veh.next = choices && choices.length ? choices[(Math.floor(s.rand()*choices.length))] : veh.node;
          veh.t -= 1;
        }
      }
    }

    // Debug
    const vehicle = s.entities.find(e => e.type === 'vehicle');
    this.debugOverlay.update({
      fps: this.renderer.fps, dt: dt,
      player: { x: player.pos.x.toFixed(2), y: player.pos.y.toFixed(2) },
      camera: { x: cam.x.toFixed(2), y: cam.y.toFixed(2) },
      roads: {
        nodes: s.world.map.roads.nodes.length,
        links: s.world.map.roads.nodes.reduce((a,n)=>a+n.next.length,0)
      },
      vehicle: vehicle ? { at: [vehicle.node.x, vehicle.node.y], speed: vehicle.speed } : null
    });
  }
  render(interp) {
    this.renderer.beginFrame(this.state);
    
    // Painter's algorithm rendering order from DESIGN.md
    
    // 1. Ground tiles (grass, parks, roads, footpaths)
    drawTiles(this.renderer, this.state, 'ground');
    
    // 2. Building floors
    drawTiles(this.renderer, this.state, 'floors');

    // 3. Sorted entities (items, peds, vehicles)
    const sortedEntities = this.state.entities.slice().sort((a, b) => a.pos.y - b.pos.y);
    for (const entity of sortedEntities) {
      if (entity.type === 'player') {
        drawPlayer(this.renderer, this.state, entity);
      } else if (entity.type === 'vehicle') {
        drawVehicle(this.renderer, this.state, entity);
      }
    }
    
    // 4. Building walls and roofs (2.5D projection)
    drawBuildings(this.renderer, this.state);

    if (this.debugOverlay.enabled) drawRoadDebug(this.renderer, this.state);
    this.renderer.endFrame();
  }
}

/* minimal modules inlined to keep foundation small */
class Vec2 { constructor(x=0,y=0){this.x=x;this.y=y;} copy(v){this.x=v.x;this.y=v.y;return this;} }

function createInitialState() {
  const map = generateCity('alpha-seed', 4, 4);
  const rand = rng('alpha-seed');
  
  const player = {
    type: 'player',
    pos: new Vec2(),
    facing: new Vec2(1, 0),
    moveSpeed: 6
  };
  
  const state = {
    time: 0,
    entities: [player],
    camera: { x: map.width/2, y: map.height/2 },
    world: { tileSize: 24, map },
    rand
  };
  
  // Find a valid spawn position on footpath or grass
  let spawnX = map.width / 2, spawnY = map.height / 2;
  let bestDist = Infinity;
  
  // Search for nearest footpath or grass to center
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x];
      if (isWalkable(tile)) {
        const dist = Math.abs(x - map.width/2) + Math.abs(y - map.height/2);
        if (dist < bestDist) {
          bestDist = dist;
          spawnX = x + 0.5; // Center in tile
          spawnY = y + 0.5;
        }
      }
    }
  }
  
  player.pos.x = spawnX;
  player.pos.y = spawnY;
  state.camera.x = spawnX;
  state.camera.y = spawnY;
  
  // spawn simple vehicle at nearest road node to player
  let best = null, bp = player.pos;
  for (const n of map.roads.nodes) {
    const dx = n.x - bp.x, dy = n.y - bp.y, d2 = dx*dx+dy*dy;
    if (!best || d2 < best.d2) best = { n, d2 };
  }
  if (best) {
    const vehicle = {
      type: 'vehicle',
      pos: new Vec2(best.n.x, best.n.y), // for z-sorting
      node: best.n,
      next: best.n.next[0] || best.n,
      t: 0,
      speed: 6 // tiles/sec
    };
    state.entities.push(vehicle);
  }
  return state;
}

class CanvasRenderer {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.fps = 0; this._acc=0; this._frames=0; this._lastFpsTs=0;
    this.resizeToDisplay();
  }
  resizeToDisplay(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(640, Math.floor(rect.width * dpr));
    const h = Math.max(360, Math.floor(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    this.ctx.imageSmoothingEnabled = false;
  }
  beginFrame(state){
    const { ctx, canvas } = this;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // fps
    const now = performance.now();
    if (!this._lastFpsTs) this._lastFpsTs = now;
    this._acc += now - this._lastFpsTs; this._frames++;
    if (this._acc >= 500) { this.fps = Math.round(this._frames * 1000 / this._acc); this._acc=0; this._frames=0; }
    this._lastFpsTs = now;

    // setup camera transform (center camera)
    const ts = state.world.tileSize;
    const cx = Math.floor(canvas.width/2), cy = Math.floor(canvas.height/2);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(cx, cy);
    ctx.scale(1,1);
    ctx.translate(Math.floor(-state.camera.x*ts), Math.floor(-state.camera.y*ts));
  }
  endFrame(){ /* no-op, reserved */ }
}

class InputSystem {
  constructor(target=window){
    this.keys = new Set();
    target.addEventListener('keydown', (e)=>{ this.keys.add(e.code); });
    target.addEventListener('keyup', (e)=>{ this.keys.delete(e.code); });
    // prevent arrow keys from scrolling page when canvas focused
    if (target instanceof HTMLCanvasElement) {
      target.tabIndex = 0;
      target.addEventListener('keydown', (e)=> {
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      });
    }
  }
  update(){ /* placeholder for future edge-triggered checks */ }
}

class DebugOverlaySystem {
  constructor(el){ this.el = el; this.enabled = false; }
  update(data){
    if (!this.el || !this.enabled) return;
    this.el.textContent = JSON.stringify(data, null, 2);
  }
}

/* drawing helpers */
function drawTiles(r, state, layer = 'all'){
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const wTiles = Math.ceil(canvas.width/ts)+2, hTiles = Math.ceil(canvas.height/ts)+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  
  const floorTypes = new Set([Tile.BuildingFloor]);
  
  for (let y=0; y<hTiles; y++) for (let x=0; x<wTiles; x++){
    const gx = sx + x, gy = sy + y; if (gy<0||gx<0||gy>=map.height||gx>=map.width) continue;
    const t = map.tiles[gy][gx];
    
    if (layer === 'ground' && floorTypes.has(t)) continue;
    if (layer === 'floors' && !floorTypes.has(t)) continue;

    ctx.fillStyle = TileColor[t] || '#f5f5f5';
    ctx.fillRect(gx*ts, gy*ts, ts, ts);
    
    // Add simple building wall shading
    if (t === 9) { // BuildingWall
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(gx*ts, gy*ts + ts*0.7, ts, ts*0.3);
    }
  }
}

function drawPlayer(r, state, player){
  const { ctx } = r;
  const ts = state.world.tileSize;
  const p = player.pos;
  ctx.save();
  ctx.fillStyle = '#FF0000'; // red player
  const size = ts * 0.8;
  ctx.translate(p.x*ts, p.y*ts);
  ctx.fillRect(-size/2, -size/2, size, size);
  // facing indicator
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc((player.facing.x)*ts*0.3, (player.facing.y)*ts*0.3, 3, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawVehicle(r, state, v){
  const { ctx } = r, ts = state.world.tileSize;
  const a = v.t;
  const x = (v.node.x + 0.5) * (1 - a) + (v.next.x + 0.5) * a;
  const y = (v.node.y + 0.5) * (1 - a) + (v.next.y + 0.5) * a;
  v.pos.x = x; v.pos.y = y; // Update position for z-sorting

  const dir = v.next.dir || v.node.dir;
  const ang = dir==='N'?-Math.PI/2:dir==='E'?0:dir==='S'?Math.PI/2:Math.PI;
  ctx.save(); ctx.translate(x*ts, y*ts); ctx.rotate(ang);
  ctx.fillStyle = '#8A2BE2'; // violet vehicles
  ctx.fillRect(-ts*0.45, -ts*0.25, ts*0.9, ts*0.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(ts*0.15, -2, ts*0.2, 4); // heading indicator
  ctx.restore();
}

function drawBuildings(r, state) {
  const { ctx } = r, ts = state.world.tileSize, map = state.world.map;
  const cam = state.camera;
  
  const perspectiveScale = 0.8;
  const vCam = { x: 0, y: -1 }; // North-up screen

  for (const b of map.buildings) {
    const floorRect = {
      x: b.rect.x * ts,
      y: b.rect.y * ts,
      w: b.rect.width * ts,
      h: b.rect.height * ts
    };

    const roofOffset = {
      x: vCam.x * b.height * perspectiveScale,
      y: vCam.y * b.height * perspectiveScale
    };
    
    // Check if camera is inside building footprint
    const isCamInside = (
      cam.x >= b.rect.x && cam.x < b.rect.x + b.rect.width &&
      cam.y >= b.rect.y && cam.y < b.rect.y + b.rect.height
    );

    if (isCamInside) {
      roofOffset.x = 0;
      roofOffset.y = 0;
    }

    const roofRect = {
      x: floorRect.x + roofOffset.x,
      y: floorRect.y + roofOffset.y,
      w: floorRect.w,
      h: floorRect.h
    };
    
    // Wall colors
    const topWallColor = `hsl(${Math.floor(b.color.match(/\d+/)[0])}, 20%, 75%)`;
    const sideWallColor = `hsl(${Math.floor(b.color.match(/\d+/)[0])}, 20%, 65%)`;

    // Draw walls
    ctx.fillStyle = sideWallColor; // West Wall
    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y);
    ctx.lineTo(roofRect.x, roofRect.y);
    ctx.lineTo(roofRect.x, roofRect.y + roofRect.h);
    ctx.lineTo(floorRect.x, floorRect.y + floorRect.h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = sideWallColor; // East Wall
    ctx.beginPath();
    ctx.moveTo(floorRect.x + floorRect.w, floorRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y + roofRect.h);
    ctx.lineTo(floorRect.x + floorRect.w, floorRect.y + floorRect.h);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = topWallColor; // North Wall
    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y);
    ctx.lineTo(roofRect.x, roofRect.y);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y);
    ctx.lineTo(floorRect.x + floorRect.w, floorRect.y);
    ctx.closePath();
    ctx.fill();
    
    // South Wall (usually occluded, draw for completeness if camera moves)
    ctx.beginPath();
    ctx.moveTo(floorRect.x, floorRect.y + floorRect.h);
    ctx.lineTo(roofRect.x, roofRect.y + roofRect.h);
    ctx.lineTo(roofRect.x + roofRect.w, roofRect.y + roofRect.h);
    ctx.lineTo(floorRect.x + floorRect.w, floorRect.y + floorRect.h);
    ctx.closePath();
    ctx.fill();

    // Draw roof
    ctx.fillStyle = b.color;
    ctx.fillRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(roofRect.x, roofRect.y, roofRect.w, roofRect.h);
  }
}

function drawRoadDebug(r, state){
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const wTiles = Math.ceil(canvas.width/ts)+2, hTiles = Math.ceil(canvas.height/ts)+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#111'; ctx.fillStyle = '#111';
  for (let y=0; y<hTiles; y++) for (let x=0; x<wTiles; x++){
    const gx = sx + x, gy = sy + y; if (gy<0||gx<0||gy>=map.height||gx>=map.width) continue;
    const t = map.tiles[gy][gx]; const d = roadDir(t);
    if (d){ drawDirArrow(ctx, gx*ts+ts/2, gy*ts+ts/2, d, ts*0.28); }
  }
  ctx.restore();
}

function drawDirArrow(ctx, cx, cy, dir, len){
  const ang = dir==='N'? -Math.PI/2 : dir==='E'? 0 : dir==='S'? Math.PI/2 : Math.PI;
  const tx = cx + Math.cos(ang)*len, ty = cy + Math.sin(ang)*len;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
  const ah = 6, aw = 4, a1 = ang + 2.6, a2 = ang - 2.6;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + Math.cos(a1)*ah, ty + Math.sin(a1)*ah);
  ctx.lineTo(tx + Math.cos(a2)*ah, ty + Math.sin(a2)*ah);
  ctx.closePath(); ctx.fill();
}