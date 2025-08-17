import { Vec2 } from '../../utils/Vec2.js';
import { BloodManager } from '../entities/drawBlood.js';

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
        
        if (this.checkCollision(vehicle, pedestrian, 0.45)) {
            // Ensure BloodManager exists
            if (!state.bloodManager) {
                state.bloodManager = new BloodManager(25);
            }
            
            const bloodStain = {
                type: 'blood',
                pos: { x: pedestrian.pos.x, y: pedestrian.pos.y },
                size: 0.25 + (state.rand ? state.rand() * 0.15 : Math.random() * 0.15), // 25% of original size
                color: `hsl(0, 70%, ${30 + (state.rand ? state.rand() * 20 : Math.random() * 20)}%)`,
                rotation: (state.rand ? state.rand() * Math.PI * 2 : Math.random() * Math.PI * 2)
            };
            
            state.bloodManager.addBlood(state, bloodStain);

            const pedIndex = state.entities.indexOf(pedestrian);
            if (pedIndex > -1) {
                state.entities.splice(pedIndex, 1);
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