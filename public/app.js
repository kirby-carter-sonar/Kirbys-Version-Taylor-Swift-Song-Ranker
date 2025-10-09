const STORAGE_KEY = 'ts-song-ranker:v1';

const el = (id) => document.getElementById(id);
// songList removed in inline pairwise mode; keep function safe
const songList = el('song-list');
const loadDefaultBtn = el('load-default');
const saveBtn = el('save');
const shareBtn = el('share');
const exportJsonBtn = el('export-json');
const exportCsvBtn = el('export-csv');
const importInput = el('import-file');
const pairwiseBtn = el('pairwise');

let songs = [];
let dragSrcIndex = null;
const PAIRWISE_KEY = STORAGE_KEY + ':pairwise';
const rankedListEl = el('ranked-list');
const autoSaveIndicator = el('auto-save-indicator');

function render() {
  if (!songList) return;
  
  songList.innerHTML = '';
  songs.forEach((song, index) => {
    const li = document.createElement('li');
    li.className = 'song-item';
    li.draggable = true;
    li.tabIndex = 0;
    li.setAttribute('data-index', index);
    
    const titleEl = document.createElement('div');
    titleEl.className = 'song-title';
    titleEl.textContent = song.title;
    
    const albumEl = document.createElement('div');
    albumEl.className = 'song-album';
    albumEl.textContent = song.album + (song.releaseYear ? ` (${song.releaseYear})` : '');
    
    const infoEl = document.createElement('div');
    infoEl.className = 'song-info';
    infoEl.appendChild(titleEl);
    infoEl.appendChild(albumEl);
    
    const rankEl = document.createElement('div');
    rankEl.className = 'song-rank';
    rankEl.textContent = `#${index + 1}`;
    
    li.appendChild(rankEl);
    li.appendChild(infoEl);
    
    // Add drag and drop handlers
    li.addEventListener('dragstart', (e) => {
      dragSrcIndex = index;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      dragSrcIndex = null;
    });
    
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragSrcIndex !== null && dragSrcIndex !== index) {
        move(dragSrcIndex, index);
        // Auto-save after drop
        logDebug(`Moved song from position ${dragSrcIndex + 1} to ${index + 1}`);
      }
    });
    
    // Double-click to edit
    titleEl.addEventListener('dblclick', () => startEdit(titleEl, song));
    
    // Keyboard navigation
    li.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        move(index, index - 1);
        setTimeout(() => songList.children[index - 1].focus(), 50);
        logDebug(`Keyboard: moved song up from position ${index + 1} to ${index}`);
      } else if (e.key === 'ArrowDown' && index < songs.length - 1) {
        e.preventDefault();
        move(index, index + 1);
        setTimeout(() => songList.children[index + 1].focus(), 50);
        logDebug(`Keyboard: moved song down from position ${index + 1} to ${index + 2}`);
      }
    });
    
    songList.appendChild(li);
  });
  
  // Update ranked preview
  updateRankedPreview();
}

function updateRankedPreview() {
  if (!rankedListEl) return;
  
  rankedListEl.innerHTML = '';
  songs.forEach((song, index) => {
    const li = document.createElement('li');
    li.textContent = `${song.title} — ${song.album}`;
    rankedListEl.appendChild(li);
  });
}

function startEdit(titleEl, song) {
  const input = document.createElement('input');
  input.value = song.title;
  input.className = 'editable';
  input.addEventListener('blur', () => { 
    const oldTitle = song.title;
    song.title = input.value || song.title; 
    render(); 
    save(); 
    if (oldTitle !== song.title) {
      logDebug(`Renamed song from "${oldTitle}" to "${song.title}"`);
    }
  });
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); });
  titleEl.replaceWith(input);
  input.focus();
}

function move(from, to) {
  if (to < 0 || to >= songs.length) return;
  const [item] = songs.splice(from, 1);
  songs.splice(to, 0, item);
  render();
  save();
}

