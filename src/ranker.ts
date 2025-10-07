import * as fs from 'fs';
import * as path from 'path';

// Simple CLI pairwise ranker using merge-sort algorithm to minimize comparisons.
// Usage: ts-node src/ranker.ts            -> interactive mode (prompts)
//        SIMULATE=1 ts-node src/ranker.ts -> simulation mode (randomized choices)

const SONGS_PATH = path.resolve(__dirname, '../public/songs.json');
const OUTPUT_PATH = path.resolve(process.cwd(), 'ranked_songs.json');

function loadSongs(): Array<{ title: string; album: string; artist: string }> {
  const raw = fs.readFileSync(SONGS_PATH, 'utf8');
  return JSON.parse(raw);
}

async function promptCompare(a: any, b: any): Promise<boolean> {
  // Return true if user prefers a over b.
  if (process.env.SIMULATE === '1') {
    // Random but biased deterministic via hash to keep runs repeatable-ish
    const key = a.title + '|' + b.title;
    let sum = 0;
    for (let i = 0; i < key.length; i++) sum = (sum * 31 + key.charCodeAt(i)) % 100000;
    return (sum % 2) === 0; // pseudo-random preference
  }

  return new Promise((resolve) => {
    process.stdout.write(`Which do you prefer?\n1) ${a.title} (${a.album})\n2) ${b.title} (${b.album})\nType 1 or 2: `);
    const onData = (buf: Buffer) => {
      const s = buf.toString().trim();
      if (s === '1') {
        process.stdin.off('data', onData);
        resolve(true);
      } else if (s === '2') {
        process.stdin.off('data', onData);
        resolve(false);
      } else {
        process.stdout.write('Please type 1 or 2: ');
      }
    };
    process.stdin.on('data', onData);
  });
}

async function mergeSort(items: any[]): Promise<any[]> {
  if (items.length <= 1) return items;
  const mid = Math.floor(items.length / 2);
  const left = await mergeSort(items.slice(0, mid));
  const right = await mergeSort(items.slice(mid));
  const merged: any[] = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    const preferLeft = await promptCompare(left[i], right[j]);
    if (preferLeft) {
      merged.push(left[i++]);
    } else {
      merged.push(right[j++]);
    }
  }
  while (i < left.length) merged.push(left[i++]);
  while (j < right.length) merged.push(right[j++]);
  return merged;
}

async function run() {
  const songs = loadSongs();
  console.log(`Loaded ${songs.length} songs.`);
  if (process.env.SIMULATE !== '1') {
    console.log('Interactive mode: you will be prompted to choose between two songs repeatedly.');
    console.log('Press Ctrl+C at any time to abort.');
  } else {
    console.log('Simulation mode: automated comparisons will run.');
  }

  // For performance when many songs, you might want to sample or chunk. We proceed with full set.
  const ranked = await mergeSort(songs);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(ranked, null, 2), 'utf8');
  console.log(`Ranking complete. Output written to ${OUTPUT_PATH}`);
  if (process.stdin.isTTY) process.stdin.pause();
}

run().catch((err) => { console.error(err); process.exit(1); });
