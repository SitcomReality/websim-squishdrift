  addDamageText(state, pos, damage) {
    if (!state.damageTexts) state.damageTexts = [];
    
    // Play ouch sound when player takes damage
    const player = state.entities.find(e => e.type === 'player');
    if (player && Math.hypot(player.pos.x - pos.x, player.pos.y - pos.y) < 0.5) {
      state.audio?.playSfx?.('ouch');
    }
    
    const damageText = {
      type: 'damage_text',
      pos: { x: pos.x, y: pos.y },
      text: `-${damage}`,
      color: '#ff3333',
      age: 0,
      lifetime: 1.5, // 1.5 seconds
      size: 16
    };
    
    state.damageTexts.push(damageText);
  }

