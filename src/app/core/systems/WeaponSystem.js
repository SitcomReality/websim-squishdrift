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
    
    // Check projectile collisions
    this.checkProjectileCollisions(state);
    
    // Update ammo bar
    this.updateAmmoBar(state, player);
  }

  checkProjectileCollisions(state) {
    const projectiles = state.entities.filter(e => e.type === 'projectile');
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      
      // Check collisions using collision handler
      if (this.collisionHandler.checkCollisions(state, proj)) {
        // Remove projectile on collision
        const index = state.entities.indexOf(proj);
        if (index > -1) {
          state.entities.splice(index, 1);
        }
      }
    }
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
      (e.type === 'item' && ['Pistol', 'AK47', 'Shotgun', 'Grenade', 'Health', 'Bribe'].includes(e.name)) || 
      (e.type === 'weapon' && ['pistol', 'ak47', 'shotgun', 'grenade', 'bribe'].includes(e.weaponType))
    );
    
    // Handle medkit pickup separately
    const healthItems = state.entities.filter(e => 
      e.type === 'item' && e.name === 'Health'
    );
    
    for (let i = healthItems.length - 1; i >= 0; i--) {
      const item = healthItems[i];
      if (Math.hypot(player.pos.x - item.pos.x, player.pos.y - item.pos.y) < 1) {
        // Calculate actual health gained
        const healthGained = Math.min(15, player.health.maxHp - player.health.hp);
        
        // Restore health
        player.health.hp = Math.min(player.health.hp + 15, player.health.maxHp);
        
        // Show pickup text with actual health gained
        this.damageTextSystem.addPickupText(state, item.pos, `+${healthGained}`, '#4CAF50');
        
        // Remove the medkit
        const index = state.entities.indexOf(item);
        if (index > -1) {
          state.entities.splice(index, 1);
        }
        
        // Play health pickup SFX
        state.audio?.playSfx?.('pickup_health');
        
        // Mark spot as empty if it has one
        if (typeof item.spotId === 'number' && state?.pickupSpots?.[item.spotId]) {
          state.pickupSpots[item.spotId].hasItem = false;
        }
      }
    }
    
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (Math.hypot(player.pos.x - item.pos.x, player.pos.y - item.pos.y) < 1) {
        // Handle bribe pickup
        if (item.name === 'Bribe') {
          // Reduce wanted level
          if (state.emergencyServices && state.emergencyServices.wantedLevel > 0) {
            state.emergencyServices.wantedLevel = Math.max(0, state.emergencyServices.wantedLevel - 1);
            state.emergencyServices.wantedDecay = 0; // Reset decay timer
            
            // Show pickup text
            this.damageTextSystem.addPickupText(state, item.pos, 'BRIBE', '#FFD700');
          }
          
          // Remove the bribe
          const index = state.entities.indexOf(item);
          if (index > -1) {
            state.entities.splice(index, 1);
          }
          
          // Play bribe pickup SFX
          state.audio?.playSfx?.('pickup_bribe');
          
          // Remove from pickup spot
          if (typeof item.spotId === 'number' && state?.pickupSpots?.[item.spotId]) {
            state.pickupSpots[item.spotId].hasItem = false;
          }
        } else if (item.name !== 'Health') {
          // Handle weapons - always replace current weapon
          const weaponKey = item.name.toLowerCase();
          player.equippedWeapon = { ...this.weapons[weaponKey] };
          player.equippedWeapon.ammo = player.equippedWeapon.maxAmmo;
          player.equippedWeapon.lastFireTime = 0;
          player.equippedWeapon.isReloading = false;
          
          // Show pickup text
          this.damageTextSystem.addPickupText(state, item.pos, item.name.toUpperCase());
          
          // Play default pickup SFX (weapons, etc.)
          state.audio?.playSfx?.('pickup_default');
          
          // Remove the item from entities
          const index = state.entities.indexOf(item);
          if (index > -1) {
            state.entities.splice(index, 1);
          }
          
          // Remove from pickup spot
          if (typeof item.spotId === 'number' && state?.pickupSpots?.[item.spotId]) {
            state.pickupSpots[item.spotId].hasItem = false;
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
    
    const isFiring = input.mousePos && input.keys.has('MouseLeft');
    if (isFiring && now - weapon.lastFireTime >= weapon.fireRate) {
      if (weapon.ammo <= 0 && !debugEnabled) {
        // Instead of reloading, remove the weapon entirely
        player.equippedWeapon = null;
        
        // Update HUD to show "None"
        const itemNameEl = document.getElementById('item-name');
        if (itemNameEl) {
          itemNameEl.textContent = 'None';
        }
        
        // Remove ammo bar
        const ammoContainer = document.getElementById('ammo-container');
        if (ammoContainer) {
          ammoContainer.remove();
        }
        
        return;
      }
      
      // Play appropriate sound effect based on weapon type
      if (weapon.name === 'Pistol' || weapon.name === 'AK47') {
        state.audio?.playSfx?.('shoot01');
      } else if (weapon.name === 'Shotgun') {
        state.audio?.playSfx?.('shoot02');
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
    const trunkSize = 0.3;
    const trunkHalf = trunkSize / 2;
    const trunkCenterX = tileX + 0.5;
    const trunkCenterY = tileY + 0.5;
    
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