// ============================================
// MEMORY TRAINER AI - Extended: Settings + main-page key summary + key quick actions
// ============================================

// assume previous functions and constants are defined in earlier app.js content
// we'll add new functions for rendering keys on the main page and quick actions

function renderKeysSummary(){
  const container = document.getElementById('keysSummary'); if(!container) return; container.innerHTML = '';
  const keys = loadKeys();
  const locked = isMasterLocked();
  // plus button
  const plus = document.createElement('div'); plus.className = 'key-plus'; plus.title = 'Add API key'; plus.textContent = '+';
  plus.onclick = ()=>{ document.getElementById('openSettings').click(); document.getElementById('newKeyValue').focus(); };
  container.appendChild(plus);

  // show up to 3 key-mini badges
  keys.slice(0,3).forEach(k=>{
    const badge = document.createElement('div'); badge.className='key-mini';
    const labelSpan = document.createElement('span'); labelSpan.textContent = k.label || (k.type==='gen'?'Gemini':'Google');
    badge.appendChild(labelSpan);
    // lock icon on badge
    const lock = document.createElement('span'); lock.className='lock'; lock.title = 'Master lock status'; lock.textContent = locked? '🔒':'🔓';
    lock.onclick = (e)=>{ e.stopPropagation(); if(confirm((locked?'Unlock':'Lock') + ' keys?')){ setMasterLocked(!locked); renderKeysSummary(); renderKeysList(); document.getElementById('masterLockBtn').textContent = isMasterLocked() ? 'Unlock Keys' : 'Lock Keys'; }};
    badge.appendChild(lock);
    // remove button
    const del = document.createElement('span'); del.className='remove'; del.title='Remove key'; del.textContent='✖'; del.onclick = (e)=>{ e.stopPropagation(); if(isMasterLocked()){ alert('Unlock keys first to remove.'); return; } if(confirm('Delete key "'+k.label+'"?')){ removeKey(k.id); renderKeysSummary(); renderKeysList(); }};
    badge.appendChild(del);
    // primary marker
    if(k.primary){ const pmark = document.createElement('span'); pmark.style.marginLeft='8px'; pmark.style.fontWeight='700'; pmark.textContent='★'; badge.appendChild(pmark); }
    container.appendChild(badge);
  });

  if(keys.length>3){ const more = document.createElement('div'); more.className='key-mini'; more.textContent = `+${keys.length-3} more`; more.onclick = ()=> document.getElementById('openSettings').click(); container.appendChild(more); }
}

// override or wrap existing DOMContentLoaded listeners to call renderKeysSummary
(function attachSummaryRenderer(){
  const orig = window.addEventListener;
  // We'll just ensure renderKeysSummary is called after DOMContentLoaded in case earlier code already set handlers
  document.addEventListener('DOMContentLoaded', ()=>{
    try{ renderKeysSummary(); renderKeysList(); }catch(e){ console.warn('render keys summary error', e); }
    // ensure masterLock button text reflects state
    document.getElementById('masterLockBtn').textContent = isMasterLocked() ? 'Unlock Keys' : 'Lock Keys';
  });
})();

// Ensure keys summary re-renders after key changes
const originalAddKey = addKey;
window.addKey = function(type,label,value,extra){ const id = originalAddKey(type,label,value,extra); renderKeysSummary(); return id; }
const originalRemoveKey = removeKey;
window.removeKey = function(id){ originalRemoveKey(id); renderKeysSummary(); }
const originalSetPrimaryKey = setPrimaryKey;
window.setPrimaryKey = function(id){ originalSetPrimaryKey(id); renderKeysSummary(); renderKeysList(); }
const originalSetMaster = setMasterLocked;
window.setMasterLocked = function(v){ originalSetMaster(v); renderKeysSummary(); renderKeysList(); }

console.log('Main-page key summary module loaded.');
