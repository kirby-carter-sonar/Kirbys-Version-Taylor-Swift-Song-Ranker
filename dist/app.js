"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SongRanker_1 = __importDefault(require("./components/SongRanker"));
const songs_1 = require("./data/songs");
const app = () => {
    const songRanker = new SongRanker_1.default(songs_1.songs);
    songRanker.initialize();
};
app();
