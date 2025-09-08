export class CanvasRenderer {
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
    const now = performance.now();
    if (!this._lastFpsTs) this._lastFpsTs = now;
    this._acc += now - this._lastFpsTs; this._frames++;
    if (this._acc >= 500) { this.fps = Math.round(this._frames * 1000 / this._acc); this._acc=0; this._frames=0; }
    this._lastFpsTs = now;
    const ts = state.world.tileSize;
    const cx = Math.floor(canvas.width/2), cy = Math.floor(canvas.height/2);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(cx, cy);
    const z = state.camera.zoom || 1;
    ctx.scale(z, z);
    // pixel-snap the world transform to avoid tile seams at fractional zoom
    const snapX = Math.round(state.camera.x * ts * z) / z;
    const snapY = Math.round(state.camera.y * ts * z) / z;
    ctx.translate(-(snapX*ts/ts), -(snapY*ts/ts));
  }
  endFrame(){ /* no-op */ }
}