import { drawNPC } from './drawNPC.js';

export function drawPlayer(r, state, player) {
  if (player.hidden) return;
  const { ctx } = r, ts = state.world.tileSize, p = player.pos;
  
  // Use drawNPC function for player sprite
  const npc = {
    type: 'npc',
    pos: player.pos,
    from: { x: Math.floor(p.x), y: Math.floor(p.y) },
    to: { x: Math.floor(p.x) + Math.cos(player.facingAngle || 0), y: Math.floor(p.y) + Math.sin(player.facingAngle || 0) },
    t: 0,
    speed: player.moveSpeed || 6,
    skinTone: player.skinTone,
    bodyIndex: player.bodyIndex,
    armIndex: player.armIndex,
    facingAngle: player.facingAngle
  };
  
  // Use the NPC drawing function directly
  drawNPC(r, state, npc);
}