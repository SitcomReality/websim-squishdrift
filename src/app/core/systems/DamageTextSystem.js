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
      
      // Update position based on type for visual separation
      if (text.type === 'score_text') {
        text.pos.y -= 0.6 * dt; // Score moves up faster
        text.pos.x += 0.3 * dt; // and to the right
      } else if (text.type === 'damage_text') {
        text.pos.y -= 0.4 * dt; // Damage moves up slower
        text.pos.x -= 0.2 * dt; // and to the left
      } else {
        text.pos.y -= 0.5 * dt; // Other texts float straight up
      }
      
      // Handle animation
      const progress = text.age / text.lifetime;
      if (text.animation === 'bulge' || text.animation === 'bulge_small') {
        const maxScale = text.animation === 'bulge' ? 1.6 : 1.3;
        // Bouncier bulge effect using a new easing function
        text.currentScale = 1 + (maxScale - 1) * this.easeOutElastic(progress);
      } else if (text.animation === 'pop') {
        // Quick pop-in animation for damage
        const popDuration = 0.2; // 200ms for the pop
        if (progress < popDuration) {
          text.currentScale = 1 + (1.2 - 1) * Math.sin((progress / popDuration) * Math.PI);
        } else {
          text.currentScale = 1;
        }
      } else {
        text.currentScale = 1;
      }
    }
    
    // Clean up if we hit max
    if (state.damageTexts.length > this.maxTexts) {
      state.damageTexts.splice(0, state.damageTexts.length - this.maxTexts);
    }
  }

  // Bouncier easing function for score text animation
  easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    const p = Math.pow(2, -10 * t);
    const s = Math.sin((t * 10 - 0.75) * c4);
    return p * s + 1;
  }

  addDamageText(state, pos, damage, color = '#ff4757') { // Slightly brighter red
    if (!state.damageTexts) state.damageTexts = [];
    
    const text = {
      type: 'damage_text',
      pos: { x: pos.x, y: pos.y },
      text: `-${damage}`,
      color,
      age: 0,
      lifetime: this.fadeDuration,
      size: 8, // Slightly larger base size for damage
      animation: 'pop', // Add pop animation
      currentScale: 1
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
        size: 14, // Slightly smaller max size
        animation: 'bulge',
      };
    } else if (score >= 10) { // Medium score
      return {
        color: '#FFA500', // Orange
        lifetime: 2.0,
        size: 11,
        animation: 'bulge_small',
      };
    } else { // Small score
      return {
        color: '#E0E0E0', // Light Grey instead of pure white
        lifetime: 1.5,
        size: 8,
        animation: 'bulge_small', // Give small scores a subtle bulge too
      };
    }
  }
}