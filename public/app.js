const STORAGE_KEY = 'ts-song-ranker:v1';

const el = (id) => document.getElementById(id);
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

function render() {
  songList.innerHTML = '';
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'song-item';
    li.setAttribute('draggable', 'true');
    li.dataset.index = i;
  li.tabIndex = 0; // make focusable for keyboard interactions

    const info = document.createElement('div');
    info.className = 'song-info';
    // Show only the song title (no artist) per user request
    const title = document.createElement('div');
    title.className = 'song-title';
    title.textContent = s.title;
    title.title = 'Double-click to edit';
    title.addEventListener('dblclick', () => startEdit(title, s));

    info.appendChild(title);
    li.appendChild(info);

    // make the whole tile clickable: toggle selected state
    li.style.cursor = 'pointer';
    li.addEventListener('click', (ev) => {
      // prevent interfering with drag operations
      if (ev.target.getAttribute && ev.target.getAttribute('draggable') === 'true') return;
      // toggle selected flag on the song object and persist
      s.selected = !s.selected;
      if (s.selected) li.classList.add('selected'); else li.classList.remove('selected');
      save();
      // small hook for other features
      const event = new CustomEvent('song-selected', { detail: { index: i, song: s, selected: s.selected } });
      document.dispatchEvent(event);
    });

    // keyboard: move focused item up/down
    li.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowUp') { move(i, i - 1); ev.preventDefault(); }
      if (ev.key === 'ArrowDown') { move(i, i + 1); ev.preventDefault(); }
    });

    // drag events
    li.addEventListener('dragstart', (e) => {
      dragSrcIndex = i;
      e.dataTransfer.effectAllowed = 'move';
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => { li.classList.remove('dragging'); });

    li.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragSrcIndex === null) return;
      const tgt = parseInt(li.dataset.index, 10);
      const [item] = songs.splice(dragSrcIndex, 1);
      songs.splice(tgt, 0, item);
      dragSrcIndex = null;
      render();
      save();
    });

  // restore selected visual state
  if (s.selected) li.classList.add('selected'); else li.classList.remove('selected');

  songList.appendChild(li);
  });
}

function startEdit(titleEl, song) {
  const input = document.createElement('input');
  input.value = song.title;
  input.className = 'editable';
  input.addEventListener('blur', () => { song.title = input.value || song.title; render(); save(); });
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

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    // subtle UI feedback
    saveBtn.textContent = 'Saved ✓';
    setTimeout(() => (saveBtn.textContent = 'Save'), 900);
  } catch (err) { console.warn('Failed to save', err); }
}

function loadDefault() {
  fetch('songs.json')
    .then(res => res.json())
    .then(data => { songs = data; render(); save(); })
    .catch(err => console.error('Failed to load default songs', err));
}

