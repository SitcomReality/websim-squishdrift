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

    for (const v of vehicles) {
      for (let i = pedestrians.length - 1; i >= 0; i--) {
        const ped = pedestrians[i];
        if (this.checkCollision(v, ped, 0.45)) {
          // spawn blood stain at ped position
          state.entities.push({
            type: 'blood',
            pos: { x: ped.pos.x, y: ped.pos.y },
            size: 0.6 + Math.random() * 0.4,
            color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
            rotation: Math.random() * Math.PI * 2
          });
          // remove pedestrian
          const idx = state.entities.indexOf(ped);
          if (idx > -1) state.entities.splice(idx, 1);
        }
      }
    }
  }

  update(state) {
    this.checkBulletCollisions(state);
    // remove player-vehicle radius collisions; handled by VehicleCollisionSystem now
    // this.checkPlayerVehicleCollisions(state);
    this.checkVehiclePedestrianCollisions(state);
  }
}