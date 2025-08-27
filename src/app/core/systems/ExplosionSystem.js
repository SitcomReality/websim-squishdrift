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
  }
}