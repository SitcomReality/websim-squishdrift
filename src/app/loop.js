export function createLoop({ update, render }) {
  const STEP = 1/60; // seconds
  let raf = 0, last = 0, acc = 0, running = false;

  function frame(nowMs){
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const now = nowMs / 1000;
    if (!last) last = now;
    let dt = now - last;
    if (dt > 0.25) dt = 0.25; // avoid spiral
    last = now;
    acc += dt;
    while (acc >= STEP) { update(STEP); acc -= STEP; }
    const alpha = acc / STEP;
    render(alpha);
  }

  return {
    start(){ if (!running){ running = true; raf = requestAnimationFrame(frame);} },
    stop(){ running = false; cancelAnimationFrame(raf); }
  };
}

