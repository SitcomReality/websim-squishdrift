export class VehiclePhysicsSystem {
  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      this.ensurePhysics(v);
      const fwd = { x: Math.cos(v.rot), y: Math.sin(v.rot) };
      const right = { x: -fwd.y, y: fwd.x };
      const vLong = v.vel.x * fwd.x + v.vel.y * fwd.y;
      const vLat =  v.vel.x * right.x + v.vel.y * right.y;

      // Controls (default to 0)
      const throttle = v.ctrl?.throttle || 0;
      const brake = v.ctrl?.brake || 0;
      const steer = v.ctrl?.steer || 0;

      // Forces
      let Fx = 0, Fy = 0;

      // Engine drive (forward/back)
      const engine = v.engineForce * throttle;
      Fx += fwd.x * engine; Fy += fwd.y * engine;

      // Braking opposes longitudinal velocity
      const brakeForce = v.brakeForce * brake * Math.sign(vLong || 0);
      Fx -= fwd.x * Math.abs(brakeForce);
      Fy -= fwd.y * Math.abs(brakeForce);

      // Lateral grip to reduce side slip
      Fx -= right.x * vLat * v.grip;
      Fy -= right.y * vLat * v.grip;

      // Rolling resistance + air drag
      Fx -= v.vel.x * v.rollingRes - v.vel.x * Math.hypot(v.vel.x, v.vel.y) * v.drag;
      Fy -= v.vel.y * v.rollingRes - v.vel.y * Math.hypot(v.vel.x, v.vel.y) * v.drag;

      // Integrate velocity
      v.vel.x += (Fx / v.mass) * dt;
      v.vel.y += (Fy / v.mass) * dt;

      // Clamp max speed
      const speed = Math.hypot(v.vel.x, v.vel.y);
      if (speed > v.maxSpeed) {
        v.vel.x *= v.maxSpeed / speed;
        v.vel.y *= v.maxSpeed / speed;
      }

      // Yaw/steer: stronger at speed
      const speedFactor = Math.min(1, Math.abs(vLong) / (v.maxSpeed || 1));
      v.angularVel += steer * v.steerRate * speedFactor * dt;
      v.angularVel *= 0.9; // damping
      v.rot += v.angularVel * dt;

      // Move
      v.pos.x += v.vel.x * dt;
      v.pos.y += v.vel.y * dt;

      // Brake light heuristic
      v.brakeLight = (brake > 0.05);
    }
  }

  ensurePhysics(v) {
    if (v._physInit) return;
    v.pos = v.pos || { x: 0, y: 0 };
    v.rot = typeof v.rot === 'number' ? v.rot : 0;
    v.vel = v.vel || { x: 0, y: 0 };
    v.angularVel = v.angularVel || 0;
    v.mass = v.mass || 1200;
    v.maxSpeed = v.maxSpeed || 6;
    v.engineForce = v.engineForce || 1200;
    v.brakeForce = v.brakeForce || 1800;
    v.rollingRes = v.rollingRes || 1.2;
    v.drag = v.drag || 0.3;
    v.grip = v.grip || 6.0;
    v.steerRate = v.steerRate || 2.5;
    v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
    v._physInit = true;
  }
}