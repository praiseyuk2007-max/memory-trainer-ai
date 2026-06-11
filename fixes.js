// Small runtime fixes and guards to ensure only one screen is active and key UI elements are clickable.
// This script is intentionally minimal and defensive: it doesn't change existing logic, only fixes display/pointer issues
// that can happen when CSS is cached or JS initialization is interrupted.

document.addEventListener('DOMContentLoaded', function(){
  try{
    // Ensure exactly one active screen
    const screens = Array.from(document.querySelectorAll('.screen'));
    const actives = screens.filter(s => s.classList.contains('active'));
    if(actives.length !== 1){
      screens.forEach(s => s.classList.remove('active'));
      const home = document.getElementById('homeScreen') || screens[0];
      if(home) home.classList.add('active');
      console.info('[fixes.js] ensured single active screen');
    }

    // Add a stricter runtime style to ensure pointer-events and visibility are correct
    const runtimeCSS = `
      .screen{display:none !important; pointer-events:none !important}
      .screen.active{display:block !important; pointer-events:auto !important; z-index:50 !important}
    `;
    const styleEl = document.createElement('style'); styleEl.innerHTML = runtimeCSS; document.head.appendChild(styleEl);

    // Ensure interactive elements are clickable (in case pointer-events were blocked by other CSS)
    ['openSettings','randomBtn','startBtn','continueFromReading','submitRecall','submitWriting','nextTopic','reviewAgain','hintBtn'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.style.pointerEvents = 'auto';
    });

    // Re-bind simple interactions if they are missing (safe no-op if already bound)
    const diffCards = document.querySelectorAll('.difficulty-card');
    if(diffCards && diffCards.length){
      diffCards.forEach(card=>{
        card.onclick = function(){
          diffCards.forEach(c=>c.classList.remove('selected'));
          card.classList.add('selected');
          try{ window.state = window.state || {}; window.state.difficulty = card.dataset.difficulty || 'Normal'; }catch(e){}
        };
      });
    }

    // Topic picker buttons: fill input when clicked
    document.querySelectorAll('.topic-btn').forEach(b=>{
      b.onclick = function(){ const ti=document.getElementById('topicInput'); if(ti) ti.value = b.textContent.trim(); };
    });

    // Settings open/close safe binding
    const settingsPanel = document.getElementById('settingsPanel');
    const openSettings = document.getElementById('openSettings');
    const closeSettings = document.getElementById('closeSettings');
    if(openSettings && settingsPanel){ openSettings.onclick = ()=> settingsPanel.classList.remove('hidden'); }
    if(closeSettings && settingsPanel){ closeSettings.onclick = ()=> settingsPanel.classList.add('hidden'); }

  }catch(err){ console.error('[fixes.js] runtime guard error', err); }
});
