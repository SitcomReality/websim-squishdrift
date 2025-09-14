// removed import aabbForTrunk
import { gatherAllLights } from './buildings/helpers.js';
import { collectAndSortElements } from './buildings/sortElements.js';
import { drawBuilding3D } from './buildings/drawBuilding3D.js';
import { drawTree3D } from './buildings/drawTree3D.js';

export function drawBuildings(r, state, mode = 'all', lightingCanvas) {
  const ts = state.world.tileSize, map = state.world.map;
  const allLights = gatherAllLights(state);
  const elements = collectAndSortElements(map, ts);
  for (const el of elements) {
    if (el.type === 'tree') drawTree3D(r, state, el.tree, mode, lightingCanvas);
    else drawBuilding3D(r, state, el, mode, lightingCanvas, allLights);
  }
}