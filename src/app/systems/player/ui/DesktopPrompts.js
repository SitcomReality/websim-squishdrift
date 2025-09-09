export class DesktopPrompts {
  constructor(vehicleInteraction) {
    this.vehicleInteraction = vehicleInteraction;
  }

  updateDesktopInteractionPrompt(state, player) {
    try {
      const promptEl = document.getElementById('interaction-prompt');
      if (promptEl) {
        const actionEl = document.getElementById('interaction-action');
        if (actionEl && player.pos && !state.control.inVehicle) {
          const nearbyVehicle = this.vehicleInteraction.findNearbyVehicle(state, player);
          if (nearbyVehicle) {
            actionEl.textContent = 'enter vehicle';
            promptEl.style.display = '';
          } else {
            promptEl.style.display = 'none';
          }
        } else {
          promptEl.style.display = 'none';
        }
      }
    } catch (e) { /* DOM may be unavailable in some contexts */ }
  }
}