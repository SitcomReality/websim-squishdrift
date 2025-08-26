  loadVehicleImages() {
-    const vehicleTypes = ['ambulance', 'compact', 'sedan', 'truck', 'sports', 'firetruck', 'police'];
+    const vehicleTypes = ['ambulance', 'compact', 'sedan', 'truck', 'sport', 'firetruck', 'police'];
    const vehicleImages = {};
    
    vehicleTypes.forEach(type => {
      const img = new Image();
      img.src = `/vehicle_${type}.png`;
      img.onload = () => {
        if (this.stateManager.state) {
          if (!this.stateManager.state.vehicleImages) {
            this.stateManager.state.vehicleImages = {};
          }
          this.stateManager.state.vehicleImages[type] = img;
        }
      };
    });
  }

