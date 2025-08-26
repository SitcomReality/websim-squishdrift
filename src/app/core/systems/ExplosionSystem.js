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
        // Remove explosion when animation is complete
        state.explosions.splice(i, 1);
      }
    }
  }

  createExplosion(state, position, source = 'vehicle') {
    const explosion = {
      type: 'explosion',
      pos: { x: position.x, y: position.y },
      time: 0,
      currentFrame: 0,
      frameWidth: 256,
      frameHeight: 256,
      totalFrames: this.totalFrames,
      source: source
    };
    
    if (!state.explosions) state.explosions = [];
    state.explosions.push(explosion);
    
    // Trigger screen shake based on distance from camera
    if (state.cameraSystem) {
      const distance = Math.hypot(
        position.x - state.camera.x,
        position.y - state.camera.y
      );
      
      // Calculate shake intensity based on distance
      // Max shake at 0 distance, drops off with distance
      const maxDistance = 15; // tiles
      const shakeIntensity = Math.max(0, 1 - (distance / maxDistance)) * 2.0;
      
      if (shakeIntensity > 0.01) {
        state.cameraSystem.addShake(shakeIntensity);
      }
    }
  }
}