export class CameraSystem {
  update(state) {
    const target = state.control.inVehicle ? state.control.vehicle.pos : 
                  state.entities.find(e => e.type === 'player')?.pos;
    if (!target) return;

    const cam = state.camera;
    cam.x += (target.x - cam.x) * 0.1;
    cam.y += (target.y - cam.y) * 0.1;

    const ts = state.world.tileSize;
    const canvas = document.getElementById('game');
    const viewW = (canvas?.width ?? window.innerWidth);
    const viewH = (canvas?.height ?? window.innerHeight);
    const halfX = (viewW / ts) / 2;
    const halfY = (viewH / ts) / 2;
    
    const map = state.world.map;
    const pad = 30; // tiles of ocean padding beyond city edges
    cam.x = Math.min(Math.max(cam.x, halfX - pad), map.width - halfX + pad);
    cam.y = Math.min(Math.max(cam.y, halfY - pad), map.height - halfY + pad);
  }
}