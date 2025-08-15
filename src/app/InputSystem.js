export class InputSystem {
  constructor(target=window){
    this.keys = new Set();
    this.ePressed = false;
    target.addEventListener('keydown', (e)=>{
      this.keys.add(e.code);
    });
    target.addEventListener('keyup', (e)=>{
      this.keys.delete(e.code);
    });
    if (target instanceof HTMLCanvasElement) {
      target.tabIndex = 0;
      target.addEventListener('keydown', (e)=>{
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE'].includes(e.code)) e.preventDefault();
      });
    }
  }
  update(){ /* placeholder for future edge-triggered checks */ }
}

