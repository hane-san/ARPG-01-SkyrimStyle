# Claude Code entrypoint

@AGENTS.md
@docs/DEVELOPMENT.md

For PR supervision (reviews, CI fixes, conflicts, overnight rounds) follow `.claude/skills/steward/SKILL.md`.

The same project contract applies in ChatGPT/Codex and Claude Code. Use the current
repository, approved GitHub documentation and issue as the source of truth; never
assume another assistant's private memory or unseen chat history.
Use the actual available model in Claude Code; this file does not select one.
For implementation follow the issue scope; for review use the PR diff and
independent evidence.
Follow the autopilot phase in AGENTS.md (human instruction 2026-11-14): adopted PRs merge through the required checks `rules`, `browser` and `gate` and GitHub auto-merge, and the daily 15:00 run is retired. Never push directly to main or force-push. For a large change the human asks for directly, write a short technical design in the PR body first, then leave merging to auto-merge. Record unverified checks; how the parts work is in `docs/AUTOPILOT.md`.
