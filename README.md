# History Heist
History Heist is a browser puzzle where your time machine is the browser history stack. You move through rooms as URLs, create timeline changes, cache what should persist, rewind to an untouched timeline, and escape through the Paradox Door.

## Why This Game Is Different
Most puzzle games treat navigation as movement. History Heist treats navigation as causality.

- `Back` rewinds timeline state.
- `Forward` replays timeline branches.
- Some inventory is timeline-bound (can be undone).
- Some inventory is persistent (survives rewinds).

The core puzzle loop is creating a contradiction on purpose: you interact with the unstable key in one timeline, preserve the result in persistent cache, then return to a timeline where that interaction never happened.

## Quickstart
```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Available Scripts
- `npm run dev` starts the local Vite dev server on `127.0.0.1:5173`.
- `npm run build` creates a production bundle in `dist/`.
- `npm run preview` serves the production bundle locally.

## How to Play
### Mission Objective
Escape by opening the Paradox Door from the Lobby while:
- you already have a cached key in persistent inventory
- the current timeline is still untouched (`keyTaken = false`)

### Recommended Solve Route
`Gallery (stamp) -> Archive (key) -> Workshop (cache) -> Back to untouched timeline -> Lobby (door)`

### Room Logic
- `Lobby`: contains the Paradox Door and links to other rooms.
- `Gallery`: gives the `CACHE stamp`, which enables persistent caching.
- `Archive`: contains the unstable key; taking it disturbs the current timeline.
- `Workshop`: stamps the unstable key into persistent cache.
- `Exit`: mission-complete summary with score and achievements.

## Controls
### Keyboard
- `ArrowLeft` or `B`: browser back (rewind timeline)
- `ArrowRight`: browser forward
- `Enter`: run recommended action
- `Space`: toggle detailed hint
- `A`: reset to briefing (new run)

### On-screen Buttons
- `Back`
- `Forward`
- `New run`

The game also exposes a context-aware `Recommended next action` button that updates based on the current state.

## Scoring and Achievements
### Score Components
- `Base`: `+100`
- `Efficiency`: `+40` if steps `<= 12`, `+20` if steps `<= 18`, else `+0`
- `Accuracy`: `+20` if invalid attempts `<= 2`, else `+0`
- `Guidance`: `+20` if manual hints opened `0` times, `+10` if `<= 2`, else `+0`
- `Exploration`: `+20` if all non-exit rooms were visited in the run

### Star Thresholds
- `3 stars`: total score `>= 170`
- `2 stars`: total score `>= 130`
- `1 star`: total score `< 130`

### Achievements
- `First Escape`: complete one run
- `Clean Timeline`: complete with `0` invalid attempts
- `Efficient Thief`: complete in `12` steps or fewer
- `Curator`: visit every non-exit room in a completed run

## State Model (For Contributors)
The game logic is centralized in `history_heist_web_game_prototype.jsx` and tracks state in four core groups:

- `route`: the current room path (`/lobby`, `/gallery`, `/archive`, `/workshop`, `/exit`)
- `timeline`: timeline-bound state
  - `keyTaken`
  - `hasKey`
  - `stampedOnce`
- `persistent`: rewind-safe state
  - `hasStamp`
  - `cachedKey`
- `stats`: run metrics
  - `steps`
  - `invalidAttempts`
  - `manualHintReveals`
  - `completion`
  - `everTouchedKey`
  - `roomsVisited`

Browser history is part of gameplay state:
- `history.pushState` records route + timeline transitions
- `history.replaceState` initializes/resets run state
- `popstate` rehydrates `route` and `timeline` when rewinding/forwarding

## Project Structure
```text
History-Heist/
├── history_heist_web_game_prototype.jsx  # Main game logic + UI + hooks
├── src/
│   ├── main.jsx                          # React entrypoint; mounts HistoryHeist
│   └── index.css                         # Tailwind imports + minimal base styles
├── index.html                            # App shell
├── package.json                          # Scripts and dependencies
├── vite.config.js                        # Dev server config (127.0.0.1:5173)
├── tailwind.config.js                    # Tailwind content scan config
├── postcss.config.js                     # Tailwind + Autoprefixer plugins
├── progress.md                           # Development log and next ideas
└── LICENSE                               # AGPL-3.0 license text
```

## Automation/Test Hooks
Stable DOM selectors for automation clients:
- `#start-btn`
- `#primary-action-btn`
- `#hint-toggle-btn`
- `#back-btn`
- `#forward-btn`
- `#new-run-btn`

Browser hooks exposed during runtime:
- `window.render_game_to_text()`
  - Returns a JSON string snapshot of game state (mode, route, timeline, persistent inventory, objectives, recommended action, run stats, score projection, unlocked achievements, route graph coordinates).
- `window.advanceTime(ms)`
  - Accepts a non-negative millisecond delta.
  - Increments internal logical time monotonically.
  - Returns a resolved Promise with the updated logical time.

## Troubleshooting
### `npm` or dependency errors
- Ensure Node.js and npm are installed.
- Reinstall dependencies:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### Port `5173` already in use
- Stop the process using `127.0.0.1:5173`, then rerun:
  ```bash
  npm run dev
  ```

### Build verification
Use this as a health check:
```bash
npm run build
```

If build succeeds, scripts/config/dependencies are consistent.

## Roadmap
Planned improvements from `progress.md`:
- Persist best score and best star rating across sessions (for example with `localStorage`).
- Add CI coverage for custom scenario assertions (including blocked-attempt behavior) alongside current Playwright-style flows.

## License
Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See [LICENSE](./LICENSE).
