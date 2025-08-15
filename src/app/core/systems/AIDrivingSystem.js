export class AIDrivingSystem {
  update(state, dt) {
    const roads = state.world.map.roads;
    for (const v of state.entities.filter(e => e.type === 'vehicle' && !e.controlled)) {
      // Ensure control struct
      v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
      v.aiTargetSpeed = v.aiTargetSpeed || 3.0;

      // Waypoint following based on node/next graph
      if (v.next && v.node) {
        const target = { x: v.next.x + 0.5, y: v.next.y + 0.5 };
        const toT = { x: target.x - v.pos.x, y: target.y - v.pos.y };
        const dist = Math.hypot(toT.x, toT.y) || 1;
        const desired = Math.atan2(toT.y, toT.x);
        const diff = wrapAngle(desired - (v.rot || 0));

        // Steering: proportional
        const steerK = 1.5;
        v.ctrl.steer = clamp(diff * steerK, -1, 1);

        // Speed control: slow for sharp turns
        const turnSlow = 1 / (1 + 2 * Math.abs(diff));
        const targetSpeed = (v.aiTargetSpeed) * turnSlow;

        // Current forward speed
        const fwd = { x: Math.cos(v.rot || 0), y: Math.sin(v.rot || 0) };
        const vLong = (v.vel?.x || 0) * fwd.x + (v.vel?.y || 0) * fwd.y;

        const accelBand = 0.2;
        if (vLong < targetSpeed - accelBand) {
          v.ctrl.throttle = 1; v.ctrl.brake = 0;
        } else if (vLong > targetSpeed + accelBand) {
          v.ctrl.throttle = 0; v.ctrl.brake = clamp((vLong - targetSpeed) / 2, 0, 1);
        } else {
          v.ctrl.throttle = 0.3; v.ctrl.brake = 0;
        }

        // Advance to next node
        if (dist < 0.35) {
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