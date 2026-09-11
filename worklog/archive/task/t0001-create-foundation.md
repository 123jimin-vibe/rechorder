+++
id = "t0001"
title = "Create foundation"
modifies = ["s0002"]
status = "done"
+++

# Create foundation

## Outcome

An empty website, foundational codebase, and lightweight build system governed by s0002.

## Direction

- Preact + Vite selected after considering React and esbuild: native JSX transformation, no Babel or custom HTML/asset pipeline.
- Node.js 24 LTS, pnpm workspace, TypeScript 7, recommended strict configs, Oxlint, and Prettier.
- Lightweight boundaries; no dependency-analysis framework.
- Musical foundations must accommodate atypical temperaments and complex beats. Concrete music/audio implementations belong to t0002.
- Concise specs with principles emphasized. Related s0003/s0004 cleanup is separately authorized in the same request.

## Completion

- [x] Concise s0002; related spec cleanup and user corrections recorded.
- [x] Blank site, documented commands, pinned toolchain, and reproducible installation.
- [x] Static entry structure, centralized base path, and GitHub Pages workflow.
- [x] Formatting, lint, types, and production build pass.
- [x] Browser checks pass or browser unavailability is explicitly recorded.
- [x] Verification evidence and implementation markers reconciled.

## Verification — 2026-09-12

- Node 24.11.1, pnpm 10.34.5, TypeScript 7.0.2, Preact 10.29.8, Vite 8.3.0.
- `pnpm check` and `pnpm build` pass. A temporary explicit-`any` probe was rejected by Oxlint and removed.
- A fresh source copy installed offline with the frozen lockfile and built successfully.
- Chrome 152.0.7977.83: desktop and portrait checks pass at `/rechorder/`.
- Edge 152.0.4191.66: desktop and portrait checks pass on the fresh build at `/verification/`.
- Checks cover the blank styled surface, document title, horizontal overflow, reload, asset failures, and application errors. The portrait screenshot was visually inspected.
- Sandbox process restrictions required normal process permissions for command resolution and browser cleanup; completed runs exit successfully.
- Firefox/WebKit Playwright binaries were unavailable; physical-device checks remain for human testers. GitHub Actions and live Pages deployment have not run from this local checkout.

The foundation is delivered locally. t0002 remains unimplemented. The user's autonomous worklog policy and s0001's read-only mode were preserved.
