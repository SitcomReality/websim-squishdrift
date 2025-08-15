export class CameraSystem {
  update(state) {
    const target = state.control.inVehicle ? state.control.vehicle.pos : 
                  state.entities.find(e => e.type === 'player')?.pos;
    if (!target) return;

    const cam = state.camera;
    cam.x += (target.x - cam.x) * 0.1;
    cam.y += (target.y - cam.y) * 0.1;

    const ts = state.world.tileSize;
    const halfX = (window.innerWidth / ts) / 2;
    const halfY = (window.innerHeight / ts) / 2;
    
    const map = state.world.map;
    if (map.width > 2 * halfX) {
      cam.x = Math.min(Math.max(cam.x, halfX), map.width - halfX);
    }
    if (map.height > 2 * halfY) {
      cam.y = Math.min(Math.max(cam.y, halfY), map.height - halfY);
    }
  }
}

