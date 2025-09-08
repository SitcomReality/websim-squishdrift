export function ensureStamina(entity, maxStamina = 100) {
  if (typeof entity.stamina !== 'number') {
    entity.stamina = maxStamina;
    entity.maxStamina = maxStamina;
  }
}

export function updateStamina(state, player, input, dt) {
  const isRunning = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  const isMoving = input.keys.has('KeyW') || input.keys.has('KeyS') || 
                   input.keys.has('KeyA') || input.keys.has('KeyD') ||
                   input.keys.has('ArrowUp') || input.keys.has('ArrowDown') ||
                   input.keys.has('ArrowLeft') || input.keys.has('ArrowRight');
  const depletion = state.playerConfig?.staminaDepletionRate ?? 20;
  const recharge = state.playerConfig?.staminaRechargeRate ?? 40;

  if (isRunning && isMoving && player.stamina > 0) {
    player.stamina = Math.max(0, player.stamina - depletion * dt);
  } else if (!(isRunning && isMoving)) {
    player.stamina = Math.min(player.maxStamina, player.stamina + recharge * dt);
  }
  player.canRun = player.stamina > 0;
}

export function updateStaminaBar() {
  const staminaBar = document.getElementById('stamina-container');
  if (staminaBar) staminaBar.style.display = 'none';
}

