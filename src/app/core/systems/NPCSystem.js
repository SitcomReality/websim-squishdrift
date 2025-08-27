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
    
    // Filter out the node we just came from with 99% probability
    const options = (node?.neighbors||[]).filter(n => {
      const cameFrom = (n.x === ped.from.x && n.y === ped.from.y);
      return !cameFrom || state.rand() < 0.01; // 1% chance to go back
    });
    
    // If no valid options (dead end), allow going back
    const pool = options.length > 0 ? options : node?.neighbors || [{x: ped.from.x, y: ped.from.y}];
    
    ped.to = pool[Math.floor(state.rand() * pool.length)];
    ped.t = 0;
  }

  updateNPCPosition(ped) {
    const ax = ped.from.x + 0.5, ay = ped.from.y + 0.5;
    const bx = ped.to.x + 0.5, by = ped.to.y + 0.5;
    
    // Add random offset from path center
    if (!ped.pathOffset) {
      const maxOffset = 0.3; // Increased from 0.075 to 0.3 (4x)
      ped.pathOffset = {
        x: (Math.random() - 0.5) * 2 * maxOffset,
        y: (Math.random() - 0.5) * 2 * maxOffset
      };
    }
    
    ped.pos.x = ax*(1-ped.t) + bx*ped.t + ped.pathOffset.x;
    ped.pos.y = ay*(1-ped.t) + by*ped.t + ped.pathOffset.y;
  }
}