export class HUDManager {
  constructor() {
    this.elements = {};
  }

  initialize() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.createHUDElements();
      });
    } else {
      // DOM is already loaded
      this.createHUDElements();
    }
  }

  createHUDElements() {
    // Find existing HUD container or create it
    let hud = document.getElementById('hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'hud';
      hud.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      `;
      document.body.appendChild(hud);
    }

    // Score HUD (top left)
    const scoreHud = document.createElement('div');
    scoreHud.id = 'score-hud';
    scoreHud.className = 'hud score-hud';
    scoreHud.innerHTML = `
      <div class="row">
        <span class="label">Score</span>
        <span id="score">0</span>
      </div>
    `;

    // Wanted level HUD (top right)
    const wantedHud = document.createElement('div');
    wantedHud.id = 'wanted-hud';
    wantedHud.className = 'hud wanted-hud';
    wantedHud.innerHTML = `
      <div class="row">
        <span class="label">Wanted</span>
        <span id="wanted-level">0</span>
      </div>
    `;

    // Item HUD (bottom left)
    const itemHud = document.createElement('div');
    itemHud.id = 'item-hud';
    itemHud.className = 'hud item-hud';
    itemHud.innerHTML = `
      <div class="row">
        <span class="label">Item</span>
        <span id="item-name">None</span>
      </div>
      <div class="row">
        <span class="label">Ammo</span>
        <div class="bar"><div id="ammo-bar" class="fill" style="width:0%"></div></div>
        <span id="ammo-text">--/--</span>
      </div>
    `;

    // Vehicle HUD (bottom right)
    const vehicleHud = document.createElement('div');
    vehicleHud.id = 'vehicle-hud';
    vehicleHud.className = 'hud vehicle-hud';
    vehicleHud.innerHTML = `
      <div class="row">
        <span class="label">Vehicle</span>
        <span id="vehicle-state">On foot</span>
      </div>
    `;

    // Append all HUD elements
    hud.appendChild(scoreHud);
    hud.appendChild(wantedHud);
    hud.appendChild(itemHud);
    hud.appendChild(vehicleHud);

    this.elements = {
      scoreEl: document.getElementById('score'),
      wantedLevelEl: document.getElementById('wanted-level'),
      itemNameEl: document.getElementById('item-name'),
      ammoBarEl: document.getElementById('ammo-bar'),
      ammoTextEl: document.getElementById('ammo-text'),
      vehicleStateEl: document.getElementById('vehicle-state')
    };
  }

  update() {
    // Update HUD elements based on game state
  }

  getElement(id) {
    return this.elements[id] || document.getElementById(id);
  }

  reset() {
    const scoreEl = this.getElement('score');
    if (scoreEl) scoreEl.textContent = '0';
    
    const wantedEl = this.getElement('wanted-level');
    if (wantedEl) wantedEl.textContent = '0';
    
    const itemNameEl = this.getElement('item-name');
    if (itemNameEl) itemNameEl.textContent = 'None';
    
    const vehicleStateEl = this.getElement('vehicle-state');
    if (vehicleStateEl) vehicleStateEl.textContent = 'On foot';
    
    const ammoBarEl = this.getElement('ammo-bar');
    if (ammoBarEl) {
      ammoBarEl.style.width = '0%';
      ammoBarEl.style.backgroundColor = '#4CAF50';
    }
    
    const ammoTextEl = this.getElement('ammo-text');
    if (ammoTextEl) ammoTextEl.textContent = '--/--';
  }
}