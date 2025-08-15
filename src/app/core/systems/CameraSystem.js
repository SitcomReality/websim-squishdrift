export class CameraSystem {
  update(state, input) {
    const target = state.control.inVehicle ? state.control.vehicle.pos : 
                  state.entities.find(e => e.type === 'player')?.pos;
    if (!target) return;

    // Handle zoom input
    const minZ = 1, maxZ = 4;
    state.camera.zoom = Math.min(maxZ, Math.max(minZ, (state.camera.zoom || 1) + (input?.zoomDelta || 0)));
    if (input) input.zoomDelta = 0;

    const cam = state.camera;
    cam.x += (target.x - cam.x) * 0.1;
    cam.y += (target.y - cam.y) * 0.1;

    const ts = state.world.tileSize;
    const canvas = document.getElementById('game');
    const viewW = (canvas?.width ?? window.innerWidth);
    const viewH = (canvas?.height ?? window.innerHeight);
    const z = cam.zoom || 1;
    const halfX = (viewW / (ts * z)) / 2;
    const halfY = (viewH / (ts * z)) / 2;
    
    const map = state.world.map;
    const pad = 30; // tiles of ocean padding beyond city edges
    cam.x = Math.min(Math.max(cam.x, halfX - pad), map.width - halfX + pad);
    cam.y = Math.min(Math.max(cam.y, halfY - pad), map.height - halfY + pad);
  }
}