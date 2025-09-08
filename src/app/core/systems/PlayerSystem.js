import { isWalkable } from '../../../map/TileTypes.js';
import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';
import { ensureStamina, updateStamina, updateStaminaBar } from './player/Stamina.js';
import { updateFacingFromMouse } from './player/Facing.js';
import { handlePlayerMovement } from './player/Movement.js';
import { handleInteraction, findNearbyVehicle } from './player/Interaction.js';
import { handleFlattenToggle } from './player/FlattenAbility.js';

export class PlayerSystem {
  constructor() {
    this.maxStamina = 100;
    this.staminaDepletionRate = 20; // per second
    this.staminaRechargeRate = 40; // per second (2x depletion)
  }

  update(state, input, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;
    
    this.ensureHealth(player);
    // delegate stamina init/config
    state.playerConfig = { staminaDepletionRate: this.staminaDepletionRate, staminaRechargeRate: this.staminaRechargeRate };
    ensureStamina(player, this.maxStamina);
    
    // Q toggle flatten
    handleFlattenToggle(state, input);
    
    // play ouch when hp drops
    try {
      const prevHp = (player.health && typeof player.health._prevHp === 'number') ? player.health._prevHp : player.health.hp;
      if (player.health.hp < prevHp) state.audio?.playSfx?.('ouch');
      player.health._prevHp = player.health.hp;
    } catch {}

    updateFacingFromMouse(state, player, input);
    handleInteraction(state, player, input);
    
    if (!state.control) state.control = { inVehicle: false };
    
    try {
      const promptEl = document.getElementById('interaction-prompt');
      const actionEl = document.getElementById('interaction-action');
      if (promptEl && actionEl && player.pos && !state.control.inVehicle) {
        const nearbyVehicle = findNearbyVehicle(state, player);
        if (nearbyVehicle) { actionEl.textContent = 'enter vehicle'; promptEl.style.display = ''; }
        else { promptEl.style.display = 'none'; }
      } else if (promptEl) { promptEl.style.display = 'none'; }
    } catch {}
    
    if (!state.control.inVehicle) {
      const prev = { x: player.pos.x, y: player.pos.y };
      handlePlayerMovement(state, player, input, dt);
      const dx = player.pos.x - prev.x, dy = player.pos.y - prev.y;
      player.lastMoveSpeed = Math.hypot(dx, dy) / dt;
      if (player.lastMoveSpeed > 0.01) player.t = (player.t || 0) + (player.lastMoveSpeed * 0.6) * dt;
      else player.t = 0;
      updateStamina(state, player, input, dt);
      updateStaminaBar(); // ensure HUD stamina container remains hidden (drawn near player instead)
    } else {
      const v = state.control.vehicle;
      if (v && v.pos) {
        player.pos.x = v.pos.x; player.pos.y = v.pos.y;
        player.hidden = true; player.inVehicle = true;
        player.lastMoveSpeed = 0; player.t = 0;
      }
    }
  }

  ensureHealth(entity) {
    if (!entity.health) entity.health = new Health(100);
  }
}