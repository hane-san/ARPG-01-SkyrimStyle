# 凪の島 — NAGI / AI development contract

## 1. This game and the other two

This is the canonical `hane-san/ARPG-01-SkyrimStyle` repository (formerly `hane-san/ARPG` and `hane-san/Koitototsukuru`). The other independent games are `hane-san/ARPG-02-retrostyle` and `hane-san/SRPG-01-FEstyle`. Scope work to this game.
Read [docs/DESIGN.md](docs/DESIGN.md), [docs/DECISIONS.md](docs/DECISIONS.md) (dated history; the D-numbers below point there), [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), [docs/ROADMAP.md](docs/ROADMAP.md), [docs/QA.md](docs/QA.md) and the approved issue before editing. Claude Code imports this contract from `CLAUDE.md`.

## 2. Current phase and development contract

### Producer's standing merge delegation (2026-11-05, D013)

The human producer delegated **normal PR merging for this game's requests** to the AI working the request: "今後の指示ふくめこのゲームに対してはマージまで一貫でやっちゃって". For requests from the producer, work branch → PR → exact-head `rules`/`browser` success → normal merge commit → confirm main Actions and Pages. Still prohibited: direct push to main, force-push, GitHub auto-merge, PR approvals, Settings changes, deleting or weakening tests. Independent audit and iPhone playtests remain unverified unless actually performed; record them so.

### Shared AI development contract

- The human producer decides game specifications, playtest acceptance and integration into main. Distinguish approved, proposed, deferred, superseded and unverified items. Do not invent missing chat context; surface contradictions between approved specs, code and tests.
- Handoff: human adoption in Chat -> Issue with acceptance criteria -> Codex or Claude Code/Sonnet work branch -> PR -> CI -> risk-based independent audit -> human playtest/approval -> main. Choose the implementation line by availability and context; model names are roles, not fixed API dependencies.
- Never push directly to main, force-push or enable auto-merge. Fetch current main, inspect open PRs and coordinate overlapping files; preserve other contributors' work.
- Record risk and evidence in the PR. Low-risk wording/docs changes may omit independent audit; medium-risk changes need an independent review of affected behavior; high-risk terrain/input/save/state changes need prior technical design and deeper independent audit (Opus when available). Self-review is not independent audit. See DEVELOPMENT for routing and unavailable-review handling.
- PASS/WARN/BLOCK are audit report terms only. GitHub required status checks are actual Actions jobs selected in Settings; an AI PASS never satisfies CI or grants merge authority.
- Preserve existing mobile input, deployment paths and the game-specific invariants below. Record executed checks, unverified work and human playtest steps; never claim iPhone hardware evidence from browser emulation.
- Repository name, game display name and internal IDs are separate. Renaming, display-name migration, repository Settings and routines are separate tasks unless explicitly requested. Preserve any existing storage identifiers; do not invent a save system.
- Leave an issue/PR, tested commit SHA and evidence for the next AI. Never commit credentials, private chat history, screenshots from local tests, browser executables or local tooling artifacts.

## 3. Game invariants (current values)

### 0. Grid travel is the default (producer decision 2026-11-04, D006)

- **Cells and eyes**: the root entrance walks the same island one 7.5 m cell at a time (`dist/grid.js`, D015) at a 1.63 m eye height (a 170–180 cm person, D020).
- **Ground**: the detailed first area takes level cell-sized steps joined by soft ramps, with dunes, a lookout knoll and a pond near the landing (grid mode only, `useGridTerrain`, D020). Never stand on an off-road cell whose centre leaves under 1.2 m of room around the body (D018). The eye height follows averaged ground rather than raw triangle edges (D010).
- **Turning**: unhurried quarter turns (0.7 s, D022); held keys pause 0.2 s between quarters, while a fresh flick or press in a turn's last 20% chains straight on; X turns round. Turn speed rises continuously from zero (t^0.8), peaks early and settles over its longer second part with zero speed and deceleration (D020, D022: profile t^0.8 (1-t)^2.4). No touch about-face.
- **Keys**: a held key walk glides between cells (18.75 m/s, Shift about 26) and eases out on release; tap-to-step.
- **Touch rule "a flick acts at once, a press-in then slide only looks"** (D016, D019): a flick up steps forward and, held on, walks on one eased cell at a time (no touch glide); a flick down steps back once; a sideways flick turns a quarter as soon as the slide is seen (no wait for release), one per flick. Flicks and taps act in the lower half only, while a press-in glance works anywhere on the screen (D022). Flicks arriving mid-step are queued.
- **Press-in look**: a 0.12 s still press-in (silent since D025) at once zooms around the pressed spot itself, which stays under the finger like a pinch (68 to 48 degrees, D020/D021/D023/D024), easing in and out like a slow lens on a critically damped spring rather than snapping (D027). Keeping the finger down, a sideways slide then moves the eyes from there at a slow, observing 340 px per quarter (D025), a natural glance easing into 45 degrees either way (D017). It settles back on release and never turns.
- **Touch bar** (producer-approved, D023): a compact bottom bar reads `< メニュー … map >` with a step-back `v` in the middle. The faint side-step buttons in the corners and `v` take a cell per press and walk on cell by cell while held. The menu (travel book) sits bottom-left and the automap bottom-right (128 px on phones, 164 px on a desktop, D027; desktop keeps both top right). The space left of the map above the menu is kept for the menu and later status such as HP.
- **View aids**: portrait grid travel lifts the horizon a little with a lens shift so the land ahead fills more of the view; a small arrow-only compass at the top right points north as you face (D024).
- **Roads and props (grid mode only)**: roads are straight runs that follow the grid, with fenced stretches; every prop that blocks a step sits on its own cell centre, never on a road or a pinch cell (D007). Holding a direction against a wall gives a single soft bump without footsteps. The automap shows walls. Free mode keeps the original layout; `?grid=0` keeps the earlier free walking, and invariants 3 and 4 below describe that free mode and its regression checks.
- **Districts** (D025): grid travel is laid out in 20 × 20-cell districts (`AREA_SIZE`; district (0,0) = the first island with the landing in its southern row). District borders are closed hedges, open only at painted gates (every road crossing, plus the fewest more that keep every previously reachable cell reachable, chosen by `planGates`). Each district has its own piece and sky and no two neighbours share a piece; district 1 keeps the shore theme; Watari beyond its bridge keeps its own authored regions with no border through it. A seeded perfect 7 × 7 hedge maze (`carveMaze`) with a folk-art pillar stands in a district near the start. The automap shows the whole current district by default and a tap (or N) switches to the close view.
- **Not yet adopted**: combat, parties and dungeon interiors are planned by the producer but are not specifications; add them only through an Issue.

