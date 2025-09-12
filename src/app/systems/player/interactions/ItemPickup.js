export class ItemPickup {
  pickupItem(state, player) {
    if (!state || !player || !state.entities) return;
    if (!player.pos) return;

    const items = state.entities.filter(e =>
      (e.type === 'item' || e.type === 'weapon') && e.pos
    );

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (!item || !item.pos || !player.pos) continue;

      if (Math.hypot(player.pos.x - item.pos.x, player.pos.y - item.pos.y) < 1) {
        if (item.type === 'item') {
          // Handle regular items
          state.inventory = state.inventory || [];
          state.inventory.push(item);

          const itemNameEl = document.getElementById('item-name');
          if (itemNameEl) itemNameEl.textContent = item.name;

          // remove from entities and mark spot (if any) as empty so it can respawn
          const idx = state.entities.indexOf(item);
          if (idx > -1) state.entities.splice(idx, 1);
          if (typeof item.spotId === 'number' && state?.pickupSpots?.[item.spotId]) {
            state.pickupSpots[item.spotId].hasItem = false;
          }
        } else if (item.type === 'weapon') {
          // Handle weapon pickup
          try {
            // Use WeaponSystem directly if available
            if (state._engine?.systems?.weapon) {
              state._engine.systems.weapon.handleWeaponPickup(state, player);
            }
          } catch (e) {
            console.warn('Weapon pickup failed:', e);
          } finally {
            const idx2 = state.entities.indexOf(item);
            if (idx2 > -1) state.entities.splice(idx2, 1);
            if (typeof item.spotId === 'number' && state?.pickupSpots?.[item.spotId]) {
              state.pickupSpots[item.spotId].hasItem = false;
            }
          }
        }
      }
    }
  }
}