export class HUDManager {
  constructor() {
    this.elements = {};
  }

  initialize() {
    // Don't create HUD elements - they already exist in index.html
    this.findExistingElements();
  }

  findExistingElements() {
    this.elements = {
      wantedLevelEl: document.getElementById('wanted-level'),
      scoreEl: document.getElementById('score'),
      itemNameEl: document.getElementById('item-name'),
      ammoBarEl: document.getElementById('ammo-bar'),
      ammoTextEl: document.getElementById('ammo-text'),
      vehicleStateEl: document.getElementById('vehicle-state')
    };
  }

  update() {
    // Update HUD elements based on game state
  }

  // Add method to create ammo bar if it doesn't exist
  createAmmoBar() {
    if (!document.getElementById('ammo-container')) {
      const itemHud = document.getElementById('item-hud');
      if (itemHud) {
        const row = document.createElement('div');
        row.className = 'row';
        row.id = 'ammo-container';
        row.innerHTML = `
          <span class="label">Ammo</span>
          <div class="bar"><div id="ammo-bar" class="fill" style="width:100%"></div></div>
          <span id="ammo-text">--/--</span>
        `;
        itemHud.appendChild(row);
        this.findExistingElements();
        row.style.display = 'none'; // Initially hidden
      }
    }
  }
}