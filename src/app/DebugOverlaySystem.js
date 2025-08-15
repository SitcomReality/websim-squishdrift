export class DebugOverlaySystem {
  constructor(el){ this.el = el; this.enabled = false; }
  update(data){
    if (!this.el || !this.enabled) return;
    this.el.textContent = JSON.stringify(data, null, 2);
  }
}

