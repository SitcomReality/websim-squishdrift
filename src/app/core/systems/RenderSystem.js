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

export class RenderSystem {
  constructor() {
    this.skidmarkSystem = new (await import('./SkidmarkSystem.js')).SkidmarkSystem();
  }

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
    
    // Draw layers in correct order
    const z = state.camera.zoom || 1;
    const wTiles = Math.ceil(canvas.width/(ts*z))+2, hTiles = Math.ceil(canvas.height/(ts*z))+2;
    const sx = Math.floor(state.camera.x - wTiles/2), sy = Math.floor(state.camera.y - hTiles/2);
    ctx.fillStyle = '#b7e3f8'; // ocean
    ctx.fillRect(sx*ts, sy*ts, wTiles*ts, hTiles*ts);
    
    // Draw ground layer first
    drawTiles(renderer, state, 'ground');
    drawTiles(renderer, state, 'floors');
    
    // Draw skidmarks on top of ground but below entities
    this.skidmarkSystem.render(renderer, state);
    
    // Draw entities behind buildings
    const entitiesBehind = state.entities.filter(e => 
      e.type === 'npc' || e.type === 'vehicle' || e.type === 'player' || 
      e.type === 'item' || e.type === 'bullet' || e.type === 'emergency'
    );
    
    for (const entity of entitiesBehind) {
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