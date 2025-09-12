export const WeaponDefinitions = {
  pistol: {
    name: 'Pistol',
    damage: 25,
    range: 20,
    fireRate: 300,
    projectileSpeed: 15,
    projectileSize: 0.1,
    maxAmmo: 12,
    reloadTime: 1000
  },
  ak47: {
    name: 'AK47',
    damage: 35,
    range: 25,
    fireRate: 100,
    projectileSpeed: 20,
    projectileSize: 0.1,
    maxAmmo: 30,
    reloadTime: 2000
  },
  shotgun: {
    name: 'Shotgun',
    damage: 15,
    range: 10,
    fireRate: 800,
    projectileSpeed: 12,
    projectileSize: 0.08,
    pellets: 8,
    spread: 0.25,
    maxAmmo: 6,
    reloadTime: 2500
  },
  grenade: {
    name: 'Grenade',
    damage: 100,
    range: 12,
    fireRate: 1000,
    projectileSpeed: 8,
    projectileSize: 0.2,
    maxAmmo: 5,
    reloadTime: 0,
    isThrowable: true,
    fuse: 2.0
  }
};

