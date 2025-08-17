export const Tile = {
  Grass: 0,
  RoadN: 1,
  RoadE: 2,
  RoadS: 3,
  RoadW: 4,
  Median: 5,
  Intersection: 6,
  Footpath: 7,
  BuildingFloor: 8,
  BuildingWall: 9,
  Park: 10,
  ZebraCrossingW: 11,
  ZebraCrossingE: 12,
  ZebraCrossingS: 13,
  ZebraCrossingN: 14,
};

export const TileColor = {
  [Tile.Grass]: '#90EE90', // light green for grass/gaps
  [Tile.RoadN]: '#2F2F2F', // very dark grey
  [Tile.RoadE]: '#2F2F2F',
  [Tile.RoadS]: '#2F2F2F',
  [Tile.RoadW]: '#2F2F2F',
  [Tile.Median]: '#404040', // dark grey for medians
  [Tile.Intersection]: '#2F2F2F', // same as roads
  [Tile.Footpath]: '#D3D3D3', // light grey
  [Tile.BuildingFloor]: '#f8f9fa',
  [Tile.BuildingWall]: '#9ca3af',
  [Tile.Park]: '#228B22', // dark green
  [11]: '#FFFFFF', // Zebra crossing west
  [12]: '#FFFFFF', // Zebra crossing east
  [13]: '#FFFFFF', // Zebra crossing south
  [14]: '#FFFFFF', // Zebra crossing north
};

export function isWalkable(t) { 
  return t !== Tile.BuildingWall && t !== Tile.BuildingFloor && 
         t !== 11 && t !== 12 && t !== 13 && t !== 14;
}

export function isRoad(t) {
  return t === Tile.RoadN || t === Tile.RoadE || t === Tile.RoadS || t === Tile.RoadW ||
         t === 11 || t === 12 || t === 13 || t === 14;
}

export function roadDir(t) {
  if (t === Tile.RoadN || t === 14) return 'N';
  if (t === Tile.RoadE || t === 11) return 'E';
  if (t === Tile.RoadS || t === 12) return 'S';
  if (t === Tile.RoadW || t === 13) return 'W';
  return null;
}