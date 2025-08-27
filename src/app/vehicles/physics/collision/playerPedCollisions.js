import { entityOBB, obbOverlap, resolveDynamicDynamic } from '../../physics/geom.js';
import { smoothCollisionNormal, applyCollisionDamping } from './helpers.js';

export class PlayerPedCollision {
  handlePedestrianCollision(state, v) {
    const peds = state.entities.filter(e => e.type === 'npc');
    const vehicleOBB = entityOBB(v);
    for (let i = peds.length - 1; i >= 0; i--) {
      const ped = peds[i];
      ped.hitboxW = ped.hitboxW ?? 0.2; ped.hitboxH = ped.hitboxH ?? 0.2; ped.rot = 0;
      const pedOBB = entityOBB(ped, { w: ped.hitboxW, h: ped.hitboxH });
      const contact = obbOverlap(vehicleOBB, pedOBB);
      if (!contact) continue;
      state.audio?.playSfx?.('pedestrian_death');
      state.entities.push({
        type: 'blood',
        pos: { x: ped.pos.x, y: ped.pos.y },
        size: 0.6 + Math.random() * 0.4,
        color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
        rotation: Math.random() * Math.PI * 2
      });
      const idx = state.entities.indexOf(ped);
      if (idx > -1) state.entities.splice(idx, 1);
    }
  }
  handlePlayerCollision(state, v) {
    const player = state.entities.find(e=>e.type==='player'); if (!player) return;
    player.mass = player.mass || 80; player.vel = player.vel || {x:0,y:0};
    player.hitboxW = player.hitboxW ?? 0.15; player.hitboxH = player.hitboxH ?? 0.15; player.rot = 0;
    if (player.collisionDisabled) return;
    const contact = obbOverlap(entityOBB(v), entityOBB(player,{w:player.hitboxW,h:player.hitboxH}));
    if (!contact) return;
    const corrected = { ...contact, normal: smoothCollisionNormal(contact.normal, v, player) };
    resolveDynamicDynamic(v, player, corrected, 0.5);
    applyCollisionDamping(v, player);
  }
}

