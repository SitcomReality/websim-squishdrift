export class FacingSystem {
  updateFacingFromMouse(state, player, input) {
    // Skip if no canvas or mouse position
    if (!state.canvas || !input || !input.mousePos) return;
    
    const canvas = state.canvas;
    const ts = state.world.tileSize || 24;
    
    // Convert mouse position to world coordinates
    const rect = canvas.getBoundingClientRect();
    const mouseX = input.mousePos.x - rect.left;
    const mouseY = input.mousePos.y - rect.top;
    
    // Apply camera transform to get world coordinates
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    const zoom = state.camera?.zoom || 1;
    const camX = state.camera?.x || 0;
    const camY = state.camera?.y || 0;
    
    const worldX = (mouseX - cx) / zoom + camX;
    const worldY = (mouseY - cy) / zoom + camY;
    
    // Calculate angle from player to mouse
    const dx = worldX - player.pos.x;
    const dy = worldY - player.pos.y;
    player.facingAngle = Math.atan2(dy, dx);
    
    // Update facing vector
    player.facing = player.facing || new Vec2();
    player.facing.x = Math.cos(player.facingAngle);
    player.facing.y = Math.sin(player.facingAngle);
  }
}