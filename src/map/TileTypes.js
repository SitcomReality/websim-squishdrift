export const Tile = {
  Grass: 0,
  Road: 1,
  Median: 2,
};
export const TileColor = {
  [Tile.Grass]: '#f7f7f7',
  [Tile.Road]: '#c9ccd1',
  [Tile.Median]: '#e6e8ec',
};

export function isWalkable(t) { return t !== Tile.Median; }