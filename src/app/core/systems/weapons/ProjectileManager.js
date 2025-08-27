import { Vec2 } from '../../../../utils/Vec2.js';

export class ProjectileManager {
  createProjectile(state, player, weapon) {
    const angle = player.facingAngle || Math.atan2(player.facing.y, player.facing.x);
    const origin = (state.control?.inVehicle && state.control.vehicle?.pos) ? state.control.vehicle.pos : player.pos;
    
    if (weapon.name === 'Grenade') {
      return this.createGrenadeProjectile(origin, angle, weapon);
    } else {
      return this.createStandardProjectile(origin, angle, weapon);
    }
  }

  createGrenadeProjectile(origin, angle, weapon) {
    return {
      type: 'projectile',
      pos: new Vec2(origin.x, origin.y),
      vel: new Vec2(
        Math.cos(angle) * weapon.projectileSpeed,
        Math.sin(angle) * weapon.projectileSpeed
      ),
      damage: 0,
      range: weapon.range,
      lifetime: weapon.range / weapon.projectileSpeed,
      age: 0,
      size: weapon.projectileSize,
      owner: 'player',
      isGrenade: true,
      explosionDamage: weapon.damage,
      shrapnelCount: 12,
      shrapnelRange: 8
    };
  }

  createStandardProjectile(origin, angle, weapon) {
    return {
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
  }

  updateProjectiles(state, dt) {
    const projectiles = state.entities.filter(e => e.type === 'projectile');
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      
      proj.pos.x += proj.vel.x * dt;
      proj.pos.y += proj.vel.y * dt;
      
      proj.age += dt;
      if (proj.age >= proj.lifetime) {
        // Play hit sound for lifetime expiration
        state.audio?.playSfxAt?.('projectile_hit', proj.pos, state);
        state.entities.splice(state.entities.indexOf(proj), 1);
        continue;
      }
      
      if (proj.isGrenade) {
        const collision = this.checkGrenadeCollision(state, proj);
        if (collision || proj.age >= proj.lifetime) {
          this.explodeGrenade(state, proj);
          // Play hit sound for grenade collision
          state.audio?.playSfxAt?.('projectile_hit', proj.pos, state);
          state.entities.splice(state.entities.indexOf(proj), 1);
          continue;
        }
      }
    }
  }

  fireProjectile(state, player) {
    const weapon = player.equippedWeapon;
    if (!weapon) return;

    const projectile = this.createProjectile(state, player, weapon);
    state.entities.push(projectile);

    // Handle shotgun pellets
    if (weapon.name === 'Shotgun' && weapon.pellets > 1) {
      for (let i = 1; i < weapon.pellets; i++) {
        const spread = weapon.spread || 0.25;
        const angle = player.facingAngle || Math.atan2(player.facing.y, player.facing.x);
        const spreadAngle = angle + (Math.random() - 0.5) * spread;
        
        const pellet = this.createStandardProjectile(
          (state.control?.inVehicle && state.control.vehicle?.pos) ? state.control.vehicle.pos : player.pos,
          spreadAngle,
          weapon
        );
        state.entities.push(pellet);
      }
    }
  }

  checkGrenadeCollision(state, grenade) {
    const map = state.world.map;
    
    // Check map boundaries
    if (grenade.pos.x < 0 || grenade.pos.x >= map.width || 
        grenade.pos.y < 0 || grenade.pos.y >= map.height) {
      // Play hit sound for boundary collision
      state.audio?.playSfxAt?.('projectile_hit', grenade.pos, state);
      return true;
    }
    
    // Check tree trunk collision
    const tx = Math.floor(grenade.pos.x);
    const ty = Math.floor(grenade.pos.y);
    if (this.isTreeTrunkCollision(grenade.pos.x, grenade.pos.y, tx, ty, state)) {
      // Play hit sound for tree collision
      state.audio?.playSfxAt?.('projectile_hit', grenade.pos, state);
      return true;
    }
    
    // Check tile collision
    if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
      const tile = map.tiles[ty][tx];
      if ([8, 9].includes(tile)) {
        // Play hit sound for wall collision
        state.audio?.playSfxAt?.('projectile_hit', grenade.pos, state);
        return true;
      }
    }
    
    return false;
  }

  explodeGrenade(state, grenade) {
    // Create explosion effect
    if (state.explosionSystem) {
      state.explosionSystem.createExplosion(state, grenade.pos);
    }
    
    // Create shrapnel projectiles
    const shrapnelCount = grenade.shrapnelCount || 12;
    const damage = grenade.explosionDamage || 100;
    const range = grenade.shrapnelRange || 8;
    
    for (let i = 0; i < shrapnelCount; i++) {
      const angle = (i / shrapnelCount) * Math.PI * 2;
      const speed = 12 + Math.random() * 4;
      
      const shrapnel = {
        type: 'projectile',
        pos: new Vec2(grenade.pos.x, grenade.pos.y),
        vel: new Vec2(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        ),
        damage: Math.round(damage * 0.6),
        range: range,
        lifetime: range / speed,
        age: 0,
        size: 0.05,
        owner: grenade.owner,
        isShrapnel: true
      };
      
      state.entities.push(shrapnel);
    }
    
    if (state.cameraSystem) {
      state.cameraSystem.addShake(1.5);
    }
  }

  isTreeTrunkCollision(projX, projY, tileX, tileY, state) {
    if (!state.world.map.trees) return false;
    
    const tree = state.world.map.trees.find(tree => 
      Math.floor(tree.pos.x) === tileX && Math.floor(tree.pos.y) === tileY
    );
    
    if (!tree) return false;
    
    const trunkSize = 0.3;
    const trunkHalf = trunkSize / 2;
    const trunkCenterX = tileX + 0.5;
    const trunkCenterY = tileY + 0.5;
    
    const dx = Math.abs(projX - trunkCenterX);
    const dy = Math.abs(projY - trunkCenterY);
    
    return dx <= trunkHalf && dy <= trunkHalf;
  }
}