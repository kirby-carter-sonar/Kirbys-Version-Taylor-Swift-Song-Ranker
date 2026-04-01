const STORAGE_KEY = 'ts-song-ranker:v1';

const el = (id) => document.getElementById(id);

/** Fisher–Yates shuffle — random order for pairwise pool (not album order). */
function shuffleArray(arr) {
  const a = arr;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setBattleUIActive(active) {
  const idle = el('pairwise-idle');
  const cards = el('pairwise-cards');
  const ctrls = el('pair-controls');
  if (active) {
    idle?.classList.add('pairwise-idle--hidden');
    cards?.classList.remove('pairwise-cards--hidden');
    ctrls?.classList.remove('pair-controls--hidden');
  } else {
    idle?.classList.remove('pairwise-idle--hidden');
    cards?.classList.add('pairwise-cards--hidden');
    ctrls?.classList.add('pair-controls--hidden');
  }
}

function selectTab(which) {
  const battlePanel = el('panel-battle');
  const favPanel = el('panel-favorites');
  const battleBtn = el('tab-battle-btn');
  const favBtn = el('tab-favorites-btn');
  if (!battlePanel || !favPanel || !battleBtn || !favBtn) return;
  const showBattle = which === 'battle';
  battlePanel.hidden = !showBattle;
  favPanel.hidden = showBattle;
  battlePanel.classList.toggle('tab-panel--active', showBattle);
  favPanel.classList.toggle('tab-panel--active', !showBattle);
  battleBtn.setAttribute('aria-selected', showBattle ? 'true' : 'false');
  favBtn.setAttribute('aria-selected', showBattle ? 'false' : 'true');
}

/** iTunes Search API — album artwork, cached per artist+album (CORS allowed for browsers). */
const albumArtCache = new Map();

function normalizeAlbumLabel(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s*\([^)]*deluxe[^)]*\)/gi, '')
    .trim();
}

async function fetchAlbumArtUrl(song) {
  const album = (song && song.album) || '';
  const artist = (song && song.artist) || 'Taylor Swift';
  const key = `${artist}\0${album}`;
  if (albumArtCache.has(key)) return albumArtCache.get(key);
  if (!album.trim()) {
    albumArtCache.set(key, null);
    return null;
  }
  try {
    const term = encodeURIComponent(`${album} ${artist}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${term}&entity=album&limit=8`
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const results = data.results || [];
    const want = normalizeAlbumLabel(album);
    let best = null;
    for (const r of results) {
      const name = normalizeAlbumLabel(r.collectionName || '');
      if (name === want || name.startsWith(want + ' ') || name.startsWith(want + '(')) {
        best = r;
        break;
      }
    }
    if (!best) {
      for (const r of results) {
        const name = normalizeAlbumLabel(r.collectionName || '');
        if (name.includes(want) || want.includes(name)) {
          best = r;
          break;
        }
      }
    }
    if (!best && results[0]) best = results[0];
    const url =
      best && best.artworkUrl100
        ? best.artworkUrl100.replace('100x100bb', '600x600bb')
        : null;
    albumArtCache.set(key, url);
    return url;
  } catch (e) {
    albumArtCache.set(key, null);
    return null;
  }
}


function renderBattleTile(tileEl, song, imageUrl) {
  if (!tileEl) return null;
  tileEl.innerHTML = '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pair-battle-card';
  const wrap = document.createElement('div');
  wrap.className = 'pair-cover-wrap';
  if (imageUrl) {
    const img = document.createElement('img');
    img.className = 'pair-cover-img';
    img.alt = '';
    img.src = imageUrl;
    img.loading = 'eager';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      img.remove();
      if (!wrap.querySelector('.pair-cover-fallback')) {
        const ph = document.createElement('div');
        ph.className = 'pair-cover-fallback';
        ph.setAttribute('aria-hidden', 'true');
        wrap.appendChild(ph);
      }
    };
    wrap.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'pair-cover-fallback';
    ph.setAttribute('aria-hidden', 'true');
    wrap.appendChild(ph);
  }
  const meta = document.createElement('div');
  meta.className = 'pair-meta';
  const h3 = document.createElement('h3');
  h3.className = 'pair-song-title';
  h3.textContent = song && song.title ? song.title : '(unknown title)';
  const p = document.createElement('p');
  p.className = 'pair-song-album';
  p.textContent = song && song.album ? song.album : '—';
  meta.appendChild(h3);
  meta.appendChild(p);
  const heart = document.createElement('span');
  heart.className = 'pair-fav-hint';
  heart.setAttribute('aria-hidden', 'true');
  heart.innerHTML = '<span class="material-symbols-outlined">favorite</span>';
  btn.appendChild(wrap);
  btn.appendChild(meta);
  btn.appendChild(heart);
  tileEl.appendChild(btn);
  return btn;
}
// songList removed in inline pairwise mode; keep function safe
const songList = el('song-list');
const loadDefaultBtn = el('load-default');
const saveBtn = el('save');
const shareBtn = el('share');
const exportJsonBtn = el('export-json');
const exportCsvBtn = el('export-csv');
const exportPdfBtn = el('export-pdf');
const shareTextBtn = el('share-text');
const shareNativeBtn = el('share-native');
const startBattleBtn = el('start-battle');

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

