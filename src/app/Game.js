import { generateCity } from '../map/MapGen.js';
import { Tile, TileColor, isRoad, roadDir } from '../map/TileTypes.js';
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

    // Movement (WASD), normalized diagonals
    let dx = 0, dy = 0;
    if (this.input.keys.has('KeyW') || this.input.keys.has('ArrowUp')) dy -= 1;
    if (this.input.keys.has('KeyS') || this.input.keys.has('ArrowDown')) dy += 1;
    if (this.input.keys.has('KeyA') || this.input.keys.has('ArrowLeft')) dx -= 1;
    if (this.input.keys.has('KeyD') || this.input.keys.has('ArrowRight')) dx += 1;
    if (dx || dy) {
      const inv = 1 / Math.hypot(dx, dy);
      dx *= inv; dy *= inv;
      const p = s.player.pos, map = s.world.map;
      const tryMove = (nx, ny) => {
        const tx = Math.floor(nx), ty = Math.floor(ny);
        if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;
        return isWalkable(map.tiles[ty][tx]);
      };
      // separate-axis collision against non-walkable tiles
      const nx = p.x + dx * s.player.moveSpeed * dt;
      if (tryMove(nx, p.y)) p.x = nx;
      const ny = p.y + dy * s.player.moveSpeed * dt;
      if (tryMove(p.x, ny)) p.y = ny;
      s.player.facing.x = dx; s.player.facing.y = dy;
    }

    // Camera follow (smooth)
    const cam = s.camera, p = s.player.pos;
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

    // Debug
    this.debugOverlay.update({
      fps: this.renderer.fps, dt: dt,
      player: { x: s.player.pos.x.toFixed(2), y: s.player.pos.y.toFixed(2) },
      camera: { x: cam.x.toFixed(2), y: cam.y.toFixed(2) },
      roads: {
        nodes: s.world.map.roads.nodes.length,
        links: s.world.map.roads.nodes.reduce((a,n)=>a+n.next.length,0)
      }
    });
  }
  render(interp) {
    this.renderer.beginFrame(this.state);
    drawTiles(this.renderer, this.state);
    drawPlayer(this.renderer, this.state);
    if (this.debugOverlay.enabled) drawRoadDebug(this.renderer, this.state);
    this.renderer.endFrame();
  }
}

/* minimal modules inlined to keep foundation small */
class Vec2 { constructor(x=0,y=0){this.x=x;this.y=y;} copy(v){this.x=v.x;this.y=v.y;return this;} }

function createInitialState() {
  const map = generateCity('alpha-seed', 2, 2);
  return {
    time: 0,
    player: { pos: new Vec2(map.width/2, map.height/2), facing: new Vec2(1,0), moveSpeed: 6 },
    camera: { x: map.width/2, y: map.height/2 },
    world: { tileSize: 24, map }
  };
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
function drawTiles(r, state){
  const { ctx, canvas } = r, ts = state.world.tileSize, map = state.world.map;
  const wTiles = Math.ceil(canvas.width/ts)+2, hTiles = Math.ceil(canvas.height/ts)+2;
  const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
  for (let y=0; y<hTiles; y++) for (let x=0; x<wTiles; x++){
    const gx = sx + x, gy = sy + y; if (gy<0||gx<0||gy>=map.height||gx>=map.width) continue;
    const t = map.tiles[gy][gx]; ctx.fillStyle = TileColor[t] || '#f5f5f5';
    ctx.fillRect(gx*ts, gy*ts, ts, ts);
  }
}

function drawPlayer(r, state){
  const { ctx } = r;
  const ts = state.world.tileSize;
  const p = state.player.pos;
  ctx.save();
  ctx.fillStyle = '#111';
  const size = ts * 0.8;
  ctx.translate(p.x*ts, p.y*ts);
  ctx.fillRect(-size/2, -size/2, size, size);
  // facing indicator
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.arc((state.player.facing.x)*ts*0.3, (state.player.facing.y)*ts*0.3, 3, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
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