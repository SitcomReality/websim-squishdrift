  handlePedestrianCollision(state, v) {
    const peds = state.entities.filter(e => e.type === 'npc');
    const vehicleOBB = entityOBB(v);

    for (let i = peds.length - 1; i >= 0; i--) {
      const ped = peds[i];
      ped.hitboxW = ped.hitboxW ?? 0.2;
      ped.hitboxH = ped.hitboxH ?? 0.2;
      ped.rot = 0;

      const pedOBB = entityOBB(ped, {w: ped.hitboxW, h: ped.hitboxH});
      const contact = obbOverlap(vehicleOBB, pedOBB);

      if (contact) {
        state.audio?.playSfxAt?.('pedestrian_death', ped.pos, state);
        
        // Play random oof sound
        const oofSound = Math.random() < 0.5 ? 'oof01' : 'oof02';
        state.audio?.playSfxAt?.(oofSound, ped.pos, state);
        
        const bloodStain = {
            type: 'blood',
            pos: { x: ped.pos.x, y: ped.pos.y },
            size: 0.6 + Math.random() * 0.4,
            color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
            rotation: Math.random() * Math.PI * 2
        };
        
        state.entities.push(bloodStain);
        
        const pedIndex = state.entities.indexOf(ped);
        if (pedIndex > -1) {
            state.entities.splice(pedIndex, 1);
        }
      }
    }
  }

