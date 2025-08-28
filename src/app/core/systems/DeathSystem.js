import { Vec2 } from '../../../utils/Vec2.js';

export class DeathSystem {
  constructor() {
    this.isDead = false;
    this.deathTime = 0;
    this.fadeDuration = 2000; // 2 seconds
    this.blackScreen = false;
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
    
    // Fade out all audio
    this.fadeOutAllAudio(state);
    
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
  }

  createDeathScreen(state) {
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
    `;

    deathOverlay.innerHTML = `
      <div id="death-content" style="display: none; text-align: center;">
        <div id="wasted-image"></div>
        <div id="death-stats" style="margin-bottom: 30px; font-size: 18px;">
          <p>Time Alive: <span id="time-alive">0:00</span></p>
          <p>Enemies Eliminated: <span id="enemies-killed">0</span></p>
          <p>Vehicles Destroyed: <span id="vehicles-destroyed">0</span></p>
        </div>
        <div id="restart-button-sprite" style="margin-left: 128px;"></div>
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
          this.runDeathStatsSequence(state);
        }
      }, 2000);
    }, 100);

    // Add restart button listener using direct assignment to ensure it works
    setTimeout(() => {
      // Query the button inside the overlay to avoid colliding with any other element
      const restartBtn = deathOverlay.querySelector('#restart-button-sprite');
      if (restartBtn) {
        console.log('Restart button found in death overlay, adding listener');
        restartBtn.addEventListener('click', () => {
          console.log('Restart button clicked (death overlay)');
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
    if(!overlay) return;
    // inject bulge keyframes once
    if(!document.getElementById('death-bulge-style')){
      const st=document.createElement('style'); st.id='death-bulge-style';
      st.textContent='@keyframes bulge{0%{transform:scale(1)}60%{transform:scale(1.15)}100%{transform:scale(1)}}';
      overlay.appendChild(st);
    }
    const statsEl=document.getElementById('death-stats');
    const timeP=statsEl.children[0], pedP=statsEl.children[1], vehP=statsEl.children[2];
    pedP.innerHTML='Pedestrians Murdered: <span id="enemies-killed">0</span>';
    const scoreP=document.createElement('p'); scoreP.style.fontSize='24px'; scoreP.style.marginTop='6px'; scoreP.innerHTML='Score: <span id="final-score">0</span>'; scoreP.style.display='none'; statsEl.appendChild(scoreP);
    const restartBtn=document.getElementById('restart-button-sprite'); if(restartBtn) restartBtn.style.display='none';
    const hide=(el)=>{el.style.opacity='0'; el.style.transform='scale(0.98)'; el.style.transition='opacity .2s ease, transform .2s ease'; el.style.display='none';};
    const show=(el)=>{el.style.display='block'; requestAnimationFrame(()=>{el.style.opacity='1'; el.style.transform='scale(1)';});};
    hide(pedP); hide(vehP);
    const timeAlive=Math.floor((Date.now()-(state.startTime||Date.now()))/1000);
    const peds=state.stats?.enemiesKilled||0, veh=state.stats?.vehiclesDestroyed||0, score=state.scoringSystem?.getScore?.()||0;
    const animate=(span,to,dur,fmt=(v)=>String(v))=>new Promise(res=>{const t0=performance.now(); const step=(now)=>{let k=Math.min(1,(now-t0)/dur); let v=Math.floor(to*k); span.textContent=fmt(v); if(k<1) requestAnimationFrame(step); else{span.textContent=fmt(to); span.parentElement.style.animation='bulge .3s ease'; setTimeout(()=>{span.parentElement.style.animation=''; res();},320);} }; requestAnimationFrame(step);});
    const fmtTime=(s)=>{const m=Math.floor(s/60), ss=String(s%60).padStart(2,'0'); return `${m}:${ss}`;};
    // time alive
    show(timeP); await animate(document.getElementById('time-alive'), timeAlive, Math.min(2000, 1200+timeAlive*10), fmtTime);
    // pedestrians
    show(pedP); await animate(document.getElementById('enemies-killed'), peds, Math.min(2000, 1200+peds*20));
    // vehicles
    show(vehP); await animate(document.getElementById('vehicles-destroyed'), veh, Math.min(2000, 1200+veh*20));
    // score (prominent)
    show(scoreP); await animate(document.getElementById('final-score'), score, Math.min(2000, 1200+score*1));
    if(restartBtn){ restartBtn.style.display='block'; restartBtn.style.opacity='0'; restartBtn.style.transition='opacity .25s ease, transform .2s ease'; requestAnimationFrame(()=>{restartBtn.style.opacity='1';}); }
  }

  restartGame() {
    console.log('Restarting game...');
    
    // Remove death overlay
    const deathOverlay = document.getElementById('death-overlay');
    if (deathOverlay) {
      deathOverlay.remove();
    }
    
    // Reset death state
    this.isDead = false;
    this.deathTime = 0;
    this.blackScreen = false;
    
    // Emit restart event
    window.dispatchEvent(new CustomEvent('game-restart'));
  }
}