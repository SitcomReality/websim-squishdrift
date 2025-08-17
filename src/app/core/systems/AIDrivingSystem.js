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
    
    // If we found a closer node, skip to it
    if (newTargetIndex !== v.currentPathIndex) {
      v.currentPathIndex = newTargetIndex;
    }
    
    // If we've reached the target node
    const ARRIVAL_TOLERANCE = 0.75;
    if (distanceToTarget < ARRIVAL_TOLERANCE) {
      v.currentPathIndex++;
    }
    
    // Always maintain at least 4 nodes ahead by extending the path
    const remainingNodes = v.plannedRoute.length - v.currentPathIndex;
    if (remainingNodes <= 2) {
      // Get the last node in current path
      const lastNode = v.plannedRoute[v.plannedRoute.length - 1];
      if (lastNode) {
        const newNodes = this.buildPathAhead(lastNode, 4, roads);
        if (newNodes && newNodes.length > 1) {
          // Remove completed nodes and append new ones
          v.plannedRoute = v.plannedRoute.slice(v.currentPathIndex).concat(newNodes.slice(1));
          v.currentPathIndex = 0;
        }
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
      
      // Speed control
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