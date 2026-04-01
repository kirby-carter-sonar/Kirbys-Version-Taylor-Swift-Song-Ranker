// ─── Era & Identity System ───
// Plugs into the Elo/Swiss battle engine to track era preferences,
// streaks, leveling, personality teasers, and generate the Eras Identity Card.

const ERA_COLORS = {
  'Taylor Swift':                    { bg: '#e8f5e9', accent: '#81c784', glow: 'rgba(129,199,132,0.35)',  emoji: '🌿', particle: 'leaf' },
  'Fearless':                        { bg: '#fffde7', accent: '#ffd54f', glow: 'rgba(255,213,79,0.35)',   emoji: '✨', particle: 'sparkle' },
  'Fearless (Taylor\'s Version)':    { bg: '#fffde7', accent: '#ffd54f', glow: 'rgba(255,213,79,0.35)',   emoji: '✨', particle: 'sparkle' },
  'Fearless (Platinum Edition)':     { bg: '#fffde7', accent: '#ffd54f', glow: 'rgba(255,213,79,0.35)',   emoji: '✨', particle: 'sparkle' },
  'Speak Now':                       { bg: '#f3e5f5', accent: '#ce93d8', glow: 'rgba(206,147,216,0.35)', emoji: '💜', particle: 'glitter' },
  'Speak Now (Taylor\'s Version)':   { bg: '#f3e5f5', accent: '#ce93d8', glow: 'rgba(206,147,216,0.35)', emoji: '💜', particle: 'glitter' },
  'Red':                             { bg: '#ffebed', accent: '#ef9a9a', glow: 'rgba(239,154,154,0.35)', emoji: '🍂', particle: 'autumn' },
  'Red (Taylor\'s Version)':         { bg: '#ffebed', accent: '#ef9a9a', glow: 'rgba(239,154,154,0.35)', emoji: '🍂', particle: 'autumn' },
  '1989':                            { bg: '#e3f2fd', accent: '#90caf9', glow: 'rgba(144,202,249,0.35)', emoji: '🌊', particle: 'wave' },
  '1989 (Taylor\'s Version)':        { bg: '#e3f2fd', accent: '#90caf9', glow: 'rgba(144,202,249,0.35)', emoji: '🌊', particle: 'wave' },
  'Reputation':                      { bg: '#37474f', accent: '#a5d6a7', glow: 'rgba(165,214,167,0.4)',  emoji: '🐍', particle: 'snake' },
  'Lover':                           { bg: '#fce4ec', accent: '#f48fb1', glow: 'rgba(244,143,177,0.35)', emoji: '🦋', particle: 'butterfly' },
  'Folklore':                        { bg: '#f5f0eb', accent: '#bcaaa4', glow: 'rgba(188,170,164,0.35)', emoji: '🍃', particle: 'folklore' },
  'Evermore':                        { bg: '#fff8e1', accent: '#ffcc80', glow: 'rgba(255,204,128,0.35)', emoji: '🍂', particle: 'evermore' },
  'Midnights':                       { bg: '#e8eaf6', accent: '#b39ddb', glow: 'rgba(179,157,219,0.4)', emoji: '🌙', particle: 'star' },
  'The Tortured Poets Department':   { bg: '#f3e5f5', accent: '#b39ddb', glow: 'rgba(179,157,219,0.35)', emoji: '🪶', particle: 'feather' },
};

const ERA_GROUPS = {
  'Taylor Swift':  ['Taylor Swift'],
  'Fearless':      ['Fearless', "Fearless (Taylor's Version)", 'Fearless (Platinum Edition)'],
  'Speak Now':     ['Speak Now', "Speak Now (Taylor's Version)"],
  'Red':           ['Red', "Red (Taylor's Version)"],
  '1989':          ['1989', "1989 (Taylor's Version)"],
  'Reputation':    ['Reputation'],
  'Lover':         ['Lover'],
  'Folklore':      ['Folklore'],
  'Evermore':       ['Evermore'],
  'Midnights':     ['Midnights'],
  'TTPD':          ['The Tortured Poets Department'],
};

