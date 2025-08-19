import { Vec2 } from '../../utils/Vec2.js';

export class CollisionSystem {
  constructor() {
    this.collisionPairs = [];
    this.cameraSystem = null; // Will be set externally
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
    
    // Check tree trunk collision for player
    const map = state.world.map;
    const tx = Math.floor(player.pos.x);
    const ty = Math.floor(player.pos.y);
    if (this.isTreeTrunk(tx, ty, map)) {
      // Push player away from tree trunk
      const dx = player.pos.x - (tx + 0.5);
      const dy = player.pos.y - (ty + 0.5);
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
        const oldHealth = player.health.hp;
        player.health.takeDamage(10);
        
        // Trigger screen shake when player takes damage
        const damageTaken = oldHealth - player.health.hp;
        if (damageTaken > 0) {
          this.triggerShake(state, damageTaken / 100); // Scale shake by damage amount
        }
        
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

  update(state) {
    this.checkBulletCollisions(state);
    this.checkPlayerVehicleCollisions(state);
  }
}