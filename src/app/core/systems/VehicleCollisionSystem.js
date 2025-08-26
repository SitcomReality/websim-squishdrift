import { VehiclePhysicsConstants } from './VehiclePhysicsConstants.js';
import { Tile } from '../../../map/TileTypes.js';
import { entityOBB, aabbForTile, aabbForTrunk, obbOverlap, resolveDynamicDynamic, resolveDynamicStatic } from './geom.js';
import { Health } from '../../components/Health.js';

export class VehicleCollisionSystem {
  constructor() {
    this.collisionDamageThreshold = 0.5; // Reduced from 2.0 to 0.5 for easier damage
    this.damageMultiplier = 20.0; // Increased from 15.0 to 20.0 for more damage
    this.damageCooldown = 1000;
  }

  update(state, dt) {
    for (const v of state.entities.filter(e => e.type === 'vehicle')) {
      v.hitboxW = v.hitboxW ?? 0.9; v.hitboxH = v.hitboxH ?? 0.5; v.mass = v.mass || 1200; v.vel = v.vel || {x:0,y:0};
      
      // Initialize lastDamageTime if not exists
      if (!v.lastDamageTime) v.lastDamageTime = 0;
      
      this.handleVehicleCollisions(state, v);
      this.handleBuildingCollisions(state, v);
      this.handlePlayerCollision(state, v);
      this.handlePedestrianCollision(state, v);
      this.handleMapBoundaries(state, v);
      
      // Check for vehicle destruction due to health
      if (v.health && !v.health.isAlive()) {
        this.handleVehicleDestruction(state, v);
      }
    }
  }

  handleVehicleCollisions(state, v) {
    const others = state.entities.filter(e => e.type === 'vehicle' && e !== v);
    const obbA = entityOBB(v);
    
    for (const o of others) {
      const contact = obbOverlap(obbA, entityOBB(o));
      if (!contact) continue;
      
      // Use contact normal for more predictable collision response
      const correctedContact = { ...contact, normal: this.smoothCollisionNormal(contact.normal, v, o) };
      resolveDynamicDynamic(v, o, correctedContact, 0.4); // Reduced restitution for smoother bounce
      
      // Calculate collision damage
      this.calculateCollisionDamage(state, v, o);
      
      // Apply damping to reduce flickering
      this.applyCollisionDamping(v, o);
    }
  }

  calculateCollisionDamage(state, vehicleA, vehicleB) {
    const now = Date.now();
    const canDamageA = now - (vehicleA.lastDamageTime || 0) >= this.damageCooldown;
    const canDamageB = now - (vehicleB.lastDamageTime || 0) >= this.damageCooldown;
    
    // Ensure both vehicles have health
    if (!vehicleA.health) {
      vehicleA.health = new Health(vehicleA.maxHealth || 100);
    }
    if (!vehicleB.health) {
      vehicleB.health = new Health(vehicleB.maxHealth || 100);
    }

    // Calculate relative velocity
    const relativeVel = {
      x: (vehicleA.vel?.x || 0) - (vehicleB.vel?.x || 0),
      y: (vehicleA.vel?.y || 0) - (vehicleB.vel?.y || 0)
    };
    
    const impactSpeed = Math.hypot(relativeVel.x, relativeVel.y);
    
    // Only cause damage if impact speed exceeds threshold
    if (impactSpeed < this.collisionDamageThreshold) {
      return;
    }
    
    // Calculate damage based on impact force - ensure minimum 1 damage
    const totalMass = vehicleA.mass + vehicleB.mass;
    const damageA = Math.max(1, Math.round((impactSpeed * vehicleB.mass / totalMass) * this.damageMultiplier));
    const damageB = Math.max(1, Math.round((impactSpeed * vehicleA.mass / totalMass) * this.damageMultiplier));
    
    // Apply damage
    if (canDamageA) {
      vehicleA.health.takeDamage(damageA);
      vehicleA.lastDamageTime = now;
    }
    
    if (canDamageB) {
      vehicleB.health.takeDamage(damageB);
      vehicleB.lastDamageTime = now;
    }
    
    // Register crimes if vehicles are destroyed
    if (state.scoringSystem) {
      if (!vehicleA.health.isAlive()) {
        state.scoringSystem.addCrime(state, 'destroy_vehicle', vehicleA);
      }
      if (!vehicleB.health.isAlive()) {
        state.scoringSystem.addCrime(state, 'destroy_vehicle', vehicleB);
      }
    }
    
    // Handle vehicle destruction if health is depleted
    if (canDamageA && !vehicleA.health.isAlive()) {
      this.handleVehicleDestruction(state, vehicleA);
    }
    if (canDamageB && !vehicleB.health.isAlive()) {
      this.handleVehicleDestruction(state, vehicleB);
    }
    
    // Add damage indicators - use integers only
    if (canDamageA) this.addDamageIndicator(state, vehicleA.pos, damageA);
    if (canDamageB) this.addDamageIndicator(state, vehicleB.pos, damageB);
    
    // Add screen shake for significant impacts
    if (impactSpeed > 3.0 && state.cameraSystem) {
      state.cameraSystem.addShake(Math.min(1, impactSpeed / 8));
    }
  }

