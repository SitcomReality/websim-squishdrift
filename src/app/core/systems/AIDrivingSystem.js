export class AIDrivingSystem {
  update(state, dt) {
    const roads = state.world.map.roads;
    for (const v of state.entities.filter(e => e.type === 'vehicle' && e.controlled !== true)) {
      // Ensure control struct
      v.ctrl = v.ctrl || { throttle: 0, brake: 0, steer: 0 };
      v.aiTargetSpeed = v.aiTargetSpeed || 3.0;
      v.lookAheadDistance = 2.0; // Look ahead this many tiles
      
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
    if (!v.plannedRoute || !v.currentPathIndex === undefined) return;
    
    // Get current and next few waypoints for smoother steering
    const waypoints = this.getLookAheadWaypoints(v);
    if (waypoints.length === 0) return;
    
    // Find the closest waypoint and calculate steering
    const target = this.calculateTargetPosition(v, waypoints);
    
    // Predictive steering with velocity compensation
    const PREDICTION_TIME = 0.8; // Increased prediction time
    const currentSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
    
    // Calculate future position based on current velocity
    const futurePos = {
      x: v.pos.x + (v.vel?.x || 0) * PREDICTION_TIME,
      y: v.pos.y + (v.vel?.y || 0) * PREDICTION_TIME
    };
    
    // Calculate steering angle based on future position
    const toTarget = { 
      x: target.x - futurePos.x, 
      y: target.y - futurePos.y 
    };
    const distance = Math.hypot(toTarget.x, toTarget.y) || 1;
    
    // Smooth angle calculation
    const desiredAngle = Math.atan2(toTarget.y, toTarget.x);
    const currentAngle = v.rot || 0;
    let angleDiff = desiredAngle - currentAngle;
    
    // Normalize angle difference
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // Proportional-derivative steering
    const steerGain = 4.0 + (currentSpeed * 2.0); // Stronger steering at higher speeds
    const damping = 0.3; // Reduce oscillation
    
    let steer = angleDiff * steerGain;
    steer = Math.max(-1, Math.min(1, steer));
    
    // Apply damping based on angular velocity
    if (v.angularVelocity) {
      steer -= v.angularVelocity * damping;
    }
    
    v.ctrl.steer = clamp(steer, -1, 1);
    
    // Speed control based on curvature
    const curvature = Math.abs(angleDiff) / distance;
    const maxSpeed = 3.0;
    const minSpeed = 0.5;
    const speedFactor = 1.0 / (1.0 + curvature * 3.0);
    const targetSpeed = maxSpeed * speedFactor;
    
    // Smooth throttle/brake control
    const speedDiff = targetSpeed - currentSpeed;
    const ACCEL_BAND = 0.3;
    
    if (Math.abs(speedDiff) < ACCEL_BAND) {
      v.ctrl.throttle = 0;
      v.ctrl.brake = 0;
    } else if (speedDiff > 0) {
      // Accelerate
      const accelStrength = Math.min(1, speedDiff * 2.0);
      v.ctrl.throttle = accelStrength;
      v.ctrl.brake = 0;
    } else {
      // Brake or coast
      const brakeStrength = Math.min(1, Math.abs(speedDiff) * 0.8);
      v.ctrl.throttle = 0;
      v.ctrl.brake = brakeStrength;
    }
    
    // Check for arrival at waypoint
    const ARRIVAL_TOLERANCE = 0.6; // Slightly larger tolerance
    const nextTarget = v.plannedRoute[v.currentPathIndex];
    if (nextTarget) {
      const nextPos = { x: nextTarget.x + 0.5, y: nextTarget.y + 0.5 };
      const distToNext = Math.hypot(v.pos.x - nextPos.x, v.pos.y - nextPos.y);
      
      if (distToNext < ARRIVAL_TOLERANCE) {
        v.currentPathIndex++;
        
        // Rebuild path if we're running low on waypoints
        if (v.currentPathIndex >= v.plannedRoute.length - 2) {
          const lastNode = v.plannedRoute[v.plannedRoute.length - 1];
          const newNodes = this.buildPathAhead(lastNode, 6, roads);
          v.plannedRoute = [...v.plannedRoute, ...newNodes.slice(1)];
        }
      }
    }
  }

  getLookAheadWaypoints(v) {
    if (!v.plannedRoute || v.currentPathIndex === undefined) return [];
    
    const waypoints = [];
    const maxLookAhead = Math.min(v.currentPathIndex + 3, v.plannedRoute.length);
    
    for (let i = v.currentPathIndex; i < maxLookAhead; i++) {
      const node = v.plannedRoute[i];
      waypoints.push({
        x: node.x + 0.5,
        y: node.y + 0.5,
        isZebra: this.isZebraCrossing(node)
      });
    }
    
    return waypoints;
  }

  calculateTargetPosition(v, waypoints) {
    // Use weighted average of upcoming waypoints
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    
    for (let i = 0; i < waypoints.length; i++) {
      const weight = Math.pow(0.7, i); // Exponential decay
      totalWeight += weight;
      weightedX += waypoints[i].x * weight;
      weightedY += waypoints[i].y * weight;
    }
    
    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight
    };
  }

  isZebraCrossing(node) {
    const zebraTypes = [11, 12, 13, 14];
    return zebraTypes.includes(window.state?.world?.map?.tiles[node.y]?.[node.x]);
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