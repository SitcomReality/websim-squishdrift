import { TitleScreen } from './title-screen.js';

export class LoadingSystem {
  constructor() {
    this.loadingScreen = null;
    this.loadedAssets = 0;
    this.totalAssets = 0;
    this.loadingPromise = null;
    this.titleScreen = null;
  }

  createLoadingScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: 'Noto Sans', system-ui, sans-serif;
    `;

    overlay.innerHTML = `
      <div id="loading-content" style="text-align: center; color: white;">
        <h1 style="font-size: 48px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 3px;">
          Loading
        </h1>
        <div id="loading-bar-container" style="width: 300px; height: 4px; background: rgba(255,255,255,0.2); margin: 30px 0; border-radius: 2px;">
          <div id="loading-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #ff6b6b, #feca57); border-radius: 2px; transition: width 0.3s ease;"></div>
        </div>
        <p id="loading-text" style="font-size: 16px; opacity: 0.8;">Preparing chaos...</p>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  createTitleScreen() {
    const titleOverlay = document.createElement('div');
    titleOverlay.id = 'title-overlay';
    titleOverlay.style.cssText = `
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
    `;

    titleOverlay.innerHTML = `
      <div id="title-content" style="text-align: center;">
        <div id="title-image" style="width: 512px; height: 128px; margin: 0 auto 40px; background-image: url('./uisprites.png'); background-size: 512px 384px; background-position: 0 0; background-repeat: no-repeat;"></div>
        <div id="start-button" style="width: 256px; height: 128px; margin: 0 auto; background-image: url('./uisprites.png'); background-size: 512px 384px; background-position: 0 -256px; background-repeat: no-repeat; cursor: pointer; transition: transform 0.2s ease;"></div>
      </div>
    `;

    document.body.appendChild(titleOverlay);
    
    // Add hover effect
    const startButton = titleOverlay.querySelector('#start-button');
    startButton.addEventListener('mouseenter', () => {
      startButton.style.transform = 'scale(1.05)';
    });
    startButton.addEventListener('mouseleave', () => {
      startButton.style.transform = 'scale(1)';
    });
    
    return titleOverlay;
  }

