export class SkidmarkSystem {
  constructor() {
    this.skidmarks = [];
    this.maxSkidmarks = 1000;
    /* @tweakable minimum skid intensity required to create a skidmark */
    this.skidIntensityThreshold = 0.05;
    /* @tweakable multiplier for skid sensitivity */
    this.skidSensitivity = 1.0;
    /* @tweakable cooldown between skidmarks in seconds */
    this.skidCooldown = 0.1;
    this.lastSkidTime = 0;
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
      const isSkidding = this.checkSkidding(vehicle);
      
      if (isSkidding && (state.time - this.lastSkidTime) > this.skidCooldown) {
        console.log('SKIDDING DETECTED:', {
          skidIntensity: vehicle.skidIntensity || 0,
          speed: Math.hypot(vehicle.vel?.x || 0, vehicle.vel?.y || 0),
          threshold: this.skidIntensityThreshold,
          isSkidding: vehicle.isSkidding,
          lateralForce: vehicle.lateralForce || 0,
          longitudinalForce: vehicle.longitudinalForce || 0
        });
        this.createSkidmark(vehicle);
        this.lastSkidTime = state.time;
      }
    }
  }

  checkSkidding(vehicle) {
    if (!vehicle.vel) return false;
    
    const speed = Math.hypot(vehicle.vel.x || 0, vehicle.vel.y || 0);
    const isMoving = speed > 0.5;
    
    // Check for skidding based on multiple conditions
    const isSkiddingFromIntensity = (vehicle.skidIntensity || 0) > this.skidIntensityThreshold;
    const isBrakingHard = (vehicle.ctrl?.brake || 0) > 0.8 && speed > 2.0;
    const isTurningSharp = Math.abs(vehicle.ctrl?.steer || 0) > 0.7 && speed > 1.5;
    
    // Also check if the vehicle has explicit skidding flag
    const hasSkidFlag = vehicle.isSkidding === true;
    
    return isMoving && (isSkiddingFromIntensity || isBrakingHard || isTurningSharp || hasSkidFlag);
  }

  createSkidmark(vehicle) {
    if (this.skidmarks.length >= this.maxSkidmarks) {
      // Remove oldest skidmark if at capacity
      this.skidmarks.shift();
    }

    const intensity = Math.min(1, Math.max(0.3, (vehicle.skidIntensity || 0) * 2));
    this.skidmarks.push({
      x: vehicle.pos.x,
      y: vehicle.pos.y,
      rot: vehicle.rot || 0,
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