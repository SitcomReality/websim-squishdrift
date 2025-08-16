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
    const fwd = { x: Math.cos(v.rot), y: Math.sin(v.rot) };
    const right = { x: -fwd.y, y: fwd.x };
    const vLong = v.vel.x * fwd.x + v.vel.y * fwd.y;
    const vLat = v.vel.x * right.x + v.vel.y * right.y;

    // Controls (default to 0)
    const throttle = v.ctrl?.throttle || 0;
    const brake = v.ctrl?.brake || 0;
    const steer = v.ctrl?.steer || 0;
    const reverse = v.ctrl?.reverse || 0;

    // Forces
    let Fx = 0, Fy = 0;

    // Engine drive (forward/back)
    const engine = VehiclePhysicsConstants.engineForceMultiplier * (throttle + reverse);
    Fx += fwd.x * engine; Fy += fwd.y * engine;

    // Braking opposes longitudinal velocity
    const brakeForce = v.brakeForce * brake * Math.sign(vLong || 0);
    Fx -= fwd.x * brakeForce;
    Fy -= fwd.y * brakeForce;

    // Lateral grip to reduce side slip
    Fx -= right.x * vLat * VehiclePhysicsConstants.gripMultiplier;
    Fy -= right.y * vLat * VehiclePhysicsConstants.gripMultiplier;
    
    // Extra skid damping: more friction the more sideways we move
    const misalign = Math.min(1, Math.abs(vLat) / (Math.abs(vLong) + 1e-3));
    Fx -= v.vel.x * VehiclePhysicsConstants.skidDamp * misalign;
    Fy -= v.vel.y * VehiclePhysicsConstants.skidDamp * misalign;

    // Rolling resistance + air drag + static friction
    const speed = Math.hypot(v.vel.x, v.vel.y);
    Fx -= v.vel.x * VehiclePhysicsConstants.rollingResistance + 
          v.vel.x * VehiclePhysicsConstants.staticFriction;
    Fx -= v.vel.x * speed * VehiclePhysicsConstants.airDrag;
    Fy -= v.vel.y * VehiclePhysicsConstants.rollingResistance + 
          v.vel.y * VehiclePhysicsConstants.staticFriction;
    Fy -= v.vel.y * speed * VehiclePhysicsConstants.airDrag;
    
    // Coasting friction (no input) to prevent endless glide
    const coasting = (throttle < 0.05 && brake < 0.05);
    if (coasting) {
      Fx -= v.vel.x * VehiclePhysicsConstants.coastingFriction;
      Fy -= v.vel.y * VehiclePhysicsConstants.coastingFriction;
    }
    
    // Braking damps all motion, not just longitudinal
    if (brake > 0.01) {
      Fx -= v.vel.x * (VehiclePhysicsConstants.brakeForceMultiplier * brake);
      Fy -= v.vel.y * (VehiclePhysicsConstants.brakeForceMultiplier * brake);
    }

    // Integrate velocity
    v.vel.x += (Fx / VehiclePhysicsConstants.vehicleMass) * dt;
    v.vel.y += (Fy / VehiclePhysicsConstants.vehicleMass) * dt;

    // Clamp max speed
    if (speed > VehiclePhysicsConstants.maxSpeed) {
      v.vel.x *= VehiclePhysicsConstants.maxSpeed / speed;
      v.vel.y *= VehiclePhysicsConstants.maxSpeed / speed;
    }
    
    // Kill tiny velocities to avoid perpetual micro-sliding
    if (Math.hypot(v.vel.x, v.vel.y) < 0.02) {
      v.vel.x = 0; v.vel.y = 0;
    }

    // Yaw/steer: stronger at speed, but still effective at low speed
    const speedFactor = Math.min(1, Math.abs(vLong) / VehiclePhysicsConstants.maxSpeed) * 0.7 + 0.3;
    v.angularVel += steer * VehiclePhysicsConstants.steerRate * speedFactor * dt;
    v.angularVel *= 0.9; // damping
    v.rot += v.angularVel * dt;

    // Move
    v.pos.x += v.vel.x * dt;
    v.pos.y += v.vel.y * dt;

    // Brake light heuristic
    v.brakeLight = (brake > 0.05);
  }

  ensurePhysics(v) {
    if (v._physInit) return;
    v.pos = v.pos || { x: 0, y: 0 };
    v.rot = typeof v.rot === 'number' ? v.rot : 0;
    v.vel = v.vel || { x: 0, y: 0 };
    v.angularVel = v.angularVel || 0;
    v.mass = VehiclePhysicsConstants.vehicleMass;
    v.maxSpeed = VehiclePhysicsConstants.maxSpeed;
    v.engineForce = VehiclePhysicsConstants.engineForceMultiplier;
    v.brakeForce = 1800;
    v.rollingRes = VehiclePhysicsConstants.rollingResistance;
    v.drag = VehiclePhysicsConstants.airDrag;
    v.grip = VehiclePhysicsConstants.gripMultiplier;
    v.steerRate = VehiclePhysicsConstants.steerRate;
    v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0, reverse: 0 };
    v.radius = VehiclePhysicsConstants.vehicleCollisionRadius;
    v._physInit = true;
  }
}