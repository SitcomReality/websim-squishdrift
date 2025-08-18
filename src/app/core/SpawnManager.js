  updateSpawning(player) {
    const state = this.stateManager.getState();
    const innerSpawnRadius = 8;
    const outerSpawnRadius = 10;
    const despawnRadius = 12; // Reduced from 15 to 12 tiles

    // Despawn entities outside despawn radius
    this.despawnEntities(state, player, despawnRadius);

