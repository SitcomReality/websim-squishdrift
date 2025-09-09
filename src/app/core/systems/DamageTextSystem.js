export class DamageTextSystem {
  constructor() {
    this.maxTexts = 50; // Limit concurrent damage texts
    this.fadeDuration = 1.5; // seconds to fade
  }

  update(state, dt) {
    if (!state.damageTexts) state.damageTexts = [];
    
    // Update existing texts
    for (let i = state.damageTexts.length - 1; i >= 0; i--) {
      const text = state.damageTexts[i];
      text.age += dt;
      
      // Remove if faded
      if (text.age >= text.lifetime) {
        state.damageTexts.splice(i, 1);
        continue;
      }
      
      // Update position (float upward)
      text.pos.y -= 0.5 * dt; // Slow upward movement
      
      // Handle animation
      if (text.animation) {
        const progress = text.age / text.lifetime;
        let maxScale = 1.0;
        if (text.animation === 'bulge') maxScale = 1.5;
        if (text.animation === 'bulge_small') maxScale = 1.2;
        
        // Simple bulge effect using a sine curve
        text.currentScale = 1 + (maxScale - 1) * Math.sin(progress * Math.PI);
      } else {
        text.currentScale = 1;
      }
    }
    
    // Clean up if we hit max
    if (state.damageTexts.length > this.maxTexts) {
      state.damageTexts.splice(0, state.damageTexts.length - this.maxTexts);
    }
  }

  addDamageText(state, pos, damage, color = '#ff3333') {
    if (!state.damageTexts) state.damageTexts = [];
    
    const text = {
      type: 'damage_text',
      pos: { x: pos.x, y: pos.y },
      text: `-${damage}`,
      color,
      age: 0,
      lifetime: this.fadeDuration,
      size: 7 // Reduced from 14 to 7 (50% of original)
    };
    
    state.damageTexts.push(text);
  }

  addText(state, pos, text, color = '#ffffff', size = 7) { // Reduced default size
    if (!state.damageTexts) state.damageTexts = [];
    
    const floatingText = {
      type: 'floating_text',
      pos: { x: pos.x, y: pos.y },
      text,
      color,
      age: 0,
      lifetime: this.fadeDuration,
      size
    };
    
    state.damageTexts.push(floatingText);
  }

  addPickupText(state, pos, itemName, color = '#4CAF50') {
    if (!state.damageTexts) state.damageTexts = [];
    
    const pickupText = {
      type: 'pickup_text',
      pos: { x: pos.x, y: pos.y - 0.5 }, // Offset slightly above pickup
      text: itemName,
      color,
      age: 0,
      lifetime: 2.0, // Longer duration for pickups
      size: 8 // Reduced from 16 to 8 (50% of original)
    };
    
    state.damageTexts.push(pickupText);
  }

  addScoreText(state, pos, score) {
    if (!state.damageTexts) state.damageTexts = [];
    if (score <= 0) return;

    const flair = this.getFlairForScore(score);

    const text = {
      type: 'score_text',
      pos: { x: pos.x, y: pos.y },
      text: `+${score}`,
      color: flair.color,
      age: 0,
      lifetime: flair.lifetime,
      size: flair.size,
      animation: flair.animation,
      currentScale: 1
    };
    
    state.damageTexts.push(text);
  }

  getFlairForScore(score) {
    // For now, scores are small. This will be more impressive with combos.
    if (score >= 25) { // Big score
      return {
        color: '#FFD700', // Gold
        lifetime: 2.5,
        size: 16,
        animation: 'bulge',
      };
    } else if (score >= 10) { // Medium score
      return {
        color: '#FFA500', // Orange
        lifetime: 2.0,
        size: 12,
        animation: 'bulge_small',
      };
    } else { // Small score
      return {
        color: '#FFFFFF', // White
        lifetime: 1.5,
        size: 9,
        animation: null,
      };
    }
  }
}