# 凪の島 — NAGI / AI development contract

This is the canonical `hane-san/ARPG-01-SkyrimStyle` repository (formerly `hane-san/ARPG` and `hane-san/Koitototsukuru`). Scope work to this game.
Read [docs/DESIGN.md](docs/DESIGN.md), [docs/DECISIONS.md](docs/DECISIONS.md),
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), [docs/ROADMAP.md](docs/ROADMAP.md),
[docs/QA.md](docs/QA.md) and the approved issue before editing. Claude Code imports this contract from `CLAUDE.md`.

## Shared AI development contract

- The human producer decides game specifications, playtest acceptance and integration into main. Distinguish approved, proposed, deferred, superseded and unverified items. Do not invent missing chat context; surface contradictions between approved specs, code and tests.
- Handoff: human adoption in Chat -> Issue with acceptance criteria -> Codex or Claude Code/Sonnet work branch -> PR -> CI -> risk-based independent audit -> human playtest/approval -> main. Choose the implementation line by availability and context; model names are roles, not fixed API dependencies.
- Never push directly to main, force-push or enable auto-merge. Fetch current main, inspect open PRs and coordinate overlapping files; preserve other contributors' work.
- Record risk and evidence in the PR. Low-risk wording/docs changes may omit independent audit; medium-risk changes need an independent review of affected behavior; high-risk terrain/input/save/state changes need prior technical design and deeper independent audit (Opus when available). Self-review is not independent audit. See DEVELOPMENT for routing and unavailable-review handling.
- PASS/WARN/BLOCK are audit report terms only. GitHub required status checks are actual Actions jobs selected in Settings; an AI PASS never satisfies CI or grants merge authority.
- Preserve existing mobile input, deployment paths and the game-specific invariants below. Record executed checks, unverified work and human playtest steps; never claim iPhone hardware evidence from browser emulation.
- Repository name, game display name and internal IDs are separate. Renaming, display-name migration, repository Settings and routines are separate tasks unless explicitly requested. Preserve any existing storage identifiers; do not invent a save system.
- Leave an issue/PR, tested commit SHA and evidence for the next AI. Never commit credentials, private chat history, screenshots from local tests, browser executables or local tooling artifacts.

## Run and verify

- Use Node.js 22+ and Python 3.12 for CI parity. Runtime has no external packages/CDN.
- `npm run build` regenerates the standalone HTML, dist manifest and icon from existing sources.
- `npm run check` runs JavaScript syntax and deterministic movement/terrain tests.
- `npm run dev` serves `dist/` at port 4173. To test the production root redirect, use `python3 -m http.server 4173` at the repository root instead; do not run both on the same port.
- Existing browser checks: `python3 tests/browser-check.py`, `python3 tests/controls-check.py`, `python3 tests/world-check.py`, `python3 tests/sky-check.py`. See QA for Playwright setup, ports and scope.
- Smartphone portrait is the primary layout. `python3 tests/journey-check.py` covers the travel book, input recovery, quiet subtitles, safe areas and reduced-motion scenery. Keep gameplay's lower half free of UI.
- Pages: `https://hane-san.github.io/ARPG-01-SkyrimStyle/`, main / root, with root `index.html` forwarding to `dist/index.html`. The former `/ARPG/` and `/Koitototsukuru/` Pages URLs return 404; use the current URL.

## Producer's standing merge delegation (2026-11-05, D013)

The human producer delegated **normal PR merging for this game's requests** to the AI working the request: "今後の指示ふくめこのゲームに対してはマージまで一貫でやっちゃって". For requests from the producer, work branch → PR → exact-head `rules`/`browser` success → normal merge commit → confirm main Actions and Pages. Still prohibited: direct push to main, force-push, GitHub auto-merge, PR approvals, Settings changes, deleting or weakening tests. Independent audit and iPhone playtests remain unverified unless actually performed; record them so.

## Game-specific invariants

0. **Default travel is grid-based (producer decision 2026-11-04, D006).** The root entrance walks the same island one 7.5 m cell at a time (`dist/grid.js`, D015): slow quarter turns on keys (0.55 s, held turns pause 0.2 s between quarters; X turns round), a held key walk that glides between cells (18.75 m/s, Shift about 26) and eases out on release, tap-to-step, touch rule "a flick acts, a held slide only looks" (D016): flicks step forward / step back / turn a quarter left or right, one per flick, and a flick up held on walks on one eased cell at a time (no touch glide); flicks arriving mid-step are queued; a 0.12 s still press arms with a soft click, then a sideways slide only moves the eyes (150 px per quarter, up to 120 degrees either way) and settles back on release, never changing the heading; side-steps are two faint touch-only buttons in the bottom corners (a press is one cell, held walks on cell by cell), the one producer-approved exception to the empty lower half; no touch about-face; grid roads are straight runs with fenced stretches (grid mode only), a single soft bump without footsteps while a direction is held against a wall, an eye height that follows averaged ground rather than raw triangle edges (D010), and an automap with walls. In grid mode roads follow the grid and every prop that blocks a step sits on its own cell centre, never on a road or a pinch cell (D007); free mode keeps the original layout. `?grid=0` keeps the earlier free walking; invariants 3 and 4 below describe that free mode and its regression checks. Combat, parties and dungeon interiors are planned by the producer but not yet adopted as specifications; add them only through an Issue.

1. `dist/` contains the game sources. Keep its layout. `scripts/build.mjs` produces `dist/nagi-standalone.html`, the dist manifest and existing icon; do not hand-edit generated files or introduce an unrelated build framework.
2. `dist/movement.js` owns gesture input, continuous acceleration, collision detection and spatial indexing; no DOM, WebGL or audio dependencies. `dist/terrain.js` owns the static terrain, routes, landmarks and shared triangle-height cache. `dist/island.js` connects events, fixed 60Hz simulation, rendering, islanders and audio.
3. One-finger origin is neutral. Vertical slide moves forward/back; horizontal slide always turns. Keep keyboard A/D strafing separate. Releasing, cancelling, losing capture, multitouch, blur, rotation and backgrounding clear input; recovery cannot retain movement.
4. Preserve the existing fixed vertical view, 68-degree FOV and absence of head bob or speed-dependent FOV. Velocity follows facing without residual drift. Normal full forward is 14.4, sustained travel up to 16.2, reverse 7.2, keyboard Shift forward up to 18; the precise conditions are in [movement-core.md](docs/movement-core.md). Do not change numbers without an approved issue.
5. Rendering, movement and camera use the same triangulated terrain height. Static terrain/collider changes must rebuild their corresponding cache/world; do not mutate stale snapshots.
6. Swept collision and coastline checks must prevent fast travel through thin objects or into the sea. Preserve deliberate sliding along obstacles/coasts and neutral stops; collider dimensions do not include the player radius twice.
7. Footsteps depend on actual travelled distance and surface. Idle, turning in place and blocked movement do not add footsteps. Audio unlock requires the start gesture; releasing input stops movement immediately.
8. Preserve existing routes, islanders, landmark triggers, visual culling and original assets. Test-only access is injected into local responses, never shipped in game assets. Keep mobile safe areas, gesture suppression and the working start screen.
9. This prototype has no combat, quests or save system. Do not call future world-state ideas implemented or silently merge another game such as `cyber-punk`.
10. Preserve root/dist entry points, relative asset paths, manifest scopes, icons and cache-busting behavior. No service worker. Repository/display-name migration is a separate task.

Current detailed design: [movement-core.md](docs/movement-core.md). Earlier research and numbers remain in [movement-research.md](docs/movement-research.md) as historical evidence. Check current code/tests if they conflict; do not silently reintroduce older speeds or controls.