  showTitleScreen() {
    this.titleScreen = new TitleScreen();
    this.titleScreen.show();
    
    // Override the start button behavior to reset start time
    this.titleScreen.onStart(() => {
      this.hideTitleScreen();
      // Reset start time when game starts
      if (window.game && window.game.stateManager && window.game.stateManager.state) {
        window.game.stateManager.state.startTime = Date.now();
      }
    });

    // Hide loading screen
    const loadingScreen = document.getElementById('loading-overlay');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => loadingScreen.remove(), 500);
    }
  }

  hideTitleScreen() {
    if (this.titleScreen) {
      this.titleScreen.hide();
      this.titleScreen.destroy();
      this.titleScreen = null;
    }
  }

  updateProgress(text, progress) {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingBar) {
      loadingBar.style.width = `${progress}%`;
    }
    if (loadingText) {
      loadingText.textContent = text;
    }
  }

  loadImage(src, name) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedAssets++;
        this.updateProgress(`Loading ${name}...`, (this.loadedAssets / this.totalAssets) * 100);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        this.loadedAssets++;
        this.updateProgress(`Loading ${name}...`, (this.loadedAssets / this.totalAssets) * 100);
        resolve(null);
      };
      img.src = src;
    });
  }

  loadAudio(src, name) {
    return new Promise((resolve) => {
      const audio = new Audio(src);
      audio.oncanplaythrough = () => {
        this.loadedAssets++;
        this.updateProgress(`Loading ${name}...`, (this.loadedAssets / this.totalAssets) * 100);
        resolve(audio);
      };
      audio.onerror = () => {
        console.warn(`Failed to load audio: ${src}`);
        this.loadedAssets++;
        this.updateProgress(`Loading ${name}...`, (this.loadedAssets / this.totalAssets) * 100);
        resolve(null);
      };
      audio.load();
    });
  }

  async loadAssets() {
    this.loadingScreen = this.createLoadingScreen();
    
    const assets = this.getAssetList();
    this.totalAssets = assets.length;
    this.loadedAssets = 0;

    const promises = assets.map(asset => {
      if (asset.type === 'image') {
        return this.loadImage(asset.src, asset.name);
      } else if (asset.type === 'audio') {
        return this.loadAudio(asset.src, asset.name);
      }
    });

    const results = await Promise.all(promises);
    
    // Build asset objects
    const loadedAssets = {};
    assets.forEach((asset, index) => {
      if (results[index]) {
        loadedAssets[asset.key] = results[index];
      }
    });

    // Small delay for smooth transition
    await new Promise(resolve => setTimeout(resolve, 500));

    this.hideLoadingScreen();
    return loadedAssets;
  }

  getAssetList() {
    return [
      // Images
      { type: 'image', src: './uisprites.png', name: 'UI Sprites', key: 'uiSprites' },
      { type: 'image', src: './Explosion_001_Tile_8x8_256x256.png', name: 'Explosions', key: 'explosion' },
      
      // Vehicle images
      { type: 'image', src: './vehicle_ambulance.png', name: 'Ambulance', key: 'vehicle_ambulance' },
      { type: 'image', src: './vehicle_compact.png', name: 'Compact Car', key: 'vehicle_compact' },
      { type: 'image', src: './vehicle_firetruck.png', name: 'Firetruck', key: 'vehicle_firetruck' },
      { type: 'image', src: './vehicle_police.png', name: 'Police Car', key: 'vehicle_police' },
      { type: 'image', src: './vehicle_sedan.png', name: 'Sedan', key: 'vehicle_sedan' },
      { type: 'image', src: './vehicle_sport.png', name: 'Sports Car', key: 'vehicle_sport' },
      { type: 'image', src: './vehicle_truck.png', name: 'Truck', key: 'vehicle_truck' },
      
      // Pickup images
      { type: 'image', src: './pickup_health.png', name: 'Health Pack', key: 'pickup_health' },
      { type: 'image', src: './pickup_bribe.png', name: 'Bribe Money', key: 'pickup_bribe' },
      { type: 'image', src: './pickup_pistol.png', name: 'Pistol', key: 'pickup_pistol' },
      { type: 'image', src: './pickup_shotgun.png', name: 'Shotgun', key: 'pickup_shotgun' },
      { type: 'image', src: './pickup_ak47.png', name: 'AK47', key: 'pickup_ak47' },
      { type: 'image', src: './pickup_grenade.png', name: 'Grenade', key: 'pickup_grenade' },
      
      // Pedestrian sprites
      { type: 'image', src: './pedestrian_bodies.png', name: 'Pedestrian Bodies', key: 'pedestrian_bodies' },
      { type: 'image', src: './pedestrian_arms.png', name: 'Pedestrian Arms', key: 'pedestrian_arms' },
      
      // Audio files
      { type: 'audio', src: './sfx/engine_compact.mp3', name: 'Engine Sounds', key: 'engine_compact' },
      { type: 'audio', src: './sfx/engine_emergency.mp3', name: 'Emergency Engine', key: 'engine_emergency' },
      { type: 'audio', src: './sfx/engine_sedan.mp3', name: 'Sedan Engine', key: 'engine_sedan' },
      { type: 'audio', src: './sfx/engine_sport.mp3', name: 'Sports Engine', key: 'engine_sport' },
      { type: 'audio', src: './sfx/engine_truck.mp3', name: 'Truck Engine', key: 'engine_truck' },
      { type: 'audio', src: './sfx/oof02.mp3', name: 'Oof Sound 2', key: 'oof02' }
    ];
  }

  hideLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s ease';
      
      setTimeout(() => {
        overlay.remove();
      }, 500);
    }
  }
}