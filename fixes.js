// Robust initialization and deduplication guards for Memory Trainer UI
// Purpose: ensure only one active screen is shown, remove duplicate stylesheet tags,
// provide a safe showScreen() function, idempotent event bindings, and fallbacks
// so the UI remains usable even if other scripts fail or are cached.

(function(){
  // Utility helpers
  function onceBind(el, type, handler){
    if(!el) return;
    if(el.dataset && el.dataset.bound === 'true') return;
    el.addEventListener(type, handler);
    if(el.dataset) el.dataset.bound = 'true';
  }

  function dedupeStylesheets(){
    try{
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const seen = new Map();
      links.forEach(link =>{
        const href = link.getAttribute('href') || '';
        // normalize by removing cache-bust querystring
        const key = href.split('?')[0];
        if(seen.has(key)){
          // remove duplicate
          link.parentNode && link.parentNode.removeChild(link);
        } else {
          seen.set(key, link);
        }
      });
    }catch(e){ console.warn('[init] dedupeStylesheets error', e); }
  }

  function ensureSingleActiveScreen(){
    const screens = Array.from(document.querySelectorAll('.screen'));
    const actives = screens.filter(s => s.classList.contains('active'));
    if(actives.length !== 1){
      screens.forEach(s => s.classList.remove('active'));
      const home = document.getElementById('homeScreen') || screens[0];
      if(home) home.classList.add('active');
      console.info('[init] ensured single active screen');
    }
  }

  function showScreen(id){
    try{
      const screens = Array.from(document.querySelectorAll('.screen'));
      screens.forEach(s => {
        if(s.id === id){
          s.classList.add('active');
          s.style.display = 'block';
          s.style.pointerEvents = 'auto';
        } else {
          s.classList.remove('active');
          s.style.display = 'none';
          s.style.pointerEvents = 'none';
        }
      });
      // update progress dots if present
      try{
        const dots = Array.from(document.querySelectorAll('.progress-dots .dot'));
        dots.forEach((d, i) => d.classList.toggle('active', false));
        // Map screen id order -> dot index if consistent
        const screenOrder = ['homeScreen','readingScreen','recallScreen','writingScreen','feedbackScreen'];
        const idx = screenOrder.indexOf(id);
        if(idx >= 0 && dots[idx]) dots[idx].classList.add('active');
      }catch(e){ /* ignore */ }
      // scroll to top of the active screen
      const activeEl = document.getElementById(id);
      if(activeEl) activeEl.scrollIntoView({behavior:'instant', block:'start'});
    }catch(err){ console.error('[init] showScreen error', err); }
  }

  function safeBindUI(){
    try{
      // difficulty cards
      const diffCards = Array.from(document.querySelectorAll('.difficulty-card'));
      diffCards.forEach(card => {
        onceBind(card, 'click', function(){
          diffCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          try{ window.state = window.state || {}; window.state.difficulty = card.dataset.difficulty || 'Normal'; }catch(e){}
        });
      });

      // main buttons
      const map = [
        {id:'openSettings', fn:()=> document.getElementById('settingsPanel') && document.getElementById('settingsPanel').classList.remove('hidden')},
        {id:'closeSettings', fn:()=> document.getElementById('settingsPanel') && document.getElementById('settingsPanel').classList.add('hidden')},
        {id:'randomBtn', fn:()=>{ const topics = Object.keys(window.knowledgeBase||{}); if(topics.length){ const pick = topics[Math.floor(Math.random()*topics.length)]; const ti=document.getElementById('topicInput'); if(ti) ti.value = pick;} }},
        {id:'startBtn', fn:()=>{ const t = (document.getElementById('topicInput')||{}).value; if(!t){ alert('Please enter a topic'); return; } window.startSession ? window.startSession(t) : showScreen('readingScreen'); }},
        {id:'backFromReading', fn:()=> showScreen('homeScreen') },
        {id:'continueFromReading', fn:()=> showScreen('recallScreen') },
        {id:'backFromRecall', fn:()=> showScreen('readingScreen') },
        {id:'backFromWriting', fn:()=> showScreen('recallScreen') },
        {id:'backFromReview', fn:()=> showScreen('homeScreen') },
        {id:'hintBtn', fn:()=>{ alert('Hint: recall the main definition and one example.'); }},
      ];

      map.forEach(m => {
        const el = document.getElementById(m.id);
        if(el) onceBind(el, 'click', m.fn);
      });

      // topic picker buttons
      document.querySelectorAll('.topic-btn').forEach(b=>{
        onceBind(b,'click',()=>{ const ti=document.getElementById('topicInput'); if(ti) ti.value = b.textContent.trim(); });
      });

      // ensure submitRecall enabled when at least one non-empty answer exists
      const questionsContainer = document.getElementById('questionsContainer');
      const submitRecall = document.getElementById('submitRecall');
      if(questionsContainer && submitRecall){
        onceBind(questionsContainer,'input', ()=>{
          const vals = Array.from(questionsContainer.querySelectorAll('textarea, input')).map(i=>i.value.trim()).filter(Boolean);
          submitRecall.disabled = vals.length === 0;
        });
      }

      // restore pointer-events for interactive elements
      ['openSettings','randomBtn','startBtn','continueFromReading','submitRecall','submitWriting','nextTopic','reviewAgain','hintBtn','modeBtn','modeLabel'].forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.style.pointerEvents = 'auto';
      });

    }catch(e){ console.warn('[init] safeBindUI error', e); }
  }

  // Remove duplicate fix scripts if accidentally included multiple times
  function dedupeFixScripts(){
    try{
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const seen = new Set();
      scripts.forEach(s =>{
        const src = s.getAttribute('src')||'';
        if(src.includes('fixes.js')){
          if(seen.has(src)){
            s.parentNode && s.parentNode.removeChild(s);
          } else seen.add(src);
        }
      });
    }catch(e){ /* ignore */ }
  }

  // Initialization sequence
  function init(){
    dedupeStylesheets();
    dedupeFixScripts();
    ensureSingleActiveScreen();
    safeBindUI();

    // expose showScreen globally for other scripts
    window.showScreen = window.showScreen || showScreen;

    // defensive timeout: if some other script later tries to set up screens, reconcile afterwards
    setTimeout(()=>{ ensureSingleActiveScreen(); safeBindUI(); }, 500);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
