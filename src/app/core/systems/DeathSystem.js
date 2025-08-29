    deathOverlay.innerHTML = `
      <div id="death-content" style="display: none; text-align: center;">
        <div id="wasted-image"></div>
        <div id="death-stats" style="margin-bottom: 30px; font-size: 18px;">
          <p>Time Alive: <span id="time-alive">0:00</span></p>
          <p>Enemies Eliminated: <span id="enemies-killed">0</span></p>
          <p>Vehicles Destroyed: <span id="vehicles-destroyed">0</span></p>
        </div>
        <div id="restart-button-sprite" style="margin-left: 128px;"></div>
        <div style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
          <p>Music from <strong>"Lullabies for Mass Graves"</strong></p>
          <p>Main Theme: <em>Player 2 Has Joined The Game</em></p>
          <p>Death Screen: <em>Damnit, Damocles!</em></p>
        </div>
      </div>
    `;