function albumToEra(album) {
  for (const [era, albums] of Object.entries(ERA_GROUPS)) {
    if (albums.some(a => album === a || album.startsWith(a))) return era;
  }
  return 'Other';
}

function getEraColor(album) {
  if (ERA_COLORS[album]) return ERA_COLORS[album];
  const era = albumToEra(album);
  for (const [key, val] of Object.entries(ERA_COLORS)) {
    if (albumToEra(key) === era) return val;
  }
  return { bg: '#f3e5f5', accent: '#9323b0', glow: 'rgba(147,35,176,0.35)', emoji: '🎵', particle: 'sparkle' };
}

// ─── Personality Archetypes ───
const PERSONALITIES = {
  'Folklore/Evermore': {
    title: 'The Storyteller',
    desc: 'Introspective, whimsical, and drawn to deep lyrics. You find beauty in quiet moments and hidden narratives.',
    icon: 'auto_stories',
    color: '#6d4c41',
  },
  'Reputation': {
    title: 'The Mastermind',
    desc: 'Strategic, bold, and fiercely loyal. You value power moves and don\'t suffer fools.',
    icon: 'psychology',
    color: '#4caf50',
  },
  'Lover/1989': {
    title: 'The Daydreamer',
    desc: 'Romantic, energetic, and unapologetically optimistic. You believe in love stories and dance floors.',
    icon: 'sunny',
    color: '#ec407a',
  },
  'Midnights': {
    title: 'The Night Owl',
    desc: 'Reflective, complex, and effortlessly modern. Your best thoughts come at 3am.',
    icon: 'dark_mode',
    color: '#7c4dff',
  },
  'Red/Speak Now': {
    title: 'The Romantic',
    desc: 'Passionate, expressive, and unafraid of big feelings. You live life in vivid color.',
    icon: 'favorite',
    color: '#c62828',
  },
  'Taylor Swift/Fearless': {
    title: 'The Dreamer',
    desc: 'Nostalgic, hopeful, and true to your roots. You never forget where you came from.',
    icon: 'star',
    color: '#f9a825',
  },
  'TTPD': {
    title: 'The Poet',
    desc: 'Literary, tortured, and deeply feeling. You turn heartbreak into art.',
    icon: 'edit_note',
    color: '#4a148c',
  },
};

function getPersonalityGroup(era) {
  if (era === 'Folklore' || era === 'Evermore') return 'Folklore/Evermore';
  if (era === 'Reputation') return 'Reputation';
  if (era === 'Lover' || era === '1989') return 'Lover/1989';
  if (era === 'Midnights') return 'Midnights';
  if (era === 'Red' || era === 'Speak Now') return 'Red/Speak Now';
  if (era === 'Taylor Swift' || era === 'Fearless') return 'Taylor Swift/Fearless';
  if (era === 'TTPD') return 'TTPD';
  return 'Lover/1989';
}

// ─── Era Win Tracker ───
const eraWins = {};

function resetEraWins() {
  Object.keys(eraWins).forEach(k => delete eraWins[k]);
}

function recordWin(song) {
  const era = albumToEra(song.album || '');
  eraWins[era] = (eraWins[era] || 0) + 1;
}

function getEraScores() {
  const total = Object.values(eraWins).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(eraWins)
    .map(([era, wins]) => ({ era, wins, pct: Math.round((wins / total) * 100) }))
    .sort((a, b) => b.wins - a.wins);
}

function getPrimaryEra() {
  const scores = getEraScores();
  return scores[0] ? scores[0].era : 'Lover';
}

function getSecondaryEra() {
  const scores = getEraScores();
  return scores[1] ? scores[1].era : '1989';
}

// ─── Streak Tracking ───
let currentStreakEra = null;
let currentStreakCount = 0;

function recordStreakPick(song) {
  const era = albumToEra(song.album || '');
  if (era === currentStreakEra) {
    currentStreakCount++;
  } else {
    currentStreakEra = era;
    currentStreakCount = 1;
  }
  return { era: currentStreakEra, count: currentStreakCount };
}

