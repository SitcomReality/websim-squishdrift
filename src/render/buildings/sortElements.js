export function collectAndSortElements(map, ts) {
  const elements = [...map.buildings];
  if (map.trees) {
    map.trees.forEach(tree => {
      elements.push({ type: 'tree', pos: tree.pos, height: (tree.currentTrunkHeight ?? tree.trunkHeight) + (tree.currentLeafHeight ?? tree.leafHeight), tree });
    });
  }
  elements.sort((a, b) => {
    const aY = a.rect ? (a.rect.y + a.rect.height) : (a.pos.y + 1);
    const bY = b.rect ? (b.rect.y + b.rect.height) : (b.pos.y + 1);
    const aH = a.currentHeight ?? a.height ?? 0;
    const bH = b.currentHeight ?? b.height ?? 0;
    return (aY + (aH / ts) * 0.1) - (bY + (bH / ts) * 0.1);
  });
  return elements;
}