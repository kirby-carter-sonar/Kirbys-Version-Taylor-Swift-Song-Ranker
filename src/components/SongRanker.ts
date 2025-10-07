import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { Song } from '../types';

export class SongRanker {
    private songs: Song[] = [];

    constructor(initialSongs: Song[]) {
        // clone to avoid mutating caller data
        this.songs = initialSongs.map(s => ({ ...s }));
    }

    initialize() {
        console.log('Welcome to the Taylor Swift Song Ranker!');
        console.log('Type "help" for commands.');
        this.startCLI();
    }

    list() {
        if (this.songs.length === 0) {
            console.log('No songs available.');
            return;
        }
        console.log('\nCurrent songs:');
        this.songs.forEach((s, i) => {
            console.log(`${i + 1}. ${s.title} — ${s.album}${s.releaseYear ? ` (${s.releaseYear})` : ''}`);
        });
        console.log('');
    }

    addSong(song: Partial<Song>) {
        const newSong: Song = {
            title: song.title || 'Untitled',
            album: song.album || 'Unknown',
            artist: song.artist || 'Taylor Swift',
            releaseYear: song.releaseYear ?? 0
        };
        this.songs.push(newSong);
        console.log(`Added: ${newSong.title}`);
    }

    move(fromIndex: number, toIndex: number) {
        const n = this.songs.length;
        if (fromIndex < 0 || fromIndex >= n || toIndex < 0 || toIndex >= n) {
            console.log('Invalid indices for move. Use 1-based positions within the list.');
            return;
        }
        const [item] = this.songs.splice(fromIndex, 1);
        this.songs.splice(toIndex, 0, item);
        console.log(`Moved "${item.title}" to position ${toIndex + 1}.`);
    }

    swap(i: number, j: number) {
        const n = this.songs.length;
        if (i < 0 || i >= n || j < 0 || j >= n) {
            console.log('Invalid indices for swap. Use 1-based positions within the list.');
            return;
        }
        const tmp = this.songs[i];
        this.songs[i] = this.songs[j];
        this.songs[j] = tmp;
        console.log(`Swapped positions ${i + 1} and ${j + 1}.`);
    }

    saveToFile(filePath?: string) {
        const out = filePath || path.resolve(process.cwd(), 'ranked-songs.json');
        try {
            fs.writeFileSync(out, JSON.stringify(this.songs, null, 2), 'utf8');
            console.log(`Saved ranking to ${out}`);
        } catch (err) {
            console.error('Failed to save file:', err instanceof Error ? err.message : String(err));
        }
    }

    loadFromFile(filePath: string) {
        const p = path.resolve(process.cwd(), filePath);
        try {
            const raw = fs.readFileSync(p, 'utf8');
            const data = JSON.parse(raw) as Song[];
            this.songs = data;
            console.log(`Loaded ${data.length} songs from ${p}`);
        } catch (err) {
            console.error('Failed to load file:', err instanceof Error ? err.message : String(err));
        }
    }

    exportText(filePath?: string) {
        const out = filePath || path.resolve(process.cwd(), 'ranked-songs.txt');
        const lines = this.songs.map((s, i) => `${i + 1}. ${s.title} — ${s.album}`);
        try {
            fs.writeFileSync(out, lines.join('\n'), 'utf8');
            console.log(`Exported text ranking to ${out}`);
        } catch (err) {
            console.error('Failed to export text:', err instanceof Error ? err.message : String(err));
        }
    }

    private startCLI() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });

        const help = () => {
            console.log('\nCommands:');
            console.log('  list                      - show current songs and order');
            console.log('  up <n>                    - move song at position n up by 1');
            console.log('  down <n>                  - move song at position n down by 1');
            console.log('  move <from> <to>          - move song from one position to another');
            console.log('  swap <i> <j>              - swap two positions');
            console.log('  add title|album|year      - add a song (pipe-separated) (year optional)');
            console.log('  save [path]               - save ranking to JSON file (default ranked-songs.json)');
            console.log('  load <path>               - load ranking from JSON file');
            console.log('  export [path]             - export plain text ranking (default ranked-songs.txt)');
            console.log('  help                      - show this help');
            console.log('  quit / done               - finish and print final ranking\n');
        };

        rl.prompt();
    rl.on('line', (line: string) => {
            const input = line.trim();
            if (!input) {
                rl.prompt();
                return;
            }
            const parts = input.split(/\s+/);
            const cmd = parts[0].toLowerCase();
            switch (cmd) {
                case 'help':
                    help();
                    break;
                case 'list':
                    this.list();
                    break;
                case 'up': {
                    const n = parseInt(parts[1], 10);
                    if (isNaN(n)) { console.log('Provide a number'); break; }
                    const idx = n - 1;
                    if (idx > 0) this.move(idx, idx - 1);
                    else console.log('Already at top');
                    break;
                }
                case 'down': {
                    const n = parseInt(parts[1], 10);
                    if (isNaN(n)) { console.log('Provide a number'); break; }
                    const idx = n - 1;
                    if (idx < this.songs.length - 1) this.move(idx, idx + 1);
                    else console.log('Already at bottom');
                    break;
                }
                case 'move': {
                    const from = parseInt(parts[1], 10);
                    const to = parseInt(parts[2], 10);
                    if (isNaN(from) || isNaN(to)) { console.log('Provide two numbers'); break; }
                    this.move(from - 1, to - 1);
                    break;
                }
                case 'swap': {
                    const i = parseInt(parts[1], 10);
                    const j = parseInt(parts[2], 10);
                    if (isNaN(i) || isNaN(j)) { console.log('Provide two numbers'); break; }
                    this.swap(i - 1, j - 1);
                    break;
                }
                case 'add': {
                    // everything after 'add ' is the payload
                    const payload = input.slice(4).trim();
                    // allow 'title|album|year' or 'title|album'
                    const parts = payload.split('|').map((p: string) => p.trim());
                    if (parts.length < 2) { console.log('Use: add title|album|year(optional)'); break; }
                    const title = parts[0];
                    const album = parts[1];
                    const year = parts[2] ? parseInt(parts[2], 10) : undefined;
                    this.addSong({ title, album, artist: 'Taylor Swift', releaseYear: year ?? 0 });
                    break;
                }
                case 'save': {
                    const p = parts[1];
                    this.saveToFile(p);
                    break;
                }
                case 'load': {
                    const p = parts[1];
                    if (!p) { console.log('Provide a path to load from'); break; }
                    this.loadFromFile(p);
                    break;
                }
                case 'export': {
                    const p = parts[1];
                    this.exportText(p);
                    break;
                }
                case 'quit':
                case 'done':
                    console.log('\nFinal ranking:');
                    this.list();
                    rl.close();
                    break;
                default:
                    console.log(`Unknown command: ${cmd}`);
                    help();
            }
            rl.prompt();
        }).on('close', () => {
            console.log('Goodbye — your rankings are not auto-saved unless you used `save`.');
            process.exit(0);
        });
    }
}

export default SongRanker;