import { drawNPC } from './drawNPC.js';
import { drawHealthBar } from './drawHealthBar.js';

export function drawPlayer(r, state, player) {
  if (player.hidden) return;
  const { ctx } = r, ts = state.world.tileSize, p = player.pos;
  
  // Create a dynamic NPC-like representation for player with arm movement
  const isMoving = player.lastMoveSpeed > 0.01;
  const moveSpeed = player.lastMoveSpeed || 0;
  
  // Only animate arms when actually moving
  let animMultiplier = 0;
  if (isMoving) {
    // Much more reasonable multiplier - only 20% faster than NPCs
    animMultiplier = 1.2;
  }
  
  // Create NPC-like structure for player with custom animation
  const npc = {
    type: 'npc',
    pos: player.pos,
    from: { x: Math.floor(p.x), y: Math.floor(p.y) },
    to: { x: Math.floor(p.x) + Math.cos(player.facingAngle || 0), y: Math.floor(p.y) + Math.sin(player.facingAngle || 0) },
    t: isMoving ? ((player.t || 0) * animMultiplier % 1) : 0, // 0 when stationary
    speed: isMoving ? moveSpeed : 0,
    skinTone: player.skinTone,
    bodyIndex: player.bodyIndex,
    armIndex: player.armIndex,
    facingAngle: player.facingAngle
  };
  
  // Use the NPC drawing function which includes arm animation
  drawNPC(r, state, npc);
  
  // Draw health bar above player
  drawHealthBar(r, player, -0.3);
  
  // Draw stamina bar below player when not full
  if (player.stamina !== undefined && player.stamina < player.maxStamina) {
    drawStaminaBar(r, player, 0.5);
  }
}

function drawStaminaBar(r, player, offsetY = 0.5) {
  if (!player.health) return;
  if (player.hidden || player.inVehicle) return;
  
  const { ctx } = r;
  const ts = r.ts || 24;
  const staminaPercent = player.stamina / player.maxStamina;
  
  ctx.save();
  ctx.translate(player.pos.x * ts, (player.pos.y + offsetY) * ts);
  
  // Background with black outline
  const barWidth = ts * 0.6;
  const barHeight = ts * 0.08;
  const outlineThickness = Math.max(1, Math.round(ts * 0.01)); // ~2-3px equivalent
  
  // Draw black outline
  ctx.fillStyle = '#000000';
  ctx.fillRect(-ts * 0.3 - outlineThickness, 
               -ts * 0.1 - outlineThickness, 
               barWidth + 2 * outlineThickness, 
               barHeight + 2 * outlineThickness);
  
  // Background inside outline
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(-ts * 0.3, -ts * 0.1, barWidth, barHeight);
  
  // Stamina bar
  const staminaColor = '#00BFFF';
  ctx.fillStyle = staminaColor;
  ctx.fillRect(-ts * 0.3, -ts * 0.1, barWidth * staminaPercent, barHeight);
  
  ctx.restore();
}