function showStreakAnimation(era, count) {
  if (count < 3) return;
  const existing = document.getElementById('streak-toast');
  if (existing) existing.remove();

  const eraColor = getEraColor(era);
  const toast = document.createElement('div');
  toast.id = 'streak-toast';
  toast.className = 'streak-toast';
  toast.innerHTML = `
    <span class="streak-fire">🔥</span>
    <span class="streak-text">${era} streak × ${count}!</span>
  `;
  toast.style.setProperty('--streak-accent', eraColor.accent);
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('streak-toast--visible'));
  setTimeout(() => {
    toast.classList.remove('streak-toast--visible');
    setTimeout(() => toast.remove(), 400);
  }, 1800);
}

// ─── Battle Particles ───
const FOLKLORE_EMOJIS = ['🍃', '🌿', '🌾', '✧', '🕊'];
const EVERMORE_EMOJIS = ['🍂', '🍁', '🌙', '✧', '🦌'];

function spawnBattleParticles(tileEl, song) {
  const eraColor = getEraColor(song.album || '');
  const rect = tileEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const isWhimsical = eraColor.particle === 'folklore' || eraColor.particle === 'evermore';

  if (isWhimsical) {
    const emojis = eraColor.particle === 'folklore' ? FOLKLORE_EMOJIS : EVERMORE_EMOJIS;
    const count = 10 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'battle-particle battle-particle--drift';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const spreadX = (Math.random() - 0.5) * rect.width * 1.2;
      p.style.left = (cx + spreadX) + 'px';
      p.style.top = (cy - Math.random() * 20) + 'px';
      p.style.setProperty('--drift-x', (Math.random() - 0.5) * 60 + 'px');
      p.style.setProperty('--drift-y', -(60 + Math.random() * 80) + 'px');
      p.style.setProperty('--drift-rot', (Math.random() - 0.5) * 180 + 'deg');
      p.style.animationDelay = (Math.random() * 0.3) + 's';
      p.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  } else {
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      p.className = 'battle-particle';
      p.textContent = eraColor.emoji;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
      const dist = 40 + Math.random() * 50;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }
}

// ─── Progress Bar Era Glow ───
function setProgressEraGlow(song) {
  const bar = document.getElementById('pair-progress');
  if (!bar) return;
  const eraColor = getEraColor(song.album || '');
  bar.style.background = eraColor.accent;
  bar.style.boxShadow = `0 0 12px ${eraColor.glow}`;
}

// ─── Leveling System ───
const LEVEL_THRESHOLDS = [
  { level: 1, comparisons: 0,    title: 'Casual Listener',     unlock: 'You\'re just getting started!' },
  { level: 2, comparisons: 50,   title: 'Era Explorer',        unlock: 'Your taste is starting to take shape...' },
  { level: 3, comparisons: 130,  title: 'Ranking Rookie',      unlock: 'Your top songs are starting to emerge!' },
  { level: 4, comparisons: 260,  title: 'Swiftie Scholar',     unlock: 'Era preferences are crystallizing...' },
  { level: 5, comparisons: 520,  title: 'Ranking Machine',     unlock: 'Your ranking is getting serious. Era identity unlocked!' },
  { level: 6, comparisons: 780,  title: 'Taste Architect',     unlock: 'Deep insights available. Check your Era Card!' },
  { level: 7, comparisons: 1040, title: 'Supreme Ranker',      unlock: 'Almost there — your ranking is highly refined.' },
  { level: 8, comparisons: 1300, title: 'The Archivist',       unlock: 'Ranking complete. Your definitive list awaits.' },
];

function getCurrentLevel(comparisons) {
  let lvl = LEVEL_THRESHOLDS[0];
  for (const t of LEVEL_THRESHOLDS) {
    if (comparisons >= t.comparisons) lvl = t;
  }
  return lvl;
}

let lastShownLevel = 0;

function checkLevelUp(comparisons) {
  const lvl = getCurrentLevel(comparisons);
  if (lvl.level > lastShownLevel) {
    lastShownLevel = lvl.level;
    showLevelUpToast(lvl);
  }
}

