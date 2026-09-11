+++
id = "t0001"
title = "Create foundation"
modifies = ["s0002"]
status = "pending"
+++

# Create foundation (NEEDS APPROVAL)

## Requested outcome

Deliver an empty website, foundational codebase, and build system. Make the minimal governing specs concrete as part of this task; create further specs if adequate. This task precedes t0002.

The user explicitly requested these outcomes. The proposed execution and acceptance details below require content approval where they go beyond the request and existing specs.

## Proposed work — NEEDS APPROVAL

1. Refine s0002 against s0001: settle the empty-site deliverable, compatible toolchain, build/development commands, mobile baseline, and GitHub Pages build/deployment requirements. Preserve the existing TypeScript 7 and no-Babel constraints; surface incompatibilities instead of silently changing them.
2. Define a small module structure and dependency rules that support the later chord utility and reusable music/audio code. Record reasoning, likely change points, and how boundaries are checked. Avoid building unused DAW infrastructure.
3. Resolve material unspecified choices with the user and record authoritative behavior before implementing it. If a new governing spec is needed, create it and extend `modifies` before dependent work. s0001 remains read-only.
4. Implement the empty responsive site, foundational structure, and reproducible lightweight build system.
5. Verify the production build and static-hosting behavior; document setup, checks, module boundaries, and the extension path for t0002.

## Proposed completion conditions — NEEDS APPROVAL

- [ ] s0002 concretely governs the delivered foundation; any additional governing specs are listed in `modifies`, with required proposals resolved.
- [ ] A fresh checkout can follow documented commands to install, develop, type-check, and produce the static site using the selected versions.
- [ ] The empty website loads without application errors at mobile portrait and desktop sizes; built assets resolve under the agreed GitHub Pages base path.
- [ ] Module responsibilities and dependency direction are documented and checked where meaningful; the structure permits a utility to consume reusable music/audio code without making that code depend on the utility page.
- [ ] Record build and browser verification evidence and material limitations. Reconcile implementation markers with delivered behavior before closure.

## Scope boundary

No chord utility implementation, other music features, or intricate visual design belongs here. Deployment details, technology selections, and the exact empty shell remain refinement decisions; this task does not invent them.

## Next action

Refine and obtain approval for the open foundation choices in s0002, then implement the agreed foundation. This task is pending; creation does not indicate implementation has started.
