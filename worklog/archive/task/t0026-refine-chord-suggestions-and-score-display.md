+++
id = "t0026"
title = "Refine chord suggestions and score display"
modifies = ["s0003", "s0005"]
status = "done"
+++

# Refine chord suggestions and score display

## Scope

- Keep harmonic function authoritative when concrete voicings are ranked.
- Remove duplicate-sounding suggestions unless their spelling communicates a defensible theoretical distinction.
- Preserve spelling-based identity independently of sounding equality so future tunings and temperaments remain possible.
- Show each suggestion's relative heuristic score with a compact accessible bar.

## Completion conditions

- Cadential recommendations preserve the intended bass resolution.
- Exact-sounding alternatives appear together only when their theoretical analysis differs meaningfully.
- Borrowed-chord explanations validate the complete chord against their claimed source.
- Suggestion cards display normalized relative scores without presenting them as probabilities.
- Focused music tests, type checking, and browser interaction pass.
