import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';
import { entityOBB, aabbForTile, aabbForTrunk, obbOverlap, resolveDynamicDynamic, resolveDynamicStatic } from './geom.js';
import { Health } from '../../components/Health.js';
import { CollisionDamageCalculator } from './CollisionDamageCalculator.js';
import { CollisionResponseHandler } from './CollisionResponseHandler.js';
import { CollisionAudioHandler } from './CollisionAudioHandler.js';

export class VehicleCollisionSystem {
  constructor() {
    this.damageCalculator = new CollisionDamageCalculator();
    this.responseHandler = new CollisionResponseHandler();
    this.audioHandler = new CollisionAudioHandler();
    
    this.collisionDamageThreshold = 0.5;
    this.damageMultiplier = 20.0;
    this.damageCooldown = 1000;
  }

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      v.hitboxW = v.hitboxW ?? 0.9; 
      v.hitboxH = v.hitboxH ?? 0.5; 
      v.mass = v.mass || 1200; 
      v.vel = v.vel || {x:0,y:0};
      
      if (!v.lastDamageTime) v.lastDamageTime = 0;
      
      this.handleVehicleCollisions(state, v);
      this.handleBuildingCollisions(state, v);
      this.handlePlayerCollision(state, v);
      this.handlePedestrianCollision(state, v);
      this.handleMapBoundaries(state, v);
    }
  }

  handleVehicleCollisions(state, v) {
    const others = state.entities.filter(e => e.type === 'vehicle' && e !== v);
    const obbA = entityOBB(v);
    
    for (const o of others) {
      const contact = obbOverlap(obbA, entityOBB(o));
      if (!contact) continue;
      
      const correctedContact = { ...contact, normal: this.smoothCollisionNormal(contact.normal, v, o) };
      resolveDynamicDynamic(v, o, correctedContact, 0.6);
      
      this.damageCalculator.calculateCollisionDamage(state, v, o, this.damageMultiplier, this.damageCooldown);
      this.responseHandler.applyCollisionDamping(v, o);
    }
  }

  handleBuildingCollisions(state, v) {
    const handler = new BuildingCollisionHandler();
    handler.handleCollisions(state, v);
  }

  handlePlayerCollision(state, v) {
    const handler = new PlayerCollisionHandler();
    handler.handleCollision(state, v);
  }

  handlePedestrianCollision(state, v) {
    const handler = new PedestrianCollisionHandler();
    handler.handleCollision(state, v);
  }

  handleMapBoundaries(state, v) {
    const handler = new MapBoundaryHandler();
    handler.handleCollision(state, v);
  }
}