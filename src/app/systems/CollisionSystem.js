import { Vec2 } from '../../utils/Vec2.js';

export class CollisionSystem {
  constructor() {
    this.collisionPairs = [];
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
      
      if (this.checkCollision(player, vehicle, 0.75)) {
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

  // Check vehicle-to-vehicle collisions and apply bounce
  checkVehicleCollisions(state) {
    const vehicles = state.entities.filter(e => e.type === 'vehicle');
    
    for (let i = 0; i < vehicles.length; i++) {
      for (let j = i + 1; j < vehicles.length; j++) {
        const vehicleA = vehicles[i];
        const vehicleB = vehicles[j];
        
        if (this.checkCollision(vehicleA, vehicleB, 0.8)) {
          // Calculate collision vector
          const dx = vehicleA.pos.x - vehicleB.pos.x;
          const dy = vehicleA.pos.y - vehicleB.pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            // Normalize collision vector
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Apply bounce force (small fraction of collision force)
            const bounceForce = 0.3;
            
            // Move vehicles apart slightly
            const separation = 0.8 - distance;
            const moveX = nx * separation * 0.5;
            const moveY = ny * separation * 0.5;
            
            vehicleA.pos.x += moveX;
            vehicleA.pos.y += moveY;
            vehicleB.pos.x -= moveX;
            vehicleB.pos.y -= moveY;
            
            // Apply bounce velocity
            const relativeVelX = (vehicleA.vel?.x || 0) - (vehicleB.vel?.x || 0);
            const relativeVelY = (vehicleA.vel?.y || 0) - (vehicleB.vel?.y || 0);
            
            const dotProduct = relativeVelX * nx + relativeVelY * ny;
            
            if (!vehicleA.vel) vehicleA.vel = { x: 0, y: 0 };
            if (!vehicleB.vel) vehicleB.vel = { x: 0, y: 0 };
            
            vehicleA.vel.x -= bounceForce * nx * dotProduct;
            vehicleA.vel.y -= bounceForce * ny * dotProduct;
            vehicleB.vel.x += bounceForce * nx * dotProduct;
            vehicleB.vel.y += bounceForce * ny * dotProduct;
            
            // Apply velocity to position
            vehicleA.pos.x += vehicleA.vel.x * 0.016; // dt approximation
            vehicleA.pos.y += vehicleA.vel.y * 0.016;
            vehicleB.pos.x += vehicleB.vel.x * 0.016;
            vehicleB.pos.y += vehicleB.vel.y * 0.016;
            
            // Dampen velocity over time
            vehicleA.vel.x *= 0.9;
            vehicleA.vel.y *= 0.9;
            vehicleB.vel.x *= 0.9;
            vehicleB.vel.y *= 0.9;
          }
        }
      }
    }
  }

  update(state) {
    this.checkBulletCollisions(state);
    this.checkPlayerVehicleCollisions(state);
    this.checkVehicleCollisions(state);
  }
}