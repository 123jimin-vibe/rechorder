+++
id = "s0002"
title = "Site"
+++

# Site

This spec concerns aspects common across the entire site. s0001 governs the product direction, including mobile-centric, portrait-first responsive UI.

## Existing requirements

- TypeScript 7 is used.
- The build step should be light (no Babel in particular).
- The site will be published via GitHub Pages.
- The site shall support multiple languages (i18n).

## Foundation milestone — UNIMPLEMENTED

t0001 delivers an empty website, foundational codebase, and build system. It also makes this spec concrete enough to govern that implementation; further specs may be created where adequate.

The foundation must support modular, maintainable growth into utilities and eventually a fully fledged DAW. Preventing future technical debt is a primary design constraint, not a later cleanup task.

## Chord utility milestone — UNIMPLEMENTED

t0002 adds the utility specified in s0003 and reusable sound code specified in s0004. Foundational UX is in scope; non-essential features and intricate design are outside this milestone.

Multi-language support remains a site requirement for future delivery. Non-English support is explicitly outside t0002; this milestone does not require translated UI.

## Proposed foundation acceptance criteria — NEEDS APPROVAL

- A fresh checkout has documented install, development, type-check, and production-build commands, with explicit runtime and package-manager requirements and reproducible dependency resolution.
- The production output is a static site compatible with GitHub Pages, including asset resolution under its configured base path. Publishing is governed by the existing GitHub Pages requirement; the deployment target and mechanism must be settled during refinement.
- The empty website loads without application errors at mobile portrait and desktop sizes. It does not contain demo features or speculative DAW UI.
- Document module responsibilities and dependency direction: application composition and UI may depend on reusable music and audio contracts; reusable music logic must not depend on page components or a UI framework. Audio implementation details remain behind an explicit boundary.
- Keep the build lightweight and Babel-free. Verify TypeScript 7 availability and compatibility when selecting the toolchain; do not silently substitute another version or assume the latest release.
- Establish checks that protect meaningful module boundaries and build correctness. Do not create unused abstractions or a generic DAW framework to satisfy hypothetical requirements.

## Decisions to resolve during t0001 — NEEDS APPROVAL

- Framework or UI approach, build tool, package manager, supported runtime and browser baseline, and exact compatible dependency versions.
- Directory/module structure, enforceable dependency rules, and the minimum checks needed to keep those boundaries intact.
- Meaning of the empty site shell, GitHub Pages base path, and deployment workflow.
- How future localization can be added without coupling reusable music/audio code to UI text; no translation work is implied by this proposal.

These are open choices, not selected technologies or approved product behavior. Record agreed decisions here, or in a focused additional spec, before implementing dependent work.
