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
  ZebraCrossing: 11, // new zebra crossing tile
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
  [Tile.ZebraCrossing]: '#CED4DA', // slightly lighter for crossing base
};

export function isWalkable(t) { 
  return t !== Tile.BuildingWall && t !== Tile.BuildingFloor && t !== Tile.Median;
  // Note: ZebraCrossing is walkable (not excluded here)
}

export function isRoad(t){ return t===Tile.RoadN||t===Tile.RoadE||t===Tile.RoadS||t===Tile.RoadW; }
export function roadDir(t){
  if (t===Tile.RoadN) return 'N';
  if (t===Tile.RoadE) return 'E';
  if (t===Tile.RoadS) return 'S';
  if (t===Tile.RoadW) return 'W';
  return null;
}