// Pairwise ranking overlay setup
function buildPairwiseOverlay() {
  let overlay = document.querySelector('[data-pairwise="overlay"]');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.setAttribute('data-pairwise', 'overlay');
  const panel = document.createElement('div');
  panel.className = 'pairwise-panel';

  const left = document.createElement('div'); left.className = 'pair-tile'; left.id = 'pair-left';
  const right = document.createElement('div'); right.className = 'pair-tile'; right.id = 'pair-right';
  const controls = document.createElement('div'); controls.className = 'pair-controls';
  const counter = document.createElement('div'); counter.className = 'pair-counter'; counter.id = 'pair-counter';
  const hint = document.createElement('div'); hint.className = 'pair-hint'; hint.id = 'pair-hint';
  hint.textContent = 'Press 1 for left, 2 for right, Esc to cancel';
  const progressWrap = document.createElement('div'); progressWrap.className = 'pair-progress-wrap'; progressWrap.id = 'pair-progress-wrap';
  const progressBar = document.createElement('div'); progressBar.className = 'pair-progress'; progressBar.id = 'pair-progress';
  progressWrap.appendChild(progressBar);
  const closeBtn = document.createElement('button'); closeBtn.className = 'pair-action'; closeBtn.textContent = 'Cancel';
  closeBtn.addEventListener('click', () => overlay.style.display = 'none');
  controls.appendChild(counter); controls.appendChild(progressWrap); controls.appendChild(hint); controls.appendChild(closeBtn);

  panel.appendChild(left); panel.appendChild(controls); panel.appendChild(right);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
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

  function renderTile(elm, song) {
    elm.innerHTML = '';
    const t = document.createElement('div'); t.className = 'song-title'; t.textContent = song.title;
    elm.appendChild(t);
  }

  function flashChoice(elm) {
    elm.classList.add('choice-flash');
    setTimeout(() => elm.classList.remove('choice-flash'), 220);
  }

  function savePairwiseState(state) {
    try { localStorage.setItem(PAIRWISE_KEY, JSON.stringify(state)); } catch (e) { console.warn('Failed to save pairwise state', e); }
  }

  function loadPairwiseState() {
    try { const s = localStorage.getItem(PAIRWISE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  function clearPairwiseState() { try { localStorage.removeItem(PAIRWISE_KEY); } catch (e) {} }

  function askCompare(a, b) {
    return new Promise((resolve) => {
      renderTile(leftEl, a);
      renderTile(rightEl, b);
      const onLeft = () => { cleanup(); resolve(true); };
      const onRight = () => { cleanup(); resolve(false); };
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
      function cleanup() { leftEl.removeEventListener('click', onLeft); rightEl.removeEventListener('click', onRight); document.removeEventListener('keydown', onKey); }
      leftEl.addEventListener('click', onLeft);
      rightEl.addEventListener('click', onRight);
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
      try { savePairwiseState({ poolIndex: i, ranked, pool, lo, hi, comparisons }); } catch (e) {}
      const preferLeft = await askCompare(item, ranked[mid]);
      if (preferLeft === null) {
        // user pressed Escape to cancel the whole run — save progress and exit
        savePairwiseState({ poolIndex: i, ranked, pool });
        overlay.style.display = 'none';
        alert('Pairwise ranking paused and saved. You can resume later.');
        return;
      }
      if (preferLeft) { hi = mid; } else { lo = mid + 1; }
    }
    ranked.splice(lo, 0, item);
    // save progress after each insertion so we can resume
    savePairwiseState({ poolIndex: i + 1, ranked, pool });
    // update progress bar
    if (progressBarEl) {
      const pct = Math.round(((i + 1) / pool.length) * 100);
      progressBarEl.style.width = pct + '%';
      progressBarEl.setAttribute('aria-valuenow', pct);
    }
  }

  // finished
  overlay.style.display = 'none';
  songs = ranked; render(); save();
  clearPairwiseState();
  alert(`Pairwise ranking complete — ${comparisons} comparisons. Results saved.`);
}

// resume pairwise if state available
async function resumePairwiseIfNeeded() {
  const s = loadPairwiseState();
  if (!s) return false;
  if (!confirm('A paused pairwise run was found. Resume?')) { clearPairwiseState(); return false; }
  // rebuild pool and ranked from saved state
  const overlay = buildPairwiseOverlay(); overlay.style.display = 'flex';
  const leftEl = el('pair-left'); const rightEl = el('pair-right'); const counterEl = el('pair-counter');
  let { poolIndex, ranked, pool } = s;
  let comparisons = 0;
  const progressBarElLocal = el('pair-progress');
  function renderTile(elm, song) { elm.innerHTML = ''; const t = document.createElement('div'); t.className = 'song-title'; t.textContent = song.title; elm.appendChild(t); }
  function askCompareLocal(a, b) { return new Promise((resolve) => {
    renderTile(leftEl, a); renderTile(rightEl, b);
    const onLeft = () => { cleanup(); resolve(true); };
    const onRight = () => { cleanup(); resolve(false); };
    const onKey = (ev) => { if (ev.key === '1') return onLeft(); if (ev.key === '2') return onRight(); if (ev.key === 'Enter') { const active = document.activeElement; if (active === leftEl || active === rightEl) return active === leftEl ? onLeft() : onRight(); } if (ev.key === 'Escape') { cleanup(); return resolve(null); } };
    function cleanup() { leftEl.removeEventListener('click', onLeft); rightEl.removeEventListener('click', onRight); document.removeEventListener('keydown', onKey); }
    leftEl.addEventListener('click', onLeft); rightEl.addEventListener('click', onRight); document.addEventListener('keydown', onKey);
    comparisons++; counterEl.textContent = `Comparisons: ${comparisons} (press 1/2 or click)`;
  }); }
  for (let i = poolIndex || 0; i < pool.length; i++) {
    const item = pool[i];
    // if saved state includes lo/hi for this item, use them to resume in-progress binary search
    let lo = (s && typeof s.lo === 'number' && s.poolIndex === i) ? s.lo : 0;
    let hi = (s && typeof s.hi === 'number' && s.poolIndex === i) ? s.hi : ranked.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      try { savePairwiseState({ poolIndex: i, ranked, pool, lo, hi, comparisons }); } catch (e) {}
      const preferLeft = await askCompareLocal(item, ranked[mid]);
      if (preferLeft === null) { savePairwiseState({ poolIndex: i, ranked, pool }); overlay.style.display = 'none'; alert('Pairwise ranking paused and saved.'); return true; }
      if (preferLeft) { hi = mid; } else { lo = mid + 1; }
    }
    ranked.splice(lo, 0, item);
    savePairwiseState({ poolIndex: i + 1, ranked, pool });
    if (progressBarElLocal) {
      const pct = Math.round(((i + 1) / pool.length) * 100);
      progressBarElLocal.style.width = pct + '%';
      progressBarElLocal.setAttribute('aria-valuenow', pct);
    }
  }
  overlay.style.display = 'none'; songs = ranked; render(); save(); clearPairwiseState(); alert('Resumed pairwise ranking complete.');
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

// wire UI
loadDefaultBtn.addEventListener('click', loadDefault);
saveBtn.addEventListener('click', save);
shareBtn.addEventListener('click', shareURL);
if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJson);
if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCsv);
importInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importFile(f); });
pairwiseBtn.addEventListener('click', async () => { const resumed = await resumePairwiseIfNeeded(); if (!resumed) pairwiseRank(); });

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
  loadDefault();
})();