src/app/core/systems/ai/RoutePlanner.js
```javascript
export class RoutePlanner {
  constructor() {}

  initializeRoute(v, roads) {
    if (!v.node) return;
    v.plannedRoute = this.buildPathAhead(v.node, 6, roads);
    v.currentPathIndex = 0;
  }

  ensureRouteLength(v, roads) {
    if (!v.plannedRoute || !v.plannedRoute.length) return;
    const MIN_PATH_LENGTH = 5;
    if (v.plannedRoute.length - (v.currentPathIndex || 0) < MIN_PATH_LENGTH) {
      const lastNode = v.plannedRoute[v.plannedRoute.length - 1];
      const newNodes = this.buildPathAhead(lastNode, MIN_PATH_LENGTH, roads);
      v.plannedRoute = [...v.plannedRoute, ...newNodes.slice(1)];
    }
  }

  buildPathAhead(startNode, depth, roads) {
    const path = [startNode];
    let current = startNode;
    for (let i = 0; i < depth; i++) {
      if (!current.next || !current.next.length) break;
      let nextChoice;
      if (current.next.length === 1) {
        nextChoice = current.next[0];
      } else {
        const validChoices = current.next.filter(n => !path[path.length - 2] || !(n.x === path[path.length - 2].x && n.y === path[path.length - 2].y));
        nextChoice = validChoices.length > 0 ? validChoices[Math.floor(Math.random() * validChoices.length)] : current.next[Math.floor(Math.random() * current.next.length)];
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
    if (v.retreatState && v.retreatState.active) {
      if (typeof v.retreatState.steerDir !== 'number') v.retreatState.steerDir = (Math.random() > 0.5 ? 1 : -1) * 0.4;
      v.ctrl.steer = v.retreatState.steerDir;
      return;
    }

    // If route short, ensured earlier; now compute current target and steering
    const currentTarget = v.plannedRoute[v.currentPathIndex];
    if (!currentTarget) return;
    const targetPos = { x: currentTarget.x + 0.5, y: currentTarget.y + 0.5 };
    const distanceToTarget = Math.hypot(v.pos.x - targetPos.x, v.pos.y - targetPos.y);

    let newTargetIndex = v.currentPathIndex;
    for (let i = v.currentPathIndex + 1; i < v.plannedRoute.length; i++) {
      const laterNode = v.plannedRoute[i];
      const laterPos = { x: laterNode.x + 0.5, y: laterNode.y + 0.5 };
      const distToLater = Math.hypot(v.pos.x - laterPos.x, v.pos.y - laterPos.y);
      if (distToLater < distanceToTarget) { newTargetIndex = i; break; }
    }
    if (newTargetIndex !== v.currentPathIndex) v.currentPathIndex = newTargetIndex;

    const drivingStyle = v.drivingStyle || 'normal';
    let baseSpeed;
    if (drivingStyle === 'reckless' || (drivingStyle === 'normal' && v.impatience >= 10)) baseSpeed = v.isEmergency ? 5.0 : 4.0;
    else baseSpeed = 1.5;

    let speedMultiplier = 1.0;

    // Obstacle handling & zebra/intersection slowdowns are delegations to caller's obstacle detector
    const zebraCrossingDistance = this.findZebraCrossingDistance(v);
    const intersectionDistance = this.findIntersectionDistance(v, roads);

    if (drivingStyle === 'normal' && v.impatience < 10) {
      if (zebraCrossingDistance !== null) {
        const minZebraDist = 2, maxZebraDist = 5;
        if (zebraCrossingDistance <= minZebraDist) speedMultiplier = Math.min(speedMultiplier, 0.3);
        else if (zebraCrossingDistance <= maxZebraDist) {
          const factor = (zebraCrossingDistance - minZebraDist) / (maxZebraDist - minZebraDist);
          speedMultiplier = Math.min(speedMultiplier, 0.3 + (factor * 0.7));
        }
      }
      if (intersectionDistance !== null) {
        const minI = 1, maxI = 4;
        if (intersectionDistance <= minI) speedMultiplier = Math.min(speedMultiplier, 0.4);
        else if (intersectionDistance <= maxI) {
          const factor = (intersectionDistance - minI) / (maxI - minI);
          speedMultiplier = Math.min(speedMultiplier, 0.4 + (factor * 0.6));
        }
      }
    } else {
      if (zebraCrossingDistance !== null) {
        const minZebraDist = 1, maxZebraDist = 3;
        if (zebraCrossingDistance <= minZebraDist) speedMultiplier = Math.min(speedMultiplier, 0.8);
        else if (zebraCrossingDistance <= maxZebraDist) {
          const factor = (zebraCrossingDistance - minZebraDist) / (maxZebraDist - minZebraDist);
          speedMultiplier = Math.min(speedMultiplier, 0.8 + (factor * 0.2));
        }
      }
    }

    v.aiTargetSpeed = baseSpeed * speedMultiplier;

    const ARRIVAL_TOLERANCE = 0.75;
    if (distanceToTarget < ARRIVAL_TOLERANCE) v.currentPathIndex++;

    const currentNode = v.plannedRoute[v.currentPathIndex];
    if (currentNode) {
      const currentPos = { x: currentNode.x + 0.5, y: currentNode.y + 0.5 };
      const PREDICTION_TIME = 0.45;
      const currentSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
      const followT = 0.35;
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
      const steerK = 6.0;
      const velocityDamping = Math.min(1, currentSpeed / 4.0);
      const rawSteer = clamp(diff * steerK * (1 - velocityDamping * 0.3), -1, 1);
      v.ctrl.steer = v.ctrl.steer !== undefined ? (v.ctrl.steer * 0.7 + rawSteer * 0.3) : rawSteer;

      const turnSlow = 1 / (1 + 2 * Math.abs(diff));
      const targetSpeed = v.aiTargetSpeed * turnSlow;
      const fwd = { x: Math.cos(v.rot || 0), y: Math.sin(v.rot || 0) };
      const vLong = (v.vel?.x || 0) * fwd.x + (v.vel?.y || 0) * fwd.y;
      const accelBand = 0.2;
      if (Math.abs(vLong - targetSpeed) < accelBand) { v.ctrl.throttle = 0; v.ctrl.brake = 0; }
      else if (vLong < targetSpeed - accelBand) { v.ctrl.throttle = 1; v.ctrl.brake = 0; }
      else if (vLong > targetSpeed + accelBand) { v.ctrl.throttle = 0; v.ctrl.brake = 0.5; }
    }
  }

  findZebraCrossingDistance(v) {
    if (!v.plannedRoute || v.currentPathIndex === undefined) return null;
    const zebraCrossingTypes = [11, 12, 13, 14];
    const state = v._engine?.stateManager?.getState?.() || v.state;
    if (!state) return null;
    const map = state.world?.map;
    if (!map) return null;
    for (let i = v.currentPathIndex; i < v.plannedRoute.length; i++) {
      const node = v.plannedRoute[i];
      const tileType = map.tiles[node.y]?.[node.x];
      if (zebraCrossingTypes.includes(tileType)) return i - v.currentPathIndex;
    }
    return null;
  }

  findIntersectionDistance(v, roads) {
    if (!v.plannedRoute || v.currentPathIndex === undefined) return null;
    for (let i = v.currentPathIndex; i < v.plannedRoute.length; i++) {
      const node = v.plannedRoute[i];
      const roadNode = roads.byKey.get(`${node.x},${node.y},${node.dir}`);
      if (roadNode && roadNode.next.length > 1) return i - v.currentPathIndex;
    }
    return null;
  }
}

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function wrapAngle(a) { while (a > Math.PI) a -= 2*Math.PI; while (a < -Math.PI) a += 2*Math.PI; return a; }


```