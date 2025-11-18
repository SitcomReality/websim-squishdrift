const tryingToMoveForward = (v.ctrl?.throttle || 0) > 0.5;
const effectivelyStopped = speed < 0.1;
if (tryingToMoveForward && effectivelyStopped) {
  v.stuckTimer = (v.stuckTimer || 0) + dt;
} else {
  v.stuckTimer = 0;
}

const effectivelyStopped = speed < 0.1;

const makingProgress = vLong > 0.15;
const effectivelyStopped = !makingProgress;

