+++
id = "s0002"
title = "Site"
+++

# Site

Site-wide requirements; product direction is in s0001.

## Principles

### Reusable musical foundations

- Separate musical data/operations, application workflows, audio implementation, and UI.
- Musical data must support atypical temperaments and complex beats; do not make twelve-tone equal temperament or a fixed beat grid universal assumptions.
- Reusable music code is independent of UI frameworks, DOM, and browser audio objects. The application composes implementations and owns their lifecycle.
- Keep editable musical data, UI state, and transient playback state separate. Future sequencing operates independently of UI rendering.

### Prevent debt without speculative infrastructure

- Keep modules small, responsibilities explicit, and dependencies one-way.
- Use package exports, declared dependencies, and code review. No dedicated architecture-analysis framework.
- Introduce shared packages with real callers. Defer a global store, plugin system, workers, and DAW infrastructure until needed.
- Keep specs concise: principles first, requirements next, open decisions last.
- When runtime schemas are needed for untrusted or external values, prefer ArkType. Do not add schemas solely to mirror trusted TypeScript values.

### Accessible, mobile-first presentation

- Prioritize portrait layouts, semantic HTML, keyboard access, visible focus, and zoom.
- Favor self-explanatory controls over help text. Use space economically while preserving touch targets and visual rhythm; ordinary editing and audition must not shift surrounding layout.
- Use native modern CSS: nesting, variables, and logical properties; no SCSS.
- Utility styling uses replaceable semantic palette tokens: warm neutral surfaces and teal accents initially. Keep selected states, readable contrast, and focus visible.
- Separate display text from musical identifiers and reusable logic. Prepare for localization without implementing translations yet.

## Foundation — t0001

- Deliver a blank website with document metadata, viewport settings, and minimal base styles.
- Use Preact, Vite, Node.js 24 LTS, and pnpm in a small workspace. No Babel.
- Use stable TypeScript 7; TypeScript 6 is permitted only for substantial, documented tooling incompatibility.
- Extend recommended strict TypeScript configs. Prohibit explicit and implicit `any` in project code; browser-independent code must not receive DOM globals.
- Use Oxlint and Prettier without complicating the stack for TS7 compatibility. Provide editor integration.
- Pin tool versions and direct dependencies, commit one lockfile, and support Windows-compatible install, development, check, build, and preview commands.
- Use static HTML entry pages for separate utilities, with a centralized hosting base path.
- Utilities may rotate their own viewport clockwise through 0°, 90°, 180°, and 270° without requiring device rotation. Keep the view container and its input-coordinate orientation reusable across utilities.
- Publish GitHub Pages artifacts through Actions after checks pass on `main`, with a manual trigger. Default to `/rechorder/`; permit an explicit build base for other hosting paths.

## Local persistence — t0028

### Principles

- A utility's durable state lives in one stored document per page under a single browser storage key, so a whole page can later be exported, imported or shared as one object.
- The document is a versioned record of independent sections, each owned by the feature that stores it and validated on load with ArkType. A corrupt or outdated section falls back to its default alone; unknown sections are carried through saves so a newer build's data survives an older build.
- Store editable data and settings; never store transient UI or playback state (candidate, selection, transport). Musical values cross the boundary as plain recipes — positions, catalogue IDs and explicit modifiers — rebuilt through the musical operations, so stored data follows catalogue corrections and other systems can add their own shapes.
- Save after every change of a stored value; load once at page start. Unavailable or throwing storage degrades to in-memory behavior with a console warning, never a broken page.

### Chord progression — t0028

- Sections: progression entries with their stable IDs, the BPM setting and the explicit Key/Mode setting (Auto stored as none). Reopening the page restores them with nothing selected and no audio started.

## Verification

- CI checks formatting, lint, types, and the production build using a frozen lockfile.
- Check built assets, page interactions, and application errors with Playwright where adequate browsers exist. Record browser unavailability as a skip, never a pass.
- Target current and previous major iOS Safari, Android Chrome, and desktop Chrome/Edge, Firefox, and Safari. Record actual tested versions; humans also test target devices.
- Use focused Vitest tests for musical operations, editing boundaries, and playback lifecycle.

## Chord progression utility — t0002

The static `/chord-progression/` page implements s0003–s0005, linked from a plain home-page feature list. A decorated landing page and non-English support remain later work.

## Piano utility — t0010

The static `/piano/` page implements s0006 and follows the chord progression link on the home-page feature list.
