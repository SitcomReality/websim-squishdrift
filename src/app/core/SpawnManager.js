    updateSpawning(player) {
        const state = this.stateManager.getState();
        const innerSpawnRadius = 8;
        const outerSpawnRadius = 10;
        const despawnRadius = 12; // Changed from 15 to 12

