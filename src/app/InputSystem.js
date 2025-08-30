export class InputSystem {
  constructor(target = window) {
    this.keys = new Set();
    this.pressed = new Set();
    this.zoomDelta = 0;
    this.mousePos = null;
    this.gamepad = null;
    
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
    }
    
    // Keyboard events
    target.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    target.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    
    // Gamepad support
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
    });
    
    if (target instanceof HTMLCanvasElement) {
      target.tabIndex = 0;
      target.addEventListener('keydown', (e) => {
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      });
      target.addEventListener('wheel', (e) => {
        e.preventDefault();
        const dir = Math.sign(e.deltaY);
        this.zoomDelta += dir > 0 ? -0.2 : 0.2;
      }, { passive: false });
    }
    
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Equal' || e.code === 'NumpadAdd') this.zoomDelta += 0.2;
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.zoomDelta -= 0.2;
    });
  }
  
  // Note: do not clear this.pressed here — callers should clear it once systems
  // have consumed the input for the frame. This preserves one-frame "pressed" events.
  update() {
    // Poll gamepads
    const gamepads = navigator.getGamepads();
    this.gamepad = gamepads[0] || null;
  }
  
  // Clear one-frame pressed events. Call this after systems have run for the frame.
  clearPressed() {
    this.pressed.clear();
  }
  
  getGamepad() {
    if (!this.gamepad) return null;
    
    const deadzone = 0.15;
    const axes = this.gamepad.axes;
    const buttons = this.gamepad.buttons;
    
    return {
      connected: true,
      buttons: {
        A: buttons[0].pressed,
        B: buttons[1].pressed,
        X: buttons[2].pressed,
        Y: buttons[3].pressed,
        LB: buttons[4].pressed,
        RB: buttons[5].pressed,
        LT: buttons[6].value > 0.5,
        RT: buttons[7].value > 0.5,
        Back: buttons[8].pressed,
        Start: buttons[9].pressed,
        DPadUp: buttons[12].pressed,
        DPadDown: buttons[13].pressed,
        DPadLeft: buttons[14].pressed,
        DPadRight: buttons[15].pressed
      },
      axes: {
        leftStick: {
          x: Math.abs(axes[0]) > deadzone ? axes[0] : 0,
          y: Math.abs(axes[1]) > deadzone ? axes[1] : 0
        },
        rightStick: {
          x: Math.abs(axes[2]) > deadzone ? axes[2] : 0,
          y: Math.abs(axes[3]) > deadzone ? axes[3] : 0
        }
      }
    };
  }
}