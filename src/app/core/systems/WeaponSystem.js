import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';
import { DamageTextSystem } from './DamageTextSystem.js';
import { ScoringSystem } from './ScoringSystem.js';

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
    this.scoringSystem = new ScoringSystem();
  }

  update(state, input, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    // Initialize scoring system if not exists
    if (!state.scoringSystem) {
      state.scoringSystem = new ScoringSystem();
    }

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
    // Handle both 'item' and 'weapon' types
    const items = state.entities.filter(e => 
      (e.type === 'item' && e.name === 'Pistol') || 
      (e.type === 'weapon' && e.weaponType === 'pistol')
    );
    
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (Math.hypot(player.pos.x - item.pos.x, player.pos.y - item.pos.y) < 1) {
        player.equippedWeapon = { ...this.weapons['pistol'] };
        player.equippedWeapon.ammo = player.equippedWeapon.maxAmmo;
        player.equippedWeapon.lastFireTime = 0;
        player.equippedWeapon.isReloading = false;
        
        // Show pickup text
        this.damageTextSystem.addPickupText(state, item.pos, 'PISTOL');
        
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
    if (this.isTreeTrunkCollision(projectile.pos.x, projectile.pos.y, tx, ty, state)) {
      return true;
    }
    
    // Check tile collision
    if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
      const tile = map.tiles[ty][tx];
      if ([8, 9].includes(tile)) {
        return true;
      }
    }
    
    // Check entity collisions
    const entities = state.entities.filter(e => 
      (e.type === 'vehicle' || e.type === 'npc') && 
      e !== projectile.owner
    );

    for (const entity of entities) {
      const distance = Math.hypot(
        projectile.pos.x - entity.pos.x,
        projectile.pos.y - entity.pos.y
      );
      
      const radius = entity.type === 'vehicle' ? 0.5 : 0.2;
      if (distance < radius + projectile.size) {
        // Register crime
        if (entity.type === 'vehicle') {
          state.scoringSystem.addCrime(state, 'shoot_vehicle', entity);
          
          // Check if it's a police vehicle
          if (entity.vehicleType === 'emergency' && entity.color === '#0000FF') {
            state.scoringSystem.addCrime(state, 'shoot_police_vehicle', entity);
          }
        }
        
        // Ensure entity has health
        if (!entity.health) {
          if (entity.type === 'vehicle') {
            entity.health = new Health(entity.maxHealth || 100);
          } else if (entity.type === 'npc') {
            // NPCs die instantly to any damage
            entity.health = new Health(1);
          }
        }
        
        // Apply damage
        if (entity.type === 'npc') {
          // NPCs die instantly
          entity.health.hp = 0;
          
          // Register crime for killing pedestrian
          state.scoringSystem.addCrime(state, 'kill_pedestrian', entity);
          
          // Check if it's a police officer
          if (entity.isPolice) {
            state.scoringSystem.addCrime(state, 'kill_police', entity);
          }
        } else {
          // Vehicles take damage normally
          entity.health.takeDamage(projectile.damage);
          state.particleSystem?.emitSparks(state, entity.pos, 10, 4);
        }
        
        // Show damage text
        this.damageTextSystem.addDamageText(state, entity.pos, projectile.damage);
        
        // Handle vehicle destruction with explosion
        if (entity.type === 'vehicle' && !entity.health.isAlive()) {
          this.handleVehicleDestruction(state, entity);
        }
        
        // Update stats
        if (entity.type === 'npc') {
          state.stats.enemiesKilled = (state.stats.enemiesKilled || 0) + 1;
        } else if (entity.type === 'vehicle') {
          state.stats.vehiclesDestroyed = (state.stats.vehiclesDestroyed || 0) + 1;
          
          // Register crime for destroying vehicle
          if (!entity.health.isAlive()) {
            state.scoringSystem.addCrime(state, 'destroy_vehicle', entity);
          }
        }
        
        // Handle entity destruction
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

  handleVehicleDestruction(state, vehicle) {
    // Create explosion using explosion system
    if (state.explosionSystem) {
      state.explosionSystem.createExplosion(state, vehicle.pos);
    }
    
    // remove fixed-intensity shake; ExplosionSystem now handles distance-based shake
    // if (state.cameraSystem) { state.cameraSystem.addShake(1.0); }
    
    // Register crimes
    if (state.scoringSystem) {
      state.scoringSystem.addCrime(state, 'destroy_vehicle', vehicle);
    }
    
    // Remove vehicle from entities
    const vehicleIndex = state.entities.indexOf(vehicle);
    if (vehicleIndex > -1) {
      state.entities.splice(vehicleIndex, 1);
    }
    
    // If this was the player's vehicle, handle death
    if (state.control?.vehicle === vehicle) {
      const deathSystem = state._engine?.systems?.death || 
                         state.deathSystem || 
                         state._engine?.deathSystem;
      if (deathSystem && deathSystem.handlePlayerDeath) {
        deathSystem.handlePlayerDeath(state);
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