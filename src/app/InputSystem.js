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
    this.gamepadMoveVector = { x: 0, y: 0 };
    this.gamepadAimVector = { x: 0, y: 0 };
    this._prevGamepadButtons = [];
    this._gamepadFiredThisPoll = false;
  }
  
  // Note: do not clear this.pressed here — callers should clear it once systems
  // have consumed the input for the frame. This preserves one-frame "pressed" events.
  update(){
    // If a gamepad fire was registered during polling, temporarily suppress
    // the mousePos for this frame so firing doesn't snap player to mouse.
    const savedMouse = this.mousePos;
    if (this._gamepadFiredThisPoll) this.mousePos = null;
    // Rebuild virtual input each frame
    this.virtualKeys.clear();
    this._pollGamepad();
    this._updateTouchVirtualKeys();
    // Remove old virtual keys, apply new, and emit pressed transitions
    for (const k of this.prevVirtualKeys) this.keys.delete(k);
    for (const k of this.virtualKeys) {
      if (!this.prevVirtualKeys.has(k) && !this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    }
    this.prevVirtualKeys = new Set(this.virtualKeys);
    // restore real mouse position after we've built virtual keys for the frame
    if (this._gamepadFiredThisPoll) this.mousePos = savedMouse;
    // expose fire source to other systems (read-only per frame)
    this.firedFromGamepadThisFrame = this._gamepadFiredThisPoll;
  }
  
  // Clear one-frame pressed events. Call this after systems have run for the frame.
  clearPressed() { this.pressed.clear(); }
  
  _bindGamepadEvents(){
    window.addEventListener('gamepadconnected', (e)=>{ if (this.gamepadIndex==null) this.gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', (e)=>{ if (this.gamepadIndex===e.gamepad.index) this.gamepadIndex=null; });
  }
  _pollGamepad(){
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[this.gamepadIndex ?? 0];
    if (!gp) {
      this.gamepadMoveVector = { x: 0, y: 0 };
      this.gamepadAimVector = { x: 0, y: 0 };
      return;
    }
    // Compare button transitions to detect single-press events (for start/restart)
    const prevButtons = this._prevGamepadButtons || [];
    this._prevGamepadButtons = gp.buttons.map(b => !!b.pressed);
    // reset per-poll fire marker
    this._gamepadFiredThisPoll = false;
    // DEBUG: log gamepad state to help diagnose button mapping issues
    if (gp.buttons.some(b => b.pressed) || gp.axes.some(a => Math.abs(a) > 0.1)) {
        try { 
            console.debug('Gamepad poll:', { 
                index: gp.index, 
                id: gp.id, 
                axes: gp.axes.slice(0,4).map(a => a.toFixed(2)), 
                buttons: gp.buttons.map(b=>b.pressed) 
            }); 
        } catch(e) {}
    }
    
    const dead=0.25;

    // Left stick for movement
    const axX=gp.axes[0]||0, axY=gp.axes[1]||0;
    if (Math.hypot(axX, axY) > dead) {
        this.gamepadMoveVector = { x: axX, y: axY };
    } else {
        this.gamepadMoveVector = { x: 0, y: 0 };
    }

    // Right stick for aiming
    const rightAxX = gp.axes[2] || 0;
    const rightAxY = gp.axes[3] || 0;
    if (Math.hypot(rightAxX, rightAxY) > dead) {
        this.gamepadAimVector = { x: rightAxX, y: rightAxY };
    } else {
        this.gamepadAimVector = { x: 0, y: 0 };
    }

    // Primary mappings
    if (gp.buttons[3]?.pressed) this.virtualKeys.add('KeyE'); // Y/Triangle -> enter/exit (only one)
    // Only Y (buttons[3]) is used for enter/exit. Flatten should only be triggered by B (buttons[1]) or X (buttons[2]).
    // Removed direct gamepad bindings for flatten (player no longer has manual control).
    // Start button -> toggle pause (map to Escape to reuse existing pause handling)
    if (gp.buttons[9]?.pressed) this.virtualKeys.add('Escape');
    // Fire mapping: Right Shoulder (R1 - buttons[5]) OR A (buttons[0]) OR Left Trigger (buttons[6]) => MouseLeft (shoot)
    // When firing from a gamepad we still want to trigger the game's shoot action
    // but avoid overriding the player's facing by the mouse position. Mark that
    // this frame's fire came from the gamepad so downstream code can rely on
    // player-facing for the shot (we temporarily suppress mousePos for this frame).
    if (gp.buttons[5]?.pressed || gp.buttons[0]?.pressed || gp.buttons[6]?.pressed) {
      this.virtualKeys.add('MouseLeft');
      if (!this.keys.has('MouseLeft')) this.pressed.add('MouseLeft'); // Manually add to pressed set
      this._gamepadFiredThisPoll = true;
    }

    // Dispatch start/restart actions on single-press transitions:
    // A (buttons[0]) or Start (buttons[9]) should act like pressing start/restart.
    const aPressed = !!gp.buttons[0]?.pressed;
    const startPressed = !!gp.buttons[9]?.pressed;
    const prevAPressed = !!prevButtons[0];
    const prevStartPressed = !!prevButtons[9];
    if ((aPressed && !prevAPressed) || (startPressed && !prevStartPressed)) {
      // If death overlay visible, request restart; always emit game-start for title handling too.
      window.dispatchEvent(new CustomEvent('game-start'));
      const deathOverlay = document.getElementById('death-overlay');
      if (deathOverlay) {
        // Click the restart button to trigger the existing, robust restart logic
        const restartButton = deathOverlay.querySelector('#restart-button-sprite') || deathOverlay.querySelector('#restart-button');
        if (restartButton) {
          restartButton.click();
        } else {
          // Fallback if button isn't found for some reason
          window.dispatchEvent(new CustomEvent('game-restart'));
        }
      }
    }
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
    const mkBtn = (txt,rightPx,bottomPx, id)=>{ const b=document.createElement('button'); // Add id parameter
      b.textContent=txt; 
      if (id) b.id = id; // Assign ID if provided
      Object.assign(b.style,{position:'absolute', right:rightPx, bottom:bottomPx,
      padding:'12px 16px', font:'600 14px system-ui, -apple-system, Segoe UI, Noto Sans, sans-serif',
      opacity:'0.9', border:'2px solid #000', borderRadius:'10px', background:'#fff', pointerEvents:'auto', zIndex:'51'});
      b.addEventListener('touchstart',(e)=>{ e.preventDefault(); e.stopPropagation(); });
      b.addEventListener('touchend',(e)=>{ e.preventDefault(); e.stopPropagation(); });
      b.addEventListener('click',(e)=>{ e.preventDefault(); e.stopPropagation(); });
      return b; };
    const btnFire = mkBtn('Fire','20px','20px');
    const btnAbility = mkBtn('Flatten','20px','70px', 'mobile-ability-button');
    // New driving controls
    const btnAccel = mkBtn('▲','110px','20px','mobile-accel'); // accelerate
    const btnBrake = mkBtn('▼','110px','70px','mobile-brake'); // brake
    const btnLeft = mkBtn('◀','200px','45px','mobile-steer-left'); // steer left
    const btnRight = mkBtn('▶','60px','45px','mobile-steer-right'); // steer right
    ui.append(left, right, btnFire, btnAbility, btnAccel, btnBrake, btnLeft, btnRight); rootWrap.appendChild(ui);
    // Touch state
    this._touch = { ui,left,right, lId:null, rId:null, lStart:null, rStart:null, lPos:null, rPos:null };
    const onDown=(e,side)=>{ for (const t of e.changedTouches){ if (side==='L' && this._touch.lId==null){ this._touch.lId=t.identifier; this._touch.lStart={x:t.clientX,y:t.clientY}; this._touch.lPos=this._touch.lStart; }
      if (side==='R' && this._touch.rId==null){ this._touch.rId=t.identifier; this._touch.rStart={x:t.clientX,y:t.clientY}; this._touch.rPos=this._touch.rStart; } } e.preventDefault(); e.stopPropagation(); };
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
    
    btnFire.addEventListener('touchstart',(e)=>{ this.keys.add('MouseLeft'); this.pressed.add('MouseLeft'); e.preventDefault(); e.stopPropagation(); },{passive:false});
    btnFire.addEventListener('touchend',(e)=>{ this.keys.delete('MouseLeft'); e.preventDefault(); e.stopPropagation(); });
    btnFire.addEventListener('click',(e)=>{ press('MouseLeft'); setTimeout(()=>this.virtualKeys.delete('MouseLeft'),50); e.preventDefault(); e.stopPropagation(); });
    
    // Context-sensitive ability button
    btnAbility.addEventListener('touchstart', (e) => {
      const action = btnAbility.dataset.action || 'KeyE'; // Default to enter/exit (no manual flatten)
      press(action);
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
    
    btnAbility.addEventListener('touchend', (e) => {
      const action = btnAbility.dataset.action || 'KeyE';
      this.virtualKeys.delete(action);
      this.keys.delete(action); // Also clear from main keys set
      e.preventDefault();
      e.stopPropagation();
    });
    
    btnAbility.addEventListener('click', (e) => {
      const action = btnAbility.dataset.action || 'KeyE';
      press(action);
      setTimeout(() => this.virtualKeys.delete(action), 50);
      e.preventDefault();
      e.stopPropagation();
    });
    
    // Accelerate / Brake / Steer handlers
    const holdKey = (el, code)=>{ el.addEventListener('touchstart', (e)=>{ this.keys.add(code); this.pressed.add(code); e.preventDefault(); e.stopPropagation(); }, { passive:false }); el.addEventListener('touchend', (e)=>{ this.keys.delete(code); e.preventDefault(); e.stopPropagation(); }, { passive:false }); el.addEventListener('mousedown', (e)=>{ this.keys.add(code); this.pressed.add(code); e.preventDefault(); }, { passive:false }); el.addEventListener('mouseup', (e)=>{ this.keys.delete(code); e.preventDefault(); }, { passive:false }); };
    holdKey(btnAccel, 'KeyW'); // accelerate
    holdKey(btnBrake, 'KeyS'); // brake
    holdKey(btnLeft, 'ArrowLeft'); // steer left
    holdKey(btnRight, 'ArrowRight'); // steer right
  }
  _updateTouchVirtualKeys(){
    if (!this._touch) return;
    
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
    
    // Calculate angle from joystick position for player facing
    if (Math.hypot(l.x, l.y) > thr) {
      const angle = Math.atan2(l.y, l.x);
      this.joystickAngle = angle;
    } else {
      this.joystickAngle = null;
    }
    
    // Left stick: A/D and W/S for movement. Using a single key for movement
    // and a vector for direction/magnitude.
    if (Math.hypot(l.x, l.y) > thr) {
      this.virtualKeys.add('KeyW'); // Treat any joystick movement as forward intention.
      const mag = Math.min(1, Math.hypot(l.x, l.y) / max);
      this.joystickVector = { x: l.x / max * mag, y: l.y / max * mag };
    } else {
      this.joystickVector = null;
    }
  }
}