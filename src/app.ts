import SongRanker from './components/SongRanker';
import { songs } from './data/songs';

const app = () => {
    const songRanker = new SongRanker(songs as any);
    songRanker.initialize();
};

app();