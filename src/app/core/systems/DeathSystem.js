  createDeathScreen(state) {
    // Create death screen overlay
    const deathOverlay = document.createElement('div');
    deathOverlay.id = 'death-overlay';
    deathOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Noto Sans', system-ui, sans-serif;
      z-index: 1000;
      transition: background 2s ease;
    `;

    deathOverlay.innerHTML = `
      <div id="death-content" style="display: none; text-align: center;">
        <div id="wasted-image"></div>
        <div id="death-stats" style="margin-bottom: 30px; font-size: 18px;">
          <p style="font-size: 32px; font-weight: bold; margin-bottom: 15px; color: #FFD700;">Score: <span id="final-score">0</span></p>
          <p>Time Alive: <span id="time-alive">0:00</span></p>
          <p>Pedestrians Murdered: <span id="enemies-killed">0</span></p>
          <p>Vehicles Destroyed: <span id="vehicles-destroyed">0</span></p>
        </div>
        <div id="restart-button-sprite" style="margin-left: 128px;"></div>
      </div>
    `;

    document.body.appendChild(deathOverlay);