### 1–10. Sources, free mode and engine

1. `dist/` contains the game sources. Keep its layout. `scripts/build.mjs` produces `dist/nagi-standalone.html`, the dist manifest and existing icon; do not hand-edit generated files or introduce an unrelated build framework.
2. `dist/movement.js` owns gesture input, continuous acceleration, collision detection and spatial indexing; no DOM, WebGL or audio dependencies. `dist/terrain.js` owns the static terrain, routes, landmarks and shared triangle-height cache. `dist/island.js` connects events, fixed 60Hz simulation, rendering, islanders and audio.
3. One-finger origin is neutral. Vertical slide moves forward/back; horizontal slide always turns. Keep keyboard A/D strafing separate. Releasing, cancelling, losing capture, multitouch, blur, rotation and backgrounding clear input; recovery cannot retain movement.
4. Preserve the existing fixed vertical view, 68-degree FOV and absence of head bob or speed-dependent FOV. Velocity follows facing without residual drift. Normal full forward is 14.4, sustained travel up to 16.2, reverse 7.2, keyboard Shift forward up to 18; the precise conditions are in [movement-core.md](docs/movement-core.md). Do not change numbers without an approved issue.
5. Rendering, movement and camera use the same triangulated terrain height. Static terrain/collider changes must rebuild their corresponding cache/world; do not mutate stale snapshots.
6. Swept collision and coastline checks must prevent fast travel through thin objects or into the sea. Preserve deliberate sliding along obstacles/coasts and neutral stops; collider dimensions do not include the player radius twice.
7. Pausing, muting or hiding the page fades the mix out (0.16 s) before the audio clock stops, and resuming fades it back in, so nothing pops (D024). The wider island beyond the first one has its own quiet music regions and a long-road piece, so the shore theme belongs to the first island only (D024). Footsteps depend on actual travelled distance and surface. Idle, turning in place and blocked movement do not add footsteps. Audio unlock requires the start gesture; releasing input stops movement immediately.
8. Preserve existing routes, islanders, landmark triggers, visual culling and original assets. Test-only access is injected into local responses, never shipped in game assets. Keep mobile safe areas, gesture suppression (including double-tap and pinch zoom on the title screen, D022) and the working start screen. The grid-mode title notes stay short, and the menu's controls are a compact gesture/result table with keyboard notes shown only where there is a keyboard (D026).
9. This prototype has no combat, quests or save system. Do not call future world-state ideas implemented or silently merge another game such as `cyber-punk`.
10. Preserve root/dist entry points, relative asset paths, manifest scopes, icons and cache-busting behavior. No service worker. Repository/display-name migration is a separate task.

Current detailed design: [movement-core.md](docs/movement-core.md). Earlier research and numbers remain in [movement-research.md](docs/movement-research.md) as historical evidence. Check current code/tests if they conflict; do not silently reintroduce older speeds or controls.

## 4. Commands and file map

- Use Node.js 22+ and Python 3.12 for CI parity. Runtime has no external packages/CDN.
- `npm run build` regenerates the standalone HTML, dist manifest and icon from existing sources.
- `npm run check` runs JavaScript syntax and deterministic movement/terrain tests.
- `npm run dev` serves `dist/` at port 4173. To test the production root redirect, use `python3 -m http.server 4173` at the repository root instead; do not run both on the same port.
- Existing browser checks: `python3 tests/browser-check.py`, `python3 tests/controls-check.py`, `python3 tests/world-check.py`, `python3 tests/sky-check.py`. See QA for Playwright setup, ports and scope.
- Smartphone portrait is the primary layout. `python3 tests/journey-check.py` covers the travel book, input recovery, quiet subtitles, safe areas and reduced-motion scenery. Keep gameplay's lower half free of UI.
- Pages: `https://hane-san.github.io/ARPG-01-SkyrimStyle/`, main / root, with root `index.html` forwarding to `dist/index.html`. The former `/ARPG/` and `/Koitototsukuru/` Pages URLs return 404; use the current URL.
- File roles: `dist/movement.js` input/movement/collision, `dist/terrain.js` terrain and height cache, `dist/grid.js` grid travel, `dist/island.js` events, rendering, islanders and audio. Details: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## 5. Records and handoff

Leave an issue/PR, the tested commit SHA and evidence for the next AI. Record adoption decisions in DECISIONS, remaining work in ROADMAP and observations in QA or the PR. Independent audit and iPhone playtests stay **unverified** unless actually performed.
