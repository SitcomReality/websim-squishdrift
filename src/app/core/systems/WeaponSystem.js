import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';
import { DamageTextSystem } from './DamageTextSystem.js';
import { ScoringSystem } from './ScoringSystem.js';
import { WeaponDefinitions } from './weapons/WeaponDefinitions.js';
import { ProjectileManager } from './weapons/ProjectileManager.js';
import { CollisionHandler } from './weapons/CollisionHandler.js';

export class WeaponSystem {
  constructor() {
    this.weapons = WeaponDefinitions;
    this.damageTextSystem = new DamageTextSystem();
    this.scoringSystem = new ScoringSystem();
    this.projectileManager = new ProjectileManager();
    this.collisionHandler = new CollisionHandler();
  }

  update(state, input, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    // Initialize systems
    if (!state.scoringSystem) {
      state.scoringSystem = new ScoringSystem();
    }

    if (player.inVehicle) return;

    // Handle weapon pickup
    this.handleWeaponPickup(state, player);
    
    // Handle firing
    if (player.equippedWeapon && !player.inVehicle) {
      this.handleWeaponFiring(state, player, input, state.debugOverlay?.enabled || false);
    }

    // Update projectiles
    this.projectileManager.updateProjectiles(state, dt);
    
    // Update ammo bar
    this.updateAmmoBar(state, player);
  }

  updateAmmoBar(state, player) {
    if (!player.equippedWeapon) return;
    
    const weapon = player.equippedWeapon;
    const weaponUI = state.weaponUI || {};
    
    // Calculate percentages
    const ammoPercent = weapon.ammo / weapon.maxAmmo;
    const reloadPercent = weapon.isReloading ? 
      Math.min(1, (Date.now() - weapon.reloadStartTime) / weapon.reloadTime) : 0;
    
    // Update UI
    const ammoBarEl = document.getElementById('ammo-bar');
    if (ammoBarEl) {
      if (weapon.isReloading) {
        // During reload, show reload progress
        ammoBarEl.style.width = `${reloadPercent * 100}%`;
        ammoBarEl.style.backgroundColor = '#FFA500'; // Orange for reloading
      } else {
        // Normal ammo display
        ammoBarEl.style.width = `${ammoPercent * 100}%`;
        ammoBarEl.style.backgroundColor = '#4CAF50'; // Green for ammo
      }
    }
    
    const ammoTextEl = document.getElementById('ammo-text');
    if (ammoTextEl) {
      ammoTextEl.textContent = weapon.isReloading ? 'Reloading...' : `${weapon.ammo}/${weapon.maxAmmo}`;
    }
  }

  handleWeaponPickup(state, player) {
    // Handle both 'item' and 'weapon' types
    const items = state.entities.filter(e => 
      (e.type === 'item' && ['Pistol', 'AK47', 'Shotgun', 'Grenade'].includes(e.name)) || 
      (e.type === 'weapon' && ['pistol', 'ak47', 'shotgun', 'grenade'].includes(e.weaponType))
    );
    
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (Math.hypot(player.pos.x - item.pos.x, player.pos.y - item.pos.y) < 1) {
        const weaponKey = item.name.toLowerCase();
        player.equippedWeapon = { ...this.weapons[weaponKey] };
        player.equippedWeapon.ammo = player.equippedWeapon.maxAmmo;
        player.equippedWeapon.lastFireTime = 0;
        player.equippedWeapon.isReloading = false;
        
        // Show pickup text
        this.damageTextSystem.addPickupText(state, item.pos, item.name.toUpperCase());
        
        // Remove the item from entities
        const index = state.entities.indexOf(item);
        if (index > -1) {
          state.entities.splice(index, 1);
        }
        
        // Create ammo bar if it doesn't exist
        this.createAmmoBar();
        
        const itemNameEl = document.getElementById('item-name');
        if (itemNameEl) itemNameEl.textContent = player.equippedWeapon.name;
        
        // Break after picking up one weapon
        break;
      }
    }
  }

  createAmmoBar() {
    // Create ammo bar if it doesn't exist
    if (!document.getElementById('ammo-container')) {
      const hud = document.getElementById('hud');
      
      const ammoContainer = document.createElement('div');
      ammoContainer.className = 'row';
      ammoContainer.id = 'ammo-container';
      ammoContainer.innerHTML = `
        <span class="label">Ammo</span>
        <div class="bar" style="width: 120px;"><div id="ammo-bar" class="fill" style="width:100%; background-color:#4CAF50;"></div></div>
        <span id="ammo-text">12/12</span>
      `;
      
      // Insert after HP bar
      const hpRow = hud.querySelector('.row');
      if (hpRow) {
        hpRow.insertAdjacentElement('afterend', ammoContainer);
      } else {
        hud.appendChild(ammoContainer);
      }
    }
  }

  handleWeaponFiring(state, player, input, debugEnabled) {
    const weapon = player.equippedWeapon;
    const now = Date.now();
    
    if (weapon.isReloading) {
      if (now - weapon.reloadStartTime >= weapon.reloadTime) {
        weapon.ammo = weapon.maxAmmo;
        weapon.isReloading = false;
      }
      return;
    }
    
    if (input.pressed.has('KeyR') && weapon.ammo < weapon.maxAmmo && !debugEnabled) {
      weapon.isReloading = true;
      weapon.reloadStartTime = now;
      return;
    }
    
    const isFiring = input.mousePos && input.keys.has('MouseLeft');
    if (isFiring && now - weapon.lastFireTime >= weapon.fireRate) {
      if (weapon.ammo <= 0 && !debugEnabled) {
        weapon.isReloading = true;
        weapon.reloadStartTime = now;
        return;
      }
      
      this.projectileManager.fireProjectile(state, player);
      weapon.lastFireTime = now;
      
      if (!debugEnabled) {
        weapon.ammo--;
      }
    }
  }

  isTreeTrunkCollision(projX, projY, tileX, tileY, state) {
    if (!state.world.map.trees) return false;
    
    // Find if there's a tree trunk at this tile
    const tree = state.world.map.trees.find(tree => 
      Math.floor(tree.pos.x) === tileX && Math.floor(tree.pos.y) === tileY
    );
    
    if (!tree) return false;
    
    // Calculate the precise trunk collision area
    const trunkSize = 0.3; // Same as used in aabbForTrunk
    const trunkHalf = trunkSize / 2;
    const trunkCenterX = tileX + 0.5;
    const trunkCenterY = tileY + 0.5;
    
    // Check if projectile is within the trunk's precise hitbox
    const dx = Math.abs(projX - trunkCenterX);
    const dy = Math.abs(projY - trunkCenterY);
    
    return dx <= trunkHalf && dy <= trunkHalf;
  }

  isTreeTrunk(x, y, map) {
    // Use the same precise trunk detection as vehicles
    if (!map.trees) return false;
    return map.trees.some(tree => {
      const trunkX = Math.floor(tree.pos.x);
      const trunkY = Math.floor(tree.pos.y);
      
      // Check if this is the tree trunk at these coordinates
      if (trunkX !== x || trunkY !== y) return false;
      
      // Return true if this is a tree trunk tile
      return true;
    });
  }
}