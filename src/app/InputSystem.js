export class InputSystem {
  constructor(target=window){
    this.keys = new Set();
    this.pressed = new Set();
    this.zoomDelta = 0;
    target.addEventListener('keydown', (e)=>{ if (!this.keys.has(e.code)) this.pressed.add(e.code); this.keys.add(e.code); });
    target.addEventListener('keyup', (e)=>{ this.keys.delete(e.code); });
    if (target instanceof HTMLCanvasElement) {
      target.tabIndex = 0;
      target.addEventListener('keydown', (e)=> {
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      });
      target.addEventListener('wheel', (e)=> {
        e.preventDefault();
        const dir = Math.sign(e.deltaY);
        this.zoomDelta += dir > 0 ? -0.2 : 0.2; // wheel up zooms in
      }, { passive: false });
    }
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'Equal' || e.code === 'NumpadAdd') this.zoomDelta += 0.2;
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.zoomDelta -= 0.2;
    });
  }
  update(){ this.pressed.clear(); }
}