import { Tile } from '../../../map/TileTypes.js'; // added for building tile checks

const maxSpeed = 5;

const engineForceMultiplier = 1400;

const brakeForceMultiplier = 20;

const gripMultiplier = 20;

const skidDamp = 1000;

const coastingFriction = 20;

const rollingResistance = 10;

const airDrag = 0.3;

const staticFriction = 20;

const vehicleMass = 1000;

const steerRate = 15;

/* @tweakable vehicle collision radius in tiles */
const vehicleCollisionRadius = 0.35;

/* @tweakable vehicle width for collision detection */
const vehicleWidth = 0.9;

/* @tweakable vehicle height for collision detection */
const vehicleHeight = 0.5;

export class VehiclePhysicsSystem {
  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      this.ensurePhysics(v);
      const steerInput = (v.ctrl?.steer || 0);
      const throttle = (v.ctrl?.throttle || 0);
      const reverse = (v.ctrl?.reverse || 0);
      const brake = (v.ctrl?.brake || 0);

      // Update steering angle with rate limit
      const targetSteer = steerInput * v.maxSteerAngle;
      const maxDelta = v.steerSpeed * dt;
      const steerDelta = Math.max(-maxDelta, Math.min(maxDelta, targetSteer - v.steerAngle));
      v.steerAngle += steerDelta;

      // Rotate world velocity into vehicle local space
      const sin = Math.sin(v.rot), cos = Math.cos(v.rot);
      const vx_local =  cos * v.vel.x + sin * v.vel.y;
      const vy_local = -sin * v.vel.x + cos * v.vel.y;

      // Longitudinal forces (engine/reverse, braking, rolling resistance, drag)
      let Fx = 0;
      const traction = v.engineForceMax * (throttle + reverse);
      const Frr = -v.rollingResistance * vx_local;
      const Fdrag = -v.dragCoefficient * vx_local * Math.abs(vx_local);
      let Fbrake = -Math.sign(vx_local || 1) * v.brakeForceMax * brake;

      // Don't let constant brake push the car into reverse when almost stopped
      if (Math.abs(vx_local) < 0.05 && brake > 0 && throttle <= 0 && reverse >= 0) {
        Fbrake = 0;
      }
      Fx = traction + Fbrake + Fdrag + Frr;

      // Slip angles for lateral tire forces
      const a = v.cgToFront, b = v.cgToRear;
      const eps = 0.1;
      const slipFront = Math.atan2(vy_local + a * v.yawRate, Math.max(eps, vx_local)) - v.steerAngle;
      const slipRear  = Math.atan2(vy_local - b * v.yawRate, Math.max(eps, vx_local));

      // Cornering forces with simple clamp (tire grip limit)
      let Fyf = -v.corneringStiffnessFront * slipFront;
      let Fyr = -v.corneringStiffnessRear  * slipRear;
      Fyf = Math.max(-v.tireGripFront, Math.min(v.tireGripFront, Fyf));
      Fyr = Math.max(-v.tireGripRear,  Math.min(v.tireGripRear,  Fyr));

      // Total lateral force
      const Fy = Fyf + Fyr;

      // Body-frame accelerations
      const ax = Fx / v.mass;
      const ay = Fy / v.mass;

      // Rotate acceleration back to world frame and integrate
      const ax_w =  cos * ax - sin * ay;
      const ay_w =  sin * ax + cos * ay;
      v.vel.x += ax_w * dt;
      v.vel.y += ay_w * dt;

      // Dampen tiny velocities to avoid jitter
      const speed = Math.hypot(v.vel.x, v.vel.y);
      if (speed < 0.01) { v.vel.x = 0; v.vel.y = 0; }

      // Integrate position
      v.pos.x += v.vel.x * dt;
      v.pos.y += v.vel.y * dt;

      // Yaw dynamics: torque from lateral forces at axles
      const torque = Fyf * a - Fyr * b;
      const yawAcc = torque / v.inertia;
      v.yawRate += yawAcc * dt;
      v.rot += v.yawRate * dt;

      // Brake light indicator
      v.brakeLight = brake > 0.05;
    }
  }

  ensurePhysics(v) {
    if (v._physInit) return;
    v.pos = v.pos || { x: 0, y: 0 };
    v.vel = v.vel || { x: 0, y: 0 };
    v.rot = typeof v.rot === 'number' ? v.rot : 0;
    v.yawRate = v.yawRate || 0;
    v.ctrl = v.ctrl || { throttle: 0, reverse: 0, brake: 0, steer: 0 };

    /* @tweakable vehicle mass in kg */
    v.mass = v.mass || 1200;

    /* @tweakable rotational inertia around vertical axis */
    v.inertia = v.inertia || 2500;

    /* @tweakable distance from CG to front axle (meters-equivalent tiles) */
    v.cgToFront = v.cgToFront || 0.9;

    /* @tweakable distance from CG to rear axle (meters-equivalent tiles) */
    v.cgToRear = v.cgToRear || 0.9;

    /* @tweakable maximum engine traction force */
    v.engineForceMax = v.engineForceMax || 2200;

    /* @tweakable maximum braking force */
    v.brakeForceMax = v.brakeForceMax || 4000;

    /* @tweakable rolling resistance coefficient */
    v.rollingResistance = v.rollingResistance || 30;

    /* @tweakable aerodynamic drag coefficient (quadratic with speed) */
    v.dragCoefficient = v.dragCoefficient || 0.4;

    /* @tweakable front axle cornering stiffness */
    v.corneringStiffnessFront = v.corneringStiffnessFront || 8_000;

    /* @tweakable rear axle cornering stiffness */
    v.corneringStiffnessRear = v.corneringStiffnessRear || 9_500;

    /* @tweakable front tire lateral force clamp (grip limit) */
    v.tireGripFront = v.tireGripFront || 8_000;

    /* @tweakable rear tire lateral force clamp (grip limit) */
    v.tireGripRear = v.tireGripRear || 8_000;

    /* @tweakable maximum steer angle (radians) */
    v.maxSteerAngle = v.maxSteerAngle || (25 * Math.PI / 180);

    /* @tweakable steering speed (radians per second) */
    v.steerSpeed = v.steerSpeed || (90 * Math.PI / 180);

    /* @tweakable vehicle collision radius (tiles) */
    v.radius = v.radius || 0.6;

    v._physInit = true;
  }
}