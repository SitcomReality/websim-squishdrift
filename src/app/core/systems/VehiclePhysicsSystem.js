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

/* @tweakable self-aligning force strength */
const selfAlignForce = 3.0;

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
      const reverse = v.ctrl?.reverse || 0;

      // Forces
      let Fx = 0, Fy = 0;

      // Engine drive (forward/back)
      const engine = engineForceMultiplier * (throttle + reverse);
      Fx += fwd.x * engine; Fy += fwd.y * engine;

      // Braking opposes longitudinal velocity
      const brakeForce = v.brakeForce * brake * Math.sign(vLong || 0);
      Fx -= fwd.x * brakeForce;
      Fy -= fwd.y * brakeForce;

      // Lateral grip to reduce side slip
      Fx -= right.x * vLat * gripMultiplier;
      Fy -= right.y * vLat * gripMultiplier;
      // Extra skid damping: more friction the more sideways we move
      const misalign = Math.min(1, Math.abs(vLat) / (Math.abs(vLong) + 1e-3));
      Fx -= v.vel.x * skidDamp * misalign;
      Fy -= v.vel.y * skidDamp * misalign;

      // Rolling resistance + air drag + static friction
      const speed = Math.hypot(v.vel.x, v.vel.y);
      Fx -= v.vel.x * rollingResistance + v.vel.x * staticFriction;
      Fx -= v.vel.x * speed * airDrag;
      Fy -= v.vel.y * rollingResistance + v.vel.y * staticFriction;
      Fy -= v.vel.y * speed * airDrag;
      // Coasting friction (no input) to prevent endless glide
      const coasting = (throttle < 0.05 && brake < 0.05);
      if (coasting) { Fx -= v.vel.x * coastingFriction; Fy -= v.vel.y * coastingFriction; }
      // Braking damps all motion, not just longitudinal
      if (brake > 0.01) { Fx -= v.vel.x * (brakeForceMultiplier * brake); Fy -= v.vel.y * (brakeForceMultiplier * brake); }

      // Self-aligning force when moving forward
      if (speed > 0.1 && throttle > 0.05) {
        const velAngle = Math.atan2(v.vel.y, v.vel.x);
        const angleDiff = wrapAngle(velAngle - v.rot);
        
        // Only apply alignment when moving forward (not reversing)
        const forwardDot = Math.cos(velAngle - v.rot);
        if (forwardDot > 0.3) { // Only align when mostly moving forward
          const alignStrength = Math.min(1, speed / maxSpeed) * selfAlignForce;
          v.angularVel += angleDiff * alignStrength * dt;
        }
      }

      // Integrate velocity
      v.vel.x += (Fx / vehicleMass) * dt;
      v.vel.y += (Fy / vehicleMass) * dt;

      // Clamp max speed
      if (speed > maxSpeed) {
        v.vel.x *= maxSpeed / speed;
        v.vel.y *= maxSpeed / speed;
      }
      // Kill tiny velocities to avoid perpetual micro-sliding
      if (Math.hypot(v.vel.x, v.vel.y) < 0.02) { v.vel.x = 0; v.vel.y = 0; }

      // Yaw/steer: stronger at speed, but still effective at low speed
      const speedFactor = Math.min(1, Math.abs(vLong) / maxSpeed) * 0.7 + 0.3;
      v.angularVel += steer * v.steerRate * speedFactor * dt;
      v.angularVel *= 0.9; // damping
      v.rot += v.angularVel * dt;

      // Move
      v.pos.x += v.vel.x * dt;
      v.pos.y += v.vel.y * dt;

      // Simple vehicle-vehicle collision resolution (circle-based)
      const vehicles = state.entities.filter(e => e.type === 'vehicle' && e !== v);
      for (const other of vehicles) {
        const dx = v.pos.x - other.pos.x;
        const dy = v.pos.y - other.pos.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const minDist = (v.radius || 0.6) + (other.radius || 0.6);
        if (dist < minDist) {
          // Separate
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist, ny = dy / dist;
          v.pos.x += nx * overlap;
          v.pos.y += ny * overlap;
          other.pos.x -= nx * overlap;
          other.pos.y -= ny * overlap;
          // Exchange velocities along collision normal with restitution
          const relVel = (v.vel.x - other.vel.x) * nx + (v.vel.y - other.vel.y) * ny;
          const restitution = 0.35; // bounciness
          if (relVel < 0) { // check if moving towards each other
            const impulse = (1 + restitution) * relVel / (1 / v.mass + 1 / other.mass);
            v.vel.x -= (impulse / v.mass) * nx;
            v.vel.y -= (impulse / v.mass) * ny;
            other.vel.x += (impulse / other.mass) * nx;
            other.vel.y += (impulse / other.mass) * ny;
          }
          // small damping to avoid jitter
          v.vel.x *= 0.9; v.vel.y *= 0.9;
          other.vel.x *= 0.9; other.vel.y *= 0.9;
        }
      }

      // Vehicle - building tile collisions (block against BuildingFloor/Wall)
      const map = state.world?.map;
      if (map) {
        const checkRange = Math.ceil((v.radius || 0.6) + 1);
        const tx = Math.floor(v.pos.x), ty = Math.floor(v.pos.y);
        for (let oy = -checkRange; oy <= checkRange; oy++) {
          for (let ox = -checkRange; ox <= checkRange; ox++) {
            const gx = tx + ox, gy = ty + oy;
            if (gx < 0 || gy < 0 || gx >= map.width || gy >= map.height) continue;
            const t = map.tiles[gy][gx];
            if (t === Tile.BuildingFloor || t === Tile.BuildingWall) {
              // treat tile as solid box centered at tile; compute penetration and push out
              const nearestX = Math.max(gx, Math.min(v.pos.x, gx + 1));
              const nearestY = Math.max(gy, Math.min(v.pos.y, gy + 1));
              const dx = v.pos.x - nearestX;
              const dy = v.pos.y - nearestY;
              const distSq = dx*dx + dy*dy;
              const radius = v.radius || 0.6;
              if (distSq < radius * radius) {
                const dist = Math.sqrt(distSq) || 0.0001;
                const nx = dx / dist, ny = dy / dist;
                const push = radius - dist;
                // if inside tile center (dist very small), push away from tile center
                v.pos.x += nx * push;
                v.pos.y += ny * push;
                // reflect velocity along normal and damp
                const vn = v.vel.x * nx + v.vel.y * ny;
                v.vel.x -= (1.5 * vn) * nx;
                v.vel.y -= (1.5 * vn) * ny;
                v.vel.x *= 0.6; v.vel.y *= 0.6;
              }
            }
          }
        }
      }

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
    v.mass = vehicleMass;
    v.maxSpeed = maxSpeed;
    v.engineForce = engineForceMultiplier;
    v.brakeForce = 1800;
    v.rollingRes = rollingResistance;
    v.drag = airDrag;
    v.grip = gripMultiplier;
    v.steerRate = steerRate;
    v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
    v.radius = vehicleCollisionRadius;
    v._physInit = true;
  }
}