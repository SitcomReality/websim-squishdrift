export class ExplosionSystem {
  constructor() {
    this.explosions = [];
    this.frameRate = 15; // frames per second
    this.totalFrames = 64; // 8x8 grid
    this.explosionSize = 2.5; // tiles radius for damage
  }

  update(state, dt) {
    if (!state.explosions) state.explosions = [];
    
    for (let i = state.explosions.length - 1; i >= 0; i--) {
      const explosion = state.explosions[i];
      
      explosion.time += dt;
      explosion.currentFrame = Math.floor(explosion.time * this.frameRate);
      
      // Check for damage on first frame (when explosion starts)
      if (explosion.currentFrame === 0 && !explosion.hasDamaged) {
        this.applyExplosionDamage(state, explosion);
        explosion.hasDamaged = true;
      }
      
      if (explosion.currentFrame >= this.totalFrames) {
        state.explosions.splice(i, 1);
      }
    }
  }

  createExplosion(state, position) {
    const explosion = {
      type: 'explosion',
      pos: { x: position.x, y: position.y },
      time: 0,
      currentFrame: 0,
      frameWidth: 256,
      frameHeight: 256,
      totalFrames: this.totalFrames,
      hasDamaged: false,
      size: this.explosionSize
    };
    
    if (!state.explosions) state.explosions = [];
    state.explosions.push(explosion);

    // Randomly play either explosion01.mp3 or explosion02.mp3
    const soundChoice = Math.random() < 0.5 ? 'explosion01' : 'explosion02';
    state.audio?.playSfxAt?.(soundChoice, explosion.pos, state);

    // Distance-based screen shake from camera center
    const cam = state.camera;
    const camSys = state.cameraSystem || state._engine?.systems?.camera;
    if (cam && camSys) {
      const dx = explosion.pos.x - cam.x, dy = explosion.pos.y - cam.y;
      const dist = Math.hypot(dx, dy);
      const maxDist = 12; // tiles
      const intensity = Math.max(0, 1 - dist / maxDist); // 0..1
      if (intensity > 0) camSys.addShake(intensity);
    }
  }

  applyExplosionDamage(state, explosion) {
    const entities = state.entities;
    
    for (const entity of entities) {
      if (!entity || !entity.pos) continue;
      
      // Calculate distance from explosion center
      const dx = entity.pos.x - explosion.pos.x;
      const dy = entity.pos.y - explosion.pos.y;
      const distance = Math.hypot(dx, dy);
      
      // Check if within explosion radius
      if (distance <= explosion.size) {
        switch (entity.type) {
          case 'npc':
            // NPCs die instantly
            if (!entity.health) {
              entity.health = { hp: 0, isAlive: () => false };
            } else {
              entity.health.hp = 0;
            }
            
            // Create blood splatter
            const bloodStain = {
              type: 'blood',
              pos: { x: entity.pos.x, y: entity.pos.y },
              size: 0.6 + Math.random() * 0.4,
              color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
              rotation: Math.random() * Math.PI * 2
            };
            
            if (state.bloodManager) {
              state.bloodManager.addBlood(state, bloodStain);
            } else {
              state.entities.push(bloodStain);
            }
            
            // Remove NPC
            const index = state.entities.indexOf(entity);
            if (index > -1) {
              state.entities.splice(index, 1);
            }
            break;
            
          case 'player':
            // Player takes 25 damage
            if (!entity.health) {
              entity.health = { hp: 75, maxHp: 100, takeDamage: function(d) { this.hp = Math.max(0, this.hp - d); } };
            }
            entity.health.takeDamage(25);
            
            // Screen shake for player damage
            if (state.cameraSystem) {
              state.cameraSystem.addShake(0.8);
            }
            break;
            
          case 'vehicle':
            // Vehicles take 25 damage
            if (!entity.health) {
              entity.health = { hp: 75, maxHp: 100, takeDamage: function(d) { this.hp = Math.max(0, this.hp - d); } };
            }
            entity.health.takeDamage(25);
            
            // Spark effects for vehicle damage
            if (state.particleSystem) {
              state.particleSystem.emitSparks(state, entity.pos, 8, 4);
            }
            break;
        }
      }
    }
    
    // Update scoring system for any destroyed entities
    if (state.scoringSystem) {
      // Handle scoring updates for destroyed entities
    }
  }
}