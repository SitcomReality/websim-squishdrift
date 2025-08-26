import { Vec2 } from '../../../utils/Vec2.js';
import { Health } from '../../components/Health.js';
import { DamageTextSystem } from './DamageTextSystem.js';
import { ScoringSystem } from './ScoringSystem.js';

export class WeaponSystem {
  constructor() {
    this.weapons = {
      pistol: {
        name: 'Pistol',
        damage: 25,
        range: 20,
        fireRate: 300, // ms between shots
        projectileSpeed: 15,
        projectileSize: 0.1,
        maxAmmo: 12,
        reloadTime: 1000 // ms
      }
    };
    this.damageTextSystem = new DamageTextSystem();
  }