// ─── Persistent Elo/Swiss state ───
const ELO_KEY = STORAGE_KEY + ':elo';

function eloStateSave(state) {
  try { localStorage.setItem(PAIRWISE_KEY, JSON.stringify(state)); } catch (_) {}
}
function eloStateLoad() {
  try { const s = localStorage.getItem(PAIRWISE_KEY); return s ? JSON.parse(s) : null; } catch (_) { return null; }
}
function eloStateClear() { try { localStorage.removeItem(PAIRWISE_KEY); } catch (_) {} }

function eloRatingsSave(ratings) {
  try { localStorage.setItem(ELO_KEY, JSON.stringify(ratings)); } catch (_) {}
}
function eloRatingsLoad() {
  try { const s = localStorage.getItem(ELO_KEY); return s ? JSON.parse(s) : null; } catch (_) { return null; }
}
function eloRatingsClear() { try { localStorage.removeItem(ELO_KEY); } catch (_) {} }

function setupPairwiseRoot() {
  const root = document.querySelector('[data-pairwise="root"]');
  if (!root) return null;
  const cancelBtn = el('pair-cancel');
  if (cancelBtn) {
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    const newBtn = el('pair-cancel');
    newBtn.addEventListener('click', () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })
      );
    });
  }
  return root;
}

/**
 * Elo/Swiss hybrid ranking engine.
 *
 * How it works:
 *   1. Every song starts at Elo 1500.
 *   2. Each round, songs are sorted by current Elo and paired with their
 *      nearest neighbor (Swiss pairing) — so you compare songs of similar
 *      quality, which is the most informative matchup.
 *   3. After a win/loss, both songs' Elo ratings are updated.
 *   4. K-factor starts high (48) and decays each round so early rounds
 *      cause big swings while later rounds fine-tune.
 *   5. After all rounds, songs are sorted by Elo → that's your ranking.
 *
 * ~10 rounds × ~130 matchups/round = ~1,300 picks total (~35 min).
 * The ranking is "good enough" after round 4–5 (~15–20 min) and the
 * remaining rounds refine the order.
 * You can pause anytime (Esc) and resume exactly where you left off.
 */

const TOTAL_ROUNDS = 10;
const BASE_K = 48;

function eloExpected(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function eloUpdate(rA, rB, aWon, K) {
  const eA = eloExpected(rA, rB);
  const eB = 1 - eA;
  const sA = aWon ? 1 : 0;
  const sB = aWon ? 0 : 1;
  return [rA + K * (sA - eA), rB + K * (sB - eB)];
}

function buildSwissPairings(entries) {
  const sorted = entries.slice().sort((a, b) => b.elo - a.elo);
  const pairs = [];
  const used = new Set();
  for (let i = 0; i < sorted.length - 1; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      pairs.push([sorted[i], sorted[j]]);
      used.add(i);
      used.add(j);
      break;
    }
  }
  // add slight shuffle within pairs so the visually "better" song isn't always on the left
  return pairs.map(([a, b]) => Math.random() < 0.5 ? [a, b] : [b, a]);
}

function sortedByElo(entries) {
  return entries.slice().sort((a, b) => b.elo - a.elo);
}

