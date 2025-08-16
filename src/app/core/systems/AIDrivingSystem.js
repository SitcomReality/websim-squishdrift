export class AIDrivingSystem {
  update(state, dt) {
    const roads = state.world.map.roads;
    for (const v of state.entities.filter(e => e.type === 'vehicle' && e.controlled !== true)) {
      // Ensure control struct
      v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
      v.aiTargetSpeed = v.aiTargetSpeed || 1.5; // 50% of player max

      // Waypoint following based on node/next graph
      if (v.next && v.node) {
        const target = { x: v.next.x + 0.5, y: v.next.y + 0.5 };
        
        // Calculate distance to target
        const dx = target.x - v.pos.x;
        const dy = target.y - v.pos.y;
        const dist = Math.hypot(dx, dy);
        
        // Predictive steering: aim ahead based on velocity
        const PREDICTION_TIME = 0.5; // seconds ahead to predict
        const currentSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
        const futureTarget = {
          x: target.x + (v.vel?.x || 0) * PREDICTION_TIME,
          y: target.y + (v.vel?.y || 0) * PREDICTION_TIME
        };
        
        const toT = { x: futureTarget.x - v.pos.x, y: futureTarget.y - v.pos.y };
        const futureDist = Math.hypot(toT.x, toT.y) || 1;
        const desired = Math.atan2(toT.y, toT.x);
        const diff = wrapAngle(desired - (v.rot || 0));

        // Dynamic speed control based on distance and turning angle
        let targetSpeed = v.aiTargetSpeed;
        
        // Slow down when approaching intersections
        if (dist < 3.0) {
          // Exponentially slow down as we get closer
          const slowFactor = Math.min(1.0, Math.max(0.1, dist / 3.0));
          targetSpeed *= slowFactor;
          
          // Extra slow for sharp turns
          const turnSharpness = Math.abs(diff);
          if (turnSharpness > 0.5) {
            targetSpeed *= 0.3; // Very slow for sharp turns
          } else if (turnSharpness > 0.2) {
            targetSpeed *= 0.6; // Moderate slow for medium turns
          }
        }
        
        // Ensure minimum speed to prevent getting stuck
        targetSpeed = Math.max(0.3, targetSpeed);

        // Steering: proportional with velocity-based damping
        const steerK = 6.0;
        const velocityDamping = Math.min(1, currentSpeed / 4.0);
        v.ctrl.steer = clamp(diff * steerK * (1 - velocityDamping * 0.3), -1, 1);

        // Current forward speed
        const fwd = { x: Math.cos(v.rot || 0), y: Math.sin(v.rot || 0) };
        const vLong = (v.vel?.x || 0) * fwd.x + (v.vel?.y || 0) * fwd.y;

        const accelBand = 0.2;
        if (Math.abs(vLong - targetSpeed) < accelBand) {
          v.ctrl.throttle = 0;
          v.ctrl.reverse = 0;
          v.ctrl.brake = 0;
        } else if (vLong < targetSpeed - accelBand) {
          v.ctrl.throttle = 1;
          v.ctrl.reverse = 0;
          v.ctrl.brake = 0;
        } else if (vLong > targetSpeed + accelBand) {
          v.ctrl.throttle = 0;
          v.ctrl.reverse = 0;
          v.ctrl.brake = 0.5;
          
          // Use reverse for stronger braking when needed
          if (vLong > targetSpeed + accelBand * 3) {
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