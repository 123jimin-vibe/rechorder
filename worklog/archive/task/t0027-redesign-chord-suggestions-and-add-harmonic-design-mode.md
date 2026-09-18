+++
id = "t0027"
title = "Redesign chord suggestions and add harmonic design mode"
modifies = ["s0003", "s0005"]
status = "done"
+++

# Redesign chord suggestions and add harmonic design mode

## Scope

- Ground the heuristic in progressions across genres (n0004) instead of one idiom.
- Replace the suggestion ranker with fewer, orthogonal terms: key-role prior, root motion, register-free voice leading, complexity; then bass line and register.
- Fix the observed defects for C → Em/B: static inversions and sus chords on top, an inverted iii mistaken for a tonic, key-blind relation scores, diversity discarding the best chords.
- Add theory-driven chord design: key-relative Function pads with a sevenths toggle, and move chips (V→I, ii–V, fifths, step, third, color) that narrow suggestions.

## Completion conditions

- C → Em/B in C major suggests Am, G, F/A, C (bass line continues to A; no chord stalls on B); C → Em/B → Am suggests C/G first.
- Dm7 → G7 resolves to a C-rooted tonic; Am7 → ? → G offers D7 as ii–V/V.
- Inference of [C, Em/B] prefers C major over E minor.
- Function pads audition diatonic triads/sevenths of the design key; a move chip filters every listed suggestion; empty focused results are explained.
- Unit, typecheck, lint, format and chromium browser checks pass.

## Findings

- Ranking harmony in pitch-class space and choosing the register afterwards removed the incentive for gratuitous inversions; the old register-local metric charged root-position chords for normal bass motion.
- Bass-line detection must be register-free: the model voices Em/B as B4 E5 G5 after C4 E4 G4, yet the line is heard as C → B.
- Applied dominants must exclude diminished goals (no V/vii°), and augmented triads must not pass as diatonic V in minor.
- Playwright serves `pnpm preview` from `dist/`; run `pnpm build` before browser checks or stale code is tested.
- Firefox/WebKit Playwright browsers are not installed on this machine; only chromium projects were run.
