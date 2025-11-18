import { drawRoadDebug } from '../../render/drawRoadDebug.js';
import { drawPedestrianDebug } from '../../render/drawPedestrianDebug.js';
import { drawSpawnDebug } from '../../render/drawSpawnDebug.js';

export class DebugOverlaySystem {
  constructor(debugEl) {
    this.el = debugEl;
    this.enabled = false;
  }

  toggle(enabled) {
    this.enabled = enabled;
    if (this.el) {
      this.el.toggleAttribute('hidden', !enabled);
    }
  }

  update(state) {
    if (!this.enabled || !this.el) return;

    const player = state.entities.find(e => e.type === 'player');
    const debugData = {
      fps: state.fps || 0,
      player: player ? { 
        x: player.pos.x.toFixed(2), 
        y: player.pos.y.toFixed(2) 
      } : null,
      camera: { 
        x: state.camera.x.toFixed(2), 
        y: state.camera.y.toFixed(2) 
      },
      npcs: state.entities.filter(e => e.type === 'npc').length,
      vehicles: state.entities.filter(e => e.type === 'vehicle').length,
      wantedLevel: state.emergencyServices?.wantedLevel || 0,
      activeIncidents: state.emergencyServices?.activeIncidents?.length || 0,
      emergencyVehicles: state.emergencyServices?.emergencyVehicles?.length || 0
    };

    this.el.textContent = JSON.stringify(debugData, null, 2);
  }

  render(renderer, state) {
    if (!this.enabled) return;

    drawRoadDebug(renderer, state);
    drawPedestrianDebug(renderer, state);
    drawSpawnDebug(renderer, state);
  }
}