  handleVehicleDestruction(state, vehicle) {
    // Create explosion
    if (state.explosionSystem) {
      state.explosionSystem.createExplosion(state, vehicle.pos);
    }
    
    // Register crimes
    if (state.scoringSystem) {
      state.scoringSystem.addCrime(state, 'destroy_vehicle', vehicle);
    }
    
    // Remove vehicle from entities
    const vehicleIndex = state.entities.indexOf(vehicle);
    if (vehicleIndex > -1) {
      state.entities.splice(vehicleIndex, 1);
    }
    
    // If this was the player's vehicle, handle death
    if (state.control?.vehicle === vehicle) {
      const deathSystem = state._engine?.systems?.death || 
                         state.deathSystem || 
                         state._engine?.deathSystem;
      if (deathSystem && deathSystem.handlePlayerDeath) {
        deathSystem.handlePlayerDeath(state);
      }
    }
  }

  handleBuildingCollisions(state, v) {
    const map = state.world?.map; if (!map) return;
    const r = Math.ceil(Math.max(v.hitboxW||0.9, v.hitboxH||0.5)) + 1, tx=Math.floor(v.pos.x), ty=Math.floor(v.pos.y);
    const obb = entityOBB(v);
    
    for (let oy=-r; oy<=r; oy++) for (let ox=-r; ox<=r; ox++) {
      const gx=tx+ox, gy=ty+oy; if (gx<0||gy<0||gx>=map.width||gy>=map.height) continue;
      const t = map.tiles[gy][gx];
      
      // Tree trunk: use tight trunk AABB instead of full tile AABB
      if (this.isTreeTrunk(gx, gy, map)) {
        const contact = obbOverlap(obb, aabbForTrunk(gx, gy)); if (!contact) continue;
        const correctedContact = { ...contact, normal: contact.normal };
        resolveDynamicStatic(v, correctedContact, 0.6);
        
        // Calculate collision damage for tree impact
        const now = Date.now();
        const canDamage = now - (v.lastDamageTime || 0) >= this.damageCooldown;
        
        if (canDamage) {
          const impactSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
          if (impactSpeed > this.collisionDamageThreshold) {
            if (!v.health) v.health = new Health(v.maxHealth || 100);
            const damage = Math.max(1, Math.round(impactSpeed * 5));
            v.health.takeDamage(damage);
            v.lastDamageTime = now;
            
            if (!v.health.isAlive()) {
              this.handleVehicleDestruction(state, v);
            }
            this.addDamageIndicator(state, v.pos, damage);
          }
        }
        
        // Add bounce reflection for trunk impacts
        {
          const restitution = 0.6;
          const speed = Math.hypot(v.vel.x || 0, v.vel.y || 0);
          const velDir = this.getVelocityDirection(v);
          const reflect = this.calculateBounceNormal(velDir, correctedContact.normal);
          const bounceFactor = Math.max(0.25, restitution * 0.8);
          v.vel.x = reflect.x * speed * bounceFactor;
          v.vel.y = reflect.y * speed * bounceFactor;
        }
        this.applyBuildingDamping(v);
        continue;
      }
      
      // BuildingFloor/Wall as solid (full tile)
      if (t !== 8 && t !== 9) continue;
      const contact = obbOverlap(obb, aabbForTile(gx,gy)); if (!contact) continue;
      
      // Use contact normal for building collision
      const correctedContact = { ...contact, normal: contact.normal };
      resolveDynamicStatic(v, correctedContact, 0.6);
      
      // Calculate collision damage for building impact
      const now = Date.now();
      const canDamage = now - (v.lastDamageTime || 0) >= this.damageCooldown;
      
      if (canDamage) {
        const impactSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
        if (impactSpeed > this.collisionDamageThreshold) {
          if (!v.health) v.health = new Health(v.maxHealth || 100);
          const damage = Math.max(1, Math.round(impactSpeed * 8));
          v.health.takeDamage(damage);
          v.lastDamageTime = now;
          
          if (!v.health.isAlive()) {
            this.handleVehicleDestruction(state, v);
          }
          this.addDamageIndicator(state, v.pos, damage);
        }
      }
      
      // Strong damping for building impacts
      this.applyBuildingDamping(v);
    }
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
            // Register crime for killing pedestrian
            if (state.scoringSystem) {
                state.scoringSystem.addCrime(state, 'kill_pedestrian', ped);
            }

            // Use BloodManager to handle blood creation and limit
            if (!state.bloodManager) {
                state.bloodManager = new (require('../../entities/drawBlood.js').BloodManager)();
            }
            
            const bloodStain = {
                type: 'blood',
                pos: { x: ped.pos.x, y: ped.pos.y },
                size: 0.6 + (state.rand ? state.rand() * 0.4 : Math.random() * 0.4),
                color: `hsl(0, 70%, ${30 + (state.rand ? state.rand() * 20 : Math.random() * 20)}%)`,
                rotation: (state.rand ? state.rand() * Math.PI * 2 : Math.random() * Math.PI * 2)
            };
            
            if (state.bloodManager) {
                state.bloodManager.addBlood(state, bloodStain);
            } else {
                state.entities.push(bloodStain);
            }

            const pedIndex = state.entities.indexOf(ped);
            if (pedIndex > -1) {
                state.entities.splice(pedIndex, 1);
            }
        }
    }
  }

  handlePlayerCollision(state, v) {
    const player = state.entities.find(e=>e.type==='player'); if (!player) return;
    player.mass = player.mass || 80; player.vel = player.vel || {x:0,y:0}; player.hitboxW = player.hitboxW ?? 0.15; player.hitboxH = player.hitboxH ?? 0.15; player.rot = 0;
    
    // Add collisionDisabled check here
    if (player.collisionDisabled) return;
    
    const contact = obbOverlap(entityOBB(v), entityOBB(player,{w:player.hitboxW,h:player.hitboxH}));
    if (!contact) return;
    
    const correctedContact = { ...contact, normal: this.smoothCollisionNormal(contact.normal, v, player) };
    resolveDynamicDynamic(v, player, correctedContact, 0.5);
    
    // Apply damping
    this.applyCollisionDamping(v, player);
  }

  handleMapBoundaries(state, v) {
    const map = state.world?.map;
    if (!map) return;
    
    // Check if vehicle is outside map boundaries
    if (v.pos.x < 0 || v.pos.x >= map.width || 
        v.pos.y < 0 || v.pos.y >= map.height) {
      
      // Mark vehicle as destroyed
      if (!v.health) v.health = new Health(v.maxHealth || 100);
      v.health.hp = 0;
      this.handleVehicleDestruction(state, v);
    }
  }

  smoothCollisionNormal(normal, objA, objB) {
    // Ensure consistent collision normals for smoother response
    const centerToCenter = {
      x: objB.pos.x - objA.pos.x,
      y: objB.pos.y - objA.pos.y
    };
    
    // Normalize center-to-center vector
    const len = Math.hypot(centerToCenter.x, centerToCenter.y);
    if (len > 0) {
      centerToCenter.x /= len;
      centerToCenter.y /= len;
    }
    
    // Use contact normal but bias slightly toward center-to-center for stability
    const blendFactor = 0.8; // 80% contact normal, 20% center-to-center
    return {
      x: normal.x * blendFactor + centerToCenter.x * (1 - blendFactor),
      y: normal.y * blendFactor + centerToCenter.y * (1 - blendFactor)
    };
  }

  applyCollisionDamping(objA, objB) {
    // Reduce angular velocity to prevent spinning
    if (typeof objA.angularVelocity === 'number') {
      objA.angularVelocity *= 0.7;
    }
    if (typeof objB.angularVelocity === 'number') {
      objB.angularVelocity *= 0.7;
    }
    
    // Reduce linear velocity slightly for stability
    const dampingFactor = 0.85;
    if (objA.vel) {
      objA.vel.x *= dampingFactor;
      objA.vel.y *= dampingFactor;
    }
    if (objB.vel) {
      objB.vel.x *= dampingFactor;
      objB.vel.y *= dampingFactor;
    }
  }

  applyBuildingDamping(v) {
    // Reduce damping for buildings to allow more bounce
    const dampingFactor = 0.5; // Changed from 0.3 to 0.5
    if (v.vel) {
      v.vel.x *= dampingFactor;
      v.vel.y *= dampingFactor;
    }
    if (typeof v.angularVelocity === 'number') {
      v.angularVelocity *= 0.6; // Reduced from 0.5 to 0.6
    }
  }

  getVelocityDirection(entity) {
    const speed = Math.hypot(entity.vel.x, entity.vel.y);
    if (speed < 0.01) return { x: 0, y: 0 };
    return { x: entity.vel.x / speed, y: entity.vel.y / speed };
  }

  calculateBounceNormal(velocityDir, contactNormal) {
    if (velocityDir.x === 0 && velocityDir.y === 0) {
      return contactNormal;
    }

    // Calculate reflection vector: r = d - 2(d·n)n
    const dot = velocityDir.x * contactNormal.x + velocityDir.y * contactNormal.y;
    const reflected = {
      x: velocityDir.x - 2 * dot * contactNormal.x,
      y: velocityDir.y - 2 * dot * contactNormal.y
    };

    // Normalize the reflected vector
    const length = Math.hypot(reflected.x, reflected.y);
    if (length < 0.01) return contactNormal;

    return { x: reflected.x / length, y: reflected.y / length };
  }

  isTreeTrunk(x, y, map) {
    if (!map.trees) return false;
    return map.trees.some(tree => 
      Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
    );
  }

  addDamageIndicator(state, pos, damage) {
    if (!state.damageTexts) state.damageTexts = [];
    
    // Ensure we have a valid damage value
    const actualDamage = damage || 0;
    
    const indicator = {
      type: 'damage_indicator',
      pos: { x: pos.x, y: pos.y },
      text: `-${actualDamage}`, // Use text property with proper formatting
      color: '#ff3333',
      age: 0,
      lifetime: 1.5,
      size: 14
    };
    
    state.damageTexts.push(indicator);
  }
}