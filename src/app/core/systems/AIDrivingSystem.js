export class AIDrivingSystem {
  update(state, dt) {
    const roads = state.world.map.roads;
    for (const v of state.entities.filter(e => e.type === 'vehicle' && e.controlled !== true)) {
      // Ensure control struct
      v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
      v.aiTargetSpeed = v.aiTargetSpeed || 3.0;
      
      // Initialize planned route if not exists
      if (!v.plannedRoute || !v.plannedRoute.length) {
        this.initializeRoute(v, roads);
      }

      this.updateRouteFollowing(state, v, roads, dt);
      this.updateMovement(v, dt);
    }
  }

  initializeRoute(v, roads) {
    if (!v.node) return;
    
    // Build initial path of 4 nodes ahead
    v.plannedRoute = this.buildPathAhead(v.node, 4, roads);
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

  updateRouteFollowing(state, v, roads, dt) {
    if (!v.plannedRoute || !v.plannedRoute.length) return;
    
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
    
    // If we found a closer node, skip to it and rebuild path
    if (newTargetIndex !== v.currentPathIndex) {
      v.currentPathIndex = newTargetIndex;
      
      // Rebuild remaining path
      const remainingPath = v.plannedRoute.slice(v.currentPathIndex);
      const additionalNodes = this.buildPathAhead(
        remainingPath[remainingPath.length - 1], 
        4 - remainingPath.length + 1, 
        roads
      );
      
      v.plannedRoute = [...remainingPath, ...additionalNodes.slice(1)];
      v.currentPathIndex = 0;
    }
    
    // Update waypoint following based on current target
    const currentNode = v.plannedRoute[v.currentPathIndex];
    if (currentNode) {
      const currentPos = { x: currentNode.x + 0.5, y: currentNode.y + 0.5 };
      
      // Predictive steering with look-ahead
      const PREDICTION_TIME = 0.8; // Increased from 0.5 for better prediction
      const LOOK_AHEAD_DISTANCE = 2.0; // Look ahead 2 tiles
      
      // Calculate look-ahead target based on velocity
      const currentSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
      const lookAheadFactor = Math.min(LOOK_AHEAD_DISTANCE, currentSpeed * PREDICTION_TIME);
      
      // Use quadratic bezier curve smoothing
      const nextNode = v.plannedRoute[v.currentPathIndex + 1];
      let targetPoint = currentPos;
      
      if (nextNode) {
        const nextPos = { x: nextNode.x + 0.5, y: nextNode.y + 0.5 };
        
        // Create smooth curve between current and next node
        const midPoint = {
          x: (currentPos.x + nextPos.x) / 2,
          y: (currentPos.y + nextPos.y) / 2
        };
        
        // Use bezier interpolation
        const t = Math.min(1, distanceToTarget / 2.0);
        targetPoint = {
          x: (1-t)*(1-t)*currentPos.x + 2*(1-t)*t*midPoint.x + t*t*nextPos.x,
          y: (1-t)*(1-t)*currentPos.y + 2*(1-t)*t*midPoint.y + t*t*nextPos.y
        };
      }
      
      // Add velocity-based look-ahead
      targetPoint.x += (v.vel?.x || 0) * lookAheadFactor;
      targetPoint.y += (v.vel?.y || 0) * lookAheadFactor;
      
      const toT = { x: targetPoint.x - v.pos.x, y: targetPoint.y - v.pos.y };
      const dist = Math.hypot(toT.x, toT.y) || 1;
      const desired = Math.atan2(toT.y, toT.x);
      
      // Smoother angle wrapping and steering
      const diff = wrapAngle(desired - (v.rot || 0));
      
      // Improved steering with velocity-based damping
      const steerK = 4.0; // Reduced from 6.0 for smoother turns
      const velocityDamping = Math.min(1, currentSpeed / 4.0);
      const steering = clamp(diff * steerK * (1 - velocityDamping * 0.2), -1, 1);
      
      // Add small correction based on distance from path center
      const pathOffset = this.calculatePathOffset(v, currentNode);
      const correctionFactor = 0.5;
      v.ctrl.steer = steering + (pathOffset * correctionFactor);
      
      // Check for upcoming zebra crossings and adjust speed
      const zebraCrossingDistance = this.findZebraCrossingDistance(v);
      const baseSpeed = 3.0;
      
      if (zebraCrossingDistance !== null) {
        // Reduce speed based on distance to zebra crossing
        const minDistance = 2; // nodes
        const maxDistance = 5; // nodes
        let speedMultiplier = 1.0;
        
        if (zebraCrossingDistance <= minDistance) {
          speedMultiplier = 0.3; // Slow down significantly
        } else if (zebraCrossingDistance <= maxDistance) {
          // Gradually reduce speed as we get closer
          const factor = (zebraCrossingDistance - minDistance) / (maxDistance - minDistance);
          speedMultiplier = 0.3 + (factor * 0.7);
        }
        
        v.aiTargetSpeed = baseSpeed * speedMultiplier;
      } else {
        v.aiTargetSpeed = baseSpeed;
      }
      
      // If we've reached the target node
      const ARRIVAL_TOLERANCE = 0.75;
      if (distanceToTarget < ARRIVAL_TOLERANCE) {
        v.currentPathIndex++;
        
        // If we've reached the end of planned route or need more nodes
        if (v.currentPathIndex >= v.plannedRoute.length || 
            v.plannedRoute.length < 4) {
          
          // Get last node in path
          const lastNode = v.plannedRoute[v.plannedRoute.length - 1];
          const newNodes = this.buildPathAhead(lastNode, 4, roads);
          
          // Replace current path with new extended path
          v.plannedRoute = newNodes;
          v.currentPathIndex = 0;
        }
      }
      
      // Update waypoint following based on current target
      const currentNode = v.plannedRoute[v.currentPathIndex];
      if (currentNode) {
        const currentPos = { x: currentNode.x + 0.5, y: currentNode.y + 0.5 };
        
        // Predictive steering
        const PREDICTION_TIME = 0.5;
        const currentSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
        const futureTarget = {
          x: currentPos.x + (v.vel?.x || 0) * PREDICTION_TIME,
          y: currentPos.y + (v.vel?.y || 0) * PREDICTION_TIME
        };
        
        const toT = { x: futureTarget.x - v.pos.x, y: futureTarget.y - v.pos.y };
        const dist = Math.hypot(toT.x, toT.y) || 1;
        const desired = Math.atan2(toT.y, toT.x);
        const diff = wrapAngle(desired - (v.rot || 0));
        
        // Steering with velocity damping
        const steerK = 6.0;
        const velocityDamping = Math.min(1, currentSpeed / 4.0);
        v.ctrl.steer = clamp(diff * steerK * (1 - velocityDamping * 0.3), -1, 1);
        
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
  }

  calculatePathOffset(v, currentNode) {
    // Calculate how far the vehicle is from the ideal path center
    const pathCenter = { x: currentNode.x + 0.5, y: currentNode.y + 0.5 };
    const offset = {
      x: v.pos.x - pathCenter.x,
      y: v.pos.y - pathCenter.y
    };
    
    // Project offset onto perpendicular to path direction
    const pathAngle = this.getPathAngle(currentNode);
    const perpX = -Math.sin(pathAngle);
    const perpY = Math.cos(pathAngle);
    
    return offset.x * perpX + offset.y * perpY;
  }

  getPathAngle(node) {
    const dirVec = {
      'N': -Math.PI/2,
      'E': 0,
      'S': Math.PI/2,
      'W': Math.PI
    };
    return dirVec[node.dir] || 0;
  }

  findZebraCrossingDistance(v) {
    if (!v.plannedRoute || v.currentPathIndex === undefined) return null;
    
    const zebraCrossingTypes = [11, 12, 13, 14]; // Zebra crossing tile types
    
    for (let i = v.currentPathIndex; i < v.plannedRoute.length; i++) {
      const node = v.plannedRoute[i];
      const tileType = window.state?.world?.map?.tiles[node.y]?.[node.x];
      
      if (zebraCrossingTypes.includes(tileType)) {
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
  }
}

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function wrapAngle(a) {
  while (a > Math.PI) a -= 2*Math.PI;
  while (a < -Math.PI) a += 2*Math.PI;
  return a;
}