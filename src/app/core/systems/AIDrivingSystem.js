import { RoutePlanner } from './ai/RoutePlanner.js';
import { ObstacleDetector } from './ai/ObstacleDetector.js';
import { StuckRecovery } from './ai/StuckRecovery.js';

export class AIDrivingSystem {
  constructor() {
    this.routePlanner = new RoutePlanner();
    this.obstacleDetector = new ObstacleDetector();
    this.stuckRecovery = new StuckRecovery();
  }

  update(state, dt) {
    const roads = state.world.map.roads;
    const obstacles = state.entities.filter(e => e.type === 'vehicle' || e.type === 'npc' || e.type === 'player');

    for (const v of state.entities.filter(e => e.type === 'vehicle' && e.controlled !== true)) {
      // Ensure control struct
      v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
      v.drivingStyle = v.drivingStyle || 'normal';
      v.aiTargetSpeed = v.aiTargetSpeed || (v.drivingStyle === 'reckless' ? 4.0 : 1.5);
      v.impatience = v.impatience || 0;
      v.stuckTimer = v.stuckTimer || 0;

      // Delegate checks
      this.checkVehiclePanic(v);

      // Ensure there's always a valid plannedRoute array and index to avoid calling nonexistent planner methods
      if (!Array.isArray(v.plannedRoute)) v.plannedRoute = [];
      if (typeof v.currentPathIndex !== 'number') v.currentPathIndex = 0;

      // Obstacle detection & route impatience
      const detected = this.obstacleDetector.detectAhead(state, v, obstacles, roads);
      if (detected) v.impatience += dt;
      else if (v.impatience > 0) v.impatience = Math.max(0, v.impatience - dt * 0.5);

      // NOTE: The older RoutePlanner had initializeRoute/ensureRouteLength/updateRouteFollowing helpers.
      // Those methods do not exist on the current RoutePlanner implementation; keep AI safe by
      // ensuring route fields exist and allowing other systems (PoliceChaseManager / EmergencyServices)
      // to assign plannedRoute when needed. Complex route-following remains out of scope here.

      // Stuck recovery (may set retreatState and modify v.ctrl)
      this.stuckRecovery.updateStuckState(v, dt);

      // Apply movement controls based on AI decisions (steer/throttle already driven elsewhere)
      this.updateMovement(v, dt);
    }
  }

  checkVehiclePanic(vehicle) {
    if (vehicle.health && vehicle.health.hp < vehicle.health.maxHp && vehicle.drivingStyle !== 'reckless') {
      vehicle.drivingStyle = 'reckless';
      vehicle.aiTargetSpeed = 4.0;
      vehicle.impatience = 10;
    }
    if (vehicle.health && vehicle.health.hp < (vehicle.health.maxHp * 0.3)) {
      vehicle.aiTargetSpeed = 5.0;
    }
  }

  // (Kept) updateMovement extracted from original file (unchanged logic)
  updateMovement(v, dt) {
    // Ensure basic physics properties exist
    v.vel = v.vel || { x: 0, y: 0 };
    v.rot = v.rot || 0;
    v.angularVelocity = v.angularVelocity || 0;
    v.mass = v.mass || 1200;

    // Smooth throttle/brake control to avoid oscillation: use deadband and lerp
    const fwd = { x: Math.cos(v.rot || 0), y: Math.sin(v.rot || 0) };
    const vLong = (v.vel?.x || 0) * fwd.x + (v.vel?.y || 0) * fwd.y;
    const speed = Math.hypot(v.vel.x, v.vel.y);

    // Stuck / retreat handling delegated to StuckRecovery; here we respect v.retreatState
    if (!v.controlled) {
      // nothing additional here - stuck timers handled elsewhere
    }

    let target = v.aiTargetSpeed || 3.0;
    if (v.retreatState && v.retreatState.active) {
      const retreatSpeed = 2.0;
      target = -retreatSpeed;
      const backwardComponent = -(vLong);
      if (backwardComponent > 0) {
        v.retreatState.remaining -= backwardComponent * dt;
      }
      if (v.retreatState.remaining <= 0) v.retreatState.active = false;
    }

    const accelBand = 0.2;
    let desiredThrottle = 0, desiredBrake = 0, desiredHandbrake = false;

    if (Math.abs(vLong - target) < accelBand) {
      desiredThrottle = 0; desiredBrake = 0; desiredHandbrake = true;
    } else if (vLong < target - accelBand) {
      if (target < 0) {
        desiredThrottle = -1; desiredBrake = 0; desiredHandbrake = false;
      } else {
        desiredThrottle = 1; desiredBrake = 0; desiredHandbrake = false;
      }
    } else if (vLong > target + accelBand) {
      desiredThrottle = 0; desiredBrake = 0.6; desiredHandbrake = false;
    }

    if (v.brakeHoldTimer && v.brakeHoldTimer > 0) {
      desiredHandbrake = true;
      desiredThrottle = 0;
      v.brakeHoldTimer = Math.max(0, v.brakeHoldTimer - dt);
    }

    v.ctrl.throttle = (v.ctrl.throttle || 0) * 0.75 + desiredThrottle * 0.25;
    v.ctrl.brake = (v.ctrl.brake || 0) * 0.75 + desiredBrake * 0.25;
    v.ctrl.handbrake = (v.ctrl.handbrake || false) || desiredHandbrake;

    v.ctrl.throttle = clamp(v.ctrl.throttle, -1, 1);
    v.ctrl.brake = clamp(v.ctrl.brake, 0, 1);
  }
}

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }