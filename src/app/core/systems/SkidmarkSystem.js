import { Vec2 } from '../../utils/Vec2.js';

export class SkidmarkSystem {
  constructor() {
    this.skidmarks = [];
    /* @tweakable max number of skidmarks to maintain */
    this.maxSkidmarks = 500;
    /* @tweakable fade out time in seconds */
    this.fadeTime = 8;
    /* @tweakable minimum lateral slip to trigger skidmarks */
    this.minLateralSlip = 0.3;
    /* @tweakable minimum longitudinal slip to trigger skidmarks */
    this.minLongitudinalSlip = 0.8;
    /* @tweakable max distance between skidmarks before creating new segment */
    this.maxSegmentDistance = 0.5;
  }

  update(state, dt) {
    // Update existing skidmarks
    for (let i = this.skidmarks.length - 1; i >= 0; i--) {
      const mark = this.skidmarks[i];
      mark.age += dt;
      
      // Remove aged skidmarks or those outside despawn radius
      const player = state.entities.find(e => e.type === 'player');
      const referencePos = state.control.inVehicle 
        ? state.control.vehicle.pos 
        : player?.pos;
      
      if (referencePos) {
        const distance = Math.hypot(mark.x - referencePos.x, mark.y - referencePos.y);
        if (mark.age > this.fadeTime || distance > 15) {
          this.skidmarks.splice(i, 1);
          continue;
        }
      }
      
      // Fade out
      mark.alpha = Math.max(0, 1 - (mark.age / this.fadeTime));
    }
    
    // Add new skidmarks from vehicles
    for (const vehicle of state.entities.filter(e => e.type === 'vehicle')) {
      if (vehicle.isSkidding && vehicle.skidIntensity > 0) {
        const currentPos = new Vec2(vehicle.pos.x, vehicle.pos.y);
        
        // Check if we should create a new skidmark
        const shouldCreateMark = vehicle.skidIntensity > this.minLateralSlip ||
                                (vehicle.longitudinalForce && 
                                 Math.abs(vehicle.longitudinalForce) > this.minLongitudinalSlip * 1000);
        
        if (shouldCreateMark) {
          // Check distance from last mark
          const lastMark = this.skidmarks.filter(m => m.vehicleId === vehicle.id).pop();
          const shouldAdd = !lastMark || 
                          Math.hypot(lastMark.x - currentPos.x, lastMark.y - currentPos.y) > this.maxSegmentDistance;
          
          if (shouldAdd) {
            this.skidmarks.push({
              x: currentPos.x,
              y: currentPos.y,
              rot: vehicle.rot,
              intensity: vehicle.skidIntensity,
              age: 0,
              alpha: 1,
              vehicleId: vehicle.id
            });
          }
        }
      }
    }
    
    // Limit max skidmarks
    while (this.skidmarks.length > this.maxSkidmarks) {
      this.skidmarks.shift();
    }
  }

  render(r, state) {
    const { ctx } = r;
    const ts = state.world.tileSize;
    
    ctx.save();
    ctx.globalAlpha = 1;
    
    for (const mark of this.skidmarks) {
      ctx.save();
      ctx.globalAlpha = mark.alpha;
      ctx.translate(mark.x * ts, mark.y * ts);
      ctx.rotate(mark.rot);
      
      // Draw skidmark as a thin black line
      const width = ts * 0.1 * Math.min(1, mark.intensity * 2);
      const length = ts * 0.3;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(-length/2, -width/2, length, width);
      
      ctx.restore();
    }
    
    ctx.restore();
  }
}