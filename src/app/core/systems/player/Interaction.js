import { Vec2 } from '../../../utils/Vec2.js';
import { isWalkable } from '../../../map/TileTypes.js';
import { isWalkableTile, getBuildingAt } from './Movement.js';

export function handleInteraction(state, player, input) {
  if (!input?.pressed?.has('KeyE')) return;
  state.control = state.control || { inVehicle: false };

  if (state.control.inVehicle) {
    exitVehicle(state, player);
  } else {
    const vehicle = findNearbyVehicle(state, player);
    if (vehicle) enterVehicle(state, player, vehicle);
    pickupItem(state, player);
  }
}

export function findNearbyVehicle(state, player) {
  const d = 1.5;
  return (state.entities || []).find(e =>
    e.type === 'vehicle' && !e.controlled && !e.isEmergency &&
    e.pos && Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) < d
  ) || null;
}

export function enterVehicle(state, player, vehicle) {
  state.control = state.control || {};
  state.control.inVehicle = true;
  state.control.vehicle = vehicle;
  player.hidden = true; player.inVehicle = true;
  player.lastMoveSpeed = 0; player.collisionDisabled = true; player.canUseItems = false;
  vehicle.controlled = true;
  if (vehicle._glowState) delete vehicle._glowState;

  const el = document.getElementById('vehicle-state');
  if (el) {
    const vt = vehicle.vehicleType || 'Vehicle';
    el.textContent = vt.charAt(0).toUpperCase() + vt.slice(1);
  }
}

export function exitVehicle(state, player) {
  if (!state?.control?.inVehicle) return;
  const v = state.control.vehicle;
  if (v) {
    v.controlled = false;
    if (v._glowState) delete v._glowState;
    const off = 0.8;
    const exitPos = { x: v.pos.x - Math.cos(v.rot || 0) * off, y: v.pos.y - Math.sin(v.rot || 0) * off };
    const map = state.world?.map;
    if (map && (exitPos.x < 0 || exitPos.x >= map.width || exitPos.y < 0 || exitPos.y >= map.height)) {
      const safe = findSafeExitPosition(state, v);
      player.pos.x = safe.x; player.pos.y = safe.y;
    } else if (isWalkableTile(state, exitPos.x, exitPos.y)) {
      player.pos.x = exitPos.x; player.pos.y = exitPos.y;
    } else {
      player.pos.x = v.pos.x - 1; player.pos.y = v.pos.y - 1;
    }
    player.hidden = false; player.inVehicle = false; player.lastMoveSpeed = 0;
    player.collisionDisabled = false; player.canUseItems = true;
  }
  state.control.inVehicle = false; state.control.vehicle = null;
  const el = document.getElementById('vehicle-state'); if (el) el.textContent = 'on foot';
}

export function findSafeExitPosition(state, vehicle) {
  const map = state.world?.map;
  if (!map) return { x: vehicle.pos.x, y: vehicle.pos.y };
  const r = vehicle.rot || 0;
  const back = (d)=>({ x: vehicle.pos.x - Math.cos(r) * d, y: vehicle.pos.y - Math.sin(r) * d });
  const side = (s)=>({ x: vehicle.pos.x + Math.cos(r + s*Math.PI/2)*0.8, y: vehicle.pos.y + Math.sin(r + s*Math.PI/2)*0.8 });
  const candidates = [back(0.8), back(1.5), back(2), side(1), side(-1),
    { x: vehicle.pos.x + 1, y: vehicle.pos.y + 1 },
    { x: vehicle.pos.x - 1, y: vehicle.pos.y - 1 },
    { x: vehicle.pos.x + 1, y: vehicle.pos.y - 1 },
    { x: vehicle.pos.x - 1, y: vehicle.pos.y + 1 }];

  for (const p of candidates) {
    if (p.x >= 0 && p.x < map.width && p.y >= 0 && p.y < map.height && isWalkableTile(state, p.x, p.y)) return p;
  }
  return { x: vehicle.pos.x, y: vehicle.pos.y };
}

export function pickupItem(state, player) {
  const items = (state.entities || []).filter(e => (e.type === 'item' || e.type === 'weapon') && e.pos);
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (Math.hypot(player.pos.x - item.pos.x, player.pos.y - item.pos.y) >= 1) continue;

    if (item.type === 'item') {
      state.inventory = state.inventory || [];
      state.inventory.push(item);
      const nameEl = document.getElementById('item-name'); if (nameEl) nameEl.textContent = item.name;
      const idx = state.entities.indexOf(item); if (idx > -1) state.entities.splice(idx, 1);
      if (typeof item.spotId === 'number' && state?.pickupSpots?.[item.spotId]) state.pickupSpots[item.spotId].hasItem = false;
    } else if (item.type === 'weapon') {
      try {
        state._engine?.systems?.weapon?.handleWeaponPickup?.(state, player);
      } catch (e) {
        console.warn('Weapon pickup failed:', e);
      } finally {
        const idx2 = state.entities.indexOf(item); if (idx2 > -1) state.entities.splice(idx2, 1);
        if (typeof item.spotId === 'number' && state?.pickupSpots?.[item.spotId]) state.pickupSpots[item.spotId].hasItem = false;
      }
    }
  }
}
```

Do not add any additional code or import statements to the file unless specified by the plan. Ensure the file path matches the plan's instructions.