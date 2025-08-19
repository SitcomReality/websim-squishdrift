export function sanitizeMap(tiles, width, height, Tile, isRoad) {
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
  const isRoadish = (t) => isRoad(t) || t === Tile.Intersection || t === Tile.RoundaboutCenter;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = tiles[y][x];
      if (t === Tile.ZebraCrossingN || t === Tile.ZebraCrossingS) {
        const up = inBounds(x, y - 1) ? tiles[y - 1][x] : 255;
        const down = inBounds(x, y + 1) ? tiles[y + 1][x] : 255;
        const ok = (isRoadish(up) && isRoadish(down)) || ((up === Tile.Footpath || down === Tile.Footpath) && (isRoadish(up) || isRoadish(down))) || (!inBounds(x, y - 1) || !inBounds(x, y + 1));
        if (!ok) tiles[y][x] = Tile.Footpath;
      } else if (t === Tile.ZebraCrossingE || t === Tile.ZebraCrossingW) {
        const left = inBounds(x - 1, y) ? tiles[y][x - 1] : 255;
        const right = inBounds(x + 1, y) ? tiles[y][x + 1] : 255;
        const ok = (isRoadish(left) && isRoadish(right)) || ((left === Tile.Footpath || right === Tile.Footpath) && (isRoadish(left) || isRoadish(right))) || (!inBounds(x - 1, y) || !inBounds(x + 1, y));
        if (!ok) tiles[y][x] = Tile.Footpath;
      }
    }
  }
}