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

export class RenderSystem {
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
    ctx.scale(state.camera?.zoom || 1, state.camera?.zoom || 1);
    ctx.translate(Math.floor(-(state.camera?.x || 0) * ts), Math.floor(-(state.camera?.y || 0) * ts));
    
    // Draw layers
    const z = state.camera?.zoom || 1;
    const wTiles = Math.ceil(canvas.width/(ts*z))+2;
    const hTiles = Math.ceil(canvas.height/(ts*z))+2;
    const sx = Math.floor((state.camera?.x || 0) - wTiles/2);
    const sy = Math.floor((state.camera?.y || 0) - hTiles/2);
    ctx.fillStyle = '#b7e3f8'; // ocean
    ctx.fillRect(sx*ts, sy*ts, wTiles*ts, hTiles*ts);
    
    drawTiles(renderer, state, 'ground');
    drawTiles(renderer, state, 'floors');
    drawSkidmarks(renderer, state);
    
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
    
    for (const entity of entities) {
      if (!entity || !entity.pos) continue;
      
      switch (entity.type) {
        case 'player':
          drawPlayer(renderer, state, entity);
          drawHealthBar(renderer, entity);
          break;
        case 'vehicle':
          drawVehicle(renderer, state, entity);
          drawHealthBar(renderer, entity);
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
      }
    }
    
    // Draw buildings (walls and roofs) in front
    drawBuildings(renderer, state, 'walls');
    drawBuildings(renderer, state, 'roofs');
    
    // Draw damage text and floating text ON TOP of everything
    drawDamageText(renderer, state);
    
    // Draw debug overlay if enabled
    if (debugOverlay && debugOverlay.enabled) {
      drawRoadDebug(renderer, state);
      drawPedestrianDebug(renderer, state);
      drawSpawnDebug(renderer, state);
      this.drawDebugHitboxes(state, renderer);
    }
    
    // Draw mouse reticule
    this.drawMouseReticule(state, renderer);
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