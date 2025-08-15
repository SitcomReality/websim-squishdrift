import { Tile } from '../../../map/TileTypes.js'; // added for building tile checks

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

      // Lateral grip to reduce side slip - INCREASED for better friction
      Fx -= right.x * vLat * v.grip * 2.5; // Increased multiplier for stronger lateral friction
      Fy -= right.y * vLat * v.grip * 2.5;

      // Rolling resistance + air drag - INCREASED for faster stopping
      Fx -= v.vel.x * (v.rollingRes * 2.5) - v.vel.x * Math.hypot(v.vel.x, v.vel.y) * v.drag;
      Fy -= v.vel.y * (v.rollingRes * 2.5) - v.vel.y * Math.hypot(v.vel.x, v.vel.y) * v.drag;

      // Add static friction when velocity is very low
      const speed = Math.hypot(v.vel.x, v.vel.y);
      if (speed < 0.1) {
        v.vel.x *= 0.92; // Stronger damping at low speeds
        v.vel.y *= 0.92;
      }

      // Integrate velocity
      v.vel.x += (Fx / v.mass) * dt;
      v.vel.y += (Fy / v.mass) * dt;

      // Clamp max speed
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
          if (relVel > 0) {
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
    v.mass = v.mass || 1200;
    v.maxSpeed = v.maxSpeed || 6;
    v.engineForce = v.engineForce || 1200;
    v.brakeForce = v.brakeForce || 1800;
    v.rollingRes = v.rollingRes || 3.0; // INCREASED from 1.2
    v.drag = v.drag || 0.5; // INCREASED from 0.3
    v.grip = v.grip || 8.0; // INCREASED from 6.0
    v.steerRate = v.steerRate || 2.5;
    v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
    v.radius = v.radius || 0.6; // collision radius in world units (tiles)
    v._physInit = true;
  }
}