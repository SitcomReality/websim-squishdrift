  isWalkableTile(state, x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= state.world.map.width || ty >= state.world.map.height) return false;
    
    const tile = state.world.map.tiles[ty][tx];
    
    // Check for tree trunks
    const isTreeTrunk = state.world.map.trees?.some(tree => 
      Math.floor(tree.pos.x) === tx && Math.floor(tree.pos.y) === ty
    );
    
    // Tree trunks are not walkable
    if (isTreeTrunk) return false;
    
    return isWalkable(tile);
  }

