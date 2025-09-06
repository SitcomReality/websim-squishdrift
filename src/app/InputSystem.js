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
    // Overlay
    const root = (target instanceof HTMLCanvasElement) ? target.parentElement || document.body : document.body;
    const ui = document.createElement('div');
    Object.assign(ui.style, {position:'fixed', inset:'0', pointerEvents:'none', touchAction:'none', zIndex:'9999'});
    // Left joystick area
    const left = document.createElement('div');
    Object.assign(left.style,{position:'absolute', left:'0', bottom:'0', width:'50%', height:'100%', pointerEvents:'auto'});
    // Right joystick area
    const right = document.createElement('div');
    Object.assign(right.style,{position:'absolute', right:'0', bottom:'0', width:'50%', height:'100%', pointerEvents:'auto'});
    // Buttons (primary fire and ability)
    const mkBtn = (txt,rightPx,bottomPx)=>{ const b=document.createElement('button');
      b.textContent=txt; Object.assign(b.style,{position:'absolute', right:rightPx, bottom:bottomPx,
      padding:'10px 14px', font:'600 14px system-ui, -apple-system, Segoe UI, Noto Sans, sans-serif',
      opacity:'0.6', border:'1px solid #000', borderRadius:'8px', background:'#fff', pointerEvents:'auto'});
      return b; };
    const btnFire = mkBtn('Fire','16px','16px'); const btnAbility = mkBtn('Ability','16px','64px');
    ui.append(left,right,btnFire,btnAbility); root.appendChild(ui);
    // Touch state
    this._touch = { ui,left,right, lId:null, rId:null, lStart:null, rStart:null, lPos:null, rPos:null };
    const onDown=(e,side)=>{ for (const t of e.changedTouches){ if (side==='L' && this._touch.lId==null && t.clientX<window.innerWidth*0.5){ this._touch.lId=t.identifier; this._touch.lStart={x:t.clientX,y:t.clientY}; this._touch.lPos=this._touch.lStart; }
      if (side==='R' && this._touch.rId==null && t.clientX>=window.innerWidth*0.5){ this._touch.rId=t.identifier; this._touch.rStart={x:t.clientX,y:t.clientY}; this._touch.rPos=this._touch.rStart; } } e.preventDefault(); };
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
    btnFire.addEventListener('touchstart',(e)=>{ press('MouseLeft'); e.preventDefault(); },{passive:false});
    btnFire.addEventListener('touchend',()=>{ this.virtualKeys.delete('MouseLeft'); });
    btnAbility.addEventListener('touchstart',(e)=>{ press('KeyF'); e.preventDefault(); },{passive:false});
    btnAbility.addEventListener('touchend',()=>{ this.virtualKeys.delete('KeyF'); });
  }
  _updateTouchVirtualKeys(){
    if (!this._touch) return;
    const out = new Set(this.virtualKeys);
    const thr=12, max=60;
    const vec=(start,pos)=>{ if (!start||!pos) return {x:0,y:0}; return {x:Math.max(-max,Math.min(max,pos.x-start.x)), y:Math.max(-max,Math.min(max,pos.y-start.y))}; };
    const l=vec(this._touch.lStart,this._touch.lPos);
    const r=vec(this._touch.rStart,this._touch.rPos);
    // Left stick: steer (A/D) and strafe if used elsewhere
    if (l.x < -thr) out.add('KeyA'); if (l.x > thr) out.add('KeyD');
    // Right stick: throttle/brake (W/S)
    if (r.y < -thr) out.add('KeyW'); if (r.y > thr) out.add('KeyS');
    this.virtualKeys = out;
  }
}