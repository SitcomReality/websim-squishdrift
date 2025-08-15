export class BulletSystem {
  update(state, dt) {
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const e = state.entities[i];
      if (e.type === 'bullet') {
        e.pos.x += e.vel.x * dt;
        e.pos.y += e.vel.y * dt;
        e.life -= dt;
        if (e.life <= 0) state.entities.splice(i, 1);
      }
    }
  }
}