function updateEloChrome(round, totalRounds, matchIdx, matchTotal, totalComparisons) {
  const overallPct = Math.round(((round * matchTotal + matchIdx) / (totalRounds * matchTotal)) * 100);
  const bar = el('pair-progress');
  if (bar) {
    bar.style.width = Math.min(overallPct, 100) + '%';
    const wrap = el('pair-progress-wrap');
    if (wrap) wrap.setAttribute('aria-valuenow', String(overallPct));
  }
  const lbl = el('pair-progress-label');
  if (lbl) lbl.textContent = `${overallPct}%`;
  const pill = el('pair-ranked-text');
  if (pill) pill.textContent = `${totalComparisons} matchups completed`;
}

async function eloSwissRank() {
  if (songs.length < 2) {
    alert('Load some songs first — go to Favorites → Reset list.');
    return;
  }
  const root = setupPairwiseRoot();
  if (!root) return;

  selectTab('battle');
  setBattleUIActive(true);

  const leftEl = el('pair-left');
  const rightEl = el('pair-right');

  // Restore or initialise Elo entries — each entry is { title, album, artist, elo, matches }
  let state = eloStateLoad();
  let entries, currentRound, currentMatchIdx, totalComparisons;

  if (state && Array.isArray(state.entries) && typeof state.round === 'number') {
    entries          = state.entries;
    currentRound     = state.round;
    currentMatchIdx  = state.matchIdx || 0;
    totalComparisons = state.totalComparisons || 0;
    logDebug(`Resuming Elo: ${totalComparisons} matchups done, picking up at match ${currentMatchIdx + 1}`);

    // Rebuild era wins from saved eraWins snapshot
    if (typeof resetEraWins === 'function') resetEraWins();
    if (state.eraWins && typeof eraWins !== 'undefined') {
      Object.entries(state.eraWins).forEach(([k, v]) => { eraWins[k] = v; });
    }
    if (typeof lastShownLevel !== 'undefined') lastShownLevel = getCurrentLevel(totalComparisons).level;
  } else {
    // build entries from songs; merge with any previously saved Elo ratings
    const savedRatings = eloRatingsLoad();
    const ratingMap = {};
    if (savedRatings) savedRatings.forEach(r => { ratingMap[r.title] = r; });

    entries = songs.map(s => ({
      title:   s.title,
      album:   s.album,
      artist:  s.artist || 'Taylor Swift',
      elo:     (ratingMap[s.title] && ratingMap[s.title].elo) || 1500,
      matches: (ratingMap[s.title] && ratingMap[s.title].matches) || 0,
    }));
    currentRound     = 0;
    currentMatchIdx  = 0;
    totalComparisons = 0;
  }

  const matchesPerRound = Math.floor(entries.length / 2);

  // ── comparison UI ──
  function flashChoice(tileEl) {
    tileEl.classList.add('choice-flash');
    setTimeout(() => tileEl.classList.remove('choice-flash'), 360);
  }

  function askCompare(a, b) {
    return new Promise((resolve) => {
      (async () => {
        let leftBtn, rightBtn;
        try {
          const [leftArt, rightArt] = await Promise.all([fetchAlbumArtUrl(a), fetchAlbumArtUrl(b)]);
          leftBtn  = renderBattleTile(leftEl, a, leftArt);
          rightBtn = renderBattleTile(rightEl, b, rightArt);
        } catch (_) {
          leftBtn  = renderBattleTile(leftEl, a, null);
          rightBtn = renderBattleTile(rightEl, b, null);
        }

        const onLeft  = () => { cleanup(); flashChoice(leftEl);  resolve(true);  };
        const onRight = () => { cleanup(); flashChoice(rightEl); resolve(false); };
        const onKey   = (ev) => {
          if (ev.key === '1') return onLeft();
          if (ev.key === '2') return onRight();
          if (ev.key === 'Enter') {
            if (leftEl.contains(document.activeElement))  return onLeft();
            if (rightEl.contains(document.activeElement)) return onRight();
          }
          if (ev.key === 'Escape') { cleanup(); resolve(null); }
        };
        function cleanup() {
          try { leftBtn.removeEventListener('click', onLeft); rightBtn.removeEventListener('click', onRight); } catch (_) {}
          document.removeEventListener('keydown', onKey);
        }
        leftBtn.addEventListener('click', onLeft);
        rightBtn.addEventListener('click', onRight);
        document.addEventListener('keydown', onKey);
      })().catch(() => resolve(null));
    });
  }

  function applyEloToSongs() {
    const ranked = sortedByElo(entries);
    songs = ranked.map(e => ({
      title:  e.title,
      album:  e.album,
      artist: e.artist,
    }));
    render();
    save();
    eloRatingsSave(entries);
  }

  function syncRankedPreview() {
    if (!rankedListEl) return;
    rankedListEl.innerHTML = '';
    sortedByElo(entries).forEach((e) => {
      const li = document.createElement('li');
      li.textContent = `${e.title} — ${e.album}`;
      rankedListEl.appendChild(li);
    });
  }

  // ── main loop: Swiss rounds ──
  // When resuming mid-round, we saved the pairing order (as title pairs) so we
  // replay exactly the same matchups rather than regenerating with new randomness.
  let savedPairTitles = (state && state.pairTitles) || null;

  for (let r = currentRound; r < TOTAL_ROUNDS; r++) {
    const K = BASE_K * Math.pow(0.88, r);

    let pairs;
    if (savedPairTitles && r === currentRound) {
      // rebuild pair references from saved titles
      const titleMap = {};
      entries.forEach(e => { titleMap[e.title] = e; });
      pairs = savedPairTitles
        .map(([tA, tB]) => [titleMap[tA], titleMap[tB]])
        .filter(([a, b]) => a && b);
      savedPairTitles = null;
    } else {
      pairs = buildSwissPairings(entries);
    }

    // serialisable snapshot of pairing order for resume
    const pairTitles = pairs.map(([a, b]) => [a.title, b.title]);

    const startIdx = (r === currentRound) ? currentMatchIdx : 0;

    for (let m = startIdx; m < pairs.length; m++) {
      const [a, b] = pairs[m];

      const eraWinsSnapshot = typeof eraWins !== 'undefined' ? { ...eraWins } : {};
      eloStateSave({ entries, round: r, matchIdx: m, totalComparisons, pairTitles, eraWins: eraWinsSnapshot });
      updateEloChrome(r, TOTAL_ROUNDS, m, matchesPerRound, totalComparisons);

      const preferLeft = await askCompare(a, b);

      if (preferLeft === null) {
        eloStateSave({ entries, round: r, matchIdx: m, totalComparisons, pairTitles, eraWins: eraWinsSnapshot });
        applyEloToSongs();
        setBattleUIActive(false);
        logDebug(`Paused at matchup ${totalComparisons}`);
        return;
      }

      const aWon = preferLeft;
      const winner = aWon ? a : b;
      const winnerTileEl = aWon ? leftEl : rightEl;
      const [newA, newB] = eloUpdate(a.elo, b.elo, aWon, K);
      a.elo = newA;
      b.elo = newB;
      a.matches += 1;
      b.matches += 1;
      totalComparisons += 1;

      // Era & Identity hooks
      if (typeof recordWin === 'function') recordWin(winner);
      if (typeof setProgressEraGlow === 'function') setProgressEraGlow(winner);
      if (typeof spawnBattleParticles === 'function') spawnBattleParticles(winnerTileEl, winner);
      const streak = typeof recordStreakPick === 'function' ? recordStreakPick(winner) : null;
      if (streak && typeof showStreakAnimation === 'function') showStreakAnimation(streak.era, streak.count);
      if (typeof checkLevelUp === 'function') checkLevelUp(totalComparisons);
      if (typeof maybeShowTeaser === 'function') maybeShowTeaser(totalComparisons);
    }

    // end of round — update rankings and save
    applyEloToSongs();
    syncRankedPreview();
    logDebug(`Phase ${r + 1} complete — ${totalComparisons} total comparisons`);

    currentMatchIdx = 0;
  }

  // ── all rounds complete ──
  setBattleUIActive(false);
  applyEloToSongs();
  syncRankedPreview();
  eloStateClear();
  logDebug(`Ranking complete! ${totalComparisons} total comparisons.`);

  const primaryEra = typeof getPrimaryEra === 'function' ? getPrimaryEra() : '';
  const personality = typeof getPersonalityGroup === 'function' && typeof PERSONALITIES !== 'undefined'
    ? PERSONALITIES[getPersonalityGroup(primaryEra)] : null;

  const sub = el('pairwise-sub');
  if (sub) {
    sub.textContent = personality
      ? `You are ${personality.title} — a ${primaryEra} human.`
      : 'All done — check your Favorites tab!';
  }
  const idleText = document.querySelector('.pairwise-idle-text');
  if (idleText) {
    idleText.textContent = personality
      ? `${personality.desc} Check the Favorites tab for your Eras Identity Card!`
      : `Ranked in ${totalComparisons} matchups! Check the Favorites tab.`;
  }
  const startBtn = el('start-battle');
  if (startBtn) startBtn.textContent = 'Rank again';

  refreshEraCard();
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

function buildRankedText() {
  return songs.map((s, i) =>
    `${i + 1}. ${s.title} — ${s.album}`
  ).join('\n');
}

function shareTextToClipboard() {
  const header = '🎶 My Taylor Swift Song Ranking\n\n';
  const txt = header + buildRankedText();
  navigator.clipboard.writeText(txt).then(() => {
    if (shareTextBtn) {
      shareTextBtn.querySelector('.fav-share-label').textContent = 'Copied!';
      setTimeout(() => {
        shareTextBtn.querySelector('.fav-share-label').textContent = 'Copy text';
      }, 1500);
    }
  }).catch(() => alert('Could not copy to clipboard'));
}

function nativeShare() {
  const txt = buildRankedText();
  if (navigator.share) {
    navigator.share({
      title: 'My Taylor Swift Song Ranking',
      text: txt,
    }).catch(() => {});
  } else {
    shareTextToClipboard();
  }
}

function exportPdf() {
  const topN = songs.slice(0, 50);
  const pageW = 595;
  const pageH = 842;
  const margin = 48;
  const colW = (pageW - margin * 2) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = pageW * 2;
  canvas.height = pageH * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // background
  const grad = ctx.createLinearGradient(0, 0, 0, pageH);
  grad.addColorStop(0, '#fff4f8');
  grad.addColorStop(1, '#ffe8f3');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, pageW, pageH);

  // decorative header bar
  ctx.fillStyle = '#9323b0';
  ctx.fillRect(0, 0, pageW, 4);

  // title
  ctx.fillStyle = '#581c87';
  ctx.font = 'italic 700 22px "Noto Serif", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('My Taylor Swift Song Ranking', pageW / 2, 52);

  // subtitle
  ctx.fillStyle = 'rgba(91, 0, 81, 0.5)';
  ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Top ${topN.length} songs · ${new Date().toLocaleDateString()}`, pageW / 2, 70);

  // divider line
  ctx.strokeStyle = 'rgba(147, 35, 176, 0.15)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(margin, 82);
  ctx.lineTo(pageW - margin, 82);
  ctx.stroke();

  // songs in two columns
  const startY = 100;
  const lineH = 14.5;
  const half = Math.ceil(topN.length / 2);

  topN.forEach((song, i) => {
    const col = i < half ? 0 : 1;
    const row = i < half ? i : i - half;
    const x = margin + col * colW;
    const y = startY + row * lineH;

    // rank number
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9323b0';
    ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${i + 1}.`, x + 20, y);

    // song title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5b0051';
    ctx.font = '600 9px Manrope, sans-serif';
    const maxTitleW = colW - 65;
    let title = song.title;
    while (ctx.measureText(title).width > maxTitleW && title.length > 3) {
      title = title.slice(0, -2) + '…';
    }
    ctx.fillText(title, x + 25, y);

    // album
    ctx.fillStyle = 'rgba(91, 0, 81, 0.45)';
    ctx.font = '500 7px "Plus Jakarta Sans", sans-serif';
    let album = song.album || '';
    const maxAlbumW = colW - 65;
    while (ctx.measureText(album).width > maxAlbumW && album.length > 3) {
      album = album.slice(0, -2) + '…';
    }
    ctx.fillText(album, x + 25, y + 9);
  });

  // footer
  const footY = pageH - 24;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(91, 0, 81, 0.35)';
  ctx.font = '500 8px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Made with The Archive — Taylor Swift Song Ranker', pageW / 2, footY);

  // convert to PDF-like download via canvas→blob
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taylor-swift-song-ranking.png';
    a.click();
    URL.revokeObjectURL(url);
    if (exportPdfBtn) {
      exportPdfBtn.querySelector('.fav-share-label').textContent = 'Downloaded!';
      setTimeout(() => {
        exportPdfBtn.querySelector('.fav-share-label').textContent = 'Download PDF';
      }, 1500);
    }
  }, 'image/png');
}

