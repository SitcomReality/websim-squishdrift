export class AIDrivingSystem {
  update(state, dt) {
    const roads = state.world.map.roads;
    for (const v of state.entities.filter(e => e.type === 'vehicle' && e.controlled !== true)) {
      // Ensure control struct
      v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
      v.aiTargetSpeed = v.aiTargetSpeed || 3.0;

      // Waypoint following based on node/next graph
      if (v.next && v.node) {
        const target = { x: v.next.x + 0.5, y: v.next.y + 0.5 };
        
        // Predictive steering: aim ahead of the target based on velocity
        const PREDICTION_TIME = 0.8; /* @tweakable how far ahead to predict for steering */
        const currentSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
        const futureTarget = {
          x: target.x + (v.vel?.x || 0) * PREDICTION_TIME,
          y: target.y + (v.vel?.y || 0) * PREDICTION_TIME
        };
        
        const toT = { x: futureTarget.x - v.pos.x, y: futureTarget.y - v.pos.y };
        const dist = Math.hypot(toT.x, toT.y) || 1;
        const desired = Math.atan2(toT.y, toT.x);
        const diff = wrapAngle(desired - (v.rot || 0));

        // Steering: proportional with velocity-based damping
        const steerK = 4.5; /* @tweakable NPC steering responsiveness */
        const velocityDamping = Math.min(1, currentSpeed / 4.0); /* @tweakable how much steering reduces at high speeds */
        v.ctrl.steer = clamp(diff * steerK * (1 - velocityDamping * 0.4), -1, 1);

        // Speed control: slow for sharp turns
        const turnSlow = 1 / (1 + 3 * Math.abs(diff)); /* @tweakable how much NPCs slow down for turns */
        const targetSpeed = (v.aiTargetSpeed || 2.0) * turnSlow;

        // Current forward speed
        const fwd = { x: Math.cos(v.rot || 0), y: Math.sin(v.rot || 0) };
        const vLong = (v.vel?.x || 0) * fwd.x + (v.vel?.y || 0) * fwd.y;

        const accelBand = 0.3; /* @tweakable how close to target speed before stopping acceleration */
        if (Math.abs(vLong - targetSpeed) < accelBand) {
          v.ctrl.throttle = 0; v.ctrl.reverse = 0; v.ctrl.brake = 0;
        } else if (vLong < targetSpeed - accelBand) {
          v.ctrl.throttle = 1; v.ctrl.reverse = 0; v.ctrl.brake = 0;
        } else if (vLong > targetSpeed + accelBand) {
          v.ctrl.throttle = 0; v.ctrl.reverse = 0; v.ctrl.brake = 0.5;
          // Use reverse for stronger braking
          if (vLong > targetSpeed + accelBand * 2) {
            v.ctrl.reverse = -0.7;
          }
        }

        // Increased pathfinding tolerance
        const ARRIVAL_TOLERANCE = 0.75;
        if (dist < ARRIVAL_TOLERANCE) {
          const key = `${v.next.x},${v.next.y},${v.next.dir}`;
          v.node = roads.byKey.get(key) || v.node;
          const choices = v.node.next;
          v.next = (choices && choices.length)
            ? choices[Math.floor(state.rand() * choices.length)]
            : { x: v.node.x, y: v.node.y, dir: v.node.dir };
        }
      } else if (v.next && !v.node && roads?.byKey) {
        const key = `${v.next.x},${v.next.y},${v.next.dir}`;
        v.node = roads.byKey.get(key) || null;
      }
    }
  }
}

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function wrapAngle(a) {
  while (a > Math.PI) a -= 2*Math.PI;
  while (a < -Math.PI) a += 2*Math.PI;
  return a;
}