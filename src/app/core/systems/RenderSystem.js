import { drawTiles } from '../../../render/drawTiles.js';
import { drawBuildings } from '../../../render/drawBuildings.js';
import { drawRoadDebug } from '../../../render/drawRoadDebug.js';
import { drawPlayer } from '../../entities/drawPlayer.js';
import { drawVehicle } from '../../entities/drawVehicle.js';
import { drawNPC } from '../../entities/drawNPC.js';
import { drawItem } from '../../entities/drawItem.js';
import { drawEmergency } from '../../entities/drawEmergency.js';
import { drawHealthBar } from '../../entities/drawHealthBar.js';
import { drawPedestrianDebug } from '../../../render/drawPedestrianDebug.js';
import { drawSpawnDebug } from '../../../render/drawSpawnDebug.js';
import { drawSkidmarks } from '../../../render/drawSkidmarks.js';
import { drawBlood } from '../../entities/drawBlood.js';
import { drawProjectile } from '../../entities/drawProjectile.js';
import { drawDamageIndicator } from '../../entities/drawDamageIndicator.js';
import { drawDamageText } from '../../entities/drawDamageText.js';
import { drawExplosion } from '../../entities/drawExplosion.js';
import { drawStreetLight } from '../../entities/drawStreetLight.js';
import { drawVehicleGlow } from './rendering/drawVehicleGlow.js';

export class RenderSystem {
  constructor() {
    // Create an offscreen canvas for the lighting buffer
    this.lightingCanvas = document.createElement('canvas');
    this.lightingCtx = this.lightingCanvas.getContext('2d');
  }

  render(state, renderer, debugOverlay) {
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
    this.drawParticles(state, renderer);
    
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
    
    // Draw debug overlay if enabled
    if (debugOverlay && debugOverlay.enabled) {
      drawRoadDebug(renderer, state);
      drawPedestrianDebug(renderer, state);
      drawSpawnDebug(renderer, state);
      this.drawDebugHitboxes(state, renderer);
    }
    
    // Draw mouse reticule
    this.drawMouseReticule(state, renderer);
    
    // Draw lighting overlay if system is present
    if (state.lightingSystem && this.lightingCanvas) {
      const { width, height } = canvas;
      if (this.lightingCanvas.width !== width || this.lightingCanvas.height !== height) {
        this.lightingCanvas.width = width;
        this.lightingCanvas.height = height;
      }

      const lightingRenderer = { canvas: this.lightingCanvas, ctx: this.lightingCtx };
      
      // The main renderer has the world transform applied. We need to apply the same transform
      // to our offscreen lighting canvas before rendering lights.
      this.lightingCtx.save();
      this.lightingCtx.setTransform(ctx.getTransform());

      // Render lights and shadows to the offscreen buffer.
      state.lightingSystem.render(state, lightingRenderer);

      this.lightingCtx.restore();

      // Now, draw the completed lighting buffer onto the main canvas.
      // We use 'multiply' to darken the scene based on the light map.
      // We need to do this in screen space, so we reset the transform on the main context.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(this.lightingCanvas, 0, 0);
      ctx.restore(); // Restores world transform and composite operation for any subsequent draws.
    }
  }

  drawDebugHitboxes(state, renderer) {
    const { ctx } = renderer;
    const ts = state.world?.tileSize || 24;
    
    // Draw player hitbox
    const player = state.entities?.find(e => e.type === 'player');
    if (player) {
      const hitboxW = player.hitboxW || 0.15;
      const hitboxH = player.hitboxH || 0.15;
      
      ctx.save();
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      const x = player.pos.x - hitboxW/2;
      const y = player.pos.y - hitboxH/2;
      
      ctx.strokeRect(x * ts, y * ts, hitboxW * ts, hitboxH * ts);
      
      // Draw center point
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.arc(player.pos.x * ts, player.pos.y * ts, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
    
    // Draw NPC hitboxes
    state.entities?.filter(e => e.type === 'npc').forEach(npc => {
      const hitboxW = npc.hitboxW || 0.2;
      const hitboxH = npc.hitboxH || 0.2;
      
      ctx.save();
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      const x = npc.pos.x - hitboxW/2;
      const y = npc.pos.y - hitboxH/2;
      
      ctx.strokeRect(x * ts, y * ts, hitboxW * ts, hitboxH * ts);
      ctx.restore();
    });
    
    // Draw vehicle hitboxes
    state.entities?.filter(e => e.type === 'vehicle').forEach(vehicle => {
      const hitboxW = vehicle.hitboxW || 0.9;
      const hitboxH = vehicle.hitboxH || 0.5;
      
      ctx.save();
      ctx.strokeStyle = '#0000FF';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      ctx.save();
      ctx.translate(vehicle.pos.x * ts, vehicle.pos.y * ts);
      ctx.rotate(vehicle.rot || 0);
      
      ctx.strokeRect(-hitboxW/2 * ts, -hitboxH/2 * ts, hitboxW * ts, hitboxH * ts);
      
      ctx.restore();
      ctx.restore();
    });
    
    // Draw tree trunk collision boxes
    if (state.world?.map?.trees) {
      state.world.map.trees.forEach(tree => {
        const trunkSize = 0.3;
        const halfSize = trunkSize / 2;
        
        ctx.save();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        
        const x = tree.pos.x - halfSize;
        const y = tree.pos.y - halfSize;
        
        ctx.strokeRect(x * ts, y * ts, trunkSize * ts, trunkSize * ts);
        ctx.restore();
      });
    }
  }

  drawParticles(state, renderer) {
    const ps = state.particles || [];
    if (!ps.length) return;
    
    const { ctx } = renderer;
    const ts = state.world.tileSize;
    
    ctx.save();
    
    for (const p of ps) {
      if (p.type === 'smoke') {
        // Draw smoke particles with soft edges
        const radius = p.size * ts;
        const gradient = ctx.createRadialGradient(p.x * ts, p.y * ts, 0, p.x * ts, p.y * ts, radius);
        
        // Create greyscale gradient for smoke
        const color = p.color || 'hsl(0, 0%, 30%)';
        gradient.addColorStop(0, color.replace('%)', `%, ${p.alpha})`));
        gradient.addColorStop(0.7, color.replace('%)', `%, ${p.alpha * 0.5})`));
        gradient.addColorStop(1, color.replace('%)', `%, 0%)`));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x * ts, p.y * ts, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Existing particle drawing
        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife || 1));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color; // use original color and globalAlpha instead of string replace
        ctx.beginPath();
        ctx.arc(p.x * ts, p.y * ts, p.size * ts, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    
    ctx.restore();
  }

  drawMouseReticule(state, renderer) {
    if (!state?.input?.mousePos || !state?.canvas) return;
    
    const { ctx } = renderer;
    const canvas = state.canvas;
    
    // Save current transform
    ctx.save();
    
    // Reset to screen coordinates for reticule
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Get mouse position
    const rect = canvas.getBoundingClientRect();
    const mouseX = state.input.mousePos.x - rect.left;
    const mouseY = state.input.mousePos.y - rect.top;
    
    // Draw reticule
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
    ctx.moveTo(mouseX - 15, mouseY);
    ctx.lineTo(mouseX + 15, mouseY);
    ctx.moveTo(mouseX, mouseY - 15);
    ctx.lineTo(mouseX, mouseY + 15);
    ctx.stroke();
    
    ctx.restore();
  }
}