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

  handleNPCDeath(state, npc) {
    // Play pedestrian death sound
    state.audio?.playSfxAt?.('pedestrian_death', npc.pos, state);
    
    // Also play random oof sound
    const oofSound = Math.random() < 0.5 ? 'oof01' : 'oof02';
    state.audio?.playSfxAt?.(oofSound, npc.pos, state);
    
    const bloodStain = {
      type: 'blood',
      pos: new Vec2(npc.pos.x, npc.pos.y),
      size: 0.6 + Math.random() * 0.4,
      color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
      rotation: Math.random() * Math.PI * 2
    };
    
    // Use blood manager if available
    if (state.bloodManager) {
      state.bloodManager.addBlood(state, bloodStain);
    } else {
      state.entities.push(bloodStain);
    }
    
    // Remove NPC
    const npcIndex = state.entities.indexOf(npc);
    if (npcIndex > -1) {
      state.entities.splice(npcIndex, 1);
    }
  }

  update(state) {
    this.checkBulletCollisions(state);
    // vehicle-pedestrian collision is now handled by VehicleCollisionSystem
  }
}