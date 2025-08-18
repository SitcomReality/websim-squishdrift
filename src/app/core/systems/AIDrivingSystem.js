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

  updateRouteFollowing(state, v, roads, dt) {
    if (!v.plannedRoute || !v.plannedRoute.length) return;
    
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

  updateMovement(v, dt) {
    // Ensure basic physics properties exist
    v.vel = v.vel || { x: 0, y: 0 };
    v.rot = v.rot || 0;
    v.angularVelocity = v.angularVelocity || 0;
    v.mass = v.mass || 1200;
    
    // Smooth throttle/brake control to avoid oscillation: use deadband and lerp
    const fwd = { x: Math.cos(v.rot || 0), y: Math.sin(v.rot || 0) };
    const vLong = (v.vel?.x || 0) * fwd.x + (v.vel?.y || 0) * fwd.y;
    // targetSpeed already set in updateRouteFollowing, ensure defined
    const target = v.aiTargetSpeed || 3.0;
    const accelBand = 0.2;
    let desiredThrottle = 0, desiredBrake = 0;
    if (Math.abs(vLong - target) < accelBand) { desiredThrottle = 0; desiredBrake = 0; }
    else if (vLong < target - accelBand) { desiredThrottle = 1; desiredBrake = 0; }
    else if (vLong > target + accelBand) { desiredThrottle = 0; desiredBrake = 0.6; }
    // lerp control values for smooth application
    v.ctrl.throttle = (v.ctrl.throttle || 0) * 0.75 + desiredThrottle * 0.25;
    v.ctrl.brake = (v.ctrl.brake || 0) * 0.75 + desiredBrake * 0.25;
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