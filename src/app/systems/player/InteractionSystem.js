import { VehicleInteraction } from './interactions/VehicleInteraction.js';
import { ItemPickup } from './interactions/ItemPickup.js';
import { MobileControls } from './ui/MobileControls.js';
import { DesktopPrompts } from './ui/DesktopPrompts.js';

export class InteractionSystem {
  constructor() {
    this.vehicleInteraction = new VehicleInteraction();
    this.itemPickup = new ItemPickup();
    this.mobileControls = new MobileControls(this.vehicleInteraction);
    this.desktopPrompts = new DesktopPrompts(this.vehicleInteraction);
  }

  updateInteractionPrompt(state, player) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (window.innerWidth <= 768 && 'ontouchstart' in window);

    if (isMobile) {
      this.mobileControls.updateMobileInteraction(state, player);
    } else {
      this.desktopPrompts.updateDesktopInteractionPrompt(state, player);
    }
  }

  handleInteraction(state, player, input) {
    if (!input || !input.pressed || !input.pressed.has) return;
    
    if (input.pressed.has('KeyE')) {
      if (!state.control) {
        state.control = { inVehicle: false };
      }
      
      if (state.control.inVehicle) {
        this.vehicleInteraction.exitVehicle(state, player);
      } else {
        this.vehicleInteraction.handleVehicleInteraction(state, player);
        this.itemPickup.pickupItem(state, player);
      }
    }
  }
}

