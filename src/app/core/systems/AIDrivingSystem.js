export class AIDrivingSystem {
  update(state, dt) {
    const roads = state.world.map.roads;
    const obstacles = state.entities.filter(e => e.type === 'vehicle' || e.type === 'npc' || e.type === 'player');

    for (const v of state.entities.filter(e => e.type === 'vehicle' && e.controlled !== true)) {
      // Ensure control struct
      v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
      v.drivingStyle = v.drivingStyle || 'normal'; // Default to normal driving
      v.aiTargetSpeed = v.aiTargetSpeed || (v.drivingStyle === 'reckless' ? 4.0 : 1.5);
      v.impatience = v.impatience || 0;
      // NEW: track stuck timer and retreat state
      v.stuckTimer = v.stuckTimer || 0;
      // v.retreatState: { active: bool, remaining: number }

      // Check if vehicle is damaged and should panic
      this.checkVehiclePanic(v);
      
      // Initialize planned route if not exists
      if (!v.plannedRoute || !v.plannedRoute.length) {
        this.initializeRoute(v, roads);
      }

      this.updateRouteFollowing(state, v, roads, dt, obstacles);
      this.updateMovement(v, dt);
    }
  }

  checkVehiclePanic(vehicle) {
    // If vehicle has health and is damaged, switch to reckless
    if (vehicle.health && vehicle.health.hp < vehicle.health.maxHp && vehicle.drivingStyle !== 'reckless') {
      vehicle.drivingStyle = 'reckless';
      vehicle.aiTargetSpeed = 4.0; // Increase speed for reckless driving
      vehicle.impatience = 10; // Make them immediately impatient
    }
    
    // If vehicle is severely damaged (below 30% health), make even more reckless
    if (vehicle.health && vehicle.health.hp < (vehicle.health.maxHp * 0.3)) {
      vehicle.aiTargetSpeed = 5.0; // Even faster when panicking
    }
  }

  initializeRoute(v, roads) {
    if (!v.node) return;
    
    // Build initial path of 6 nodes ahead (increased from 4)
    v.plannedRoute = this.buildPathAhead(v.node, 6, roads);
    v.currentPathIndex = 0;
  }

  buildPathAhead(startNode, depth, roads) {
    const path = [startNode];
    let current = startNode;
    
    for (let i = 0; i < depth; i++) {
      if (!current.next || !current.next.length) break;
      
      // Choose next node (prefer straight, avoid immediate backtracking)
      let nextChoice;
      if (current.next.length === 1) {
        nextChoice = current.next[0];
      } else {
        // Filter out immediate backtracking
        const validChoices = current.next.filter(n => 
          !path[path.length - 2] || 
          !(n.x === path[path.length - 2].x && n.y === path[path.length - 2].y)
        );
        nextChoice = validChoices.length > 0 
          ? validChoices[Math.floor(Math.random() * validChoices.length)]
          : current.next[Math.floor(Math.random() * current.next.length)];
      }
      
      const nextNode = roads.byKey.get(`${nextChoice.x},${nextChoice.y},${nextChoice.dir}`);
      if (!nextNode) break;
      
      path.push(nextNode);
      current = nextNode;
    }
    
    return path;
  }

  updateRouteFollowing(state, v, roads, dt, allObstacles) {
    if (!v.plannedRoute || !v.plannedRoute.length) return;
    
    // If currently retreating, skip normal route following logic;
    // movement will be handled in updateMovement.
    if (v.retreatState && v.retreatState.active) {
      // NEW: Apply a slight turn while reversing to get unstuck.
      if (typeof v.retreatState.steerDir !== 'number') {
        v.retreatState.steerDir = (Math.random() > 0.5 ? 1 : -1) * 0.4;
      }
      v.ctrl.steer = v.retreatState.steerDir;
      return;
    }

    // Always maintain minimum path length - extend path BEFORE it runs out
    const MIN_PATH_LENGTH = 5;
    if (v.plannedRoute.length - v.currentPathIndex < MIN_PATH_LENGTH) {
      const lastNode = v.plannedRoute[v.plannedRoute.length - 1];
      const newNodes = this.buildPathAhead(lastNode, MIN_PATH_LENGTH, roads);
      
      // Add new nodes, skipping the first one (it's the same as lastNode)
      v.plannedRoute = [...v.plannedRoute, ...newNodes.slice(1)];
    }
    
    const currentTarget = v.plannedRoute[v.currentPathIndex];
    if (!currentTarget) return;
    
    const targetPos = { x: currentTarget.x + 0.5, y: currentTarget.y + 0.5 };
    const distanceToTarget = Math.hypot(
      v.pos.x - targetPos.x, 
      v.pos.y - targetPos.y
    );
    
    // Check if we're closer to a later node in the path
    let newTargetIndex = v.currentPathIndex;
    for (let i = v.currentPathIndex + 1; i < v.plannedRoute.length; i++) {
      const laterNode = v.plannedRoute[i];
      const laterPos = { x: laterNode.x + 0.5, y: laterNode.y + 0.5 };
      const distToLater = Math.hypot(v.pos.x - laterPos.x, v.pos.y - laterPos.y);
      
      if (distToLater < distanceToTarget) {
        newTargetIndex = i;
        break;
      }
    }
    
    // If we found a closer node, skip to it
    if (newTargetIndex !== v.currentPathIndex) {
      v.currentPathIndex = newTargetIndex;
    }

    // --- NEW DRIVING STYLE LOGIC ---
    const drivingStyle = v.drivingStyle || 'normal';
    const IMPATIENCE_THRESHOLD = 10; // 10 seconds

    let detectedObstacle = null;
    let obstacleDistance = Infinity;

    if (drivingStyle === 'normal' && v.impatience < IMPATIENCE_THRESHOLD) {
      const obstacles = allObstacles.filter(o => o !== v);
      const checkDistance = 3; // Check current + next 2 nodes

      for (let i = 0; i < checkDistance; i++) {
        const pathIndex = (v.currentPathIndex || 0) + i;
        if (pathIndex >= v.plannedRoute.length) break;

        const node = v.plannedRoute[pathIndex];
        const nodePos = { x: node.x + 0.5, y: node.y + 0.5 };

        for (const obs of obstacles) {
          if (!obs.pos) continue;
          const distToNode = Math.hypot(obs.pos.x - nodePos.x, obs.pos.y - nodePos.y);

          if (distToNode < 0.7) { // Obstacle is on this path tile
            detectedObstacle = obs;
            obstacleDistance = i;
            break; 
          }
        }
        if (detectedObstacle) break;
      }
    }

    if (detectedObstacle) {
      v.impatience += dt;
    } else if (v.impatience > 0) {
      // Slowly decrease impatience when path is clear
      v.impatience = Math.max(0, v.impatience - dt * 0.5);
    }

    let baseSpeed;
    if (drivingStyle === 'reckless' || (drivingStyle === 'normal' && v.impatience >= IMPATIENCE_THRESHOLD)) {
      baseSpeed = v.isEmergency ? 5.0 : 4.0;
    } else { // 'normal'
      baseSpeed = 1.5;
    }

    let speedMultiplier = 1.0;

    // --- NEW --- Obstacle avoidance speed adjustment for normal drivers
    if (drivingStyle === 'normal' && v.impatience < IMPATIENCE_THRESHOLD) {
      if (obstacleDistance === 0) { // Obstacle right in front
        const ov = detectedObstacle;
        const isVeh = ov && ov.type === 'vehicle';
        const relSpeed = isVeh ? Math.hypot((ov.vel?.x||0)-(v.vel?.x||0),(ov.vel?.y||0)-(v.vel?.y||0)) : Infinity;
        const ang = (a)=>((a% (2*Math.PI))+2*Math.PI)%(2*Math.PI);
        const hDiff = isVeh ? Math.abs(((ang(ov.rot||0)-ang(v.rot||0)+Math.PI)% (2*Math.PI)) - Math.PI) : Math.PI;
        const sameFlow = isVeh && hDiff < 0.35 && relSpeed < 0.6;
        if (sameFlow) {
          speedMultiplier = Math.min(speedMultiplier, 0.85);
          v.ctrl.throttle = Math.max(v.ctrl.throttle || 0, 0.2);
        } else {
          v.brakeHoldTimer = Math.max(v.brakeHoldTimer || 0, 0.6);
          v.ctrl.throttle = 0;
          speedMultiplier = 0;
        }
      } else if (obstacleDistance === 1) { // Obstacle 1 node away
        speedMultiplier = Math.min(speedMultiplier, 0.6);
      } else if (obstacleDistance === 2) { // Obstacle 2 nodes away
        speedMultiplier = Math.min(speedMultiplier, 0.8);
      }
    }

    // Check for upcoming hazards and adjust speed
    const zebraCrossingDistance = this.findZebraCrossingDistance(v);
    const intersectionDistance = this.findIntersectionDistance(v, roads);
    
    if (drivingStyle === 'normal' && v.impatience < IMPATIENCE_THRESHOLD) {
      // Slow down for zebra crossings
      if (zebraCrossingDistance !== null) {
        const minZebraDist = 2, maxZebraDist = 5;
        if (zebraCrossingDistance <= minZebraDist) {
          speedMultiplier = Math.min(speedMultiplier, 0.3);
        } else if (zebraCrossingDistance <= maxZebraDist) {
          const factor = (zebraCrossingDistance - minZebraDist) / (maxZebraDist - minZebraDist);
          speedMultiplier = Math.min(speedMultiplier, 0.3 + (factor * 0.7));
        }
      }

      // Slow down for intersections
      if (intersectionDistance !== null) {
        const minIntersectDist = 1, maxIntersectDist = 4;
        if (intersectionDistance <= minIntersectDist) {
          speedMultiplier = Math.min(speedMultiplier, 0.4);
        } else if (intersectionDistance <= maxIntersectDist) {
          const factor = (intersectionDistance - minIntersectDist) / (maxIntersectDist - minIntersectDist);
          speedMultiplier = Math.min(speedMultiplier, 0.4 + (factor * 0.6));
        }
      }
    } else { // 'reckless' or impatient
      // Only a slight slowdown for zebra crossings, ignore intersections
      if (zebraCrossingDistance !== null) {
        const minZebraDist = 1, maxZebraDist = 3;
        if (zebraCrossingDistance <= minZebraDist) {
          speedMultiplier = Math.min(speedMultiplier, 0.8);
        } else if (zebraCrossingDistance <= maxZebraDist) {
          const factor = (zebraCrossingDistance - minZebraDist) / (maxZebraDist - minZebraDist);
          speedMultiplier = Math.min(speedMultiplier, 0.8 + (factor * 0.2));
        }
      }
    }
    
    v.aiTargetSpeed = baseSpeed * speedMultiplier;
    
    // If we've reached the target node
    const ARRIVAL_TOLERANCE = 0.75;
    if (distanceToTarget < ARRIVAL_TOLERANCE) {
      v.currentPathIndex++;
    }
    
    // Update waypoint following based on current target
    const currentNode = v.plannedRoute[v.currentPathIndex];
    if (currentNode) {
      const currentPos = { x: currentNode.x + 0.5, y: currentNode.y + 0.5 };
      
      // Predictive steering: look ahead a bit along velocity and path to get smooth aiming point
      const PREDICTION_TIME = 0.45;
      const currentSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
      // Interpolate towards the path node center to avoid jerky instant turns
      const followT = 0.35; // fraction between current node and next for smoother gliding
      const nextNode = v.plannedRoute[v.currentPathIndex + 1] || currentNode;
      const interpTarget = {
        x: (currentPos.x * (1 - followT)) + ((nextNode.x + 0.5) * followT),
        y: (currentPos.y * (1 - followT)) + ((nextNode.y + 0.5) * followT)
      };
      const futureTarget = {
        x: interpTarget.x + (v.vel?.x || 0) * PREDICTION_TIME,
        y: interpTarget.y + (v.vel?.y || 0) * PREDICTION_TIME
      };
      const toT = { x: futureTarget.x - v.pos.x, y: futureTarget.y - v.pos.y };
      const desired = Math.atan2(toT.y, toT.x);
      const diff = wrapAngle(desired - (v.rot || 0));
      // Apply steering gain and damping, then smooth by lerping towards previous steer for stability
      const steerK = 6.0;
      const velocityDamping = Math.min(1, currentSpeed / 4.0);
      const rawSteer = clamp(diff * steerK * (1 - velocityDamping * 0.3), -1, 1);
      v.ctrl.steer = v.ctrl.steer !== undefined ? (v.ctrl.steer * 0.7 + rawSteer * 0.3) : rawSteer;
      
      // Speed control based on zebra crossing proximity
      const turnSlow = 1 / (1 + 2 * Math.abs(diff));
      const targetSpeed = v.aiTargetSpeed * turnSlow;
      
      const fwd = { x: Math.cos(v.rot || 0), y: Math.sin(v.rot || 0) };
      const vLong = (v.vel?.x || 0) * fwd.x + (v.vel?.y || 0) * fwd.y;
      
      const accelBand = 0.2;
      if (Math.abs(vLong - targetSpeed) < accelBand) {
        v.ctrl.throttle = 0; v.ctrl.brake = 0;
      } else if (vLong < targetSpeed - accelBand) {
        v.ctrl.throttle = 1; v.ctrl.brake = 0;
      } else if (vLong > targetSpeed + accelBand) {
        v.ctrl.throttle = 0; v.ctrl.brake = 0.5;
      }
    }
  }

  findZebraCrossingDistance(v) {
    if (!v.plannedRoute || v.currentPathIndex === undefined) return null;
    
    const zebraCrossingTypes = [11, 12, 13, 14]; // Zebra crossing tile types
    
    // Use the proper state reference instead of window.state
    const state = v._engine?.stateManager?.getState?.() || v.state;
    if (!state) return null;
    
    const map = state.world?.map;
    if (!map) return null;
    
    for (let i = v.currentPathIndex; i < v.plannedRoute.length; i++) {
      const node = v.plannedRoute[i];
      const tileType = map.tiles[node.y]?.[node.x];
      
      if (zebraCrossingTypes.includes(tileType)) {
        return i - v.currentPathIndex; // Distance in nodes
      }
    }
    
    return null;
  }

  findIntersectionDistance(v, roads) {
    if (!v.plannedRoute || v.currentPathIndex === undefined) return null;
    
    // Check nodes ahead in the path
    for (let i = v.currentPathIndex; i < v.plannedRoute.length; i++) {
      const node = v.plannedRoute[i];
      const roadNode = roads.byKey.get(`${node.x},${node.y},${node.dir}`);
      
      if (roadNode && roadNode.next.length > 1) {
        return i - v.currentPathIndex; // Distance in nodes
      }
    }
    
    return null;
  }

  updateMovement(v, dt) {
    // Ensure basic physics properties exist
    v.vel = v.vel || { x: 0, y: 0 };
    v.rot = v.rot || 0;
    v.angularVelocity = v.angularVelocity || 0;
    v.mass = v.mass || 1200;
    
    // Smooth throttle/brake control to avoid oscillation: use deadband and lerp
    const fwd = { x: Math.cos(v.rot || 0), y: Math.sin(v.rot || 0) };
    const vLong = (v.vel?.x || 0) * fwd.x + (v.vel?.y || 0) * fwd.y;
    const speed = Math.hypot(v.vel.x, v.vel.y);

    // --- NEW: stuck detection and retreat trigger for AI vehicles ---
    // Only for non-controlled vehicles
    if (!v.controlled) {
      const tryingToMoveForward = (v.ctrl?.throttle || 0) > 0.5;
      const effectivelyStopped = speed < 0.1;
      if (tryingToMoveForward && effectivelyStopped) {
        v.stuckTimer = (v.stuckTimer || 0) + dt;
      } else {
        v.stuckTimer = 0;
      }

      // If stuck for a short time and not already retreating, start a retreat
      if (!v.retreatState || !v.retreatState.active) {
        const STUCK_THRESHOLD = 0.7; // seconds at low speed
        if (v.stuckTimer > STUCK_THRESHOLD) {
          const minDist = 0.5;
          const maxDist = 2.0;
          const retreatDist = minDist + Math.random() * (maxDist - minDist);
          v.retreatState = {
            active: true,
            remaining: retreatDist
          };
          // Clear impatience so we don't immediately treat this as traffic jam
          v.impatience = 0;
          // Reset stuck timer
          v.stuckTimer = 0;
        }
      }
    }

    // If retreating, override targetSpeed and controls to move backwards
    let target = v.aiTargetSpeed || 3.0;
    if (v.retreatState && v.retreatState.active) {
      // Simple straight reverse: negative target speed along current forward axis
      const retreatSpeed = 2.0; // tiles/sec while reversing
      target = -retreatSpeed;

      // Apply retreat progress based on movement along -forward direction
      const backwardComponent = -(vLong); // positive when moving backwards
      if (backwardComponent > 0) {
        v.retreatState.remaining -= backwardComponent * dt;
      }
      if (v.retreatState.remaining <= 0) {
        v.retreatState.active = false;
      }
    }

    const accelBand = 0.2;
    let desiredThrottle = 0, desiredBrake = 0, desiredHandbrake = false;
    
    if (Math.abs(vLong - target) < accelBand) { 
      desiredThrottle = 0; 
      desiredBrake = 0; 
      desiredHandbrake = true; // Use handbrake when we want to stop completely
    } else if (vLong < target - accelBand) { 
      desiredThrottle = 1; 
      desiredBrake = 0; 
      desiredHandbrake = false;
    } else if (vLong > target + accelBand) { 
      desiredThrottle = 0; 
      desiredBrake = 0.6; 
      desiredHandbrake = false;
    }
    
    // Honor any explicit brakeHold requested by route following
    if (v.brakeHoldTimer && v.brakeHoldTimer > 0) {
      desiredHandbrake = true;
      desiredThrottle = 0;
      v.brakeHoldTimer = Math.max(0, v.brakeHoldTimer - dt);
    }
    
    // lerp control values for smooth application
    v.ctrl.throttle = (v.ctrl.throttle || 0) * 0.75 + desiredThrottle * 0.25;
    v.ctrl.brake = (v.ctrl.brake || 0) * 0.75 + desiredBrake * 0.25;
    v.ctrl.handbrake = (v.ctrl.handbrake || false) || desiredHandbrake;
    
    // gentle cap to prevent instant flips
    v.ctrl.throttle = clamp(v.ctrl.throttle, -1, 1);
    v.ctrl.brake = clamp(v.ctrl.brake, 0, 1);
  }
}

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function wrapAngle(a) {
  while (a > Math.PI) a -= 2*Math.PI;
  while (a < -Math.PI) a += 2*Math.PI;
  return a;
}