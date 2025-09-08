export class InputSystem {
  constructor(target=window){
    this.keys = new Set();
    this.pressed = new Set();
    this.zoomDelta = 0;
    this.mousePos = null;
    
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
    target.addEventListener('keydown', (e)=>{ 
      if (!this.keys.has(e.code)) this.pressed.add(e.code); 
      this.keys.add(e.code); 
    });
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
    // Gamepad + Touch
    this.virtualKeys = new Set(); this.prevVirtualKeys = new Set();
    this.gamepadIndex = null; this._bindGamepadEvents();
    this._initTouch(target);
  }
  
  // Note: do not clear this.pressed here — callers should clear it once systems
  // have consumed the input for the frame. This preserves one-frame "pressed" events.
  update(){
    // Rebuild virtual input each frame
    this._pollGamepad();
    this._updateTouchVirtualKeys();
    // Remove old virtual keys, apply new, and emit pressed transitions
    for (const k of this.prevVirtualKeys) this.keys.delete(k);
    for (const k of this.virtualKeys) {
      if (!this.prevVirtualKeys.has(k) && !this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    }
    this.prevVirtualKeys = new Set(this.virtualKeys);
  }
  
  // Clear one-frame pressed events. Call this after systems have run for the frame.
  clearPressed() { this.pressed.clear(); }
  
  _bindGamepadEvents(){
    window.addEventListener('gamepadconnected', (e)=>{ if (this.gamepadIndex==null) this.gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', (e)=>{ if (this.gamepadIndex===e.gamepad.index) this.gamepadIndex=null; });
  }
  _pollGamepad(){
    this.virtualKeys = new Set(this.virtualKeys);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[this.gamepadIndex ?? 0];
    if (!gp) return;
    const dead=0.25, axX=gp.axes[0]||0, axY=gp.axes[1]||0;
    if (axY < -dead) this.virtualKeys.add('KeyW'); else if (axY > dead) this.virtualKeys.add('KeyS');
    if (axX < -dead) this.virtualKeys.add('KeyA'); else if (axX > dead) this.virtualKeys.add('KeyD');
    if (gp.buttons[0]?.pressed) this.virtualKeys.add('MouseLeft'); // A/Cross -> primary
    if (gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) this.virtualKeys.add('Space'); // B/Circle or X/Square
    if (gp.buttons[3]?.pressed) this.virtualKeys.add('KeyF'); // Y/Triangle -> ability
  }
  _initTouch(target){
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints>0;
    if (!isTouch) { this._touch = null; return; }
    // Overlay inside canvas-wrap, not full screen, so it doesn't hit footer or block page
    const rootWrap = (target instanceof HTMLCanvasElement) ? target.closest('.canvas-wrap') || document.body : document.body;
    const ui = document.createElement('div');
    ui.id = 'mobile-controls';
    Object.assign(ui.style, {position:'absolute', inset:'0', pointerEvents:'none', touchAction:'none', zIndex:'50', display: 'block' }); 
    // Left joystick area (within canvas)
    const left = document.createElement('div');
    Object.assign(left.style,{position:'absolute', left:'12px', bottom:'12px', width:'40%', height:'45%', pointerEvents:'auto'});
    // Remove full-screen right stick; use buttons at bottom-right above HUD
    const right = document.createElement('div');
    Object.assign(right.style,{display:'none'}); // deprecated
    // Buttons (primary fire and ability)
    const mkBtn = (txt,rightPx,bottomPx)=>{ const b=document.createElement('button');
      b.textContent=txt; Object.assign(b.style,{position:'absolute', right:rightPx, bottom:bottomPx,
      padding:'12px 16px', font:'600 14px system-ui, -apple-system, Segoe UI, Noto Sans, sans-serif',
      opacity:'0.9', border:'2px solid #000', borderRadius:'10px', background:'#fff', pointerEvents:'auto', zIndex:'51'});
      b.addEventListener('touchstart',(e)=>{ e.preventDefault(); e.stopPropagation(); });
      b.addEventListener('touchend',(e)=>{ e.preventDefault(); e.stopPropagation(); });
      b.addEventListener('click',(e)=>{ e.preventDefault(); e.stopPropagation(); });
      return b; };
    const btnFire = mkBtn('Fire','20px','20px'); const btnAbility = mkBtn('Ability','20px','70px');
    ui.append(left, right, btnFire, btnAbility); rootWrap.appendChild(ui);
    // Touch state
    this._touch = { ui,left,right, lId:null, rId:null, lStart:null, rStart:null, lPos:null, rPos:null };
    const onDown=(e,side)=>{ for (const t of e.changedTouches){ if (side==='L' && this._touch.lId==null){ this._touch.lId=t.identifier; this._touch.lStart={x:t.clientX,y:t.clientY}; this._touch.lPos=this._touch.lStart; } } e.preventDefault(); e.stopPropagation(); };
    const onMove=(e)=>{ for (const t of e.changedTouches){ if (t.identifier===this._touch.lId) this._touch.lPos={x:t.clientX,y:t.clientY};
      if (t.identifier===this._touch.rId) this._touch.rPos={x:t.clientX,y:t.clientY}; } e.preventDefault(); };
    const onUp=(e)=>{ for (const t of e.changedTouches){ if (t.identifier===this._touch.lId){ this._touch.lId=null; this._touch.lStart=this._touch.lPos=null; }
      if (t.identifier===this._touch.rId){ this._touch.rId=null; this._touch.rStart=this._touch.rPos=null; } } e.preventDefault(); };
    left.addEventListener('touchstart',(e)=>onDown(e,'L'),{passive:false});
    right.addEventListener('touchstart',(e)=>onDown(e,'R'),{passive:false});
    ui.addEventListener('touchmove',onMove,{passive:false});
    ui.addEventListener('touchend',onUp,{passive:false});
    ui.addEventListener('touchcancel',onUp,{passive:false});
    // Buttons map to actions
    const press=(code)=>{ this.virtualKeys.add(code); if (!this.keys.has(code)) this.pressed.add(code); };
    btnFire.addEventListener('touchstart',(e)=>{ press('MouseLeft'); e.preventDefault(); e.stopPropagation(); },{passive:false});
    btnFire.addEventListener('touchend',(e)=>{ this.virtualKeys.delete('MouseLeft'); e.preventDefault(); e.stopPropagation(); });
    btnFire.addEventListener('click',(e)=>{ press('MouseLeft'); setTimeout(()=>this.virtualKeys.delete('MouseLeft'),50); e.preventDefault(); e.stopPropagation(); });
    btnAbility.addEventListener('touchstart',(e)=>{ press('KeyF'); e.preventDefault(); e.stopPropagation(); },{passive:false});
    btnAbility.addEventListener('touchend',(e)=>{ this.virtualKeys.delete('KeyF'); e.preventDefault(); e.stopPropagation(); });
    btnAbility.addEventListener('click',(e)=>{ press('KeyF'); setTimeout(()=>this.virtualKeys.delete('KeyF'),50); e.preventDefault(); e.stopPropagation(); });
  }
  _updateTouchVirtualKeys(){
    if (!this._touch) return;
    const out = new Set(this.virtualKeys);
    const thr=12, max=60;
    const vec=(start,pos)=>{ if (!start||!pos) return {x:0,y:0}; return {x:Math.max(-max,Math.min(max,pos.x-start.x)), y:Math.max(-max,Math.min(max,pos.y-start.y))}; };
    const l=vec(this._touch.lStart,this._touch.lPos);
    
    // Update joystick position and visibility
    const joystick = document.getElementById('joystick-indicator');
    if (joystick) {
      if (this._touch.lStart) {
        joystick.style.display = 'block';
        joystick.style.left = (this._touch.lStart.x - 50) + 'px';
        joystick.style.top = (this._touch.lStart.y - 50) + 'px';
        
        // Update knob position
        const knob = joystick.querySelector('.joystick-knob');
        if (knob) {
          const knobX = Math.max(-40, Math.min(40, l.x * 0.67));
          const knobY = Math.max(-40, Math.min(40, l.y * 0.67));
          knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
        }
      } else {
        joystick.style.display = 'none';
      }
    }
    
    // Left stick: A/D and W/S
    if (l.x < -thr) out.add('KeyA'); else if (l.x > thr) out.add('KeyD');
    if (l.y < -thr) out.add('KeyW'); else if (l.y > thr) out.add('KeyS');
    this.virtualKeys = out;
  }
}