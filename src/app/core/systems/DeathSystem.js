import { Vec2 } from '../../../utils/Vec2.js';

export class DeathSystem {
  constructor() {
    this.isDead = false;
    this.deathTime = 0;
    this.fadeDuration = 2000; // 2 seconds
    this.blackScreen = false;
    this.deathMusic = null;
    this.freezeRequested = false; // request engine pause when death UI shows
    this.deathUIShown = false; // prevent duplicate UI/sequences
  }

  update(state, dt) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player || !player.health) return;

    // Check if player is dead
    if (player.health.hp <= 0 && !this.isDead) {
      this.handlePlayerDeath(state);
    }

    // Check if player is in a vehicle that gets destroyed
    this.checkVehicleDestruction(state);

    // Check if vehicles (including player vehicle) go outside map
    this.checkMapBoundaries(state);

    // Update death screen if player is dead
    if (this.isDead) {
      this.updateDeathScreen(state, dt);
    }
  }

  checkVehicleDestruction(state) {
    if (!state.control?.inVehicle) return;
    
    const vehicle = state.control.vehicle;
    if (!vehicle || !vehicle.health) return;
    
    if (!vehicle.health.isAlive()) {
      // Vehicle destroyed while player is inside - instant death
      this.handlePlayerDeath(state);
    }
  }

  checkMapBoundaries(state) {
    const map = state.world?.map;
    if (!map) return;
    
    // Check all vehicles
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const entity = state.entities[i];
      if (entity.type === 'vehicle') {
        // Check if vehicle is outside map boundaries
        if (entity.pos.x < 0 || entity.pos.x >= map.width || 
            entity.pos.y < 0 || entity.pos.y >= map.height) {
          
          // Special check for player vehicle
          if (state.control?.inVehicle && state.control.vehicle === entity) {
            // Player drove off map - instant death
            this.handlePlayerDeath(state);
          }
          
          // Remove vehicle regardless
          state.entities.splice(i, 1);
        }
      }
    }
  }

  handlePlayerDeath(state) {
    this.isDead = true;
    this.deathTime = Date.now();

    // Fade out all audio including main theme
    if (state.audio && state.audio.stopAll) {
      state.audio.stopAll();
    }

    this.createDeathScreen(state);
  }

  fadeOutAllAudio(state) {
    if (!state.audio) return;
    
    // Stop all loops with fade out
    if (state.audio.loops && state.audio.loops.size) {
      for (const [id] of state.audio.loops) {
        state.audio.stopLoop(id, { fadeOut: 1.0 });
      }
    }
    
    // Stop engine audio system
    if (state.engineAudioSystem) {
      state.engineAudioSystem.stopAll();
    }
    
    // Stop any other playing sounds
    if (state.audio.stopAll) {
      state.audio.stopAll();
    }
    
    // Stop death music
    this.stopDeathMusic();
  }

  createDeathScreen(state) {
    // prevent duplicate overlays/listeners
    if (document.getElementById('death-overlay')) return;
    // Create death screen overlay
    const deathOverlay = document.createElement('div');
    deathOverlay.id = 'death-overlay';
    deathOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Noto Sans', system-ui, sans-serif;
      z-index: 1000;
      transition: background 2s ease;
      padding: 20px;
      box-sizing: border-box;
    `;

    deathOverlay.innerHTML = `
      <div id="death-content" style="display: none; text-align: center; width: 100%; max-width: 600px;">
        <div id="death-title" style="margin: 0 auto 20px;">
          <h1 class="death-title-text">GAME OVER</h1>
          <p class="death-subtitle">Your rampage has finally ended. Now a devastated city will mourn.</p>
        </div>
        <div id="death-stats" style="margin-bottom: 30px; font-size: 18px;">
          <p>Time Alive: <span id="time-alive">0:00</span></p>
          <p>Squishes: <span id="enemies-killed">0</span></p>
          <p>Vehicles Destroyed: <span id="vehicles-destroyed">0</span></p>
        </div>
        <button id="restart-button" class="death-restart-btn" aria-label="Restart game">Restart</button>
      </div>
    `;

    document.body.appendChild(deathOverlay);

    // Start zooming out immediately
    if (state.camera) {
      const defaultZoom = state.camera.defaultZoom || 4;
      const targetZoom = defaultZoom * 0.5; // Zoom out to half the default zoom
      
      // Smooth zoom out over 2 seconds
      const startTime = Date.now();
      const zoomDuration = 2000;
      
      const zoomOut = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / zoomDuration, 1);
        
        // Ease out cubic for smooth zoom
        const easeOut = 1 - Math.pow(1 - progress, 3);
        state.camera.zoom = state.camera.defaultZoom - (state.camera.defaultZoom - targetZoom) * easeOut;
        
        if (progress < 1) {
          requestAnimationFrame(zoomOut);
        }
      };
      
      zoomOut();
    }

    // Use setTimeout to trigger the fade-in animation
    setTimeout(() => {
      deathOverlay.style.background = 'rgba(0, 0, 0, 0.8)';
      
      // After fade completes, show content
      setTimeout(() => {
        const deathContent = document.getElementById('death-content');
        if (deathContent) {
          deathContent.style.display = 'block';
          this.freezeRequested = true;
          if (state) state.gamePaused = true;
          this.runDeathStatsSequence(state);
        }
      }, 2000);
    }, 100);

    // Add restart button listener using direct assignment to ensure it works
    setTimeout(() => {
      // Query the button inside the overlay to avoid colliding with any other element
      const restartBtn = deathOverlay.querySelector('#restart-button');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => {
          this.restartGame();
        });
      }
    }, 2100); // Wait until after content is shown
  }

  updateDeathScreen(state, dt) {
    // This method is now just for ongoing updates, not for the fade animation
    // The actual fade is handled by CSS transitions and setTimeout
  }

  async runDeathStatsSequence(state){
    const overlay=document.getElementById('death-overlay');
    if(!overlay || this.deathUIShown) return;
    this.deathUIShown = true;
    
    // --- NEW: Finalize any active drift when player dies ---
    const playerVehicle = state.control?.inVehicle ? state.control.vehicle : null;
    if (playerVehicle && playerVehicle.driftState && (playerVehicle.driftState.active || playerVehicle.driftState.gracePeriodTimer > 0)) {
        const duration = state.time - playerVehicle.driftState.startTime;
        const distance = playerVehicle.driftState.distance;
        
        // Only update if it was a "big drift"
        const wasBigDrift = duration > 2.0 || distance > 5.0;
        if (wasBigDrift) {
            state.stats.totalDriftDistance = (state.stats.totalDriftDistance || 0) + distance;
            if (duration > (state.stats.longestDriftDuration || 0)) {
              state.stats.longestDriftDuration = duration;
            }
        }
    }
    
    // inject bulge keyframes once
    if(!document.getElementById('death-bulge-style')){
      const st=document.createElement('style'); st.id='death-bulge-style';
      st.textContent='@keyframes bulge{0%{transform:scale(1)}60%{transform:scale(1.15)}100%{transform:scale(1)}}';
      overlay.appendChild(st);
    }
    const statsEl=document.getElementById('death-stats');
    const timeP=statsEl.children[0], pedP=statsEl.children[1], vehP=statsEl.children[2];
    pedP.innerHTML='Squishes: <span id="enemies-killed">0</span>';
    const driftDistP=document.createElement('p'); driftDistP.style.fontSize='18px'; driftDistP.style.marginTop='4px'; driftDistP.innerHTML='Distance Drifted: <span id="drift-distance">0</span>m'; driftDistP.style.display='none'; statsEl.appendChild(driftDistP);
    const driftDurP=document.createElement('p'); driftDurP.style.fontSize='18px'; driftDurP.style.marginTop='4px'; driftDurP.innerHTML='Longest Drift: <span id="drift-duration">0.0</span>s'; driftDurP.style.display='none'; statsEl.appendChild(driftDurP);
    const comboP=document.createElement('p'); comboP.style.fontSize='18px'; comboP.style.marginTop='4px'; comboP.innerHTML='Highest Combo: <span id="highest-combo">0</span>'; comboP.style.display='none'; statsEl.appendChild(comboP);
    const scoreP=document.createElement('p'); scoreP.style.fontSize='24px'; scoreP.style.marginTop='6px'; scoreP.innerHTML='Score: <span id="final-score">0</span>'; scoreP.style.display='none'; statsEl.appendChild(scoreP);
    const restartBtn=document.getElementById('restart-button'); if(restartBtn) restartBtn.style.display='none';
    const hide=(el)=>{el.style.opacity='0'; el.style.transform='scale(0.98)'; el.style.transition='opacity .2s ease, transform .2s ease'; el.style.display='none';};
    const show=(el)=>{el.style.display='block'; requestAnimationFrame(()=>{el.style.opacity='1'; el.style.transform='scale(1)';});};
    hide(pedP); hide(vehP); hide(driftDistP); hide(driftDurP);
    const timeAlive=Math.floor((Date.now()-(state.startTime||Date.now()))/1000);
    const peds=state.stats?.enemiesKilled||0, veh=state.stats?.vehiclesDestroyed||0, score=state.scoringSystem?.getScore?.()||0, highestCombo=state.scoringSystem?.getHighestCombo?.()||0;
    const longestDrift=state.stats?.longestDriftDuration||0, totalDriftDist=state.stats?.totalDriftDistance||0;
    const animate=(span,to,dur,fmt=(v)=>String(v))=>new Promise(res=>{
      if(!span){ res(); return; }
      const t0=performance.now();
      const step=(now)=>{
        let k=Math.min(1,(now-t0)/dur);
        let v=Math.floor(to*k);
        span.textContent=fmt(v);
        if(k<1) requestAnimationFrame(step);
        else{
          span.textContent=fmt(to);
          if (span.parentElement && span.parentElement.style) {
            span.parentElement.style.animation='bulge .3s ease';
            setTimeout(()=>{span.parentElement.style.animation=''; res();},320);
          } else {
            res();
          }
        }
      };
      requestAnimationFrame(step);
    });
    const fmtTime=(s)=>{const m=Math.floor(s/60), ss=String(s%60).padStart(2,'0'); return `${m}:${ss}`;};
    // time alive
    show(timeP); await animate(document.getElementById('time-alive'), timeAlive, Math.min(1000, 600+timeAlive*5), fmtTime);
    // pedestrians (now called "Squishes")
    show(pedP); await animate(document.getElementById('enemies-killed'), peds, Math.min(1000, 600+peds*10));
    // vehicles
    show(vehP); await animate(document.getElementById('vehicles-destroyed'), veh, Math.min(1000, 600+veh*10));
    // distance drifted
    show(driftDistP); await animate(document.getElementById('drift-distance'), Math.round(totalDriftDist * 10), Math.min(1000, 600+totalDriftDist*2));
    // longest drift
    show(driftDurP); await animate(document.getElementById('drift-duration'), longestDrift, 800, (v)=>v.toFixed(1));
    // highest combo (before score)
    show(comboP); await animate(document.getElementById('highest-combo'), highestCombo, 800);
    // score (final stat - now positioned last)
    show(scoreP); await animate(document.getElementById('final-score'), score, Math.min(1000, 600+score*0.5));
    
    // Play death music when restart button appears
    this.playDeathMusic(state);
    
    if(restartBtn){ restartBtn.style.display='block'; restartBtn.style.opacity='0'; restartBtn.style.transition='opacity .25s ease, transform .2s ease'; requestAnimationFrame(()=>{restartBtn.style.opacity='1';}); }
  }

  playDeathMusic(state) {
    if (!state.audio) return;
    if (this.deathMusic && !this.deathMusic.paused) return;
    
    // Create new audio element for death music
    this.deathMusic = new Audio('/music/damocles.mp3');
    this.deathMusic.volume = state.audio.musicMuted ? 0 : state.audio.musicVolume;
    this.deathMusic.muted = state.audio.musicMuted;
    
    // Play once, no loop
    this.deathMusic.play().catch(e => console.warn('Could not play death music:', e));
    
    // Update volume when music volume changes
    const updateVolume = () => {
      if (this.deathMusic) {
        this.deathMusic.volume = state.audio.musicMuted ? 0 : state.audio.musicVolume;
        this.deathMusic.muted = state.audio.musicMuted;
      }
    };
    
    // Listen for volume changes
    if (state.audio.setMusicVolume) {
      const originalSetMusicVolume = state.audio.setMusicVolume;
      state.audio.setMusicVolume = (volume) => {
        originalSetMusicVolume(volume);
        updateVolume();
      };
    }
    
    if (state.audio.toggleMusicMute) {
      const originalToggleMusicMute = state.audio.toggleMusicMute;
      state.audio.toggleMusicMute = () => {
        const result = originalToggleMusicMute();
        updateVolume();
        return result;
      };
    }
  }

  stopDeathMusic() {
    if (this.deathMusic) {
      // Quick fade out
      const fadeOut = () => {
        const currentVolume = this.deathMusic.volume;
        if (currentVolume > 0.05) {
          this.deathMusic.volume = Math.max(0, currentVolume - 0.1);
          setTimeout(fadeOut, 50);
        } else {
          this.deathMusic.pause();
          this.deathMusic.currentTime = 0;
          this.deathMusic = null;
        }
      };
      fadeOut();
    }
  }

  restartGame() {
    console.log('Restarting game...');
    
    // Stop death music
    this.stopDeathMusic();
    
    // Remove death overlay
    const deathOverlay = document.getElementById('death-overlay');
    if (deathOverlay) {
      deathOverlay.remove();
    }
    
    // Reset death state
    this.isDead = false;
    this.deathTime = 0;
    this.blackScreen = false;
    this.freezeRequested = false;
    this.deathUIShown = false;
    
    // Emit restart event
    window.dispatchEvent(new CustomEvent('game-restart'));
  }
}