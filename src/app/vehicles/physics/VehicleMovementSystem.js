import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';

export class VehicleMovementSystem {
  constructor() {
        this.maxEngineForce = 2500;
        this.maxBrakeForce = 3500;
        this.maxReverseForce = 1500;
        this.airDrag = 0.45;
        this.rollingResistance = 400;
        this.maxLateralFriction = 6000;
        this.corneringStiffness = 1500;
        this.maxSteerAngle = Math.PI / 3.5;
        this.lowSpeedSteerFactor = 0.2;
        this.wheelBase = 2.5;
  }

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      this.ensurePhysics(v);
      this.updateMovement(state, v, dt);
    }
  }

  updateMovement(state, v, dt) {
    v.longitudinalForce = v.longitudinalForce || 0;
    v.lateralForce = v.lateralForce || 0;
    v.angularVelocity = v.angularVelocity || 0;
    
    const throttle = v.ctrl?.throttle || 0;
    const brake = v.ctrl?.brake || 0;
    const steer = v.ctrl?.steer || 0;
    
    const longitudinalForce = this.calculateLongitudinalForce(v, throttle, brake);
    v.longitudinalForce = longitudinalForce;
    
    const lateralForce = this.calculateLateralForce(v);
    v.lateralForce = lateralForce;
    
    const longAccel = longitudinalForce / v.mass;
    const latAccel = lateralForce / v.mass;
    
    const cosRot = Math.cos(v.rot);
    const sinRot = Math.sin(v.rot);
    
    const ax = longAccel * cosRot - latAccel * sinRot;
    const ay = longAccel * sinRot + latAccel * cosRot;
    
    v.vel.x += ax * dt;
    v.vel.y += ay * dt;
    
    const speed = Math.hypot(v.vel.x, v.vel.y);
    const dragForce = this.airDrag * speed * speed;
    const dragAccel = dragForce / v.mass;
    
    if (speed > 0) {
      v.vel.x -= (v.vel.x / speed) * dragAccel * dt;
      v.vel.y -= (v.vel.y / speed) * dragAccel * dt;
    }
    
    const rollingForce = this.rollingResistance * speed;
    const rollingAccel = rollingForce / v.mass;
    
    if (speed > 0) {
      v.vel.x -= (v.vel.x / speed) * rollingAccel * dt;
      v.vel.y -= (v.vel.y / speed) * rollingAccel * dt;
    }
    
    if (speed > 0.1) {
      const steerAngle = steer * this.maxSteerAngle;
      const turningRadius = this.wheelBase / Math.tan(steerAngle);
      v.angularVelocity = speed / turningRadius;
    } else {
      const steerAngle = steer * this.maxSteerAngle;
      v.angularVelocity = steerAngle * this.lowSpeedSteerFactor;
    }
    
    v.rot += v.angularVelocity * dt;
    v.pos.x += v.vel.x * dt;
    v.pos.y += v.vel.y * dt;
    
    this.calculateWheelSlip(v);
    v.brakeLight = brake > 0.1;
  }

  calculateLongitudinalForce(v, throttle, brake) {
    let force = 0;
    
    if (throttle > 0) {
      force = this.maxEngineForce * throttle;
    }
    
    if (brake > 0) {
      const speed = Math.hypot(v.vel.x, v.vel.y);
      if (speed > 0.1) {
        force -= this.maxBrakeForce * brake;
      }
    }
    
    if (throttle < 0) {
      force = this.maxReverseForce * throttle;
    }
    
    return force;
  }

  calculateLateralForce(v) {
    const speed = Math.hypot(v.vel.x, v.vel.y);
    if (speed < 0.1) return 0;
    
    const velocityAngle = Math.atan2(v.vel.y, v.vel.x);
    const wheelAngle = v.rot;
    const slipAngle = velocityAngle - wheelAngle;
    
    const lateralForce = -this.corneringStiffness * Math.sin(slipAngle);
    const maxLateralForce = this.maxLateralFriction;
    return Math.max(-maxLateralForce, Math.min(maxLateralForce, lateralForce));
  }

  calculateWheelSlip(v) {
    const speed = Math.hypot(v.vel.x, v.vel.y);
    if (speed < 0.1) return;
    
    const longitudinalSlip = Math.abs(v.longitudinalForce) / this.maxLateralFriction;
    const velocityAngle = Math.atan2(v.vel.y, v.vel.x);
    const wheelAngle = v.rot;
    const lateralSlip = Math.abs(Math.sin(velocityAngle - wheelAngle));
    
    // Calculate combined skid intensity
    v.skidIntensity = Math.max(longitudinalSlip, lateralSlip);
    v.isSkidding = v.skidIntensity > 0.2;
  }

  ensurePhysics(v) {
    if (v._physInit) return;
    
    v.mass = VehiclePhysicsConstants.vehicleMass;
    v.vel = v.vel || { x: 0, y: 0 };
    v.rot = typeof v.rot === 'number' ? v.rot : 0;
    v.angularVelocity = v.angularVelocity || 0;
    v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
    
    // Initialize skidding properties
    v.isSkidding = false;
    v.skidIntensity = 0;
    
    v._physInit = true;
  }
}