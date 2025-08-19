import { Vec2 } from '../../utils/Vec2.js';

export class CollisionSystem {
  constructor() {
    this.collisionPairs = [];
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
          target.health.takeDamage(25);
          
          // Remove bullet on hit
          const bulletIndex = state.entities.indexOf(bullet);
          if (bulletIndex > -1) state.entities.splice(bulletIndex, 1);
          
          // Remove destroyed targets
          if (!target.health.isAlive()) {
            const targetIndex = state.entities.indexOf(target);
            if (targetIndex > -1) state.entities.splice(targetIndex, 1);
          }
        }
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
    
    // Check tree trunk collision for player
    const map = state.world.map;
    const tx = Math.floor(player.pos.x);
    const ty = Math.floor(player.pos.y);
    if (this.isTreeTrunk(tx, ty, map)) {
      // Push player away from tree trunk
      const dx = player.pos.x - (tx + 0.5);
      const dy = player.pos.y - (ty + 0.5);
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
        // Calculate damage based on relative motion
        const damage = this.calculateCollisionDamage(player, vehicle);
        
        if (damage > 0) {
          const oldHealth = player.health.hp;
          player.health.takeDamage(damage);
          
          // Trigger screen shake when player takes damage
          const damageTaken = oldHealth - player.health.hp;
          if (damageTaken > 0) {
            this.triggerShake(state, damageTaken / 100); // Scale shake by damage amount
          }
        }
        
        // Simple knockback
        const dx = player.pos.x - vehicle.pos.x;
        const dy = player.pos.y - vehicle.pos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          player.pos.x += (dx / len) * 0.2;
          player.pos.y += (dy / len) * 0.2;
        }
      }
    }
  }

  calculateCollisionDamage(player, vehicle) {
    // If vehicle has no velocity, no damage
    if (!vehicle.vel || (Math.abs(vehicle.vel.x) < 0.1 && Math.abs(vehicle.vel.y) < 0.1)) {
      return 0;
    }

    // Calculate vector from vehicle to player
    const toPlayer = {
      x: player.pos.x - vehicle.pos.x,
      y: player.pos.y - vehicle.pos.y
    };
    
    // Normalize the toPlayer vector
    const playerDistance = Math.hypot(toPlayer.x, toPlayer.y);
    if (playerDistance < 0.01) return 0;
    
    toPlayer.x /= playerDistance;
    toPlayer.y /= playerDistance;
    
    // Normalize vehicle velocity
    const vehicleSpeed = Math.hypot(vehicle.vel.x, vehicle.vel.y);
    const normalizedVelocity = {
      x: vehicle.vel.x / vehicleSpeed,
      y: vehicle.vel.y / vehicleSpeed
    };
    
    // Calculate dot product (projection of vehicle velocity onto player direction)
    const dotProduct = normalizedVelocity.x * toPlayer.x + normalizedVelocity.y * toPlayer.y;
    
    // If vehicle is moving away from player (negative dot product), no damage
    if (dotProduct <= 0) {
      return 0;
    }
    
    // Damage scales with speed and alignment
    const baseDamage = 15;
    const speedMultiplier = Math.min(2, vehicleSpeed / 3); // Cap at 2x for high speeds
    
    return Math.floor(baseDamage * dotProduct * speedMultiplier);
  }

  isTreeTrunk(x, y, map) {
    if (!map.trees) return false;
    return map.trees.some(tree => 
      Math.floor(tree.pos.x) === x && Math.floor(tree.pos.y) === y
    );
  }

  triggerShake(state, intensity = 1) {
    if (this.cameraSystem) {
      this.cameraSystem.addShake(intensity);
    }
  }

  update(state) {
    this.checkBulletCollisions(state);
    this.checkVehiclePedestrianCollisions(state);
    this.checkPlayerVehicleCollisions(state);
  }
}