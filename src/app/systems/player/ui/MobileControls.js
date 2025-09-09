export class MobileControls {
  constructor(vehicleInteraction) {
    this.vehicleInteraction = vehicleInteraction;
  }

  updateMobileInteraction(state, player) {
    const abilityButton = document.getElementById('mobile-ability-button');
    if (!abilityButton) return;

    if (state.control?.inVehicle) {
      abilityButton.textContent = 'Exit';
      abilityButton.dataset.action = 'KeyE';
    } else {
      const nearbyVehicle = this.vehicleInteraction.findNearbyVehicle(state, player);
      if (nearbyVehicle) {
        abilityButton.textContent = 'Enter';
        abilityButton.dataset.action = 'KeyE';
      } else {
        abilityButton.textContent = 'Flatten';
        abilityButton.dataset.action = 'KeyQ';
      }
    }
  }
}

