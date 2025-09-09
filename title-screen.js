export class TitleScreen {
  constructor() {
    this.element = null;
    this.gameStarted = false;
    this.paused = false;
  }

  create() {
    const overlay = document.createElement('div');
    overlay.id = 'title-screen';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999; /* Higher z-index than mobile controls */
      font-family: 'Noto Sans', system-ui, sans-serif;
      color: white;
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                    (window.innerWidth <= 768 && 'ontouchstart' in window);

    overlay.innerHTML = `
      <div id="title-content" style="text-align: center; max-width: 600px; width: 100%;">
        <div id="title-image" style="width: 512px; height: 128px; margin: 0 auto 40px; background-image: url('/uisprites.png'); background-size: 512px 384px; background-position: 0 0; background-repeat: no-repeat; max-width: 100%; height: auto; aspect-ratio: 4/1;"></div>
        
        ${!isMobile ? `
        <div id="controls-section" style="margin-bottom: 30px;">
          <h2 style="font-size: 24px; margin-bottom: 16px; color: #FFD700;">Desktop Controls</h2>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; text-align: left;">
            <div style="border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 12px; background: rgba(0,0,0,0.35);">
              <div style="font-weight: 600; margin-bottom: 8px;">Movement</div>
              <div style="line-height: 1.6;"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> — move<br><kbd>Shift</kbd> — sprint</div>
            </div>
            <div style="border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 12px; background: rgba(0,0,0,0.35);">
              <div style="font-weight: 600; margin-bottom: 8px;">Combat</div>
              <div style="line-height: 1.6;">Mouse — aim<br><kbd>LMB</kbd> — fire</div>
            </div>
            <div style="border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 12px; background: rgba(0,0,0,0.35);">
              <div style="font-weight: 600; margin-bottom: 8px;">Interaction</div>
              <div style="line-height: 1.6;"><kbd>E</kbd> — enter/exit vehicle, pick up items<br><kbd>Q</kbd> — toggle flatten view</div>
            </div>
            <div style="border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 12px; background: rgba(0,0,0,0.35);">
              <div style="font-weight: 600; margin-bottom: 8px;">Driving</div>
              <div style="line-height: 1.6;"><kbd>W/S</kbd> or <kbd>↑/↓</kbd> — throttle/reverse<br><kbd>A/D</kbd> or <kbd>←/→</kbd> — steer<br><kbd>Space</kbd> — handbrake</div>
            </div>
            <div style="grid-column: 1 / -1; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 12px; background: rgba(0,0,0,0.35);">
              <div style="font-weight: 600; margin-bottom: 8px;">System</div>
              <div style="line-height: 1.6;"><kbd>P</kbd> / <kbd>Esc</kbd> — pause</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 24px; margin-bottom: 20px; color: #FFD700;">Find Items Between Buildings</h2>
          <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; margin: 0 auto;">
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 8px; background-image: url('/pickup_pistol.png'); background-size: contain; background-repeat: no-repeat;"></div>
              <p style="font-size: 14px;">Pistol</p>
            </div>
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 8px; background-image: url('/pickup_shotgun.png'); background-size: contain; background-repeat: no-repeat;"></div>
              <p style="font-size: 14px;">Shotgun</p>
            </div>
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 8px; background-image: url('/pickup_ak47.png'); background-size: contain; background-repeat: no-repeat;"></div>
              <p style="font-size: 14px;">AK47</p>
            </div>
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 8px; background-image: url('/pickup_grenade.png'); background-size: contain; background-repeat: no-repeat;"></div>
              <p style="font-size: 14px;">Grenade</p>
            </div>
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 8px; background-image: url('/pickup_health.png'); background-size: contain; background-repeat: no-repeat;"></div>
              <p style="font-size: 14px;">Health</p>
            </div>
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 8px; background-image: url('/pickup_bribe.png'); background-size: contain; background-repeat: no-repeat;"></div>
              <p style="font-size: 14px;">Bribe</p>
            </div>
          </div>
        </div>

        <div id="start-button" style="width: 256px; height: 128px; margin: 0 auto; background-image: url('/uisprites.png'); background-size: 512px 384px; background-position: 0 -256px; background-repeat: no-repeat; cursor: pointer; transition: transform 0.2s ease; max-width: 100%; height: auto; aspect-ratio: 2/1;"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.element = overlay;

    // Listen for controller start to begin the game (also fired by InputSystem)
    window.addEventListener('game-start', () => { this.handleStart(); });

    // Add hover effects
    const startButton = overlay.querySelector('#start-button');
    startButton.addEventListener('mouseenter', () => {
      startButton.style.transform = 'scale(1.05)';
    });
    startButton.addEventListener('mouseleave', () => {
      startButton.style.transform = 'scale(1)';
    });

    // Add click/touch event for mobile compatibility
    startButton.addEventListener('click', () => {
      this.handleStart();
    });
    
    startButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startButton.style.transform = 'scale(0.95)';
    });
    
    startButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      startButton.style.transform = 'scale(1)';
      this.handleStart(); // directly start on touch
    });

    // Add pause functionality
    this.setupPauseControls();

    return overlay;
  }

  handleStart() {
    if (this.gameStarted) return;
    this.gameStarted = true;
    // Start the main soundtrack via AudioManager only
    if (window.game && window.game.audioManager) {
      window.game.audioManager.playMainTheme();
    }
    // Start game via global starter and hide
    if (typeof window.__startGame === 'function') {
      window.__startGame();
    } else {
      this.hide();
    }
  }

  show() {
    if (!this.element) {
      this.create();
    }
    this.element.style.display = 'flex';
    this.paused = false;
    
    // Ensure mobile controls are hidden when title screen is shown
    this.hideMobileControls();
  }

  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
    this.paused = false;
    
    // Show mobile controls when game starts
    this.showMobileControls();
  }

  hideMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.style.display = 'none';
    }
  }

  showMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.style.display = 'block';
    }
  }

  setupPauseControls() {
    document.addEventListener('keydown', (e) => {
      if (this.element && this.element.style.display !== 'none') {
        if (e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          this.togglePause();
        }
      }
    });
  }

  togglePause() {
    this.paused = !this.paused;
    
    // Toggle pause overlay
    const pauseOverlay = document.getElementById('pause-overlay');
    if (this.paused) {
      this.showPauseOverlay();
    } else {
      this.hidePauseOverlay();
    }
  }

  showPauseOverlay() {
    // Remove existing pause overlay if any
    const existingPause = document.getElementById('pause-overlay');
    if (existingPause) {
      existingPause.remove();
    }

    // Create pause overlay
    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Noto Sans', system-ui, sans-serif;
      z-index: 10000;
    `;

    pauseOverlay.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px;">PAUSED</h1>
      <p style="font-size: 20px; margin-bottom: 30px;">Press P or Escape to resume</p>
    `;

    document.body.appendChild(pauseOverlay);
  }

  hidePauseOverlay() {
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
      pauseOverlay.remove();
    }
  }

  onStart(callback) {
    if (!this.element) return;
    const startButton = this.element.querySelector('#start-button');
    startButton.addEventListener('click', () => {
      if (this.gameStarted) return;
      this.gameStarted = true;
      if (window.game && window.game.audioManager) {
        window.game.audioManager.playMainTheme();
      }
      if (typeof window.__startGame === 'function') {
        window.__startGame();
      }
      callback();
    });
  }

  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.paused = false;
    
    // Show mobile controls when title screen is destroyed
    this.showMobileControls();
  }
}