export class StuckRecovery {
  constructor() {}

  updateStuckState(v, dt) {
    const tryingToMoveForward = (v.ctrl?.throttle || 0) > 0.5;
    const fwd = { x: Math.cos(v.rot || 0), y: Math.sin(v.rot || 0) };
    const vLong = (v.vel?.x || 0) * fwd.x + (v.vel?.y || 0) * fwd.y;
    const makingProgress = vLong > 0.15;
    const effectivelyStopped = !makingProgress;

    if (tryingToMoveForward && effectivelyStopped) {
      v.stuckTimer = (v.stuckTimer || 0) + dt;
    } else {
      v.stuckTimer = 0;
    }

    if (!v.retreatState || !v.retreatState.active) {
      const STUCK_THRESHOLD = 0.7;
      if (v.stuckTimer > STUCK_THRESHOLD) {
        const minDist = 0.5;
        const maxDist = 2.0;
        const retreatDist = minDist + Math.random() * (maxDist - minDist);
        v.retreatState = { active: true, remaining: retreatDist };
        v.impatience = 0;
        v.stuckTimer = 0;
        v.ctrl.steer = 0;
      }
    }
  }
}

