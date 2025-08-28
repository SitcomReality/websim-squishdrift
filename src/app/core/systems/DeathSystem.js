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
      background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
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
        <div id="death-stats" style="margin-bottom: 30px; font-size: 24px;">
          <p style="font-size: 36px; font-weight: bold; color: #FFD700; margin-bottom: 20px;">
            Score: <span id="final-score">0</span>
          </p>
          <p>Time Alive: <span id="time-alive">0:00</span></p>
          <p>Pedestrians Murdered: <span id="enemies-killed">0</span></p>
          <p>Vehicles Destroyed: <span id="vehicles-destroyed">0</span></p>
        </div>
        <div id="restart-button-sprite" style="margin-left: 128px;"></div>
      </div>
    `;

    document.body.appendChild(deathOverlay);

  updateDeathStats(state) {
    // Calculate time alive
    const timeAlive = Math.floor((Date.now() - state.startTime) / 1000);
    const minutes = Math.floor(timeAlive / 60);
    const seconds = timeAlive % 60;
    
    const timeAliveEl = document.getElementById('time-alive');
    if (timeAliveEl) {
      timeAliveEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    const scoreEl = document.getElementById('final-score');
    if (scoreEl) {
      scoreEl.textContent = state.scoringSystem?.getScore?.() || state.score || 0;
    }
    
    const enemiesKilledEl = document.getElementById('enemies-killed');
    if (enemiesKilledEl) {
      enemiesKilledEl.textContent = state.stats?.enemiesKilled || 0;
    }
    
    const vehiclesDestroyedEl = document.getElementById('vehicles-destroyed');
    if (vehiclesDestroyedEl) {
      vehiclesDestroyedEl.textContent = state.stats?.vehiclesDestroyed || 0;
    }
  }

