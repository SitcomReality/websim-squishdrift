import { drawNPC } from './drawNPC.js';
import { drawHealthBar } from './drawHealthBar.js';

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
  
  // Draw health bar above player
  drawHealthBar(r, player, -0.3);
  
  // Draw stamina bar below player when not full
  if (player.stamina !== undefined && player.stamina < player.maxStamina) {
    updateStaminaBar(r, player, 0.5);
  }
}

function updateStaminaBar(r, player, offsetY = 0.5) {
  if (!player.health) return;
  if (player.hidden || player.inVehicle) return;
  if (player.stamina === undefined || player.stamina >= player.maxStamina) return;
  
  const { ctx } = r;
  const ts = r.ts || 24;
  const staminaPercent = player.stamina / player.maxStamina;
  
  ctx.save();
  ctx.translate(player.pos.x * ts, (player.pos.y + offsetY) * ts);
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(-ts * 0.3, -ts * 0.1, ts * 0.6, ts * 0.08);
  
  // Stamina bar
  const staminaColor = '#00BFFF'; // Blue for stamina
  ctx.fillStyle = staminaColor;
  ctx.fillRect(-ts * 0.3, -ts * 0.1, ts * 0.6 * staminaPercent, ts * 0.08);
  
  ctx.restore();
}