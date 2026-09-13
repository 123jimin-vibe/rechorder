+++
id = "t0007"
title = "Refine string sound and editor density"
status = "done"
modifies = ["s0003", "s0004"]
+++

## Scope

- Replace plucked sound with sustained violin/cello-like synthesis; improve audible midrange and consistent chord levels.
- Move Now playing above Progression and compact Append/Replace above Root.
- Compact root/bass pads and jazz choices while retaining spelling, direct selection, keyboard access, and future adapter independence.

## Completion

- Verify sustained output, pitch, mobile-band energy, overlap headroom, and cancellation.
- Run project checks, build, and available browser interaction/layout checks.
- Record actual-device listening as a human verification limit.

## Verification

- `pnpm check` and `pnpm build` passed; 55 unit tests cover lifecycle, pitch, sustained energy and a 300 Hz–4 kHz speaker-band approximation.
- 26 browser checks each passed in Chrome 152.0.7977.83 and Edge 153.0.4234.32: native output, sustained triad/extended-chord RMS, overlap peaks, release, keyboard/touch, portrait, enlarged text, and editing semantics.
- Reviewed expanded desktop and portrait screenshots; widened jazz cells to preserve complete labels. Stable-layout assertions use document coordinates to exclude native scrolling.
- Reconciled s0003, s0004 and the audio architecture document. Compact spelling pads retain direct access; the separate piano remains a replaceable conventional-adapter view.
- Playwright's requested bundled Chromium revision, Firefox and WebKit were unavailable. Physical-phone listening/touch and subjective violin/cello likeness remain human checks; signal tests do not certify device loudness or timbre.
