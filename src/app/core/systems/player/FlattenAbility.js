export function handleFlattenToggle(state, input) {
  if (!input?.pressed?.has('KeyQ')) return;
  const was = state.isFlattened;
  state.isFlattened = !state.isFlattened;
  if (state.isFlattened) state.audio?.playSfx('flatten_down');
  else state.audio?.playSfx('flatten_up');
  triggerFlattenAnimations(state);
}

export function triggerFlattenAnimations(state) {
  const map = state.world.map;
  const isFlattening = state.isFlattened;
  const now = performance.now();

  if (map.buildings) {
    for (const building of map.buildings) {
      building.animationState = {
        type: isFlattening ? 'shrink' : 'grow',
        startTime: now,
        duration: isFlattening ? 300 : 600
      };
    }
  }

  if (map.trees) {
    for (const tree of map.trees) {
      tree.animationState = {
        type: isFlattening ? 'shrink' : 'grow',
        startTime: now,
        duration: isFlattening ? 300 : 600
      };
    }
  }
}

