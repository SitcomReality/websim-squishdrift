import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';
import { entityOBB, aabbForTile, obbOverlap, resolveDynamicDynamic, resolveDynamicStatic } from './geom.js';

export class VehicleCollisionSystem {
  constructor() {}

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      v.hitboxW = v.hitboxW ?? 0.9; v.hitboxH = v.hitboxH ?? 0.5; v.mass = v.mass || 1200; v.vel = v.vel || {x:0,y:0};
      this.handleVehicleCollisions(state, v);
      this.handleBuildingCollisions(state, v);
      this.handlePlayerCollision(state, v);
    }
  }

  handleVehicleCollisions(state, v) {
    const others = state.entities.filter(e => e.type === 'vehicle' && e !== v);
    const obbA = entityOBB(v);
    for (const o of others) {
      const contact = obbOverlap(obbA, entityOBB(o)); if (!contact) continue;
      resolveDynamicDynamic(v, o, contact, 0.85);
    }
  }

  handleBuildingCollisions(state, v) {
    const map = state.world?.map; if (!map) return;
    const r = Math.ceil(Math.max(v.hitboxW||0.9, v.hitboxH||0.5)) + 1, tx=Math.floor(v.pos.x), ty=Math.floor(v.pos.y);
    const obb = entityOBB(v);
    for (let oy=-r; oy<=r; oy++) for (let ox=-r; ox<=r; ox++) {
      const gx=tx+ox, gy=ty+oy; if (gx<0||gy<0||gx>=map.width||gy>=map.height) continue;
      const t = map.tiles[gy][gx]; if (t !== 8 && t !== 9) continue; // BuildingFloor/Wall as solid
      const contact = obbOverlap(obb, aabbForTile(gx,gy)); if (!contact) continue;
      resolveDynamicStatic(v, contact, 0.85);
    }
  }

  handlePlayerCollision(state, v) {
    const player = state.entities.find(e=>e.type==='player'); if (!player) return;
    player.mass = player.mass || 80; player.vel = player.vel || {x:0,y:0}; player.hitboxW = player.hitboxW ?? 0.6; player.hitboxH = player.hitboxH ?? 0.6; player.rot = 0;
    const contact = obbOverlap(entityOBB(v), entityOBB(player,{w:player.hitboxW,h:player.hitboxH}));
    if (!contact) return;
    resolveDynamicDynamic(v, player, contact, 0.85);
  }
}