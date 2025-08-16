export class SkidmarkSystem {
  constructor() {
    this.skidmarks = [];
    this.maxSkidmarks = 1000;
    this.skidIntensityThreshold = 0.5;
  }

  update(state, dt) {
    // Update existing skidmarks (fade out)
    for (let i = this.skidmarks.length - 1; i >= 0; i--) {
      const mark = this.skidmarks[i];
      mark.life -= dt;
      
      // Despawn if outside radius or faded
      const referenceEntity = state.control.inVehicle ? state.control.vehicle : state.entities.find(e => e.type === 'player');
      if (referenceEntity) {
        const distance = Math.hypot(mark.x - referenceEntity.pos.x, mark.y - referenceEntity.pos.y);
        if (distance > 15 || mark.life <= 0) {
          this.skidmarks.splice(i, 1);
        }
      }
    }

    // Create new skidmarks from vehicles
    const vehicles = state.entities.filter(e => e.type === 'vehicle');
    for (const vehicle of vehicles) {
      if (vehicle.isSkidding && vehicle.skidIntensity > this.skidIntensityThreshold) {
        this.createSkidmark(vehicle);
      }
    }
  }

  createSkidmark(vehicle) {
    if (this.skidmarks.length >= this.maxSkidmarks) {
      // Remove oldest skidmark if at capacity
      this.skidmarks.shift();
    }

    const intensity = Math.min(1, vehicle.skidIntensity * 2);
    this.skidmarks.push({
      x: vehicle.pos.x,
      y: vehicle.pos.y,
      rot: vehicle.rot,
      intensity,
      life: 10, // seconds
      alpha: 1
    });
  }

  render(renderer, state) {
    const { ctx } = renderer;
    const ts = state.world.tileSize;

    ctx.save();
    
    for (const mark of this.skidmarks) {
      const alpha = mark.life / 10; // Fade out over lifetime
      const width = ts * 0.15 * mark.intensity;
      
      ctx.save();
      ctx.translate(mark.x * ts, mark.y * ts);
      ctx.rotate(mark.rot);
      
      // Draw skidmark as a dark streak
      ctx.fillStyle = `rgba(20, 20, 20, ${alpha * 0.8})`;
      ctx.fillRect(-ts * 0.3, -width/2, ts * 0.6, width);
      
      ctx.restore();
    }
    
    ctx.restore();
  }
}