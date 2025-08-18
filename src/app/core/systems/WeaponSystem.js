import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';
import { DamageTextSystem } from './DamageTextSystem.js';

export class WeaponSystem {
  constructor() {
    this.weapons = {
      pistol: {
        name: 'Pistol',
        damage: 25,
        range: 20,
        fireRate: 300, // ms between shots
        projectileSpeed: 15,
        projectileSize: 0.1,
        maxAmmo: 12,
        reloadTime: 1000 // ms
      }
    };
    this.damageTextSystem = new DamageTextSystem();
  }

  update(state, input, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    // Skip weapon handling if player is in vehicle
    if (player.inVehicle) return;

    // Handle weapon pickup
    this.handleWeaponPickup(state, player);
    
    // Handle firing
    if (player.equippedWeapon && !player.inVehicle) {
      this.handleWeaponFiring(state, player, input, state.debugOverlay?.enabled || false);
    }

    // Update damage text system
    this.damageTextSystem.update(state, dt);

    // Update projectiles
    this.updateProjectiles(state, dt);
    
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
    const weapons = state.entities.filter(e => e.type === 'weapon');
    for (let i = weapons.length - 1; i >= 0; i--) {
      const weapon = weapons[i];
      if (Math.hypot(player.pos.x - weapon.pos.x, player.pos.y - weapon.pos.y) < 1) {
        player.equippedWeapon = { ...this.weapons[weapon.weaponType] };
        player.equippedWeapon.ammo = player.equippedWeapon.maxAmmo;
        player.equippedWeapon.lastFireTime = 0;
        player.equippedWeapon.isReloading = false;
        
        // Show pickup text
        this.damageTextSystem.addPickupText(state, weapon.pos, weapon.weaponType.toUpperCase());
        
        state.entities.splice(state.entities.indexOf(weapon), 1);
        
        // Create ammo bar if it doesn't exist
        this.createAmmoBar();
        
        const itemNameEl = document.getElementById('item-name');
        if (itemNameEl) itemNameEl.textContent = player.equippedWeapon.name;
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
      
      this.fireProjectile(state, player);
      weapon.lastFireTime = now;
      
      if (!debugEnabled) {
        weapon.ammo--;
      }
    }
  }

  fireProjectile(state, player) {
    const weapon = player.equippedWeapon;
    const angle = player.facingAngle || Math.atan2(player.facing.y, player.facing.x);
    const origin = (state.control?.inVehicle && state.control.vehicle?.pos) ? state.control.vehicle.pos : player.pos;
    
    const projectile = {
      type: 'projectile',
      pos: new Vec2(origin.x, origin.y),
      vel: new Vec2(
        Math.cos(angle) * weapon.projectileSpeed,
        Math.sin(angle) * weapon.projectileSpeed
      ),
      damage: weapon.damage,
      range: weapon.range,
      lifetime: weapon.range / weapon.projectileSpeed,
      age: 0,
      size: weapon.projectileSize,
      owner: 'player'
    };
    
    state.entities.push(projectile);
  }

  updateProjectiles(state, dt) {
    const projectiles = state.entities.filter(e => e.type === 'projectile');
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      
      proj.pos.x += proj.vel.x * dt;
      proj.pos.y += proj.vel.y * dt;
      
      proj.age += dt;
      if (proj.age >= proj.lifetime) {
        state.entities.splice(state.entities.indexOf(proj), 1);
        continue;
      }
      
      if (this.checkCollisions(state, proj)) {
        state.entities.splice(state.entities.indexOf(proj), 1);
      }
    }
  }

  checkCollisions(state, projectile) {
    const map = state.world.map;
    const tileSize = state.world.tileSize;
    
    // Check map boundaries
    if (projectile.pos.x < 0 || projectile.pos.x >= map.width || 
        projectile.pos.y < 0 || projectile.pos.y >= map.height) {
      return true;
    }
    
    // Check tree trunk collision
    const tx = Math.floor(projectile.pos.x);
    const ty = Math.floor(projectile.pos.y);
    if (this.isTreeTrunk(tx, ty, map)) {
      return true;
    }
    
    // Check tile collision
    if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
      const tile = map.tiles[ty][tx];
      if ([8, 9].includes(tile)) { // BuildingWall, BuildingFloor
        return true;
      }
    }
    
    // Check entity collisions
    const entities = state.entities.filter(e => 
      (e.type === 'vehicle' || e.type === 'npc') && 
      e !== projectile.owner &&
      (!e.health || e.health.isAlive())
    );
    
    for (const entity of entities) {
      const distance = Math.hypot(
        projectile.pos.x - entity.pos.x,
        projectile.pos.y - entity.pos.y
      );
      
      const radius = entity.type === 'vehicle' ? 0.5 : 0.2;
      if (distance < radius + projectile.size) {
        // Apply damage
        if (!entity.health) {
          entity.health = new Health(100);
        }
        
        entity.health.takeDamage(projectile.damage);
        
        // Show damage text
        this.damageTextSystem.addDamageText(state, entity.pos, projectile.damage);
        
        // Remove entity if dead
        if (!entity.health.isAlive()) {
          const index = state.entities.indexOf(entity);
          if (index > -1) {
            if (entity.type === 'npc') {
              const bloodStain = {
                type: 'blood',
                pos: { x: entity.pos.x, y: entity.pos.y },
                size: 0.6 + Math.random() * 0.4,
                color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
                rotation: Math.random() * Math.PI * 2
              };
              
              if (state.bloodManager) {
                state.bloodManager.addBlood(state, bloodStain);
              } else {
                state.entities.push(bloodStain);
              }
            }
            
            state.entities.splice(index, 1);
          }
        }
        
        return true;
      }
    }
    
    return false;
  }

  isTreeTrunk(x, y, map) {
    if (!map.trees) return false;
    return map.trees.some(tree => 
      Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
    );
  }
}