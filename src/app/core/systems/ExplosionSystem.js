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
  }
}