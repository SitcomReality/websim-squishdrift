import { drawTiles } from '../../../render/drawTiles.js';
import { drawBuildings } from '../../../render/drawBuildings.js';

import { drawPlayer } from '../../entities/drawPlayer.js';
import { drawVehicle } from '../../entities/drawVehicle.js';
import { drawNPC } from '../../entities/drawNPC.js';
import { drawItem } from '../../entities/drawItem.js';
import { drawEmergency } from '../../entities/drawEmergency.js';
import { drawHealthBar } from '../../entities/drawHealthBar.js';
import { drawSkidmarks } from '../../../render/drawSkidmarks.js';
import { drawBlood } from '../../entities/drawBlood.js';
import { drawProjectile } from '../../entities/drawProjectile.js';
import { drawDamageIndicator } from '../../entities/drawDamageIndicator.js';
import { drawDamageText } from '../../entities/drawDamageText.js';
import { drawExplosion } from '../../entities/drawExplosion.js';
import { drawStreetLight } from '../../entities/drawStreetLight.js';
import { drawVehicleGlow } from './rendering/drawVehicleGlow.js';
import { drawParticles } from './rendering/drawParticles.js';
import { applyLighting } from './rendering/applyLighting.js';

export class RenderSystem {
  constructor() {
    // Create an offscreen canvas for the lighting buffer
    this.lightingCanvas = document.createElement('canvas');
    this.lightingCtx = this.lightingCanvas.getContext('2d');
  }

