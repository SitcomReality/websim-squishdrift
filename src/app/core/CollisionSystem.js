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
          // Ensure entity has health
          if (!target.health) {
            if (target.type === 'vehicle') {
              target.health = new Health(target.maxHealth || 100);
            } else if (target.type === 'npc') {
              // NPCs die instantly
              target.health = new Health(1);
              target.health.hp = 0;
            }
          }
          
          // Apply damage
          target.health.takeDamage(25);
          
          // Handle NPC death with both sounds
          if (target.type === 'npc' && !target.health.isAlive()) {
            state.audio?.playSfxAt?.('pedestrian_death', target.pos, state);
            
            // Play random oof sound
            const oofSound = Math.random() < 0.5 ? 'oof01' : 'oof02';
            state.audio?.playSfxAt?.(oofSound, target.pos, state);
            
            const bloodStain = {
              type: 'blood',
              pos: new Vec2(target.pos.x, target.pos.y),
              size: 0.6 + Math.random() * 0.4,
              color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
              rotation: Math.random() * Math.PI * 2
            };
            
            state.entities.push(bloodStain);
            const targetIndex = state.entities.indexOf(target);
            if (targetIndex > -1) state.entities.splice(targetIndex, 1);
          }
          
          // Remove bullet on hit
          const bulletIndex = state.entities.indexOf(bullet);
          if (bulletIndex > -1) state.entities.splice(bulletIndex, 1);
        }
      }
    }
  }

  update(state) {
    this.checkBulletCollisions(state);
    // vehicle-pedestrian collision is now handled by VehicleCollisionSystem
  }
}