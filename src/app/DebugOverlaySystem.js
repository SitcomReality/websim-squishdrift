export class DebugOverlaySystem {
  constructor(el){ 
    this.el = el; 
    this.enabled = false; 
  }
  
  toggle(enabled) {
    this.enabled = enabled;
    if (this.el) {
      this.el.toggleAttribute('hidden', !enabled);
    }
  }

  update(data){
    if (!this.el) return;
    this.el.toggleAttribute('hidden', !this.enabled);
    if (this.enabled) {
      // Only show summary stats, not full entity data
      const summary = {
        fps: data.fps || 0,
        entities: data.entities?.length || 0,
        npcs: data.entities?.filter(e => e.type === 'npc').length || 0,
        vehicles: data.entities?.filter(e => e.type === 'vehicle').length || 0,
        bullets: data.entities?.filter(e => e.type === 'bullet').length || 0,
        player: data.entities?.find(e => e.type === 'player') ? {
          x: data.entities.find(e => e.type === 'player')?.pos?.x?.toFixed(1),
          y: data.entities.find(e => e.type === 'player')?.pos?.y?.toFixed(1)
        } : null,
        camera: { x: data.camera?.x?.toFixed(1), y: data.camera?.y?.toFixed(1), zoom: data.camera?.zoom?.toFixed(1) }
      };
      
      this.el.textContent = JSON.stringify(summary, null, 2);
    }
  }

  render(renderer, state) {
    // This method is called from RenderSystem when debug is enabled
    if (!this.enabled) return;
    
    // Import the debug drawing functions
    import('../../render/drawRoadDebug.js').then(module => {
      module.drawRoadDebug(renderer, state);
    });
    
    import('../../render/drawPedestrianDebug.js').then(module => {
      module.drawPedestrianDebug(renderer, state);
    });
    
    import('../../render/drawSpawnDebug.js').then(module => {
      module.drawSpawnDebug(renderer, state);
    });
  }
}