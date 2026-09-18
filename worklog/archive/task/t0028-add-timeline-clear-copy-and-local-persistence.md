+++
id = "t0028"
title = "Add timeline clear, copy and local persistence"
modifies = ["s0002", "s0003", "s0005"]
status = "done"
+++

# Add timeline clear, copy and local persistence

## Scope

- Timeline actions: an icon button that removes every chord (two taps, so a slip cannot erase work), and an icon button that copies the progression as space-separated chord symbols.
- Timeline heading layout: transport and editing icons in two visibly separated groups so six icons read as two purposes, wrapping under the heading on narrow screens without changing button size.
- Persistence: a versioned page document in `localStorage` with independently validated sections (progression entries with IDs, tempo, explicit key) so reopening the page restores them. Unknown sections survive a save so older builds do not erase newer data. Chord data crosses the storage boundary through a plain, catalogue-referencing shape validated with ArkType in `@rechorder/music`.
- Non-goals: candidate, selection and playback state are not stored; no multi-tab sync, cloud storage or undo.

## Completion conditions

- Remove all clears the progression and selection, stops sounding chords, and needs a confirming second tap; Copy places `C Am F G` style text on the clipboard and disables when empty.
- At 320 px and 390 px the timeline heading and its actions fit without page overflow and keep 36 px targets.
- Reloading the page restores entries (including IDs), BPM and Key/Mode; corrupt or foreign storage content falls back to defaults section by section.
- Unit, typecheck, lint, format and chromium browser checks pass; s0002/s0003/s0005 describe the delivered behavior.

## Findings

- `WesternChord.definition` is derived: `alterChord` rewrites suffix and intervals from the recipe. Storing the definition object would freeze stale intervals, so the stored shape is the recipe (definition ID + modifiers) and loading rebuilds through `alterChord`/`setBass`.
- ArkType's declarations reference DOM (`File`, `FormData`, `URL`) and Node (`buffer`) types. With `skipLibCheck: false` it cannot live in `@rechorder/music` (no DOM lib by design); it lives in the app, with a one-line `declare module 'buffer'` shim in `apps/web/src/node-buffer.d.ts`.
- Tempo state moved from the settings form (which read `controller.tempo()`) to the page so it can be stored; an effect applies it to the controller, which ignores equal values.
- Layout: at 390 px the heading, three transport icons and three editing icons fit one row with a hairline divider; at 320 px the two groups wrap together under the heading. Page overflow stays zero.
- Playwright contexts start with empty storage, so existing tests were unaffected; the new test reloads within one context to prove restoration.
