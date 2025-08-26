  fireProjectile(state, player) {
    const weapon = player.equippedWeapon;
    const angle = player.facingAngle || Math.atan2(player.facing.y, player.facing.x);
    const origin = (state.control?.inVehicle && state.control.vehicle?.pos) ? state.control.vehicle.pos : player.pos;
    
    const createProjectile = (projAngle) => ({
      type: 'projectile',
      pos: new Vec2(origin.x, origin.y),
      vel: new Vec2(
        Math.cos(projAngle) * weapon.projectileSpeed,
        Math.sin(projAngle) * weapon.projectileSpeed
      ),
      damage: weapon.damage,
      range: weapon.range,
      lifetime: weapon.range / weapon.projectileSpeed,
      age: 0,
      size: weapon.projectileSize * 0.25, // Make 25% smaller
      owner: 'player'
    });

