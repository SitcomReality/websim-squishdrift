import { Vec2 } from '../../utils/Vec2.js';

export class CollisionSystem {
  /* @tweakable collision detection radius */
  constructor() {
    this.collisionPairs = [];
    this.collisionRadius = 0.35;
    this.playerVehicleCollisionRadius = 0.75;
  }

  // Simple radius-based collision detection
  checkCollision(entityA, entityB, radius = this.collisionRadius) {
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
        if (this.checkCollision(bullet, target, this.collisionRadius)) {
          target.health.takeDamage(25);
          
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
    
    for (const vehicle of vehicles) {
      if (vehicle.controlled) continue; // Skip player-controlled vehicle
      
      if (this.checkCollision(player, vehicle, this.playerVehicleCollisionRadius)) {
        player.health.takeDamage(10);
        
        // Simple knockback
        const dx = player.pos.x - vehicle.pos.x;
        const dy = player.pos.y - vehicle.pos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          player.pos.x += (dx / len) * 0.2;
          player.pos.y += (dy / len) * 0.2;
        }
      }
    }
  }

  update(state) {
    this.checkBulletCollisions(state);
    this.checkPlayerVehicleCollisions(state);
  }
}