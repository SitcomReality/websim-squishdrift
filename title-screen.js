export class TitleScreen {
  constructor() {
    this.element = null;
    this.gameStarted = false;
    this.paused = false;
  }

  create() {
    const overlay = document.createElement('div');
    overlay.id = 'title-screen';

    // Ensure title screen stylesheet is present
    if (!document.getElementById('title-screen-styles')) {
      const link = document.createElement('link');
      link.id = 'title-screen-styles';
      link.rel = 'stylesheet';
      link.href = '/title-screen.css';
      document.head.appendChild(link);
    }

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                      (window.innerWidth <= 768 && 'ontouchstart' in window);

    overlay.innerHTML = `
      <div id="title-content">
        <div id="title-image"></div>
        ${!isMobile ? `
        <div id="controls-section">
          <h2>Desktop Controls</h2>
          <div class="controls-grid">
            <div class="controls-column">
              <h3>On Foot</h3>
              <div class="control-item">
                <span class="action">Move</span>
                <span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd class="gamepad-button">LS</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Aim</span>
                <span class="keys">Mouse / <kbd class="gamepad-button">RS</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Sprint</span>
                <span class="keys"><kbd>Shift</kbd> / <kbd class="gamepad-button">A</kbd> / <kbd class="gamepad-button">RT</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Fire</span>
                <span class="keys"><kbd>LMB</kbd> / <kbd class="gamepad-button">RT</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Interact</span>
                <span class="keys"><kbd>E</kbd> / <kbd class="gamepad-button">Y</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Flatten World</span>
                <span class="keys"><kbd>Q</kbd> / <kbd class="gamepad-button">B</kbd> or <kbd class="gamepad-button">X</kbd></span>
              </div>
            </div>
            <div class="controls-column">
              <h3>In Vehicle</h3>
              <div class="control-item">
                <span class="action">Steer</span>
                <span class="keys"><kbd>A</kbd><kbd>D</kbd> / <kbd class="gamepad-button">LS</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Accelerate/Brake</span>
                <span class="keys"><kbd>W</kbd><kbd>S</kbd> / <kbd class="gamepad-button">RT</kbd> <kbd class="gamepad-button">LT</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Handbrake</span>
                <span class="keys"><kbd>Space</kbd> / <kbd class="gamepad-button">A</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Exit Vehicle</span>
                <span class="keys"><kbd>E</kbd> / <kbd class="gamepad-button">Y</kbd></span>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 24px; margin-bottom: 20px; color: #FFD700;">Find Items Between Buildings</h2>
          <div class="items-grid">
            <div style="text-align: center;">
              <div class="item-sprite item-pistol"></div>
              <p class="item-label">Pistol</p>
            </div>
            <div style="text-align: center;">
              <div class="item-sprite item-shotgun"></div>
              <p class="item-label">Shotgun</p>
            </div>
            <div style="text-align: center;">
              <div class="item-sprite item-ak"></div>
              <p class="item-label">AK47</p>
            </div>
            <div style="text-align: center;">
              <div class="item-sprite item-grenade"></div>
              <p class="item-label">Grenade</p>
            </div>
            <div style="text-align: center;">
              <div class="item-sprite item-health"></div>
              <p class="item-label">Health</p>
            </div>
            <div style="text-align: center;">
              <div class="item-sprite item-bribe"></div>
              <p class="item-label">Bribe</p>
            </div>
          </div>
        </div>
        <div id="start-button"></div>
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
    // Styles moved to title-screen.css for consistency
    pauseOverlay.className = 'pause-overlay';
    pauseOverlay.innerHTML = `
      <h1>PAUSED</h1>
      <p>Press P or Escape to resume</p>
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