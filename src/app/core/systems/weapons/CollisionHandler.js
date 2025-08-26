import { Vec2 } from '../../../../utils/Vec2.js';
import { Health } from '../../../components/Health.js';

export class CollisionHandler {
  constructor() {
    this.damageTextSystem = new DamageTextSystem();
  }

  checkCollisions(state, projectile) {
    const map = state.world.map;
    const tileSize = state.world.tileSize;
    
    // Check map boundaries
    if (projectile.pos.x < 0 || projectile.pos.x >= map.width || 
        projectile.pos.y < 0 || projectile.pos.y >= map.height) {
      return true;
    }
    
    // Check tree trunk collision
    const tx = Math.floor(projectile.pos.x);
    const ty = Math.floor(projectile.pos.y);
    if (this.isTreeTrunkCollision(projectile.pos.x, projectile.pos.y, tx, ty, state)) {
      return true;
    }
    
    // Check tile collision
    if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
      const tile = map.tiles[ty][tx];
      if ([8, 9].includes(tile)) {
        return true;
      }
    }
    
    // Check entity collisions
    const entities = state.entities.filter(e => 
      (e.type === 'vehicle' || e.type === 'npc') && 
      e !== projectile.owner
    );

    for (const entity of entities) {
      const distance = Math.hypot(
        projectile.pos.x - entity.pos.x,
        projectile.pos.y - entity.pos.y
      );
      
      const radius = entity.type === 'vehicle' ? 0.5 : 0.2;
      if (distance < radius + projectile.size) {
        this.handleEntityCollision(state, projectile, entity);
        return true;
      }
    }
    
    return false;
  }

  handleEntityCollision(state, projectile, entity) {
    // Register crime
    if (entity.type === 'vehicle') {
      state.scoringSystem.addCrime(state, 'shoot_vehicle', entity);
      
      if (entity.vehicleType === 'emergency' && entity.color === '#0000FF') {
        state.scoringSystem.addCrime(state, 'shoot_police_vehicle', entity);
      }
    }
    
    // Ensure entity has health
    if (!entity.health) {
      if (entity.type === 'vehicle') {
        entity.health = new Health(entity.maxHealth || 100);
      } else if (entity.type === 'npc') {
        entity.health = new Health(1);
      }
    }
    
    // Apply damage
    if (entity.type === 'npc') {
      entity.health.hp = 0;
      state.scoringSystem.addCrime(state, 'kill_pedestrian', entity);
      
      if (entity.isPolice) {
        state.scoringSystem.addCrime(state, 'kill_police', entity);
      }
    } else {
      entity.health.takeDamage(projectile.damage);
      state.particleSystem?.emitSparks(state, entity.pos, 10, 4);
    }
    
    // Show damage text
    this.damageTextSystem.addDamageText(state, entity.pos, projectile.damage);
    
    // Handle destruction
    if (!entity.health.isAlive()) {
      this.handleEntityDestruction(state, entity);
    }
  }

  handleEntityDestruction(state, entity) {
    if (entity.type === 'npc') {
      state.stats.enemiesKilled = (state.stats.enemiesKilled || 0) + 1;
      
      const bloodStain = {
        type: 'blood',
        pos: { x: entity.pos.x, y: entity.pos.y },
        size: 0.6 + Math.random() * 0.4,
        color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
        rotation: Math.random() * Math.PI * 2
      };
      
      if (state.bloodManager) {
        state.bloodManager.addBlood(state, bloodStain);
      } else {
        state.entities.push(bloodStain);
      }
    } else if (entity.type === 'vehicle') {
      state.stats.vehiclesDestroyed = (state.stats.vehiclesDestroyed || 0) + 1;
      state.scoringSystem.addCrime(state, 'destroy_vehicle', entity);
    }
    
    const index = state.entities.indexOf(entity);
    if (index > -1) {
      state.entities.splice(index, 1);
    }
  }

  isTreeTrunkCollision(projX, projY, tileX, tileY, state) {
    if (!state.world.map.trees) return false;
    
    const tree = state.world.map.trees.find(tree => 
      Math.floor(tree.pos.x) === tileX && Math.floor(tree.pos.y) === tileY
    );
    
    if (!tree) return false;
    
    const trunkSize = 0.3;
    const trunkHalf = trunkSize / 2;
    const trunkCenterX = tileX + 0.5;
    const trunkCenterY = tileY + 0.5;
    
    const dx = Math.abs(projX - trunkCenterX);
    const dy = Math.abs(projY - trunkCenterY);
    
    return dx <= trunkHalf && dy <= trunkHalf;
  }
}

