import { Vec2 } from '../../utils/Vec2.js';
import { Health } from '../components/Health.js';

export class CollisionSystem {
  constructor() {
    this.collisionPairs = [];
    this.lastDamageTime = 0;
    this.invincibilityDuration = 50; // 50ms invincibility frames
  }

  // Simple radius-based collision detection
  checkCollision(entityA, entityB, radius = 0.5) {
    const dx = entityA.pos.x - entityB.pos.x;
    const dy = entityA.pos.y - entityB.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius;
  }

  // Check collisions between bullets and entities
  checkBulletCollisions(state) {
    const bullets = state.entities.filter(e => e.type === 'bullet');
    const targets = state.entities.filter(e => 
      (e.type === 'npc' && e.health?.isAlive()) || 
      (e.type === 'vehicle' && e.health?.isAlive())
    );

    for (const bullet of bullets) {
      for (const target of targets) {
        if (this.checkCollision(bullet, target, 0.35)) {
          // Ensure entity has health
          if (!target.health) {
            if (target.type === 'vehicle') {
              target.health = new Health(target.maxHealth || 100);
            } else if (target.type === 'npc') {
              // NPCs die instantly
              target.health = new Health(1);
              target.health.hp = 0;
            }
          }
          
          // Apply damage
          if (entity.type === 'npc') {
            entity.health.hp = 0;
            state.scoringSystem.addCrime(state, 'kill_pedestrian', entity);
            
            // Ensure blood particles are emitted
            state.particleSystem?.emitBlood(state, entity.pos, 12, 3);
            
            // Play pedestrian death sound
            state.audio?.playSfxAt?.('pedestrian_death', entity.pos, state);
            state.audio?.playSfxAt?.('oof02', entity.pos, state);
            
            const bloodStain = {
              type: 'blood',
              pos: new Vec2(entity.pos.x, entity.pos.y),
              size: 0.6 + Math.random() * 0.4,
              color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
              rotation: Math.random() * Math.PI * 2
            };
            
            state.entities.push(bloodStain);
            const targetIndex = state.entities.indexOf(entity);
            if (targetIndex > -1) state.entities.splice(targetIndex, 1);
          }
          
          // Play impact sound for vehicles hit by bullets
          if (target.type === 'vehicle') {
            const impactSound = ['impact02', 'impact03'][Math.floor(Math.random() * 2)];
            state.audio?.playSfxAt?.(impactSound, target.pos, state);
          }
          
          // Trigger screen shake for player damage
          if (target.type === 'npc') {
            state.particleSystem?.emitBlood(state, target.pos, 10, 3);
          }
          if (target.type === 'vehicle') {
            state.particleSystem?.emitSparks(state, target.pos, 8, 5);
          }
          
          // Remove bullet on hit
          const bulletIndex = state.entities.indexOf(bullet);
          if (bulletIndex > -1) state.entities.splice(bulletIndex, 1);
        }
      }
    }
  }

