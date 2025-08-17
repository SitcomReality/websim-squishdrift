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

export class RenderSystem {
  render(state, renderer, debugOverlay) {
    const { ctx, canvas } = renderer;
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Setup camera transform
    const ts = state.world.tileSize;
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(cx, cy);
    ctx.scale(state.camera.zoom || 1, state.camera.zoom || 1);
    ctx.translate(Math.floor(-state.camera.x * ts), Math.floor(-state.camera.y * ts));
    
    // Draw layers
    const z = state.camera.zoom || 1;
    const wTiles = Math.ceil(canvas.width/(ts*z))+2, hTiles = Math.ceil(canvas.height/(ts*z))+2;
    const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
    ctx.fillStyle = '#b7e3f8'; // ocean
    ctx.fillRect(sx*ts, sy*ts, wTiles*ts, hTiles*ts);
    
    drawTiles(renderer, state, 'ground');
    drawTiles(renderer, state, 'floors');
    drawSkidmarks(renderer, state);
    
    // Sort entities by y-position for proper z-ordering
    // Blood, pedestrians, vehicles in that order
    const entities = [...state.entities].sort((a, b) => {
      // Blood stains should be drawn behind everything
      if (a.type === 'blood' && b.type !== 'blood') return -1;
      if (b.type === 'blood' && a.type !== 'blood') return 1;
      
      // Pedestrians behind vehicles
      if (a.type === 'npc' && b.type === 'vehicle') return -1;
      if (b.type === 'npc' && a.type === 'vehicle') return 1;
      
      // Otherwise sort by y-position for depth
      return (a.pos.y || 0) - (b.pos.y || 0);
    });
    
    for (const entity of entities) {
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
      }
    }
    
    // Draw buildings (walls and roofs) in front
    drawBuildings(renderer, state, 'walls');
    drawBuildings(renderer, state, 'roofs');
    
    // Draw debug overlay if enabled
    if (debugOverlay.enabled) {
      drawRoadDebug(renderer, state);
      drawPedestrianDebug(renderer, state);
      drawSpawnDebug(renderer, state);
    }
  }
}