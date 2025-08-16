import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';

export class VehicleMovementSystem {
  constructor() {}

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      this.ensurePhysics(v);
      this.updateMovement(state, v, dt);
    }
  }

  updateMovement(state, v, dt) {
    // Ensure physics properties exist
    v.longitudinalForce = v.longitudinalForce || 0;
    v.lateralForce = v.lateralForce || 0;
    v.angularVelocity = v.angularVelocity || 0;
    
    // Get inputs
    const throttle = v.ctrl?.throttle || 0;
    const brake = v.ctrl?.brake || 0;
    const steer = v.ctrl?.steer || 0;
    
    // Calculate longitudinal force (forward/backward)
    const longitudinalForce = this.calculateLongitudinalForce(v, throttle, brake);
    v.longitudinalForce = longitudinalForce;
    
    // Calculate lateral force (sideways)
    const lateralForce = this.calculateLateralForce(v);
    v.lateralForce = lateralForce;
    
    // Apply forces to get acceleration
    const longAccel = longitudinalForce / v.mass;
    const latAccel = lateralForce / v.mass;
    
    // Convert to world coordinates
    const cosRot = Math.cos(v.rot);
    const sinRot = Math.sin(v.rot);
    
    const ax = longAccel * cosRot - latAccel * sinRot;
    const ay = longAccel * sinRot + latAccel * cosRot;
    
    // Update velocity
    v.vel.x += ax * dt;
    v.vel.y += ay * dt;
    
    // Apply drag
    const speed = Math.hypot(v.vel.x, v.vel.y);
    const dragForce = VehiclePhysicsConstants.airDrag * speed * speed;
    const dragAccel = dragForce / v.mass;
    
    if (speed > 0) {
      v.vel.x -= (v.vel.x / speed) * dragAccel * dt;
      v.vel.y -= (v.vel.y / speed) * dragAccel * dt;
    }
    
    // Apply rolling resistance
    const rollingForce = VehiclePhysicsConstants.rollingResistance * speed;
    const rollingAccel = rollingForce / v.mass;
    
    if (speed > 0) {
      v.vel.x -= (v.vel.x / speed) * rollingAccel * dt;
      v.vel.y -= (v.vel.y / speed) * rollingAccel * dt;
    }
    
    // Calculate angular velocity from steering
    if (speed > 0.1) {
      const steerAngle = steer * VehiclePhysicsConstants.maxSteerAngle;
      const turningRadius = VehiclePhysicsConstants.wheelBase / Math.tan(steerAngle);
      v.angularVelocity = speed / turningRadius;
    } else {
      // Low speed steering
      const steerAngle = steer * VehiclePhysicsConstants.maxSteerAngle;
      v.angularVelocity = steerAngle * VehiclePhysicsConstants.lowSpeedSteerFactor;
    }
    
    // Update rotation
    v.rot += v.angularVelocity * dt;
    
    // Update position
    v.pos.x += v.vel.x * dt;
    v.pos.y += v.vel.y * dt;
    
    // Calculate wheel slip for skidding effects
    this.calculateWheelSlip(v);
    
    // Update brake light
    v.brakeLight = brake > 0.1;
  }

  calculateLongitudinalForce(v, throttle, brake) {
    let force = 0;
    
    // Engine force
    if (throttle > 0) {
      force = VehiclePhysicsConstants.maxEngineForce * throttle;
    }
    
    // Braking force
    if (brake > 0) {
      const speed = Math.hypot(v.vel.x, v.vel.y);
      if (speed > 0.1) {
        force -= VehiclePhysicsConstants.maxBrakeForce * brake;
      }
    }
    
    // Reverse force (when reversing)
    if (throttle < 0) {
      force = VehiclePhysicsConstants.maxReverseForce * throttle;
    }
    
    return force;
  }

  calculateLateralForce(v) {
    const speed = Math.hypot(v.vel.x, v.vel.y);
    if (speed < 0.1) return 0;
    
    // Calculate slip angle based on wheel direction vs velocity direction
    const velocityAngle = Math.atan2(v.vel.y, v.vel.x);
    const wheelAngle = v.rot;
    const slipAngle = velocityAngle - wheelAngle;
    
    // Calculate lateral force based on slip angle
    const lateralForce = -VehiclePhysicsConstants.corneringStiffness * Math.sin(slipAngle);
    
    // Limit by maximum friction
    const maxLateralForce = VehiclePhysicsConstants.maxLateralFriction;
    return Math.max(-maxLateralForce, Math.min(maxLateralForce, lateralForce));
  }

  calculateWheelSlip(v) {
    const speed = Math.hypot(v.vel.x, v.vel.y);
    if (speed < 0.1) return;
    
    // Calculate longitudinal slip
    const wheelSpeed = speed;
    const longitudinalSlip = Math.abs(v.longitudinalForce) / VehiclePhysicsConstants.maxLateralFriction;
    
    // Calculate lateral slip
    const velocityAngle = Math.atan2(v.vel.y, v.vel.x);
    const wheelAngle = v.rot;
    const lateralSlip = Math.abs(Math.sin(velocityAngle - wheelAngle));
    
    // Determine if skidding
    v.isSkidding = longitudinalSlip > 0.8 || lateralSlip > 0.5;
    v.skidIntensity = Math.max(longitudinalSlip, lateralSlip);
  }

  ensurePhysics(v) {
    if (v._physInit) return;
    
    // Physical properties
    v.mass = VehiclePhysicsConstants.vehicleMass;
    v.maxEngineForce = VehiclePhysicsConstants.maxEngineForce;
    v.maxBrakeForce = VehiclePhysicsConstants.maxBrakeForce;
    v.maxReverseForce = VehiclePhysicsConstants.maxReverseForce;
    v.maxLateralFriction = VehiclePhysicsConstants.maxLateralFriction;
    v.corneringStiffness = VehiclePhysicsConstants.corneringStiffness;
    v.wheelBase = VehiclePhysicsConstants.wheelBase;
    v.maxSteerAngle = VehiclePhysicsConstants.maxSteerAngle;
    v.lowSpeedSteerFactor = VehiclePhysicsConstants.lowSpeedSteerFactor;
    
    // State variables
    v.vel = v.vel || { x: 0, y: 0 };
    v.rot = typeof v.rot === 'number' ? v.rot : 0;
    v.angularVelocity = v.angularVelocity || 0;
    v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
    
    v._physInit = true;
  }
}