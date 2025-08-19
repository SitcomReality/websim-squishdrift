import { Vec2 } from '../../../utils/Vec2.js';
import { createInitialState } from '../../state/createInitialState.js';

export class DeathSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.isDead = false;
    this.deathTimer = 0;
    this.fadeDuration = 2;
    this.stats = {
      timeAlive: 0,
      kills: 0,
      vehiclesDestroyed: 0,
      distanceTraveled: 0
    };
  }

  update(state, dt) {
    if (!state) return;
    
    // Check if player is dead
    const player = state.entities.find(e => e.type === 'player');
    if (!player || !player.health) return;

    if (player.health.isAlive() === false && !this.isDead) {
      this.triggerDeath(state);
    }

    if (this.isDead) {
      this.deathTimer += dt;
      this.handleDeathScreen(state);
    }
  }

  triggerDeath(state) {
    this.isDead = true;
    this.deathTimer = 0;
    
    // Calculate final stats
    this.stats.timeAlive = Math.floor(state.time || 0);
    this.stats.kills = state.killCount || 0;
    this.stats.vehiclesDestroyed = state.vehiclesDestroyed || 0;
    this.stats.distanceTraveled = Math.floor(state.distanceTraveled || 0);
    
    // Show death screen
    this.createDeathScreen();
  }

  handleDeathScreen(state) {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    
    // Calculate fade alpha
    const fadeAlpha = Math.min(1, this.deathTimer / this.fadeDuration);
    
    // Draw black overlay
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Show death screen after fade
    if (this.deathTimer >= this.fadeDuration) {
      this.drawDeathScreen(ctx, canvas.width, canvas.height);
    }
    
    ctx.restore();
  }

  drawDeathScreen(ctx, width, height) {
    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.fillStyle = '#ff3333';
    ctx.font = 'bold 48px "Noto Sans"';
    ctx.textAlign = 'center';
    ctx.fillText('WASTED', width / 2, height / 3);
    
    // Stats
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Noto Sans"';
    ctx.textAlign = 'center';
    
    let yOffset = height / 3 + 80;
    ctx.fillText(`Time Alive: ${this.formatTime(this.stats.timeAlive)}`, width / 2, yOffset);
    yOffset += 35;
    ctx.fillText(`Kills: ${this.stats.kills}`, width / 2, yOffset);
    yOffset += 35;
    ctx.fillText(`Vehicles Destroyed: ${this.stats.vehiclesDestroyed}`, width / 2, yOffset);
    yOffset += 35;
    ctx.fillText(`Distance Traveled: ${this.stats.distanceTraveled}m`, width / 2, yOffset);
    
    // Restart button
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = yOffset + 80;
    
    // Button background
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Button text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px "Noto Sans"';
    ctx.fillText('RESTART', width / 2, buttonY + 32);
    
    // Store button position for click handling
    this.restartButton = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight
    };
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  handleClick(x, y) {
    if (!this.isDead || !this.restartButton) return false;
    
    const canvas = document.getElementById('game');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (x - rect.left) * scaleX;
    const canvasY = (y - rect.top) * scaleY;
    
    const btn = this.restartButton;
    if (canvasX >= btn.x && canvasX <= btn.x + btn.width &&
        canvasY >= btn.y && canvasY <= btn.y + btn.height) {
      this.restartGame();
      return true;
    }
    
    return false;
  }

  restartGame() {
    this.isDead = false;
    this.deathTimer = 0;
    this.restartButton = null;
    
    // Create completely fresh game state
    const newState = createInitialState();
    
    // Update existing engine state (preserve engine reference)
    Object.keys(newState).forEach(key => {
      this.gameEngine.stateManager.state[key] = newState[key];
    });
    
    // Reset emergency services and other systems
    this.gameEngine.stateManager.state.emergencyServices = new this.gameEngine.stateManager.state.emergencyServices.constructor(newState);
    this.gameEngine.stateManager.state.bloodManager = new this.gameEngine.stateManager.state.bloodManager.constructor(20);
    
    // Reset stats tracking
    this.stats = {
      timeAlive: 0,
      kills: 0,
      vehiclesDestroyed: 0,
      distanceTraveled: 0
    };
  }

  reset() {
    this.isDead = false;
    this.deathTimer = 0;
    this.restartButton = null;
    this.stats = {
      timeAlive: 0,
      kills: 0,
      vehiclesDestroyed: 0,
      distanceTraveled: 0
    };
  }
}