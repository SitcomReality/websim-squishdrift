import { Vec2 } from '../../utils/Vec2.js';
import { Health } from '../components/Health.js';

export class CollisionSystem {
  constructor() {
    this.collisionPairs = [];
    this.cameraSystem = null; // Will be set externally
    this.lastDamageTime = 0;
    this.invincibilityDuration = 1000; // Increased from 50ms to 1000ms
  }

  // Simple radius-based collision detection
  checkCollision(entityA, entityB, radius = 0.5) {
    const dx = entityA.pos.x - entityB.pos.x;
    const dy = entityA.pos.y - entityB.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius;
  }

  // Check collisions between bullets and entities
  checkBulletCollisions(state) {
    const bullets = state.entities.filter(e => e.type === 'bullet');
    const targets = state.entities.filter(e => 
      (e.type === 'npc' && e.health?.isAlive()) || 
      (e.type === 'vehicle' && e.health?.isAlive())
    );

    for (const bullet of bullets) {
      for (const target of targets) {
        if (this.checkCollision(bullet, target, 0.35)) {
          target.health.takeDamage(25);
          
          // Trigger screen shake for player damage
          if (target.type === 'npc') {
            this.triggerShake(state, 0.5);
          }
          
          // Play impact sound for vehicles hit by bullets
          if (target.type === 'vehicle') {
            const impactSound = ['impact02', 'impact03'][Math.floor(Math.random() * 2)];
            state.audio?.playSfxAt?.(impactSound, target.pos, state);
          }
          
          // Remove bullet on hit
          const bulletIndex = state.entities.indexOf(bullet);
          if (bulletIndex > -1) state.entities.splice(bulletIndex, 1);
          
          // Remove destroyed targets
          if (!target.health.isAlive()) {
            const targetIndex = state.entities.indexOf(target);
            if (targetIndex > -1) state.entities.splice(targetIndex, 1);
          }
        }
      }
    }
  }

  // Check collisions between player and vehicles
  checkPlayerVehicleCollisions(state) {
    const player = state.entities.find(e => e.type === 'player');
    const vehicles = state.entities.filter(e => e.type === 'vehicle');
    
    if (!player || !player.health) return;
    if (state.control?.inVehicle) return; // disable player collisions while inside a vehicle
    if (player.collisionDisabled) return; // Skip if player collision is disabled
    
    // invincibility frames: skip damage if recently hit
    const now = Date.now();
    if (now - this.lastDamageTime < this.invincibilityDuration) return;
    
    // Check tree trunk collision for player
    const map = state.world.map;
    const tx = Math.floor(player.pos.x);
    const ty = Math.floor(player.pos.y);
    // Only treat the small trunk area as solid (same size used elsewhere)
    const trunkHalf = 0.3 / 2; // trunkSize / 2
    const playerHw = (player.hitboxW || 0.15) / 2;
    const playerHh = (player.hitboxH || 0.15) / 2;
    const trunkCenterX = tx + 0.5, trunkCenterY = ty + 0.5;
    const overlapX = Math.abs(player.pos.x - trunkCenterX) < (trunkHalf + playerHw);
    const overlapY = Math.abs(player.pos.y - trunkCenterY) < (trunkHalf + playerHh);
    if (this.isTreeTrunk(tx, ty, map) && overlapX && overlapY) {
      // push player away from trunk center only when overlapping trunk AABB
      const dx = player.pos.x - trunkCenterX;
      const dy = player.pos.y - trunkCenterY;
      const len = Math.hypot(dx, dy) || 1;
      player.pos.x += (dx / len) * 0.2;
      player.pos.y += (dy / len) * 0.2;
      return;
    }
    
    for (const vehicle of vehicles) {
      if (vehicle.controlled) continue; // Skip player-controlled vehicle
      
      // Use actual rectangle half-extents (converted into an equivalent circle radius)
      const playerHw = (player.hitboxW || 0.15) / 2;
      const playerHh = (player.hitboxH || 0.15) / 2;
      const vehicleHw = (vehicle.hitboxW || 0.9) / 2;
      const vehicleHh = (vehicle.hitboxH || 0.5) / 2;
      const playerRadius = Math.hypot(playerHw, playerHh);
      const vehicleRadius = Math.hypot(vehicleHw, vehicleHh);
      const collisionRadius = playerRadius + vehicleRadius;
      
      if (this.checkCollision(player, vehicle, collisionRadius)) {
        // Compute damage based on vehicle movement vector relative to player
        const vx = vehicle.vel?.x || 0, vy = vehicle.vel?.y || 0;
        const speed = Math.hypot(vx, vy);
        if (speed > 0.01) {
          const vdir = { x: vx / speed, y: vy / speed };
          const toPlayer = { x: player.pos.x - vehicle.pos.x, y: player.pos.y - vehicle.pos.y };
          const dist = Math.hypot(toPlayer.x, toPlayer.y) || 1;
          const toPlayerN = { x: toPlayer.x / dist, y: toPlayer.y / dist };
          const alignment = vdir.x * toPlayerN.x + vdir.y * toPlayerN.y; // 1 => directly toward player
          if (alignment > 0) {
            // Scale damage by speed and alignment; tune multiplier to keep similar feel
            const damage = Math.max(1, Math.round(speed * alignment * 20));
            const oldHealth = player.health.hp;
            player.health.takeDamage(damage);
            const damageTaken = oldHealth - player.health.hp;
            if (damageTaken > 0) {
              this.lastDamageTime = now;
              this.triggerShake(state, Math.min(1, damageTaken / 50));
              // Add floating damage text
              this.addDamageText(state, player.pos, damage);
            }
            // Knockback away from vehicle (scaled by damage)
            const k = Math.min(1, damage / 30) * 0.35;
            player.pos.x += toPlayerN.x * k;
            player.pos.y += toPlayerN.y * k;
          }
        }
      }
    }
  }

  isTreeTrunk(x, y, map) {
    if (!map.trees) return false;
    return map.trees.some(tree => 
      Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
    );
  }

  triggerShake(state, intensity = 1) {
    if (this.cameraSystem) {
      this.cameraSystem.addShake(intensity);
    }
  }

  addDamageText(state, pos, damage) {
    if (!state.damageTexts) state.damageTexts = [];
    state.damageTexts.push({
      type: 'damage_text',
      pos: { x: pos.x, y: pos.y },
      text: `-${damage}`,
      color: '#ff3333',
      age: 0,
      lifetime: 1.5,
      size: 16
    });
  }

  update(state) {
    this.checkBulletCollisions(state);
    this.checkPlayerVehicleCollisions(state);
  }
}