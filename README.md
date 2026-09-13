# Rechorder

A web music scratchpad. Create a chord progression at
`/rechorder/chord-progression/` or freely play a two-row piano at
`/rechorder/piano/`. Both utilities are linked from the home page.
Requirements and task history live in `worklog/`; start with s0001 and s0002.

Tap a root and chord type to audition, then Append or Replace. Timeline chords
load and play with one tap; the backspace icon removes the last chord. The piano's
rows scroll independently, including while holding a note on the other row. Rotate cycles
through all four orientations without changing device orientation. Audio uses a bowed-string synth. The initial warm-neutral/teal palette is
defined by semantic CSS variables in `apps/web/src/styles.css`.

## Development

Use Node.js **24.11.1** (`.node-version`) and pnpm **10.34.5** (`packageManager`).
The lockfile pins the dependency graph. Commands work in PowerShell and Unix shells.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:5173/rechorder/`.

| Command             | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `pnpm check`        | Formatting, lint, TypeScript, and unit tests |
| `pnpm test`         | Musical, editing, and audio lifecycle tests  |
| `pnpm format`       | Apply consistent formatting                  |
| `pnpm build`        | Type-check, then build into `apps/web/dist`  |
| `pnpm preview`      | Serve that production build on port 4173     |
| `pnpm test:browser` | Check the production build using Playwright  |

Install the recommended VS Code extensions for Oxlint, Prettier, and TypeScript's
native language service. The project enables formatting and explicit lint fixes on save.

## Structure and boundaries

- `apps/web`: HTML entry pages, Preact presentation, styles, and application composition.
- `packages/music`: musical models, conventional chord/voicing adapter, tuning, and immutable progression operations; no browser globals.
- `packages/audio`: cancellable audio-clock scheduling, active-note reporting, and the native Web Audio instrument; no UI dependencies.
- `tsconfig.base.json`: recommended strict rules with no ambient DOM or Node globals.
- Separate web, build-tool, and browser-test configs add only their required environments.

Musical data/operations must remain independent of Preact, DOM, and browser audio
objects. The application assembles sound implementations and owns their lifetime.
Keep musical edits, UI selection, and transient playback state distinct. Future
sequencing must not depend on rendering. Musical models must accommodate atypical
temperaments and complex beats. See [music and audio contracts](docs/music-and-audio.md)
for current interfaces and the path to sequencing and additional musical systems.

Use explicit package dependencies and public exports as packages are introduced.
Review imports and ownership; no architecture-analysis framework is installed.
Project code permits neither explicit nor implicit `any`. Third-party declarations
are type-checked but are not rewritten to follow project coding rules.

Preact keeps presentation small. Vite owns HTML/asset processing, static builds,
and development serving; an esbuild-only setup would require custom orchestration.
Preact uses Vite's native JSX transform without a framework plugin or Babel.
TSX changes use normal reloads; state-preserving component refresh is not configured.
Use CSS Modules for component styles and native CSS features throughout.

## Pages and deployment

The shared base path is in `apps/web/site.config.ts`. `SITE_BASE` can override it
for a custom domain or alternate path; set it consistently for builds and checks.
For example, in PowerShell:

```powershell
$env:SITE_BASE = '/'
pnpm build
pnpm preview
```

The default production address is `https://123jimin-vibe.github.io/rechorder/`.
Select **GitHub Actions** as the repository's Pages source. The Site workflow
checks PRs and builds/deploys `main`, including manual runs on `main`.
This checkout does not by itself enable Pages or publish uncommitted changes.

Future utilities get real HTML entry pages under `apps/web` and explicit Vite build
inputs. Deep links must resolve to static files; do not add a 404 redirect workaround.

## Browser verification

Build first. Install Playwright browsers, then run the relevant projects:

```sh
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

An installed Chrome or Edge can run the Chromium checks without a browser download:

```powershell
$env:BROWSER_CHANNEL = 'chrome' # or 'msedge'
pnpm test:browser --project=chromium-desktop --project=chromium-portrait
```

CI runs Chromium desktop/portrait checks against the built site. An unavailable
browser installation is explicitly reported as a skip; actual test failures fail CI.
Local runs also support Firefox desktop and WebKit portrait. Emulation does not
replace human testing on iOS Safari, Android Chrome, and other target devices.
Record tested versions and unavailable coverage in the task. Browser checks include
editing, keyboard access, overflow, failures, and native audio waveform output.
Waveform checks do not replace perceptual listening on physical devices.
