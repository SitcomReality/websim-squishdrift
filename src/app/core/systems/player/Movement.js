import { isWalkable } from '../../../map/TileTypes.js';

export function handlePlayerMovement(state, player, input, dt) {
  let forward = 0, strafe = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) forward += 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) forward -= 0.75;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) strafe -= 0.75;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) strafe += 0.75;

  if (input.keys.has('FacingEast')) player.facingAngle = 0;
  else if (input.keys.has('FacingSouth')) player.facingAngle = Math.PI/2;
  else if (input.keys.has('FacingNorth')) player.facingAngle = -Math.PI/2;
  else if (input.keys.has('FacingWest')) player.facingAngle = Math.PI;

  if (!(forward || strafe)) return;

  const facing = player.facingAngle || 0;
  const cos = Math.cos(facing), sin = Math.sin(facing);
  const dx = forward * cos + strafe * -sin;
  const dy = forward * sin + strafe * cos;

  const len = Math.hypot(dx, dy);
  if (len <= 0) return;

  const ndx = dx / len, ndy = dy / len;
  const running = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  let speed = player.moveSpeed || 1.5;
  if (running && player.canRun !== false) speed *= 1.8;

  const nx = player.pos.x + ndx * speed * dt;
  const ny = player.pos.y + ndy * speed * dt;

  if (isWalkableTile(state, nx, player.pos.y)) player.pos.x = nx;
  if (isWalkableTile(state, player.pos.x, ny)) player.pos.y = ny;
}

export function isWalkableTile(state, x, y) {
  const map = state?.world?.map;
  if (!map) return false;
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;
  const tile = map.tiles[ty][tx];
  if (tile === 8 || tile === 9) {
    const b = getBuildingAt(state, tx, ty);
    if (b && (b.currentHeight ?? b.height) < 0.1) return true;
  }
  return isWalkable(tile);
}

export function getBuildingAt(state, x, y) {
  const map = state.world.map;
  if (!map.buildings) return null;
  return map.buildings.find(b =>
    x >= b.rect.x && x < b.rect.x + b.rect.width &&
    y >= b.rect.y && y < b.rect.y + b.rect.height
  );
}

