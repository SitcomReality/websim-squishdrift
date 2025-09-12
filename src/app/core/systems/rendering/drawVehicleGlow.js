// src/app/core/systems/rendering/drawVehicleGlow.js
export function drawVehicleGlow(state, renderer) {
  if (!state.control?.inVehicle || !state.control?.vehicle) return;
  
  const { ctx } = renderer;
  const ts = state.world.tileSize;
  const vehicle = state.control.vehicle;
  
  // Initialize vehicle's glow state if it doesn't exist
  if (!vehicle._glowState) {
    vehicle._glowState = {
      startTime: Date.now(),
      isAnimating: true,
      duration: 1000 // 1 second animation
    };
  }
  
  const now = Date.now();
  const elapsed = now - vehicle._glowState.startTime;
  const progress = Math.min(elapsed / vehicle._glowState.duration, 1);
  
  // If animation is complete, don't draw anything
  if (progress >= 1) {
    vehicle._glowState.isAnimating = false;
    return;
  }
  
  // Calculate current size and alpha based on progress
  const startSize = ts * 0.25;
  const endSize = ts * 1.5;
  const currentSize = startSize + (endSize - startSize) * progress;
  
  const startAlpha = 0.8;
  const endAlpha