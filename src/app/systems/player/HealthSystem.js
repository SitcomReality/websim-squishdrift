import { Health } from '../../components/Health.js';

export class HealthSystem {
  ensureHealth(entity) {
    if (!entity.health) {
      entity.health = new Health(100);
    }
  }

  updateHealth(state, player) {
    // Play ouch when player's health decreases
    try {
      const prevHp = (player.health && typeof player.health._prevHp === 'number') ? player.health._prevHp : player.health.hp;
      if (player.health.hp < prevHp) {
        state.audio?.playSfx?.('ouch');
      }
      player.health._prevHp = player.health.hp;
    } catch (e) { /* swallow audio errors */ }
  }
}