function updateAutoSaveIndicator(status, message) {
  if (!autoSaveIndicator) return;
  
  autoSaveIndicator.className = 'auto-save-indicator';
  if (status === 'saving') {
    autoSaveIndicator.classList.add('saving');
  } else if (status === 'error') {
    autoSaveIndicator.classList.add('error');
  }
  
  const statusEl = autoSaveIndicator.querySelector('.save-status');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function save() {
  try {
    updateAutoSaveIndicator('saving', 'Saving...');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    
    // enhanced UI feedback with timestamp
    const now = new Date().toLocaleTimeString();
    saveBtn.textContent = `Saved ✓ ${now}`;
    saveBtn.style.color = '#10b981';
    
    updateAutoSaveIndicator('success', `Last saved: ${now}`);
    
    setTimeout(() => {
      saveBtn.textContent = 'Save';
      saveBtn.style.color = '';
      updateAutoSaveIndicator('', 'Auto-save: ON');
    }, 2000);
    
    logDebug(`Auto-saved ${songs.length} songs at ${now}`);
  } catch (err) { 
    console.warn('Failed to save', err); 
    saveBtn.textContent = 'Save failed ⚠️';
    saveBtn.style.color = '#ef4444';
    
    updateAutoSaveIndicator('error', 'Save failed!');
    
    setTimeout(() => {
      saveBtn.textContent = 'Save';
      saveBtn.style.color = '';
      updateAutoSaveIndicator('', 'Auto-save: ON');
    }, 3000);
  }
}

function loadDefault() {
  logDebug('Loading default songs from songs.json');
  return fetch('songs.json')
    .then(res => res.json())
    .then(data => { songs = data; render(); save(); logDebug(`Loaded ${songs.length} songs`); return data; })
    .catch(err => { console.error('Failed to load default songs', err); logDebug('Failed to load default songs: ' + (err && err.message)); throw err; });
}


// simple on-page debug console for easier debugging without devtools
function ensureDebugPane() {
  let d = document.getElementById('debug-pane');
  if (d) return d;
  d = document.createElement('div'); d.id = 'debug-pane'; d.style.position = 'fixed'; d.style.right = '12px'; d.style.top = '12px'; d.style.width = '300px'; d.style.maxHeight = '40vh'; d.style.overflow = 'auto'; d.style.background = 'rgba(255,255,255,0.96)'; d.style.border = '1px solid rgba(0,0,0,0.06)'; d.style.padding = '8px'; d.style.zIndex = 200; d.style.fontSize = '12px'; d.style.color = '#101827'; d.style.borderRadius = '8px'; d.innerHTML = '<strong>Debug</strong><div id="debug-log"></div>';
  document.body.appendChild(d);
  return d;
}
function logDebug(msg) { try { const d = ensureDebugPane(); const log = d.querySelector('#debug-log'); const el = document.createElement('div'); el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`; log.prepend(el); } catch (e) { console.log('dbg', msg); } }

// Global pairwise state helpers so other functions (resume/init) can access saved runs
function pairwiseStateSave(state) {
  try { localStorage.setItem(PAIRWISE_KEY, JSON.stringify(state)); } catch (e) { console.warn('Failed to save pairwise state', e); }
}
function pairwiseStateLoad() {
  try { const s = localStorage.getItem(PAIRWISE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function pairwiseStateClear() { try { localStorage.removeItem(PAIRWISE_KEY); } catch (e) {} }

// Pairwise ranking overlay setup
function buildPairwiseOverlay() {
  // Inline pairwise panel exists in the page (we replaced the list). Select and return it.
  const overlay = document.querySelector('[data-pairwise="overlay"]');
  if (!overlay) return null;
  const cancelBtn = el('pair-cancel');
  if (cancelBtn) {
    // ensure only one handler
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    const newBtn = el('pair-cancel');
    newBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
  }
  return overlay;
}

// Pairwise rank using insertion: O(n log n) comparisons
async function pairwiseRank() {
  const overlay = buildPairwiseOverlay();
  overlay.style.display = 'flex';
  const leftEl = el('pair-left');
  const rightEl = el('pair-right');
  const counterEl = el('pair-counter');

  // We'll build ranked = [] by inserting songs one at a time using binary search with comparisons
  const pool = songs.slice();
  const ranked = [];
  let comparisons = 0;
  const progressWrapEl = el('pair-progress-wrap');
  const progressBarEl = el('pair-progress');
  const totalSongs = songs.length;

  // initial random head-to-head to get ranking started if nothing is ranked yet
  if (ranked.length === 0 && pool.length >= 2) {
    const i1 = Math.floor(Math.random() * pool.length);
    let i2 = Math.floor(Math.random() * (pool.length - 1));
    if (i2 >= i1) i2 += 1;
    const a = pool[i1];
    const b = pool[i2];
    const firstChoice = await askCompare(a, b);
    if (firstChoice === null) {
      // paused during initial comparison
      pairwiseStateSave({ poolIndex: 0, ranked, pool });
      overlay.style.display = 'none';
      alert('Pairwise ranking paused and saved. You can resume later.');
      return;
    }
    const winner = firstChoice ? a : b;
    const loser = firstChoice ? b : a;
    ranked.push(winner);
    // remove both from pool
    const winnerTitle = winner.title, loserTitle = loser.title;
    for (let k = pool.length - 1; k >= 0; k--) {
      if (pool[k].title === winnerTitle || pool[k].title === loserTitle) pool.splice(k, 1);
    }
    pairwiseStateSave({ poolIndex: 0, ranked, pool });
    // update progress bar
    if (progressBarEl) {
      const pct = Math.round((ranked.length / totalSongs) * 100);
      progressBarEl.style.width = pct + '%';
      progressBarEl.setAttribute('aria-valuenow', pct);
    }
  }

  function renderTile(elm, song) {
    try {
      if (!elm) { logDebug('renderTile: missing element'); return document.createElement('button'); }
      elm.innerHTML = '';
      // create a focusable button inside the tile so clicking the title explicitly selects
      const btn = document.createElement('button');
      btn.className = 'pair-title-btn';
      btn.type = 'button';
      btn.textContent = (song && song.title) ? song.title : '(missing title)';
      // ensure it fills the tile area visually
      elm.appendChild(btn);
      return btn;
    } catch (err) {
      console.error('renderTile error', err);
      logDebug('renderTile error: ' + (err && err.message));
      // fallback
      const fb = document.createElement('button'); fb.className = 'pair-title-btn'; fb.type = 'button'; fb.textContent = '(error)'; return fb;
    }
  }

  function flashChoice(elm) {
    elm.classList.add('choice-flash');
    setTimeout(() => elm.classList.remove('choice-flash'), 220);
  }

  function renderRankedPreview(arr) {
    try {
      if (!rankedListEl) return;
      rankedListEl.innerHTML = '';
      arr.forEach((s, i) => {
        const li = document.createElement('li'); 
        li.textContent = `${s.title} — ${s.album}`;
        rankedListEl.appendChild(li);
      });
    } catch (e) { console.warn('Failed to render ranked preview', e); }
  }

  // Using global pairwise state functions

  function askCompare(a, b) {
    logDebug(`askCompare: ${a && a.title} vs ${b && b.title}`);
    return new Promise((resolve) => {
      const leftBtn = renderTile(leftEl, a);
      const rightBtn = renderTile(rightEl, b);
      const onLeft = () => { cleanup(); flashChoice(leftEl); resolve(true); };
      const onRight = () => { cleanup(); flashChoice(rightEl); resolve(false); };
      const onKey = (ev) => {
        if (ev.key === '1') return onLeft();
        if (ev.key === '2') return onRight();
        if (ev.key === 'Enter') {
          // confirm focused tile if any
          const active = document.activeElement;
          if (active === leftEl || active === rightEl) return active === leftEl ? onLeft() : onRight();
        }
        if (ev.key === 'Escape') { cleanup(); return resolve(null); }
      };
      function cleanup() { try { leftBtn.removeEventListener('click', onLeft); rightBtn.removeEventListener('click', onRight); leftBtn.onclick = null; rightBtn.onclick = null; } catch(e){} document.removeEventListener('keydown', onKey); }
      // attach both addEventListener and onclick fallback to the title buttons
      try { leftBtn.addEventListener('click', onLeft); rightBtn.addEventListener('click', onRight); leftBtn.onclick = onLeft; rightBtn.onclick = onRight; } catch(e){}
      document.addEventListener('keydown', onKey);
      comparisons++;
      counterEl.textContent = `Comparisons: ${comparisons} (press 1/2 or click)`;
    });
  }

  for (let i = 0; i < pool.length; i++) {
    const item = pool[i];
    // binary search insert position in ranked
    let lo = 0, hi = ranked.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      // persist current comparison state so we can resume even if the browser closes
      try { pairwiseStateSave({ poolIndex: i, ranked, pool, lo, hi, comparisons }); } catch (e) {}
      const preferLeft = await askCompare(item, ranked[mid]);
      if (preferLeft === null) {
        // user pressed Escape to cancel the whole run — save progress and exit
        pairwiseStateSave({ poolIndex: i, ranked, pool });
        overlay.style.display = 'none';
        alert('Pairwise ranking paused and saved. You can resume later.');
        return;
      }
      if (preferLeft) { hi = mid; } else { lo = mid + 1; }
    }
    ranked.splice(lo, 0, item);
    // save both pairwise state and current ranking after each insertion
    pairwiseStateSave({ poolIndex: i + 1, ranked, pool });
    songs = ranked.slice(); // update main songs array
    save(); // auto-save progress
    // update progress bar (completed = ranked.length)
    if (progressBarEl) {
      const pct = Math.round((ranked.length / totalSongs) * 100);
      progressBarEl.style.width = pct + '%';
      progressBarEl.setAttribute('aria-valuenow', pct);
    }
    // update preview
    renderRankedPreview(ranked);
  }

  // finished
  overlay.style.display = 'none';
  songs = ranked; render(); save();
  pairwiseStateClear();
  alert(`Pairwise ranking complete — ${comparisons} comparisons. Results saved.`);
}

// resume pairwise if state available
async function resumePairwiseIfNeeded() {
  const s = pairwiseStateLoad();
  if (!s) return false;
  if (!confirm('A paused pairwise run was found. Resume?')) { pairwiseStateClear(); return false; }
  // rebuild pool and ranked from saved state
  const overlay = buildPairwiseOverlay(); overlay.style.display = 'flex';
  const leftEl = el('pair-left'); const rightEl = el('pair-right'); const counterEl = el('pair-counter');
  let { poolIndex, ranked, pool } = s;
  let comparisons = 0;
  const progressBarElLocal = el('pair-progress');
  function renderTile(elm, song) {
    // original compact renderer used elsewhere; keep simple here
    if (!elm) return null;
    elm.innerHTML = '';
    const t = document.createElement('div');
    t.className = 'song-title';
    t.textContent = (song && song.title) ? song.title : '(missing)';
    elm.appendChild(t);
    return t;
  }

  function renderTileLocal(elm, song) {
    try {
      if (!elm) { logDebug('renderTileLocal: missing elm'); return document.createElement('div'); }
      elm.innerHTML = '';
      const t = document.createElement('div');
      t.className = 'song-title';
      t.textContent = (song && song.title) ? song.title : '(missing)';
      elm.appendChild(t);
      return t;
    } catch (e) {
      logDebug('renderTileLocal error: ' + (e && e.message));
      const fb = document.createElement('div'); fb.className = 'song-title'; fb.textContent = '(error)';
      return fb;
    }
  }

  function askCompareLocal(a, b) {
    logDebug(`askCompareLocal: ${a && a.title} vs ${b && b.title}`);
    return new Promise((resolve) => {
      const leftBtn = renderTileLocal(leftEl, a);
      const rightBtn = renderTileLocal(rightEl, b);
      const onLeft = () => { cleanup(); resolve(true); };
      const onRight = () => { cleanup(); resolve(false); };
      const onKey = (ev) => {
        if (ev.key === '1') return onLeft();
        if (ev.key === '2') return onRight();
        if (ev.key === 'Enter') {
          const active = document.activeElement;
          if (active === leftEl || active === rightEl) return active === leftEl ? onLeft() : onRight();
        }
        if (ev.key === 'Escape') { cleanup(); return resolve(null); }
      };
      function cleanup() { try { leftBtn.removeEventListener && leftBtn.removeEventListener('click', onLeft); rightBtn.removeEventListener && rightBtn.removeEventListener('click', onRight); leftBtn.onclick = null; rightBtn.onclick = null; } catch(e){} document.removeEventListener('keydown', onKey); }
      try { if (leftBtn.addEventListener) leftBtn.addEventListener('click', onLeft); if (rightBtn.addEventListener) rightBtn.addEventListener('click', onRight); leftBtn.onclick = onLeft; rightBtn.onclick = onRight; } catch (e) {}
      document.addEventListener('keydown', onKey);
      comparisons++; counterEl.textContent = `Comparisons: ${comparisons} (press 1/2 or click)`;
    });
  }
  for (let i = poolIndex || 0; i < pool.length; i++) {
    const item = pool[i];
    // if saved state includes lo/hi for this item, use them to resume in-progress binary search
    let lo = (s && typeof s.lo === 'number' && s.poolIndex === i) ? s.lo : 0;
    let hi = (s && typeof s.hi === 'number' && s.poolIndex === i) ? s.hi : ranked.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      try { pairwiseStateSave({ poolIndex: i, ranked, pool, lo, hi, comparisons }); } catch (e) {}
      const preferLeft = await askCompareLocal(item, ranked[mid]);
      if (preferLeft === null) { pairwiseStateSave({ poolIndex: i, ranked, pool }); overlay.style.display = 'none'; alert('Pairwise ranking paused and saved.'); return true; }
      if (preferLeft) { hi = mid; } else { lo = mid + 1; }
    }
    ranked.splice(lo, 0, item);
    pairwiseStateSave({ poolIndex: i + 1, ranked, pool });
    songs = ranked.slice(); // update main songs array during resume
    save(); // auto-save progress during resume
    if (progressBarElLocal) {
      const pct = Math.round(((i + 1) / pool.length) * 100);
      progressBarElLocal.style.width = pct + '%';
      progressBarElLocal.setAttribute('aria-valuenow', pct);
    }
    renderRankedPreview(ranked);
  }
  overlay.style.display = 'none'; songs = ranked; render(); save(); pairwiseStateClear(); alert('Resumed pairwise ranking complete.');
  return true;
}

function exportText() {
  const txt = songs.map((s, i) => `${i + 1}. ${s.title} — ${s.album}${s.releaseYear ? ' (' + s.releaseYear + ')' : ''}`).join('\n');
  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ranked-songs.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'ranked-songs.json'; a.click(); URL.revokeObjectURL(url);
}

function exportCsv() {
  const rows = songs.map((s, i) => [i + 1, s.title, s.album || '', s.releaseYear || '']);
  const csv = ['Rank,Title,Album,Year', ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'ranked-songs.csv'; a.click(); URL.revokeObjectURL(url);
}

function shareURL() {
  try {
    const payload = encodeURIComponent(JSON.stringify(songs));
    const url = `${location.origin}${location.pathname}?data=${payload}`;
    navigator.clipboard.writeText(url).then(() => {
      shareBtn.textContent = 'Link copied ✓';
      setTimeout(() => (shareBtn.textContent = 'Share'), 1000);
    });
  } catch (err) { alert('Failed to copy share link'); }
}

function importFile(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data)) { songs = data; render(); save(); }
      else alert('Invalid file format');
    } catch (err) { alert('Failed to parse file'); }
  };
  reader.readAsText(file);
}

// wire UI with guards so missing elements don't break the whole script
if (loadDefaultBtn) loadDefaultBtn.addEventListener('click', loadDefault);
if (saveBtn) saveBtn.addEventListener('click', save);
if (shareBtn) shareBtn.addEventListener('click', shareURL);
if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJson);
if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCsv);
if (importInput) importInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importFile(f); });
if (pairwiseBtn) pairwiseBtn.addEventListener('click', async () => { try { const resumed = await resumePairwiseIfNeeded(); if (!resumed) await pairwiseRank(); } catch (err) { console.error('Pairwise start failed', err); logDebug('Pairwise start failed: ' + (err && err.message)); alert('Pairwise failed to start: ' + (err && err.message)); } });

// helper: wait for pairwise overlay elements to exist before auto-starting
function waitForPairwiseElements(timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      const left = el('pair-left'); const right = el('pair-right');
      if (left && right) return resolve(true);
      if (Date.now() - start > timeout) return reject(new Error('pairwise elements not found'));
      setTimeout(check, 80);
    })();
  });
}

// load existing or default / support ?data=encoded query
(function init() {
  const params = new URLSearchParams(location.search);
  const dataParam = params.get('data');
  if (dataParam) {
    try { songs = JSON.parse(decodeURIComponent(dataParam)); render(); save(); return; } catch (err) { console.warn('Invalid shared data, loading stored/default'); }
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { songs = JSON.parse(stored); render(); return; } catch (err) { console.warn('Invalid stored data, loading default'); }
  }
  // load default and then auto-start pairwise unless there's a paused run
  loadDefault().then(() => {
    const saved = pairwiseStateLoad();
    if (saved) {
      logDebug('Found saved pairwise state; not auto-starting');
      // don't auto-start if there's a saved run: let user resume
      return;
    }
    // start pairwise automatically with two random songs to begin, but ensure DOM elements are present
    waitForPairwiseElements(2500).then(() => {
      setTimeout(async () => {
        try { logDebug('Auto-starting pairwiseRank'); await pairwiseRank(); } catch (err) { console.error('Auto pairwise failed', err); logDebug('Auto pairwise failed: ' + (err && err.message)); alert('Auto pairwise failed: ' + (err && err.message)); }
      }, 120);
    }).catch((err) => { console.warn('Pairwise DOM not ready for auto-start', err); logDebug('Pairwise DOM not ready: ' + (err && err.message)); });
  }).catch((err) => { console.error('Failed to load defaults during init', err); logDebug('Init failed to load defaults: ' + (err && err.message)); });
})();