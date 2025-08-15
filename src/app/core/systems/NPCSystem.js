export class NPCSystem {
  update(state, dt) {
    for (const ped of state.entities.filter(e=>e.type==='npc')) {
      ped.t += ped.speed * dt;
      if (ped.t >= 1) {
        this.updateNPCPath(state, ped);
      }
      this.updateNPCPosition(ped);
    }
  }

  updateNPCPath(state, ped) {
    ped.from = { x: ped.to.x, y: ped.to.y };
    const key = `${ped.from.x},${ped.from.y}`;
    const node = state.world.map.peds.nodes.get(key);
    const options = (node?.neighbors||[]).filter(n=> !(n.x===ped.from.x && n.y===ped.from.y && n.x===ped.to.x && n.y===ped.to.y));
    const notBack = options.filter(n=> !(n.x===ped.to.x && n.y===ped.to.y));
    const pool = (notBack.length?notBack:options.length?options:[{x:ped.from.x,y:ped.from.y}]);
    ped.to = pool[Math.floor(state.rand()*pool.length)];
    ped.t = 0;
  }

  updateNPCPosition(ped) {
    const ax = ped.from.x + 0.5, ay = ped.from.y + 0.5;
    const bx = ped.to.x + 0.5, by = ped.to.y + 0.5;
    ped.pos.x = ax*(1-ped.t) + bx*ped.t;
    ped.pos.y = ay*(1-ped.t) + by*ped.t;
  }
}

