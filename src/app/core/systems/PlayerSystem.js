import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';
import { StaminaSystem } from '../../systems/player/StaminaSystem.js';
import { HealthSystem } from '../../systems/player/HealthSystem.js';
import { FlattenSystem } from '../../systems/player/FlattenSystem.js';
import { MovementSystem } from '../../systems/player/MovementSystem.js';
import { FacingSystem } from '../../systems/player/FacingSystem.js';
import { InteractionSystem } from '../../systems/player/InteractionSystem.js';

export class PlayerSystem {
  constructor() {
    this.staminaSystem = new StaminaSystem();
    this.healthSystem = new HealthSystem();
    this.flattenSystem = new FlattenSystem();
    this.movementSystem = new MovementSystem();
    this.facingSystem = new FacingSystem();
    this.interactionSystem = new InteractionSystem();
  }

  update(state, input, dt) {
    if (!state || !dt) return;
    
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;
    
    // Ensure player has required components
    this.ensurePlayerComponents(player);
    
    // Update stamina system
    this.staminaSystem.ensureStamina(player);
    this.staminaSystem.updateStamina(state, player, input, dt);
    
    // Update health system
    this.healthSystem.ensureHealth(player);
    this.healthSystem.updateHealth(state, player);
    
    // Update flatten system
    this.flattenSystem.update(state, input, dt);
    
    // Update movement system
    this.movementSystem.handlePlayerMovement(state, player, input, dt);
    
    // Update facing system
    this.facingSystem.updateFacingFromMouse(state, player, input);
    
    // Update interaction system
    this.interactionSystem.updateInteractionPrompt(state, player);
    this.interactionSystem.handleInteraction(state, player, input);
  }

  ensurePlayerComponents(player) {
    if (!player.health) {
      player.health = new Health(100);
    }
    if (!player.facingAngle) {
      player.facingAngle = 0;
    }
    if (!player.facing) {
      player.facing = new Vec2(1, 0);
    }
    if (!player.t) {
      player.t = 0;
    }
    if (!player.lastMoveSpeed) {
      player.lastMoveSpeed = 0;
    }
  }
}