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
            // Use same styled buttons as title screen: keyboard + gamepad
            actionEl.innerHTML = 'Press <kbd>E</kbd> / <kbd class="gamepad-button">Y</kbd> to enter vehicle';
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