// wire UI with guards so missing elements don't break the whole script
if (loadDefaultBtn) loadDefaultBtn.addEventListener('click', loadDefault);
if (saveBtn) saveBtn.addEventListener('click', save);
if (shareBtn) shareBtn.addEventListener('click', shareURL);
if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJson);
if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCsv);
if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportPdf);
if (shareTextBtn) shareTextBtn.addEventListener('click', shareTextToClipboard);
if (shareNativeBtn) shareNativeBtn.addEventListener('click', nativeShare);
async function startBattleFlow() {
  try {
    await eloSwissRank();
  } catch (err) {
    console.error('Battle start failed', err);
    logDebug('Battle start failed: ' + (err && err.message));
  }
}

if (startBattleBtn) startBattleBtn.addEventListener('click', () => {
  if (startBattleBtn.textContent.trim() === 'Rank again') {
    eloStateClear();
    eloRatingsClear();
    if (typeof resetEraWins === 'function') resetEraWins();
    if (typeof lastShownLevel !== 'undefined') lastShownLevel = 0;
  }
  startBattleFlow();
});

document.querySelectorAll('.app-tab[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    if (tab === 'battle' || tab === 'favorites') selectTab(tab);
  });
});

// ─── Era Identity Card on Favorites tab ───
function refreshEraCard() {
  const section = el('era-card-section');
  const preview = el('era-card-preview');
  if (!section || !preview) return;
  if (typeof getEraScores !== 'function') return;
  const scores = getEraScores();
  if (!scores.length || scores[0].wins < 5) { section.style.display = 'none'; return; }
  section.style.display = '';
  try {
    const card = generateEraCard();
    const ctx = preview.getContext('2d');
    preview.width = card.width;
    preview.height = card.height;
    preview.style.width = '100%';
    preview.style.height = 'auto';
    ctx.drawImage(card, 0, 0);
  } catch (e) { console.warn('Era card render failed', e); }
}

