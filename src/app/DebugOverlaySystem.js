export class DebugOverlaySystem {
  constructor(el){ 
    this.el = el; 
    this.enabled = false; 
  }
  
  update(data){
    if (!this.el) return;
    this.el.toggleAttribute('hidden', !this.enabled);
    if (this.enabled) {
      const npcs = data?.entities?.filter(e => e.type === 'npc').length || 0;
      const vehicles = data?.entities?.filter(e => e.type === 'vehicle').length || 0;
      const bullets = data?.entities?.filter(e => e.type === 'bullet').length || 0;
      const projectiles = data?.entities?.filter(e => e.type === 'projectile').length || 0;
      const wanted = data?.emergencyServices?.wantedLevel || 0;
      const incidents = data?.emergencyServices?.activeIncidents?.length || 0;
      const emVehicles = data?.emergencyServices?.emergencyVehicles?.length || 0;
      const player = data?.entities?.find(e => e.type === 'player');
      const cam = data?.camera;
      const summary = {
        player: player ? { x: player.pos.x.toFixed(2), y: player.pos.y.toFixed(2) } : null,
        camera: cam ? { x: cam.x.toFixed(2), y: cam.y.toFixed(2), z: (cam.zoom||1).toFixed(1) } : null,
        counts: { npcs, vehicles, bullets, projectiles },
        wantedLevel: wanted,
        incidents,
        emergencyVehicles: emVehicles
      };
      this.el.textContent = JSON.stringify(summary, null, 2);
    }
  }
}