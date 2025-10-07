export interface Song {
    title: string;
    album: string;
    artist: string;
    releaseYear?: number;
}

export interface Rank {
    song: Song;
    rank: number;
}