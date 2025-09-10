    deathOverlay.innerHTML = `
      <div id="death-content" style="display: none; text-align: center; width: 100%; max-width: 600px;">
        <div id="death-title" style="margin: 0 auto 20px;">
          <h1 class="death-title-text">GAME OVER</h1>
-          <p class="death-subtitle">You got squished. Try again?</p>
+          <p class="death-subtitle">Your rampage has finally ended. Now a devastated city will mourn.</p>
        </div>

-    const scoreP=document.createElement('p'); scoreP.style.fontSize='24px'; scoreP.style.marginTop='6px'; scoreP.innerHTML='Score: <span id="final-score">0</span>'; scoreP.style.display='none'; statsEl.appendChild(scoreP);
-    const comboP=document.createElement('p'); comboP.style.fontSize='18px'; comboP.style.marginTop='4px'; comboP.innerHTML='Highest Combo: <span id="highest-combo">0</span>'; comboP.style.display='none'; statsEl.appendChild(comboP);
+    const comboP=document.createElement('p'); comboP.style.fontSize='18px'; comboP.style.marginTop='4px'; comboP.innerHTML='Highest Combo: <span id="highest-combo">0</span>'; comboP.style.display='none'; statsEl.appendChild(comboP);
+    const scoreP=document.createElement('p'); scoreP.style.fontSize='24px'; scoreP.style.marginTop='6px'; scoreP.innerHTML='Score: <span id="final-score">0</span>'; scoreP.style.display='none'; statsEl.appendChild(scoreP);

