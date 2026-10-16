# WebKaraoke

WebKaraoke is a browser-based karaoke prototype. It plays separate vocal and backing-track audio, listens to the singer through the microphone, estimates their pitch, and displays pitch feedback and a score.

## Features

- Pitch detection and note feedback using the Web Audio API.
- Visual pitch/song boards, score display, and particle effects.
- Sample audio and pitch data in `src/sounds/`.
- A prototype interface with lyrics, song selection, and settings.

Microphone access requires the user's permission and is generally available only when the site is served from `localhost` or over HTTPS. The song list and settings are prototype UI; the bundled audio and pitch data are for the included demo.

## Run locally

Install the project dependencies:

```sh
npm install
```

Start the local BrowserSync server and file watchers:

```sh
npx gulp
```

Open the local URL printed by BrowserSync. The server uses `src/` as its document root.

To generate the production output in `dist/`:

```sh
npx gulp build
```

The Gulp tasks compile SCSS, copy and process assets, and write the built site to `dist/`. This project does not currently define an automated test suite; its `npm test` script is a placeholder.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/index.html` | Karaoke page and interface |
| `src/js/` | Pitch analysis, playback, and visual effects |
| `src/scss/` | Application styles and Bootstrap SCSS sources |
| `src/css/` | Stylesheets used by the page |
| `src/sounds/` | Demo tracks and pitch data |
| `prototypades/` | Prototype images and PDF designs |
| `gulpfile.js` | Development server, watch, and build tasks |
| `dist/` | Generated build output (not tracked) |

## License

The repository includes a `LICENSE` file containing the CC0 1.0 Universal dedication. Check the terms applicable to bundled third-party libraries and media separately.
