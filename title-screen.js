export class TitleScreen {
  constructor() {
    this.element = null;
    this.gameStarted = false;
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
      z-index: 9998;
      font-family: 'Noto Sans', system-ui, sans-serif;
      color: white;
    `;

    overlay.innerHTML = `
      <div id="title-content" style="text-align: center; max-width: 600px;">
        <div id="title-image" style="width: 512px; height: 128px; margin: 0 auto 40px; background-image: url('/uisprites.png'); background-size: 512px 384px; background-position: 0 0; background-repeat: no-repeat;"></div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 24px; margin-bottom: 20px; color: #FFD700;">Controls</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; margin-bottom: 30px;">
            <div>
              <p><strong>Mouse:</strong> Aim & Click to Shoot</p>
              <p><strong>WASD / Arrows:</strong> Move</p>
              <p><strong>Shift:</strong> Sprint</p>
            </div>
            <div>
              <p><strong>E:</strong> Enter/Exit Vehicle</p>
              <p><strong>Space:</strong> Handbrake</p>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 40px;">
          <h2 style="font-size: 24px; margin-bottom: 20px; color: #FFD700;">Find Items Between Buildings</h2>
          <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap;">
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

        <div id="start-button" style="width: 256px; height: 128px; margin: 0 auto; background-image: url('/uisprites.png'); background-size: 512px 384px; background-position: 0 -256px; background-repeat: no-repeat; cursor: pointer; transition: transform 0.2s ease;"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.element = overlay;

    // Add hover effects
    const startButton = overlay.querySelector('#start-button');
    startButton.addEventListener('mouseenter', () => {
      startButton.style.transform = 'scale(1.05)';
    });
    startButton.addEventListener('mouseleave', () => {
      startButton.style.transform = 'scale(1)';
    });

    return overlay;
  }

  show() {
    if (!this.element) {
      this.create();
    }
    this.element.style.display = 'flex';
  }

  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  onStart(callback) {
    if (!this.element) return;
    
    const startButton = this.element.querySelector('#start-button');
    startButton.addEventListener('click', () => {
      if (this.gameStarted) return;
      this.gameStarted = true;
      
      // Start the main soundtrack
      if (window.game && window.game.audioManager) {
        window.game.audioManager.playMainTheme();
      } else {
        // Fallback direct audio
        const music = new Audio('/music/player2.mp3');
        music.loop = true;
        music.volume = 0.6;
        music.play().catch(e => console.warn('Could not play music:', e));
      }
      
      callback();
    });
  }

  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}