const downloadEraCardBtn = el('download-era-card');
const shareEraCardBtn = el('share-era-card');
if (downloadEraCardBtn) downloadEraCardBtn.addEventListener('click', () => {
  if (typeof downloadEraCard === 'function') downloadEraCard();
});
if (shareEraCardBtn) shareEraCardBtn.addEventListener('click', () => {
  if (typeof shareEraCard === 'function') shareEraCard();
});

// refresh era card when switching to favorites tab
document.querySelectorAll('.app-tab[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.getAttribute('data-tab') === 'favorites') refreshEraCard();
  });
});

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

// ─── Initialisation ───
(function init() {
  selectTab('battle');

  // shared link override
  const params = new URLSearchParams(location.search);
  const dataParam = params.get('data');
  if (dataParam) {
    try { songs = JSON.parse(decodeURIComponent(dataParam)); render(); save(); return; }
    catch (_) { console.warn('Invalid shared data'); }
  }

  // load songs from storage or defaults
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { songs = JSON.parse(stored); render(); } catch (_) {}
  }

  // if no songs yet, fetch the default list
  const needsDefaults = !songs.length;
  const ready = needsDefaults ? loadDefault() : Promise.resolve();

  ready.then(() => {
    // if there is saved Elo/Swiss progress, auto-resume immediately
    const saved = eloStateLoad();
    if (saved) {
      logDebug('Resuming saved ranking session');
      waitForPairwiseElements(2500)
        .then(() => setTimeout(startBattleFlow, 80))
        .catch(() => logDebug('Battle DOM not ready'));
    }
    // otherwise just show the idle screen — user clicks "Start ranking"
  }).catch((err) => {
    logDebug('Init failed: ' + (err && err.message));
  });
})();