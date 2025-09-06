export class AnimationSystem {
  constructor() {
    this.animatingBuildings = new Set();
    this.animatingTrees = new Set();
  }

  update(state, dt) {
    if (!state || !state.world || !state.world.map) return;
    
    const map = state.world.map;
    
    // Update building animations
    if (map.buildings) {
      for (const building of map.buildings) {
        if (building.animationState) {
          this.updateBuildingAnimation(building, state.isFlattened, dt);
        }
      }
    }
    
    // Update tree animations
    if (map.trees) {
      for (const tree of map.trees) {
        if (tree.animationState) {
          this.updateTreeAnimation(tree, state.isFlattened, dt);
        }
      }
    }
  }

  updateBuildingAnimation(building, isFlattened, dt) {
    const anim = building.animationState;
    const now = Date.now();
    const elapsed = now - anim.startTime;
    const progress = Math.min(elapsed / anim.duration, 1);
    
    if (anim.type === 'shrink') {
      // Linear interpolation to 0
      building.currentHeight = building.originalHeight * (1 - progress);
      if (progress >= 1) {
        building.currentHeight = 0;
        building.animationState = null;
      }
    } else if (anim.type === 'grow') {
      // Elastic easing for bounce effect
      const easeOutElastic = (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      };
      
      const easedProgress = easeOutElastic(progress);
      building.currentHeight = building.originalHeight * easedProgress;
      
      if (progress >= 1) {
        building.currentHeight = building.originalHeight;
        building.animationState = null;
      }
    }
  }

  updateTreeAnimation(tree, isFlattened, dt) {
    const anim = tree.animationState;
    const now = Date.now();
    const elapsed = now - anim.startTime;
    const progress = Math.min(elapsed / anim.duration, 1);
    
    if (anim.type === 'shrink') {
      // Linear interpolation to 0
      tree.currentTrunkHeight = tree.originalTrunkHeight * (1 - progress);
      tree.currentLeafHeight = tree.originalLeafHeight * (1 - progress);
      if (progress >= 1) {
        tree.currentTrunkHeight = 0;
        tree.currentLeafHeight = 0;
        tree.animationState = null;
      }
    } else if (anim.type === 'grow') {
      // Elastic easing for bounce effect
      const easeOutElastic = (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      };
      
      const easedProgress = easeOutElastic(progress);
      tree.currentTrunkHeight = tree.originalTrunkHeight * easedProgress;
      tree.currentLeafHeight = tree.originalLeafHeight * easedProgress;
      
      if (progress >= 1) {
        tree.currentTrunkHeight = tree.originalTrunkHeight;
        tree.currentLeafHeight = tree.originalLeafHeight;
        tree.animationState = null;
      }
    }
  }

  triggerAnimations(state) {
    if (!state || !state.world || !state.world.map) return;
    
    const map = state.world.map;
    const now = Date.now();
    
    // Trigger building animations
    if (map.buildings) {
      for (const building of map.buildings) {
        if (!building.animationState) {
          if (state.isFlattened) {
            // Start shrink animation
            building.animationState = {
              type: 'shrink',
              startTime: now,
              duration: 300
            };
          }
        } else {
          // Start grow animation
          building.animationState = {
            type: 'grow',
            startTime: now,
            duration: 600
          };
        }
      }
    }
    
    // Trigger tree animations
    if (map.trees) {
      for (const tree of map.trees) {
        if (!tree.animationState) {
          if (state.isFlattened) {
            // Start shrink animation
            tree.animationState = {
              type: 'shrink',
              startTime: now,
              duration: 300
            };
          }
        } else {
          // Start grow animation
          tree.animationState = {
            type: 'grow',
            startTime: now,
            duration: 600
          };
        }
      }
    }
  }
}