import { Vec2 } from '../../../../utils/Vec2.js';
import { Health } from '../../../components/Health.js';
import { DamageTextSystem } from '../../systems/DamageTextSystem.js';

export class CollisionHandler {
  constructor() {
    this.damageTextSystem = new DamageTextSystem();
  }

  checkCollisions(state, projectile) {
    const map = state.world.map;
    const tileSize = state.world.tileSize;
    
    // Allow freshly spawned grenade shrapnel to move out of walls/trees before colliding
    if (projectile.isShrapnel && projectile.age < 0.05) return false;
    
    // Check map boundaries
    if (projectile.pos.x < 0 || projectile.pos.x >= map.width || 
        projectile.pos.y < 0 || projectile.pos.y >= map.height) {
      // Play hit sound for boundary collision
      state.audio?.playSfxAt?.('projectile_hit', projectile.pos, state);
      return true;
    }
    
    // Check tree trunk collision
    const tx = Math.floor(projectile.pos.x);
    const ty = Math.floor(projectile.pos.y);
    if (this.isTreeTrunkCollision(projectile.pos.x, projectile.pos.y, tx, ty, state)) {
      // Play hit sound for tree collision
      state.audio?.playSfxAt?.('projectile_hit', projectile.pos, state);
      return true;
    }
    
    // Check tile collision
    if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
      const tile = map.tiles[ty][tx];
      if ([8, 9].includes(tile)) {
        // Play hit sound for wall collision
        state.audio?.playSfxAt?.('projectile_hit', projectile.pos, state);
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
        // Play hit sound for entity collision
        state.audio?.playSfxAt?.('projectile_hit', projectile.pos, state);
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
      // Immediate blood splatter on lethal hit
      state.particleSystem?.emitBlood(state, entity.pos, 12, 3);
    } else {
      entity.health.takeDamage(projectile.damage);
      state.particleSystem?.emitSparks(state, entity.pos, 10, 4);
    }
    
    // Show damage text
    this.damageTextSystem.addDamageText(state, entity.pos, projectile.damage);
    
    // Handle destruction - ensure explosion system is triggered
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
      // Extra splatter burst on death cleanup
      state.particleSystem?.emitBlood(state, bloodStain.pos, 10, 2.5);
    } else if (entity.type === 'vehicle') {
      state.stats.vehiclesDestroyed = (state.stats.vehiclesDestroyed || 0) + 1;
      state.scoringSystem.addCrime(state, 'destroy_vehicle', entity);
      
      // Ensure explosion system is triggered for vehicles destroyed by gunfire
      if (state.explosionSystem) {
        state.explosionSystem.createExplosion(state, entity.pos);
      }
    }
    
    // Remove entity from entities array
    const index = state.entities.indexOf(entity);
    if (index > -1) {
      state.entities.splice(index, 1);
    }
  }

  isTreeTrunkCollision(projX, projY, tx, ty, state) {
    if (!state.world.map.trees) return false;
    
    const tree = state.world.map.trees.find(tree => 
      Math.floor(tree.pos.x) === tx && Math.floor(tree.pos.y) === ty
    );
    
    if (!tree) return false;
    
    const trunkSize = 0.3;
    const trunkHalf = trunkSize / 2;
    const trunkCenterX = tx + 0.5;
    const trunkCenterY = ty + 0.5;
    
    const dx = Math.abs(projX - trunkCenterX);
    const dy = Math.abs(projY - trunkCenterY);
    
    return dx <= trunkHalf && dy <= trunkHalf;
  }
}