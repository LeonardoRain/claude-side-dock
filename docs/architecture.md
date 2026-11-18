# Code layout

The code under `hooks/` is grouped by where things show on screen, with each part's
state and event hooks kept apart from its drawing.

```
hooks/
  register.tsx       entry: runs each event's hooks as one chain, in the order below
  shell/             the dock itself
    dock.ts          the pane's id, the one `sections` atom, open / close / isOpen
    chain.ts         then / settled / none, tool-name routing for savvy, the skill-text rename
    words.ts         the dock's own words (en / zh)
    band.tsx         above the prompt: the crab row, then the session stats row
    pane.tsx         the dock pane: Session panel, work map, Crab crew
  core/
    lang.ts          the UI language, set once per session
  band/              drawn above the prompt
    crab/            the crab scene, its props and the usage meter
    stats/           the session stats row and the flow's progress bar
    pixel/           the Pixel plan bar and subagent strips (from claude-deck)
  pane/              drawn inside the dock
    session/         the Session panel's cards (cost, context, tokens, models, subagents) and its terminal text
    map/             the work map: SVG drawing, palette, rich look, braille / raster terminal map, feed rows
    crew/            the Crab crew section
  state/             each part's state and event hooks; no drawing
    crab/            activity recognition, crew tracking, the crab's timers and hooks
    lot/             station classification, setup, words, the board and its hooks
    savvy/           flow / agents / meter state, pricing, cost persistence, routing commands, words
    deck/            the plan bar's state and its hooks
types/index.d.ts     shared types
```

## Rules

- `state/` never imports from `band/` or `pane/`. Drawing reads state through what
  `state/<part>/index.ts` exports. Render hooks (`*_ui_render_*`) live with their
  drawing, in `band/<x>/` or `pane/<x>/`.
- Each folder's `index.ts` is its public face; other folders import only from it.
- Atom keys (`{ plugin: 'side-dock-claude', key }`) never change: they are stored
  between sessions.
- Tests sit next to the code they test.

## Where the upstream code went

| Upstream | Now |
| --- | --- |
| crab-cam | `state/crab`, `band/crab`, `pane/crew` |
| lot-map | `state/lot`, `pane/map` |
| savvy-progress | `state/savvy`, `band/stats`, `pane/session` |
| claude-deck (Pixel bar) | `state/deck`, `band/pixel` |
