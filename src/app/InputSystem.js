export class InputSystem {
  constructor(target=window){
    this.keys = new Set();
    this.pressed = new Set();
    this.zoomDelta = 0;
    this.mousePos = null;
    
    if (!target) {
      console.warn('InputSystem initialized without valid target');
      return;
    }
    
    // Mouse tracking
    if (target instanceof HTMLCanvasElement) {
      target.addEventListener('mousemove', (e) => {
        this.mousePos = { x: e.clientX, y: e.clientY };
      });
      
      target.addEventListener('mouseenter', (e) => {
        this.mousePos = { x: e.clientX, y: e.clientY };
      });
      
      target.addEventListener('mouseleave', () => {
        this.mousePos = null;
      });
      
      // Add mouse click handling
      target.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left click
          this.keys.add('MouseLeft');
          this.pressed.add('MouseLeft');
        }
      });
      
      target.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          this.keys.delete('MouseLeft');
        }
      });
      
      // Handle focus events
      target.addEventListener('focus', () => {
        // Ensure canvas is properly focused
        target.style.outline = 'none';
      });
      
      target.addEventListener('blur', () => {
        // Clear keys when losing focus
        this.keys.clear();
        this.pressed.clear();
      });
    }
    
    // Only add keyboard events if target is valid
    if (target.addEventListener) {
      target.addEventListener('keydown', (e) => { 
        if (!this.keys.has(e.code)) this.pressed.add(e.code); 
        this.keys.add(e.code); 
      });
      target.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
      
      if (target instanceof HTMLCanvasElement) {
        target.tabIndex = 0;
        target.addEventListener('keydown', (e) => {
          if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
            e.preventDefault();
          }
        });
        target.addEventListener('wheel', (e) => {
          e.preventDefault();
          const dir = Math.sign(e.deltaY);
          this.zoomDelta += dir > 0 ? -0.2 : 0.2; // wheel up zooms in
        }, { passive: false });
      }
    }
    
    // Global keyboard events
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Equal' || e.code === 'NumpadAdd') this.zoomDelta += 0.2;
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.zoomDelta -= 0.2;
      });
    }
  }
  
  update() { 
    this.pressed.clear(); 
  }
}