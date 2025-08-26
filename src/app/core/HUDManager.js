export class HUDManager {
  constructor() {
    this.elements = {};
  }

  initialize() {
    this.createHUDElements();
  }

  createHUDElements() {
    const hud = document.getElementById('hud');
    
    // Create wanted level row
    const wantedRow = document.createElement('div');
    wantedRow.className = 'row';
    wantedRow.innerHTML = '<span class="label">Wanted</span><span id="wanted-level">0</span>';
    hud.appendChild(wantedRow);

    // Create score row
    const scoreRow = document.createElement('div');
    scoreRow.className = 'row';
    scoreRow.innerHTML = '<span class="label">Score</span><span id="score">0</span>';
    hud.appendChild(scoreRow);

    // Create interaction prompt
    const interactionRow = document.createElement('div');
    interactionRow.className = 'row';
    interactionRow.id = 'interaction-prompt';
    interactionRow.style.display = 'none';
    interactionRow.innerHTML = '<span class="label">Press E to</span><span id="interaction-action">enter vehicle</span>';
    hud.appendChild(interactionRow);

    // Create debug info row
    const debugRow = document.createElement('div');
    debugRow.className = 'row';
    debugRow.id = 'debug-info';
    debugRow.style.display = 'none';
    debugRow.innerHTML = '<span class="label">Debug</span><span id="debug-text">-</span>';
    hud.appendChild(debugRow);

    this.elements = {
      wantedLevelEl: document.getElementById('wanted-level'),
      scoreEl: document.getElementById('score'),
      interactionPromptEl: document.getElementById('interaction-prompt'),
      interactionActionEl: document.getElementById('interaction-action'),
      debugInfoEl: document.getElementById('debug-info'),
      debugTextEl: document.getElementById('debug-text')
    };
  }

  update() {
    // Update HUD elements based on game state
  }
}