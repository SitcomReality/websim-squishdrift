export class StaminaSystem {
  constructor() {
    this.maxStamina = 100;
    this.staminaDepletionRate = 20; // per second
    this.staminaRechargeRate = 40; // per second (2x depletion)
  }

  ensureStamina(entity) {
    // Only initialize stamina when it's missing (null/undefined), not when it's 0.
    if (typeof entity.stamina !== 'number') {
      entity.stamina = this.maxStamina;
      entity.maxStamina = this.maxStamina;
    }
  }

  updateStamina(state, player, input, dt) {
    const gp = navigator.getGamepads()[input.gamepadIndex ?? 0];
    const isRunning = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || gp?.buttons[0]?.pressed;
    const isMoving = input.keys.has('KeyW') || input.keys.has('KeyS') || 
                    input.keys.has('KeyA') || input.keys.has('KeyD') ||
                    input.keys.has('ArrowUp') || input.keys.has('ArrowDown') ||
                    input.keys.has('ArrowLeft') || input.keys.has('ArrowRight');
    
    // Deplete stamina when running and moving, but only if there's stamina
    if (isRunning && isMoving && player.stamina > 0) {
      // actively depleting while running and moving
      player.stamina = Math.max(0, player.stamina - this.staminaDepletionRate * dt);
    } else if (!(isRunning && isMoving)) {
      // only recharge when the player is NOT holding run+movement
      player.stamina = Math.min(player.maxStamina, player.stamina + this.staminaRechargeRate * dt);
    }
    
    // If stamina is zero and player is trying to run, don't allow running
    // This prevents the instant reset issue
    player.canRun = player.stamina > 0;
    
    // Removed HUD stamina bar update - now drawn near player on canvas
  }
}