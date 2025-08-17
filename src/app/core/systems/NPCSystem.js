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
    
    if (!node || !node.neighbors || node.neighbors.length === 0) {
      // Fallback to current position if no neighbors
      ped.to = { x: ped.from.x, y: ped.from.y };
      ped.t = 0;
      return;
    }
    
    const options = node.neighbors;
    
    // Filter out the node we just came from (heavy bias against backtracking)
    let filteredOptions = options.filter(n => 
      !(n.x === ped.from.x && n.y === ped.from.y)
    );
    
    // If we have no options except backtracking, we have to backtrack
    if (filteredOptions.length === 0) {
      // Find the original node we came from
      const prevNode = options.find(n => n.x === ped.from.x && n.y === ped.from.y);
      if (prevNode) {
        ped.to = prevNode;
      } else {
        // Fallback to any available neighbor
        ped.to = options[Math.floor(state.rand() * options.length)];
      }
    } else {
      // Choose from the filtered options (excluding backtracking)
      ped.to = filteredOptions[Math.floor(state.rand() * filteredOptions.length)];
    }
    
    ped.t = 0;
  }

  updateNPCPosition(ped) {
    const ax = ped.from.x + 0.5, ay = ped.from.y + 0.5;
    const bx = ped.to.x + 0.5, by = ped.to.y + 0.5;
    ped.pos.x = ax*(1-ped.t) + bx*ped.t;
    ped.pos.y = ay*(1-ped.t) + by*ped.t;
  }
}