function showLevelUpToast(lvl) {
  const existing = document.getElementById('level-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'level-toast';
  toast.className = 'level-toast';
  toast.innerHTML = `
    <div class="level-toast-badge">Lv.${lvl.level}</div>
    <div class="level-toast-body">
      <div class="level-toast-title">${lvl.title}</div>
      <div class="level-toast-desc">${lvl.unlock}</div>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('level-toast--visible'));
  setTimeout(() => {
    toast.classList.remove('level-toast--visible');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ─── Personality Teasers ───
const TEASERS = [
  { minPct: 25, era: 'Folklore',    text: 'You seem drawn to storytelling — very folklore of you.' },
  { minPct: 25, era: 'Evermore',     text: 'Willow vibes detected. You love a slow burn.' },
  { minPct: 25, era: 'Reputation',   text: 'Big reputation energy. You like it dark and bold.' },
  { minPct: 25, era: 'Lover',        text: 'Your heart\'s in Lover territory — hopeless romantic alert.' },
  { minPct: 25, era: '1989',         text: 'Pop perfection is your thing. Welcome to 1989.' },
  { minPct: 25, era: 'Midnights',    text: 'Late-night thinker? Midnights is calling.' },
  { minPct: 25, era: 'Red',          text: 'You feel things in ALL CAPS. Very Red of you.' },
  { minPct: 25, era: 'Speak Now',    text: 'Main character energy detected. Speak Now stan spotted.' },
  { minPct: 25, era: 'TTPD',         text: 'You\'re choosing the tortured poetry. Respect.' },
  { minPct: 20, era: 'Fearless',     text: 'Golden hour vibes. Fearless is your comfort zone.' },
];

let lastTeaserAt = 0;
const TEASER_INTERVAL = 40;

function maybeShowTeaser(totalComparisons) {
  if (totalComparisons - lastTeaserAt < TEASER_INTERVAL) return;

  const scores = getEraScores();
  if (!scores.length) return;

  const top = scores[0];
  const matched = TEASERS.filter(t => t.era === top.era && top.pct >= t.minPct);
  if (!matched.length) return;

  const teaser = matched[Math.floor(Math.random() * matched.length)];
  lastTeaserAt = totalComparisons;
  showTeaserPopup(teaser.text);
}

function showTeaserPopup(text) {
  const existing = document.getElementById('teaser-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'teaser-popup';
  popup.className = 'teaser-popup';
  popup.innerHTML = `
    <span class="material-symbols-outlined teaser-icon">lightbulb</span>
    <span class="teaser-text">${text}</span>
  `;
  document.body.appendChild(popup);
  requestAnimationFrame(() => popup.classList.add('teaser-popup--visible'));
  setTimeout(() => {
    popup.classList.remove('teaser-popup--visible');
    setTimeout(() => popup.remove(), 400);
  }, 3000);
}

// ─── Eras Identity Card Generator ───
function generateEraCard() {
  const primary = getPrimaryEra();
  const secondary = getSecondaryEra();
  const pGroup = getPersonalityGroup(primary);
  const personality = PERSONALITIES[pGroup] || PERSONALITIES['Lover/1989'];
  const primaryColor = getEraColor(primary);
  const scores = getEraScores();
  const top5 = (typeof songs !== 'undefined' ? songs : []).slice(0, 5);

  const W = 600;
  const H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // card background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, primaryColor.bg);
  grad.addColorStop(1, '#fff4f8');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  // accent stripe
  ctx.fillStyle = primaryColor.accent;
  ctx.fillRect(0, 0, W, 6);

  // header
  ctx.fillStyle = primaryColor.accent;
  ctx.font = 'italic 700 28px "Noto Serif", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Eras Identity Card', W / 2, 52);

  // personality title
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = personality.color;
  ctx.fillText(`You are ${personality.title}`, W / 2, 88);

  // primary era badge
  ctx.font = '600 14px Manrope, sans-serif';
  ctx.fillStyle = primaryColor.accent;
  ctx.fillText(`Primary Era: ${primary} ${primaryColor.emoji}`, W / 2, 118);

  // secondary era
  const secColor = getEraColor(secondary);
  ctx.fillStyle = 'rgba(91,0,81,0.55)';
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Secondary Era: ${secondary} ${secColor.emoji}`, W / 2, 140);

  // divider
  ctx.strokeStyle = primaryColor.accent + '33';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 158);
  ctx.lineTo(W - 40, 158);
  ctx.stroke();

  // personality description
  ctx.fillStyle = '#5b0051';
  ctx.font = 'italic 400 12px "Noto Serif", Georgia, serif';
  ctx.textAlign = 'center';
  wrapText(ctx, personality.desc, W / 2, 182, W - 80, 18);

  // top 5 songs
  ctx.fillStyle = primaryColor.accent;
  ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TOP 5 SONGS', W / 2, 250);

  ctx.textAlign = 'left';
  top5.forEach((s, i) => {
    const y = 275 + i * 28;
    ctx.fillStyle = primaryColor.accent;
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${i + 1}.`, 55, y);
    ctx.fillStyle = '#5b0051';
    ctx.font = '600 13px Manrope, sans-serif';
    let title = s.title || '';
    while (ctx.measureText(title).width > 340 && title.length > 3) title = title.slice(0, -2) + '…';
    ctx.fillText(title, 80, y);
    ctx.fillStyle = 'rgba(91,0,81,0.45)';
    ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(s.album || '', 80, y + 14);
  });

  // era breakdown
  const breakdownY = 430;
  ctx.textAlign = 'center';
  ctx.fillStyle = primaryColor.accent;
  ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ERA BREAKDOWN', W / 2, breakdownY);

  const barStartY = breakdownY + 20;
  const maxBarW = W - 120;
  const maxWins = scores.length ? scores[0].wins : 1;
  scores.slice(0, 8).forEach((s, i) => {
    const y = barStartY + i * 26;
    const eColor = getEraColor(s.era);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#5b0051';
    ctx.font = '500 10px Manrope, sans-serif';
    ctx.fillText(s.era, 105, y + 4);

    const barW = Math.max(4, (s.wins / maxWins) * maxBarW);
    ctx.fillStyle = eColor.accent + '55';
    roundRect(ctx, 115, y - 6, maxBarW, 14, 4);
    ctx.fill();
    ctx.fillStyle = eColor.accent;
    roundRect(ctx, 115, y - 6, barW, 14, 4);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#5b0051';
    ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${s.pct}%`, 115 + barW + 6, y + 4);
  });

  // vibe descriptor
  const diversity = scores.filter(s => s.pct >= 10).length;
  let vibe = 'Mono-era loyalist';
  if (diversity >= 5) vibe = 'Ultimate all-eras explorer';
  else if (diversity >= 4) vibe = 'Wide-ranging taste curator';
  else if (diversity >= 3) vibe = 'Multi-era connoisseur';
  else if (diversity >= 2) vibe = 'Dual-era devotee';

  const vibeY = barStartY + Math.min(scores.length, 8) * 26 + 20;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(91,0,81,0.6)';
  ctx.font = 'italic 500 12px "Noto Serif", Georgia, serif';
  ctx.fillText(`Vibe: ${vibe}`, W / 2, vibeY);

  // footer
  ctx.fillStyle = 'rgba(91,0,81,0.3)';
  ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('The Archive — Taylor Swift Song Ranker', W / 2, H - 20);
  ctx.fillText(new Date().toLocaleDateString(), W / 2, H - 8);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, curY);
      line = word + ' ';
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, curY);
}

function downloadEraCard() {
  const canvas = generateEraCard();
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-eras-identity-card.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function shareEraCard() {
  const canvas = generateEraCard();
  canvas.toBlob(async (blob) => {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'eras-identity-card.png', { type: 'image/png' });
      try {
        await navigator.share({ title: 'My Eras Identity Card', files: [file] });
        return;
      } catch (_) {}
    }
    downloadEraCard();
  }, 'image/png');
}