  render(state, renderer) {
    if (!state || !renderer || !renderer.ctx || !renderer.canvas) {
      console.error('Invalid state or renderer');
      return;
    }
    
    const { ctx, canvas } = renderer;
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Setup camera transform
    const ts = state.world?.tileSize || 24;
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(cx, cy);
    const z = state.camera?.zoom || 1;
    ctx.scale(z, z);
    // pixel-snap transform to prevent tile border seams
    const snapX = Math.round((state.camera?.x || 0) * ts * z) / z;
    const snapY = Math.round((state.camera?.y || 0) * ts * z) / z;
    ctx.translate(-snapX, -snapY);
    
    // Draw layers
    const wTiles = Math.ceil(canvas.width/(ts*z))+2;
    const hTiles = Math.ceil(canvas.height/(ts*z))+2;
    const sx = Math.floor((state.camera?.x || 0) - wTiles/2);
    const sy = Math.floor((state.camera?.y || 0) - hTiles/2);
    ctx.fillStyle = '#b7e3f8'; // ocean
    ctx.fillRect(sx*ts, sy*ts, wTiles*ts, hTiles*ts);
    
    drawTiles(renderer, state, 'ground');
    // When flattened, draw roofs on the ground before entities.
    if (state.isFlattened) {
      drawBuildings(renderer, state, 'roofs_flat');
    }
    drawTiles(renderer, state, 'floors');
    drawSkidmarks(renderer, state);
    
    // When flattened, draw roofs on the ground before entities
    // Draw only already-flattened roofs on the ground before entities.
    // This ensures tall building walls remain visible while they are animating.
    drawBuildings(renderer, state, 'roofs_flat_animating');
    
    // Sort entities by y-position for proper z-ordering
    const entities = [...(state.entities || [])].sort((a, b) => {
      // Blood stains should be drawn behind everything
      if (a?.type === 'blood' && b?.type !== 'blood') return -1;
      if (b?.type === 'blood' && a?.type !== 'blood') return 1;
      
      // Pedestrians behind vehicles
      if (a?.type === 'npc' && b?.type === 'vehicle') return -1;
      if (b?.type === 'npc' && a?.type === 'vehicle') return 1;
      
      // Otherwise sort by y-position for depth
      return (a?.pos?.y || 0) - (b?.pos?.y || 0);
    });
    
    // Draw player vehicle glow effect first
    if (state.control?.inVehicle && state.control?.vehicle) {
      drawVehicleGlow(state, renderer);
    }
    
    for (const entity of entities) {
      if (!entity || !entity.pos) continue;
      
      switch (entity.type) {
        case 'player':
          drawPlayer(renderer, state, entity);
          drawHealthBar(renderer, entity);
          break;
        case 'vehicle':
          drawVehicle(renderer, state, entity);
          // Remove health bar for vehicles
          break;
        case 'npc':
          drawNPC(renderer, state, entity);
          break;
        case 'item':
          drawItem(renderer, state, entity);
          break;
        case 'emergency':
          drawEmergency(renderer, state, entity);
          break;
        case 'blood':
          drawBlood(renderer, state, entity);
          break;
        case 'bullet':
          ctx.save();
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(entity.pos.x * ts, entity.pos.y * ts, ts * 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        case 'projectile':
          drawProjectile(renderer, state, entity);
          break;
        case 'damage_indicator':
          drawDamageIndicator(renderer, state, entity);
          break;
        case 'light':
          drawStreetLight(renderer, state, entity);
          break;
      }
    }
    
    // Draw explosions in front of everything except roofs
    const explosions = state.explosions || [];
    for (const explosion of explosions) {
      drawExplosion(renderer, state, explosion);
    }
    
    // Draw buildings: always render walls for any building that still has height,
    // then draw roofs. drawBuildings internally skips walls/roofs based on currentHeight.
    if (!state.isFlattened) {
      drawBuildings(renderer, state, 'walls');
      drawBuildings(renderer, state, 'roofs');
    } else {
      // In flattened mode, only draw walls/roofs for buildings that are still animating down.
      drawBuildings(renderer, state, 'walls_animating');
      drawBuildings(renderer, state, 'roofs_animating');
    }
    
    // Draw particles (including smoke)
    drawParticles(state, renderer);
    
    // Draw damage text and floating text ON TOP of everything
    drawDamageText(renderer, state);
    
    // Flatten pulse FX (expanding ring + tint)
    if (state.flattenFX?.active) {
      const fx = state.flattenFX, p = Math.min(1, fx.t / fx.duration);
      const ts = state.world.tileSize, z = state.camera?.zoom || 1;
      const cx = Math.floor(canvas.width/2), cy = Math.floor(canvas.height/2);
      const sx = cx + (fx.origin.x - (state.camera?.x||0)) * ts * z;
      const sy = cy + (fx.origin.y - (state.camera?.y||0)) * ts * z;
      const color = fx.mode === 'down' ? 'rgba(0,229,255,' : 'rgba(255,209,102,';
      const r = (Math.hypot(canvas.width, canvas.height) * 0.5) * p;
      ctx.save(); ctx.setTransform(1,0,0,1,0,0);
      ctx.strokeStyle = `${color}${1 - p})`; ctx.lineWidth = 6 + 24 * (1 - p);
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = `${color}${0.08 * (1 - p)})`; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.restore();
    }
    
    // Warning ring when auto-flatten is about to expire (last 3s)
    if (state.flattenAuto?.active) {
      const now = Date.now();
      const timeLeft = Math.max(0, state.flattenAuto.expiresAt - now);
      if (timeLeft <= 3000) {
        const warnP = timeLeft / 3000;           // 1 -> 0
        const intensity = 1 - warnP;             // 0 -> 1
        const freq = 1 + intensity * 6;          // speeds up as it nears 0
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.12;
        // determine origin (fallback to player if no current fx origin)
        const ref = (state.control?.inVehicle ? state.control.vehicle?.pos : state.entities.find(e=>e.type==='player')?.pos) || state.flattenFX?.origin || {x:0,y:0};
        const ts = state.world.tileSize, z = state.camera?.zoom || 1;
        const cx = Math.floor(canvas.width/2), cy = Math.floor(canvas.height/2);
        const sx = cx + (ref.x - (state.camera?.x||0)) * ts * z;
        const sy = cy + (ref.y - (state.camera?.y||0)) * ts * z;
        const t = (now % 1000) / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * freq);
        const radius = baseRadius * (0.8 + intensity * 1.5) * (0.9 + 0.2 * pulse);
        ctx.save(); ctx.setTransform(1,0,0,1,0,0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,209,102,${0.25 + 0.5 * intensity})`;
        ctx.lineWidth = 2 + 6 * intensity * pulse;
        ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI*2); ctx.stroke();
        // subtle center flash growing as it nears end
        ctx.fillStyle = `rgba(255,209,102,${0.03 + 0.12 * intensity * pulse})`;
        ctx.beginPath(); ctx.arc(sx, sy, radius * 0.35 * (0.7 + 0.6 * pulse), 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }
    
    // Apply lighting buffer (offscreen composition)
    applyLighting({ ctx, canvas }, state, this.lightingCanvas, this.lightingCtx);
  }
}