  // Check if this is a tree trunk position
  const isTreeTrunk = (x, y) => {
    if (!map.trees) return false;
    return map.trees.some(tree => {
      const trunkX = Math.floor(tree.pos.x);
      const trunkY = Math.floor(tree.pos.y);
      return trunkX === x && trunkY === y;
    });
  };

