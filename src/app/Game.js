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
      s.player.pos.x += dx * s.player.moveSpeed * dt;
      s.player.pos.y += dy * s.player.moveSpeed * dt;
      s.player.facing.x = dx; s.player.facing.y = dy;
    }

    // Camera follow (smooth)
    const cam = s.camera, p = s.player.pos;
    cam.x += (p.x - cam.x) * Math.min(1, dt * 6);
    cam.y += (p.y - cam.y) * Math.min(1, dt * 6);

    // Debug
    this.debugOverlay.update({
      fps: this.renderer.fps, dt: dt,
      player: { x: s.player.pos.x.toFixed(2), y: s.player.pos.y.toFixed(2) },
      camera: { x: cam.x.toFixed(2), y: cam.y.toFixed(2) }
    });
  }
  render(interp) {
    this.renderer.beginFrame(this.state);
    drawGrid(this.renderer, this.state);
    drawPlayer(this.renderer, this.state);
    this.renderer.endFrame();
  }
}

/* minimal modules inlined to keep foundation small */
class Vec2 { constructor(x=0,y=0){this.x=x;this.y=y;} copy(v){this.x=v.x;this.y=v.y;return this;} }

function createInitialState() {
  return {
    time: 0,
    player: { pos: new Vec2(0,0), facing: new Vec2(1,0), moveSpeed: 6 }, // tiles/sec
    camera: { x: 0, y: 0 },
    world: { tileSize: 24 }
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
function drawGrid(r, state){
  const { ctx, canvas } = r;
  const ts = state.world.tileSize;
  const wTiles = Math.ceil(canvas.width/ts)+2;
  const hTiles = Math.ceil(canvas.height/ts)+2;
  const camX = state.camera.x, camY = state.camera.y;
  const startX = Math.floor(camX - wTiles/2);
  const startY = Math.floor(camY - hTiles/2);

  ctx.save();
  ctx.lineWidth = 1;
  for (let y=0; y<hTiles; y++){
    for (let x=0; x<wTiles; x++){
      const wx = (startX + x) * ts;
      const wy = (startY + y) * ts;
      ctx.fillStyle = ( (x+y) & 1 ) ? '#fafafa' : '#f5f5f5';
      ctx.fillRect(wx, wy, ts, ts);
      ctx.strokeStyle = '#e5e7eb';
      ctx.strokeRect(wx, wy, ts, ts);
    }
  }
  ctx.restore();
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