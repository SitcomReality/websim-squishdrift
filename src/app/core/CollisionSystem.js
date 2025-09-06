import { Vec2 } from '../../utils/Vec2.js';

export class CollisionSystem {
  constructor() {
    this.collisionPairs = [];
    this.lastDamageTime = 0;
    this.invincibilityDuration = 1000; // 1 second, adjust as needed
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
    
    // Always use oof02 for NPC death
    state.audio?.playSfxAt?.('oof02', npc.pos, state);
    
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

  isTreeTrunk(x, y, map) {
    if (!map.trees) return false;
    return map.trees.some(tree => 
      Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
    );
  }

  getTreeAt(x, y, map) {
    if (!map.trees) return null;
    return map.trees.find(tree => 
      Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
    );
  }

  triggerShake(state, intensity) {
    if (state.cameraSystem) {
      // camera shake logic goes here
    }
  }

  update(state) {
    const now = Date.now();
    const player = state.entities.find(e => e.type === 'player');
    if (!player || !player.health) return;
    if (state.control?.inVehicle) return; // disable player collisions while inside a vehicle
    if (player.collisionDisabled) return; // Skip if player collision is disabled

    // Check invincibility frames
    if (now - this.lastDamageTime < this.invincibilityDuration) {
      return; // Player is invincible
    }
    
    const map = state.world.map;
    const tx = Math.floor(player.pos.x);
    const ty = Math.floor(player.pos.y);
    const tree = this.getTreeAt(tx, ty, map);
    
    // Only treat the small trunk area as solid (same size used elsewhere)
    if (tree && (tree.currentTrunkHeight ?? tree.trunkHeight) > 0.1) {
      const trunkHalf = 0.3 / 2; // trunkSize / 2
      const playerHw = (player.hitboxW || 0.15) / 2;
      const playerHh = (player.hitboxH || 0.15) / 2;
      const trunkCenterX = tx + 0.5, trunkCenterY = ty + 0.5;
      const overlapX = Math.abs(player.pos.x - trunkCenterX) < (trunkHalf + playerHw);
      const overlapY = Math.abs(player.pos.y - trunkCenterY) < (trunkHalf + playerHh);
      if (overlapX && overlapY) {
        // push player away from trunk center only when overlapping trunk AABB
        const dx = player.pos.x - trunkCenterX;
        const dy = player.pos.y - trunkCenterY;
        const len = Math.hypot(dx, dy) || 1;
        player.pos.x += (dx / len) * 0.2;
        player.pos.y += (dy / len) * 0.2;
        return;
      }
    }
    
    const vehicles = state.entities.filter(e => e.type === 'vehicle');
    for (const vehicle of vehicles) {
      if (vehicle.controlled) continue; // Skip player-controlled vehicle
      // add player-vehicle collision logic here
    }
    
    this.checkBulletCollisions(state);
  }
}