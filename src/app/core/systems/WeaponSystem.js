import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';

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
  }

  update(state, input, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;

    // Handle weapon pickup
    this.handleWeaponPickup(state, player);
    
    // Handle firing
    if (player.equippedWeapon) {
      this.handleWeaponFiring(state, player, input);
    }

    // Update projectiles
    this.updateProjectiles(state, dt);
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
        
        state.entities.splice(state.entities.indexOf(weapon), 1);
        
        // Update HUD
        const itemNameEl = document.getElementById('item-name');
        if (itemNameEl) itemNameEl.textContent = player.equippedWeapon.name;
      }
    }
  }

  handleWeaponFiring(state, player, input) {
    const weapon = player.equippedWeapon;
    const now = Date.now();
    
    if (weapon.isReloading) {
      if (now - weapon.reloadStartTime >= weapon.reloadTime) {
        weapon.ammo = weapon.maxAmmo;
        weapon.isReloading = false;
      }
      return;
    }
    
    // Reload on R
    if (input.pressed.has('KeyR') && weapon.ammo < weapon.maxAmmo) {
      weapon.isReloading = true;
      weapon.reloadStartTime = now;
      return;
    }
    
    // Fire on mouse click
    if (input.keys.has('MouseLeft') && now - weapon.lastFireTime >= weapon.fireRate) {
      if (weapon.ammo <= 0) {
        // Auto-reload
        weapon.isReloading = true;
        weapon.reloadStartTime = now;
        return;
      }
      
      this.fireProjectile(state, player);
      weapon.lastFireTime = now;
      weapon.ammo--;
    }
  }

  fireProjectile(state, player) {
    const weapon = player.equippedWeapon;
    const angle = player.facingAngle || Math.atan2(player.facing.y, player.facing.x);
    
    const projectile = {
      type: 'projectile',
      pos: new Vec2(player.pos.x, player.pos.y),
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
      
      // Update position
      proj.pos.x += proj.vel.x * dt;
      proj.pos.y += proj.vel.y * dt;
      
      // Update age and lifetime
      proj.age += dt;
      if (proj.age >= proj.lifetime) {
        state.entities.splice(state.entities.indexOf(proj), 1);
        continue;
      }
      
      // Check collisions
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
    
    // Check tile collision
    const tx = Math.floor(projectile.pos.x);
    const ty = Math.floor(projectile.pos.y);
    if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
      const tile = map.tiles[ty][tx];
      // Solid tiles
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
        
        // Show damage indicator
        this.createDamageIndicator(state, entity.pos, projectile.damage);
        
        // Remove entity if dead
        if (!entity.health.isAlive()) {
          const index = state.entities.indexOf(entity);
          if (index > -1) {
            // Create blood stain for NPCs
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

  createDamageIndicator(state, pos, damage) {
    const indicator = {
      type: 'damage_indicator',
      pos: { x: pos.x, y: pos.y - 0.5 },
      damage: damage,
      age: 0,
      lifetime: 1.0
    };
    
    state.entities.push(indicator);
  }
}