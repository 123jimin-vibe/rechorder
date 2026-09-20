+++
id = "t0035"
title = "Audit closed chord vocabularies and research open-ended harmonic assessment"
status = "done"
modifies = []
+++

# Audit closed chord vocabularies and research open-ended harmonic assessment

## Scope and completion

- Research and audit only: identify catalogue gates, representational limits, search bounds, and stylistic scoring assumptions in the harmonic grid and progression tools.
- Explain computable chord and sequence descriptors that accept unnamed note collections, with primary research sources and explicit limitations.
- Preserve findings in a research note, separating observed behavior from proposed design. No application or governing-spec changes are required for this investigation.
- Complete when code evidence and sources support both requested findings. Musical objectives and future implementation choices remain open for the user.

## Outcome and verification

- n0005 records the hard catalogue/storage gates, stylistic priors, tuning/layout distinctions, and local-search limitations with implementation references.
- Primary research supports separate acoustic and sequential descriptors; proposed generation/evaluation changes are explicitly distinguished from observed behavior and validated perceptual findings.
- Existing harmonic-grid and recommendation unit suites passed: 2 files, 34 tests. No new application behavior or perceptual model was implemented.
- `modifies` remains empty: this research outcome requires no changes to s0003, s0005, or s0007. Future implementation needs a separately scoped task and corresponding spec changes.
