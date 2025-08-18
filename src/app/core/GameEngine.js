  initializePickups() {
    // Create pickup spawn locations at center of each block
    const cityLayout = this.state.world.map;
    const blockWidth = cityLayout.W + cityLayout.MED;
    
    for (let by = 0; by < cityLayout.blocksHigh; by++) {
      for (let bx = 0; bx < cityLayout.blocksWide; bx++) {
        const center = {
          x: cityLayout.mapOffset + cityLayout.MED + bx * blockWidth + cityLayout.W / 2,
          y: cityLayout.mapOffset + cityLayout.MED + by * blockWidth + cityLayout.W / 2
        };
        
        this.pickupManager.addSpawnLocation(center);
      }
    }
  }

