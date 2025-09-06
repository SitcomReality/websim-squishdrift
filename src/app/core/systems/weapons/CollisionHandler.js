  checkTreeTrunkCollision(projX, projY, tx, ty, state) {
    if (!state.world.map.trees) return false;
    
    const tree = this.getTreeAt(tx, ty, state.world.map);
    
    if (!tree) return false;
    
    // Skip collision if tree is flattened
    if ((tree.currentTrunkHeight ?? tree.trunkHeight) < 0.1) {
      return false;
    }
    
    const trunkSize = 0.3;
    const trunkHalf = trunkSize / 2;
    const trunkCenterX = tx + 0.5;
    const trunkCenterY = ty + 0.5;
    
    const dx = Math.abs(projX - trunkCenterX);
    const dy = Math.abs(projY - trunkCenterY);
    
    return dx <= trunkHalf && dy <= trunkHalf;
  }

