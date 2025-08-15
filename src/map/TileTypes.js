export const Tile = {
  Grass: 0,
  RoadN: 1,
  RoadE: 2,
  RoadS: 3,
  RoadW: 4,
  Median: 5,
  Intersection: 6,
  Footpath: 7,
};

export const TileColor = {
  [Tile.Grass]: '#f7f7f7',
  [Tile.RoadN]: '#c9ccd1',
  [Tile.RoadE]: '#c9ccd1',
  [Tile.RoadS]: '#c9ccd1',
  [Tile.RoadW]: '#c9ccd1',
  [Tile.Median]: '#e6e8ec',
  [Tile.Intersection]: '#bfc3c8',
  [Tile.Footpath]: '#e0e2e6',
};

export function isWalkable(t) { return t !== Tile.Median && t !== Tile.RoadN && t !== Tile.RoadE && t !== Tile.RoadS && t !== Tile.RoadW && t !== Tile.Intersection; }
export function isRoad(t){ return t===Tile.RoadN||t===Tile.RoadE||t===Tile.RoadS||t===Tile.RoadW; }
export function roadDir(t){
  if (t===Tile.RoadN) return 'N';
  if (t===Tile.RoadE) return 'E';
  if (t===Tile.RoadS) return 'S';
  if (t===Tile.RoadW) return 'W';
  return null;
}