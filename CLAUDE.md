# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

午夜音乐记忆展览 (Midnight Music Memory Exhibition) — a static web app that curates hot comments from NetEase Cloud Music into an immersive "exhibition" experience with 3D record covers and story generation. All user-facing text is in Simplified Chinese.

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no framework, no bundler, no TypeScript)
- Three.js v0.184.0 for 3D vinyl record rendering
- Python HTTP server for local development
- Data from NetEase Cloud Music API (requires local NeteaseCloudMusicApi server on port 3000)

## Commands

```bash
# Run the app locally
./start.sh                    # or: python3 -m http.server 8080
# Access at http://localhost:8080

# Fetch music data (requires NeteaseCloudMusicApi on port 3000)
node fetch-one.mjs            # fetch songs with resume support

# Install dependencies
npm install                   # only dependency: three
```

No build, lint, or test tooling is configured.

## Architecture

**Entry points**: `index.html` loads `styles.css` and `app.js`. Data loads from `data/songs.json` with fallback to `data/embedded.js` (inline JS).

**Key files**:
- `app.js` — all application logic: exhibition gallery, 3D record (Three.js WebGL canvas), story generation, search/filter, random exhibit selection (~700 lines)
- `styles.css` — all styling with CSS custom properties for theming (~1500 lines)
- `index.html` — HTML structure with sidebar navigation and exhibit layout

**Data fetching script**: `fetch-one.mjs` is an ES module that calls the NeteaseCloudMusicApi REST endpoints and writes results to `data/songs.json`, with resume support.

**Layout**: Mobile-first responsive design with sidebar navigation. The 3D canvas renders an interactive vinyl record with cover art textures.

## Data Flow

1. Fetch scripts call NeteaseCloudMusicApi (localhost:3000) → write `data/songs.json`
2. `app.js` loads JSON → renders exhibition gallery, search, filters
3. User interactions trigger 3D record animation and story generation

## Directories

- `data/` — song and comment JSON data
- `assets/generated/` — AI-generated cover art and textures
- `docs/` — UI redesign planning docs
- `open-design/` — separate project, not part of this app
