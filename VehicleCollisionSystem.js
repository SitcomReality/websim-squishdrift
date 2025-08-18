  isTreeTrunk(x, y, map) {
    if (!map.trees) return false;
    return map.trees.some(tree => {
      const trunkX = Math.floor(tree.pos.x);
      const trunkY = Math.floor(tree.pos.y);
      return trunkX === x && trunkY === y;
    });
  }

