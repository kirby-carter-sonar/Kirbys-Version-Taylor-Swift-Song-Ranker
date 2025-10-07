# Taylor Swift Song Ranker

This small TypeScript CLI helps you interactively rank your favorite Taylor Swift songs.

Getting started

1. Install dependencies (you need Node and npm installed):

```bash
npm install
```

2. Start the app:

```bash
npm start
```

You'll get a prompt. Useful commands:

- list: show current list
- up N / down N: move a song up or down
- move A B: move from position A to B
- swap A B: swap two positions
- add title|album|year: add a song (year optional)
- save [path]: save ranking to JSON
- load <path>: load ranking from JSON
- export [path]: export plain text ranking
- help: show help
- quit / done: finish and exit

Notes

- The CLI saves only when you use the `save` command.
- The app uses the sample songs in `src/data/songs.ts` by default.

Web UI

I added a lightweight web UI under the `public/` folder. You can open `public/index.html` in a browser, but to use `fetch` for `songs.json` it's easiest to serve the folder with a static server. Two simple ways:

- If you have `http-server` (npm):

```bash
npx http-server public -c-1
# then open http://localhost:8080
```

- Or with Python 3's simple server (macOS and Linux):

```bash
cd public
python3 -m http.server 8000
# open http://localhost:8000
```

The web UI supports drag-and-drop reordering, saving to localStorage, exporting a text file, and importing a previously-exported JSON ranking via the file input.

Polished web UI

I updated the `public/` UI with a pastel theme, subtle animations, keyboard accessibility (focus + Arrow keys to move items), inline editing, and a "Share" button that copies a link encoding your current ranking.

To serve locally using the new npm script:

```bash
npm install
npm run serve
# open http://localhost:8080
```

Share links: clicking Share copies a URL with your ranking encoded in the query parameter. Paste that link to share your list with others.

Accessibility & keyboard support:
- Each item is focusable (Tab). While focused, use ArrowUp/ArrowDown to move the item in the list.
- Double-click to rename a title, or use keyboard to focus and then edit.

GitHub Pages deployment

I added a GitHub Actions workflow that deploys the `public/` folder to GitHub Pages when you push to `main` or `master`.

How to deploy:

1. Commit and push your changes to your repository's `main` (or `master`) branch:

```bash
git add .
git commit -m "Add polished web UI and GitHub Pages deploy workflow"
git push origin main
```

2. The workflow `.github/workflows/deploy-pages.yml` will run on push and deploy `public/` to GitHub Pages. You can follow the Actions tab in your repository to watch deployment progress.

3. After the workflow completes, your site will be published at `https://<your-username>.github.io/<your-repo>/` (or the custom domain you configure in the Pages settings).

Notes and permissions:
- The workflow uses GitHub's pages deploy action and requires no repository secrets; it uses the default GITHUB_TOKEN permission to publish.
- If your repo's default branch is not `main` or `master`, update the workflow branches accordingly.



## Overview
The Taylor Swift Song Ranker is a web application that allows users to rank their favorite Taylor Swift songs. Users can add songs, rank them based on their preferences, and view the ranked list.

## Features
- Add your favorite Taylor Swift songs to the list.
- Rank songs based on personal preference.
- View the ranked list of songs.

## Project Structure
```
taylor-swift-song-ranker
├── src
│   ├── app.ts                # Entry point of the application
│   ├── components
│   │   └── SongRanker.ts     # Component for managing song ranking
│   ├── data
│   │   └── songs.ts          # Initial data source for songs
│   └── types
│       └── index.ts          # Type definitions for songs and ranking
├── package.json               # npm configuration file
├── tsconfig.json              # TypeScript configuration file
└── README.md                  # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd taylor-swift-song-ranker
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
To start the application, run:
```
npm start
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.