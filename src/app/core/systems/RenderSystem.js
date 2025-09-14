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
import { drawFlattenEffects } from './rendering/drawFlattenEffects.js';

export class RenderSystem {
  constructor() {
    // Create an offscreen canvas for the lighting buffer
    this.lightingCanvas = document.createElement('canvas');
    this.lightingCtx = this.lightingCanvas.getContext('2d');
    
    // Create an offscreen canvas for 3D elements (buildings)
    this.threeDCanvas = document.createElement('canvas');
    this.threeDCtx = this.threeDCanvas.getContext('2d');
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
    
    // Prepare 3D elements buffer
    const { width, height } = canvas;
    if (this.threeDCanvas.width !== width || this.threeDCanvas.height !== height) {
        this.threeDCanvas.width = width;
        this.threeDCanvas.height = height;
    }
    this.threeDCtx.clearRect(0, 0, width, height);
    const threeDRenderer = { canvas: this.threeDCanvas, ctx: this.threeDCtx, ts: renderer.ts };
    
    // Draw buildings and other 3D elements to offscreen buffer
    this.threeDCtx.save();
    this.threeDCtx.setTransform(ctx.getTransform());
    if (!state.isFlattened) {
      drawBuildings(threeDRenderer, state, 'walls');
      drawBuildings(threeDRenderer, state, 'roofs');
    } else {
      drawBuildings(threeDRenderer, state, 'walls_animating');
      drawBuildings(threeDRenderer, state, 'roofs_animating');
    }
    this.threeDCtx.restore();

    // Draw the 3D buffer to the main canvas
    ctx.drawImage(this.threeDCanvas, -cx, -cy);

    // Draw particles (including smoke)
    drawParticles(state, renderer);
    
    // Draw damage text and floating text ON TOP of everything
    drawDamageText(renderer, state);
    
    // Draw flattening visual effects
    drawFlattenEffects(state, renderer);
    
    // Draw lighting overlay if system is present
    if (state.lightingSystem && this.lightingCanvas) {
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

      // Make the completed lighting canvas available to drawBuildings by passing it as a 4th arg.
      // drawBuildings currently accepts (renderer, state, mode), extra args are safe and
      // allow drawBuildings to read the lighting canvas if it wants.
      drawBuildings(renderer, state, 'all', this.lightingCanvas);

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
}