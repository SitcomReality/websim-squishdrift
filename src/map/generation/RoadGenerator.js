  generateRoundabouts(tiles) {
    for (let gy = 0; gy <= this.cityLayout.blocksHigh; gy++) {
      for (let gx = 0; gx <= this.cityLayout.blocksWide; gx++) {
        const center = this.cityLayout.getIntersectionCenter(gx, gy);
        if (center.y >= this.cityLayout.height || center.x >= this.cityLayout.width) continue;
        
        const isPerimeter = (gx === 0 || gx === this.cityLayout.blocksWide || 
                           gy === 0 || gy === this.cityLayout.blocksHigh);
        
        this.createRoundabout(tiles, center.x, center.y, isPerimeter);
        this.roundabouts.push({ cx: center.x, cy: center.y, isPerimeter });
        
        // Store roundabouts on cityLayout for median generation
        if (!this.cityLayout.roundabouts) {
          this.cityLayout.roundabouts = [];
        }
        this.cityLayout.roundabouts.push({ cx: center.x, cy: center.y });
      }
    }
  }

