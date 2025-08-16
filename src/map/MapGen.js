  // Outer perimeter road (clockwise)
  for (let i = 0; i < width; i++) {
    tiles[0][i] = Tile.RoadW;      // Changed from RoadE to RoadW
    tiles[1][i] = Tile.RoadW;    // Changed from RoadE to RoadW
    tiles[height - 2][i] = Tile.RoadE; // Changed from RoadW to RoadE
    tiles[height - 1][i] = Tile.RoadE; // Changed from RoadW to RoadE
  }
  for (let i = 0; i < height; i++) {
    tiles[i][0] = Tile.RoadS;
    tiles[i][1] = Tile.RoadS;
    tiles[i][width - 2] = Tile.RoadN;
    tiles[i][width - 1] = Tile.RoadN;
  }

