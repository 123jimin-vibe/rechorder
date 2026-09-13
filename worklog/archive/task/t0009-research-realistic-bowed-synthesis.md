+++
id = "t0009"
title = "Research realistic bowed synthesis"
status = "done"
modifies = ["s0004"]
+++

## Scope

- Investigate the current brassy chord timbre and research realistic, expressive synthesis without soundfonts, preserving arbitrary-frequency input.
- Compare physical string excitation, body response, ensemble behavior and browser feasibility using primary sources.
- Produce a concrete proposed architecture and verification plan; distinguish findings from untested sound-quality claims.

## Completion

- Record cited findings and a practical recommendation, including limitations and a listening-based acceptance path.
- Preserve production behavior during this research task; t0008's duration questions remain pending.

## Outcome

- n0002 records primary-source research, current-code findings, a comparison of synthesis approaches, and the proposed physical-string/body/ensemble architecture with listening acceptance criteria.
- Added `docs/research/audio-mix-diagnostic.mjs`. Its repeatable two-tone experiment confirms intermodulation in the current static output curve while explicitly excluding the full audio chain and perceived timbre.
- Research artifact formatting, diagnostic lint, rerun and diff whitespace checks passed. No replacement synthesizer, subjective listening validation or mobile benchmark is claimed.
- Reviewed s0004: this task supplies research toward its bowed-character requirement without changing production behavior or introducing authoritative new defaults. No spec edit is needed for the research outcome. t0008 remains pending independently.
