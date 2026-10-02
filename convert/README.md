# convert

Local media converter (image, audio, video) built on **ffmpeg.wasm**. Static site, no backend.

## Privacy
Conversions run in your browser. Files are read with the File API and are never sent to a server of this project. (The page loads the JetBrains Mono font from Google Fonts.)

## Install & develop
```
npm install
npm run dev      # copies ffmpeg.wasm to ./vendor and serves http://localhost:8080
```
Edit `js/config.js` for the site name, GitHub URL, colours and formats.

## Deploy on GitHub Pages
1. Push to a repo on `main`.
2. Settings → Pages → Source: **GitHub Actions**. `.github/workflows/deploy.yml` builds and publishes `dist/`.

## How it works
`js/ffmpeg.js` lazy-loads the single-thread ffmpeg.wasm core (no SharedArrayBuffer, so no special headers are needed on GitHub Pages) only when you press convert. The file is written to ffmpeg's in-memory filesystem, `exec()` runs the arguments built by `js/commands.js`, the result is read back as a Blob, then the wasm instance is terminated to free memory. The command page lets you edit the arguments: input must stay `-i input.<ext>`, output a plain file name. Nothing is evaluated as JavaScript.

## Known limitations
- Single-thread wasm is slow: long or 4K videos can take many times their duration and may fail on phones.
- About 2 GB maximum file size; the file is held in memory during conversion.
- The standard core may lack some encoders (AVIF/libaom is likely missing). Unsupported outputs show an explicit error.
- The first conversion downloads ~30 MB of wasm (cached afterwards).
