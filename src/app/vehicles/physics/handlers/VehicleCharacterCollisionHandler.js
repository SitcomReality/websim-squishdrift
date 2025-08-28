import { entityOBB, obbOverlap, resolveDynamicDynamic } from '../geom.js';
import { 
    smoothCollisionNormal, 
    applyCollisionDamping 
} from './VehicleCollisionUtils.js';

export class VehicleCharacterCollisionHandler {
    constructor(system) {
        this.system = system;
    }

    handle(state, v) {
        this.handlePedestrianCollision(state, v);
        this.handlePlayerCollision(state, v);
    }

    handlePedestrianCollision(state, v) {
        const peds = state.entities.filter(e => e.type === 'npc');
        const vehicleOBB = entityOBB(v);

        for (let i = peds.length - 1; i >= 0; i--) {
            const ped = peds[i];
            ped.hitboxW = ped.hitboxW ?? 0.2;
            ped.hitboxH = ped.hitboxH ?? 0.2;
            ped.rot = 0;

            const pedOBB = entityOBB(ped, {w: ped.hitboxW, h: ped.hitboxH});
            const contact = obbOverlap(vehicleOBB, pedOBB);

            if (contact) {
                // Register kill with scoring system if this is a player-controlled vehicle
                if (state.control?.inVehicle && state.control?.vehicle === v) {
                    state.scoringSystem?.addCrime(state, 'kill_pedestrian', ped);
                }
                
                // Always play pedestrian death sound
                state.audio?.playSfxAt?.('pedestrian_death', ped.pos, state);
                
                state.audio?.playSfxAt?.('oof02', ped.pos, state);
                
                const bloodStain = {
                    type: 'blood',
                    pos: { x: ped.pos.x, y: ped.pos.y },
                    size: 0.6 + Math.random() * 0.4,
                    color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
                    rotation: Math.random() * Math.PI * 2
                };
                
                state.entities.push(bloodStain);
                
                const pedIndex = state.entities.indexOf(ped);
                if (pedIndex > -1) {
                    state.entities.splice(pedIndex, 1);
                }
            }
        }
    }

    handlePlayerCollision(state, v) {
        const player = state.entities.find(e=>e.type==='player');
        if (!player) return;

        player.mass = player.mass || 80;
        player.vel = player.vel || {x:0,y:0}; 
        player.hitboxW = player.hitboxW ?? 0.15;
        player.hitboxH = player.hitboxH ?? 0.15;
        player.rot = 0;
        
        if (player.collisionDisabled) return;
        
        const contact = obbOverlap(entityOBB(v), entityOBB(player,{w:player.hitboxW,h:player.hitboxH}));
        if (!contact) return;
        
        const correctedContact = { ...contact, normal: smoothCollisionNormal(contact.normal, v, player) };
        resolveDynamicDynamic(v, player, correctedContact, 0.5);
        
        applyCollisionDamping(v, player);
    }
}