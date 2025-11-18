// Simple RoutePlanner used by AI driving system.
// Provides path creation and basic waypoint iteration.
// This file previously contained stray triple-backtick wrappers which have been removed.

export class RoutePlanner {
  constructor() {
    this.waypoints = [];
    this.index = 0;
    this.loop = false;
  }

  // Load an array of { x, y } waypoints
  setWaypoints(points = [], { loop = false } = {}) {
    this.waypoints = Array.isArray(points) ? points.slice() : [];
    this.index = 0;
    this.loop = !!loop;
  }

  // Add a waypoint to the end
  addWaypoint(point) {
    if (point && typeof point.x === 'number' && typeof point.y === 'number') {
      this.waypoints.push({ x: point.x, y: point.y });
    }
  }

  // Get current waypoint or null if none
  current() {
    return this.waypoints[this.index] || null;
  }

  // Advance to next waypoint. Returns new current waypoint or null.
  advance() {
    if (this.waypoints.length === 0) return null;
    this.index++;
    if (this.index >= this.waypoints.length) {
      if (this.loop) {
        this.index = 0;
      } else {
        // clamp to last index
        this.index = this.waypoints.length;
        return null;
      }
    }
    return this.current();
  }

  // Reset iteration to start
  reset() {
    this.index = 0;
  }

  // Check whether we've reached the end (non-looping)
  isFinished() {
    return !this.loop && (this.index >= this.waypoints.length || this.waypoints.length === 0);
  }

  // Find closest waypoint index to given position (x,y) and set index to it
  seekClosest(x, y) {
    if (this.waypoints.length === 0) return null;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.waypoints.length; i++) {
      const dx = this.waypoints[i].x - x;
      const dy = this.waypoints[i].y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    this.index = bestIdx;
    return this.current();
  }

  // Convenience: get remaining waypoints from current index
  remaining() {
    if (this.waypoints.length === 0) return [];
    return this.waypoints.slice(this.index);
  }
}