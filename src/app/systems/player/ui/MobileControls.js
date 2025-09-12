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
        abilityButton.style.display = '';
      } else {
        // Hide ability button while on foot — manual flattening is removed.
        abilityButton.textContent = '';
        abilityButton.dataset.action = '';
        abilityButton.style.display = 'none';
      }
    }
  }
}