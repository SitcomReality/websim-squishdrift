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
                <span class="keys"><kbd>Shift</kbd> / <kbd class="gamepad-button">RT</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Fire</span>
                <span class="keys"><kbd>LMB</kbd> / <kbd class="gamepad-button">A</kbd> / <kbd class="gamepad-button">R1</kbd> / <kbd class="gamepad-button">LT</kbd></span>
              </div>
              <div class="control-item">
                <span class="action">Interact</span>
                <span class="keys"><kbd>E</kbd> / <kbd class="gamepad-button">Y</kbd></span>
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

