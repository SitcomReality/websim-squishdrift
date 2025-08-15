export class DebugOverlaySystem {
  constructor(el){ 
    this.el = el; 
    this.enabled = false; 
  }
  
  update(data){
    if (!this.el) return;
    this.el.toggleAttribute('hidden', !this.enabled);
    if (this.enabled) {
      this.el.textContent = JSON.stringify(data, null, 2);
    }
  }
}

