export class InputSystem {
  constructor(target=window){
    this.keys = new Set();
    target.addEventListener('keydown', (e)=>{ this.keys.add(e.code); });
    target.addEventListener('keyup', (e)=>{ this.keys.delete(e.code); });
    if (target instanceof HTMLCanvasElement) {
      target.tabIndex = 0;
      target.addEventListener('keydown', (e)=> {
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      });
    }
  }
  update(){ /* placeholder for future edge-triggered checks */ }
}

