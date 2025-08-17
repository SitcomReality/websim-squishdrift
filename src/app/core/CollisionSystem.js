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

  // Check collisions between vehicles and pedestrians
  checkVehiclePedestrianCollisions(state) {
    const vehicles = state.entities.filter(e => e.type === 'vehicle');
    const pedestrians = state.entities.filter(e => e.type === 'npc');

    for (const vehicle of vehicles) {
      for (let i = pedestrians.length - 1; i >= 0; i--) {
        const pedestrian = pedestrians[i];
        
        // Skip if vehicle is controlled by player (they might be careful)
        if (vehicle.controlled) continue;
        
        if (this.checkCollision(vehicle, pedestrian, 0.75)) {
          // Pedestrian gets squished - create blood stain
          const bloodStain = {
            type: 'blood',
            pos: new Vec2(pedestrian.pos.x, pedestrian.pos.y),
            size: 0.6 + Math.random() * 0.4,
            color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
            rotation: Math.random() * Math.PI * 2
          };
          
          state.entities.push(bloodStain);
          
          // Remove the pedestrian
          const pedestrianIndex = state.entities.indexOf(pedestrian);
          if (pedestrianIndex > -1) {
            state.entities.splice(pedestrianIndex, 1);
          }
        }
      }
    }
  }

  update(state) {
    this.checkBulletCollisions(state);
    this.checkVehiclePedestrianCollisions(state);
  }
}