  handleVehicleDestruction(state, vehicle) {
    // Create explosion
    if (state.explosionSystem) {
      state.explosionSystem.createExplosion(state, vehicle.pos);
    }
    
    // remove fixed-intensity shake; ExplosionSystem now handles distance-based shake
    // if (state.cameraSystem) { state.cameraSystem.addShake(1.0); }
    
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

  // Check collisions between vehicles and pedestrians
  checkVehiclePedestrianCollisions(state) {
    const vehicles = state.entities.filter(e => e.type === 'vehicle');
    const pedestrians = state.entities.filter(e => e.type === 'npc');

    for (const vehicle of vehicles) {
      for (let i = pedestrians.length - 1; i >= 0; i--) {
        const pedestrian = pedestrians[i];
        
        if (this.checkCollision(vehicle, pedestrian, 0.45)) {
          // Pedestrian gets squished - create blood stain
          const bloodStain = {
            type: 'blood',
            pos: new Vec2(pedestrian.pos.x, pedestrian.pos.y),
            size: 0.6 + Math.random() * 0.4,
            color: `hsl(0, 70%, ${30 + Math.random() * 20}%)`,
            rotation: Math.random() * Math.PI * 2
          };
          
          // push blood and remove pedestrian entity
          state.entities.push({
            type: 'blood',
            pos: { x: pedestrian.pos.x, y: pedestrian.pos.y },
            size: bloodStain.size,
            color: bloodStain.color,
            rotation: bloodStain.rotation
          });
          
          const pedestrianIndex = state.entities.indexOf(pedestrian);
          if (pedestrianIndex > -1) {
            state.entities.splice(pedestrianIndex, 1);
          }
        }
      }
    }
  }

  // Check collisions between player and vehicles
  checkPlayerVehicleCollisions(state) {
    const player = state.entities.find(e => e.type === 'player');
    const vehicles = state.entities.filter(e => e.type === 'vehicle');
    
    if (!player || !player.health) return;
    if (state.control?.inVehicle) return; // disable player collisions while inside a vehicle
    if (player.collisionDisabled) return; // Skip if player collision is disabled
    
    // Check invincibility frames
    const now = Date.now();
    if (now - this.lastDamageTime < this.invincibilityDuration) {
      return; // Player is invincible
    }
    
    // Only treat the small trunk area as solid (same size used elsewhere)
    const trunkHalf = 0.3 / 2; // trunkSize / 2
    const playerHw = (player.hitboxW || 0.15) / 2;
    const playerHh = (player.hitboxH || 0.15) / 2;
    const trunkCenterX = Math.floor(player.pos.x) + 0.5, trunkCenterY = Math.floor(player.pos.y) + 0.5;
    const overlapX = Math.abs(player.pos.x - trunkCenterX) < (trunkHalf + playerHw);
    const overlapY = Math.abs(player.pos.y - trunkCenterY) < (trunkHalf + playerHh);
    if (this.isTreeTrunk(Math.floor(player.pos.x), Math.floor(player.pos.y), state.world.map) && overlapX && overlapY) {
      // push player away from trunk center only when overlapping trunk AABB
      const dx = player.pos.x - trunkCenterX;
      const dy = player.pos.y - trunkCenterY;
      const len = Math.hypot(dx, dy) || 1;
      player.pos.x += (dx / len) * 0.2;
      player.pos.y += (dy / len) * 0.2;
      return;
    }
    
    for (const vehicle of vehicles) {
      if (vehicle.controlled) continue; // Skip player-controlled vehicle
      
      // Use actual rectangle half-extents (converted into an equivalent circle radius)
      const playerHw = (player.hitboxW || 0.15) / 2;
      const playerHh = (player.hitboxH || 0.15) / 2;
      const vehicleHw = (vehicle.hitboxW || 0.9) / 2;
      const vehicleHh = (vehicle.hitboxH || 0.5) / 2;
      const playerRadius = Math.hypot(playerHw, playerHh);
      const vehicleRadius = Math.hypot(vehicleHw, vehicleHh);
      const collisionRadius = playerRadius + vehicleRadius;
      
      if (this.checkCollision(player, vehicle, collisionRadius)) {
        // Compute damage based on vehicle movement vector relative to player
        const vx = vehicle.vel?.x || 0, vy = vehicle.vel?.y || 0;
        const speed = Math.hypot(vx, vy);
        if (speed > 0.01) {
          const vdir = { x: vx / speed, y: vy / speed };
          const toPlayer = { x: player.pos.x - vehicle.pos.x, y: player.pos.y - vehicle.pos.y };
          const dist = Math.hypot(toPlayer.x, toPlayer.y) || 1;
          const toPlayerN = { x: toPlayer.x / dist, y: toPlayer.y / dist };
          const alignment = vdir.x * toPlayerN.x + vdir.y * toPlayerN.y; // 1 => directly toward player
          if (alignment > 0) {
            // Scale damage by speed and alignment; tune multiplier to keep similar feel
            const damage = Math.max(1, Math.round(speed * alignment * 20));
            const oldHealth = player.health.hp;
            player.health.takeDamage(damage);
            const damageTaken = oldHealth - player.health.hp;
            if (damageTaken > 0) {
              this.lastDamageTime = now;
              this.triggerShake(state, Math.min(1, damageTaken / 50));
              // Play ouch sound for player damage
              state.audio?.playSfxAt?.('ouch', player.pos, state);
              // Add blood particles for player damage
              state.particleSystem?.emitBlood(state, player.pos, 8, 2.5);
              // Add floating damage text
              this.addDamageText(state, player.pos, damage);
            }
            // Handle vehicle destruction if it runs out of health
            this.handleVehicleDestruction(state, vehicle);
            // Knockback away from vehicle (scaled by damage)
            const k = Math.min(1, damage / 30) * 0.35;
            player.pos.x += toPlayerN.x * k;
            player.pos.y += toPlayerN.y * k;
          }
        }
      }
    }
  }

  addDamageText(state, pos, damage) {
    if (!state.damageTexts) state.damageTexts = [];
    
    const damageText = {
      type: 'damage_text',
      pos: { x: pos.x, y: pos.y },
      text: `-${damage}`,
      color: '#ff3333',
      age: 0,
      lifetime: 1.5, // 1.5 seconds
      size: 16
    };
    
    state.damageTexts.push(damageText);
  }

  isTreeTrunk(x, y, map) {
    if (!map.trees) return false;
    return map.trees.some(tree => 
      Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
    );
  }

  triggerShake(state, intensity) {
    if (state.cameraSystem) {
      state.cameraSystem.addShake(intensity);
    }
  }

  update(state) {
    this.checkBulletCollisions(state);
    this.checkVehiclePedestrianCollisions(state);
    this.checkPlayerVehicleCollisions(state);
  }
}