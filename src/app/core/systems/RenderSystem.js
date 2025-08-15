import { drawTiles } from '../../render/drawTiles.js';
import { drawBuildings } from '../../render/drawBuildings.js';
import { drawRoadDebug } from '../../render/drawRoadDebug.js';
import { drawPlayer } from '../entities/drawPlayer.js';
import { drawVehicle } from '../entities/drawVehicle.js';
import { drawNPC } from '../entities/drawNPC.js';
import { drawItem } from '../entities/drawItem.js';
import { drawEmergency } from '../entities/drawEmergency.js';
import { drawHealthBar } from '../entities/drawHealthBar.js';

export class RenderSystem {
  render(state, renderer, debugOverlay) {
    renderer.ts = state.world.tileSize;
    
    const sorted = state.entities.slice().sort((a, b) => a.pos.y - b.pos.y);
    
    drawTiles(renderer, state, 'ground');
    drawTiles(renderer, state, 'floors');
    
    for (const e of sorted) {
      switch(e.type) {
        case 'player':
          drawPlayer(renderer, state, e);
          drawHealthBar(renderer, e);
          break;
        case 'npc':
          drawNPC(renderer, state, e);
          drawHealthBar(renderer, e);
          break;
        case 'vehicle':
          drawVehicle(renderer, state, e);
          drawHealthBar(renderer, e, -1.2);
          break;
        case 'item':
          drawItem(renderer, state, e);
          break;
        case 'emergency':
          drawEmergency(renderer, state, e);
          drawHealthBar(renderer, e, -1.2);
          break;
        case 'bullet':
          this.drawBullet(renderer, e);
          break;
      }
    }
    
    drawBuildings(renderer, state);
    if (debugOverlay.enabled) drawRoadDebug(renderer, state);
  }

  drawBullet(renderer, bullet) {
    const { ctx } = renderer;
    const ts = renderer.ts;
    ctx.save();
    ctx.translate(bullet.pos.x * ts, bullet.pos.y * ts);
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
}

