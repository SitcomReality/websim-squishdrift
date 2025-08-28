          <div id="death-stats" style="margin-bottom: 30px; font-size: 18px;">
            <p style="font-size: 24px; font-weight: bold; color: #FFD700;">Score: <span id="score-display">0</span></p>
            <p>Time Alive: <span id="time-alive">0:00</span></p>
            <p>Pedestrians Murdered: <span id="enemies-killed">0</span></p>
            <p>Vehicles Destroyed: <span id="vehicles-destroyed">0</span></p>
          </div>

  updateDeathStats(state) {
    // Calculate time alive
    const timeAlive = Math.floor((Date.now() - state.startTime) / 1000);
    const minutes = Math.floor(timeAlive / 60);
    const seconds = timeAlive % 60;
    
    const timeAliveEl = document.getElementById('time-alive');
    if (timeAliveEl) {
      timeAliveEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    const scoreEl = document.getElementById('score-display');
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

