export class ExplosionSystem {
  constructor() {
    this.explosions = [];
    this.frameRate = 15; // frames per second
    this.totalFrames = 64; // 8x8 grid
  }

  update(state, dt) {
    if (!state.explosions) state.explosions = [];
    
    for (let i = state.explosions.length - 1; i >= 0; i--) {
      const explosion = state.explosions[i];
      
      explosion.time += dt;
      explosion.currentFrame = Math.floor(explosion.time * this.frameRate);
      
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
      totalFrames: this.totalFrames
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

    // --- NEW: apply damage to nearby entities ---
    // Explosion visual covers roughly a 2x2 tile area (centered). Use radius=1.1 to be safe.
    const blastRadius = 1.1;
    const entities = state.entities || [];

    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      if (!e || !e.pos) continue;
      const dx = e.pos.x - explosion.pos.x;
      const dy = e.pos.y - explosion.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > blastRadius) continue;

      // NPCs die instantly
      if (e.type === 'npc') {
        // ensure health object exists and mark dead
        if (!e.health) e.health = { hp: 0, maxHp: 1, isAlive: () => false, takeDamage(){} };
        e.health.hp = 0;
        // spawn blood stain
        state.particleSystem?.emitBlood?.(state, e.pos, 10, 3);
        state.audio?.playSfxAt?.('pedestrian_death', e.pos, state);
        // remove NPC entity
        const idx = state.entities.indexOf(e);
        if (idx > -1) state.entities.splice(idx, 1);
        // credit stats
        if (state.stats) state.stats.enemiesKilled = (state.stats.enemiesKilled || 0) + 1;
        continue;
      }

      // Vehicles and player take 40 damage if within blast
      if (e.type === 'vehicle' || e.type === 'player') {
        if (!e.health) {
          // create Health-like object if missing
          e.health = { hp: (e.maxHealth || 100) , maxHp: (e.maxHealth || 100), takeDamage(amount){ this.hp = Math.max(0, this.hp - amount); }, isAlive(){ return this.hp > 0; } };
        }
        // Apply damage
        e.health.takeDamage(40);
        // Play impact sound at entity
        state.audio?.playSfxAt?.('impact01', e.pos, state);
        // If vehicle destroyed, let existing destruction handlers run elsewhere; if player killed trigger death system
        if (e.type === 'player' && !e.health.isAlive()) {
          const deathSystem = state._engine?.systems?.death || state.deathSystem || state._engine?.deathSystem;
          if (deathSystem && deathSystem.handlePlayerDeath) deathSystem.handlePlayerDeath(state);
        }
      }
    }
  }
}