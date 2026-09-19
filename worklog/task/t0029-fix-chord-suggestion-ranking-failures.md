+++
id = "t0029"
title = "Fix chord suggestion ranking failures"
modifies = ["s0003"]
status = "done"
+++

# Fix chord suggestion ranking failures

## Scope

- Reported: on C major, C G Am Em, Replace on Em offers Cmaj7/B, F, C/G, E/B. Cmaj7/B
  sounds poor, the list looks unsorted, and Em never appears as an alternative to
  other chords. Next after C G Am offers Cmaj7/B, F, Dm, C/G.
- Reproduced exactly with `recommendChords` (explicit key C). This task records the
  observed failures and their causes in `packages/music/src/recommendations/`.

## Observed failures (limit 4, the panel's size)

| Context                 | Result                                   | Expected                                |
| ----------------------- | ---------------------------------------- | --------------------------------------- |
| C G Am → ?, key C       | Cmaj7/B, F, Dm, C/G                      | root-position C, F, Dm, Em among them   |
| F G → ?, key C          | C6/A, Dm/A, B/F♯, E/G♯                   | C first; C is 5th at 4.17 vs C6/A 4.21  |
| F G → ?, auto           | Am, E/G♯, C, D/A                         | C or Am first                           |
| Am F C G → ?, auto      | E, Dm, Am, B                             | C; C scores 1.33, below B major         |
| Am F C G → ?, key C     | C, Dm, B, F                              | B (V/iii) should not outrank F or Am    |
| C Dm → ?, key C         | Am/E, G7, F/C, B♭                        | G root position                         |
| Dm7 G7 → ?, key C       | Cmaj7, F6, Am7, B♭7                      | plain C offered somewhere               |
| G7 → ?, auto            | Cadd9, Dm6, Fadd9, E7                    | C                                       |
| E7 → ?, key Am          | Am7, Dm6, G6, Fmaj7                      | Am                                      |
| Am Dm E7 → ?, key Am    | Am7, G7/F, Fmaj7, B7/F♯                  | Am; G7/F is not idiomatic               |
| C F → ?, key C          | Am, G, Dm, B♭sus2                        | C among top 4 (it is 5th, −1.5 penalty) |
| C → ?, key C            | F, G, Am, E                              | Dm before E/A♭; Dm is 8th               |
| C G Am → ?, ↑5th focus  | E/B, Edim/B♭, Em/B, Eaug/G♯              | Em/B ahead of Edim/B♭                   |
| C Am → ?, V→I focus     | empty                                    | see cause 8                             |
| Replace C in C G Am F   | Cmaj7, Am7, Fsus2, Em                    | Fsus2 outranking F                      |
| Replace Em in C G Am Em | Cmaj7/B 5.69, F 3.84, C/G 5.08, E/B 3.63 | bars monotonic with position            |

## Causes, in order of impact

1. **False bass-line detection** (`voice-leading.ts` `detectBassLine`). Any two root-position
   chords whose roots are a whole or half step apart start a "line" (G→Am, F→G, C→Dm,
   Dm→E7). n0004 §4 intends inversions to _serve_ an existing stepwise bass; the code
   treats ordinary root motion as one. Consequences:
   - `chooseVoicing` weights the bass-line term −100, so the inversion continuing the
     step always wins and only one voicing per harmony is kept: root-position C, Em, G,
     Am are never generated after G→Am, F→G, C→Dm.
   - The bonus `1.5 × bassLine × min(1, role/2.4)` is the largest single term in the
     score (I vs IV differ by 0.3, I vs ii by 0.9), so Cmaj7/B, C6/A, Am/E, G7/F top the
     list purely by having a chord tone on the next scale step.
   - Cmaj7 is chosen over C because only the seventh chord contains B; third inversion
     puts the root a semitone above the bass (B4 C5 E5 G5), the harshness the user hears.
2. **Displayed score ≠ ranking**. Greedy diversity reranking (`recommend.ts` end) subtracts
   −1.5 per repeated root, −0.75 per repeated bass and −1 × pitch-set overlap, but `score`
   and the UI meter use the pre-diversity value. F (3.84) sits above C/G (5.08). s0003 calls
   the bar a comparative ranking; it contradicts the list order.
3. **Diversity penalties distort content, not just order**.
   - −1.5 per repeated root removes the other quality on the same root: C behind Cmaj7/B,
     Am behind Am7, Em behind E/B. After G7 or E7 the plain tonic triad is never offered.
   - Overlap uses the larger set's size, so a seventh chord sharing two tones (2/4) is
     penalised less than a triad sharing two (2/3); Am7 displaces Am between C and G.
   - Diatonic chords share tones with each other; chromatic ones share none. After Am F C
     G, B major (V/iii) outranks F and Am by avoiding overlap.
   - With a `focus` every candidate shares the root by construction, so the root penalty is
     noise and ranking degenerates to "least similar to the first pick": Edim/B♭ over Em/B.
4. **Register-free voice leading weighs like function**. `pitchClassMovement` rewards
   common tones and chromatic neighbours and punishes diatonic steps: C→Dm 1.67 vs
   C→A♭ 0.67, G→C 1.00 vs G→B 0.67, F→B♭ 1.00 vs F→B♭sus2 0.33, C→Am 0.67 vs C→Am7 0.29.
   Its spread (~1.5) equals the role gap between I and iii, so ♭VI, V/iii, sus and added
   tones rise above ii, IV, V. n0004 §5 calls smoothness evidence of coherence, not a
   primary driver.
5. **Return-to-earlier-root penalty** (−1.5, `earlier`). n0004 §3 says returning after two
   chords is common as I–V–I and I–IV–I; the code penalises every return, including the
   tonic: C after C F, C after Am F C G (1.33 in auto), restarting any four-chord loop.
6. **Dominant recognition needs a confident key**. A plain V triad → I counts 0.7
   (fifth-down) instead of 0.9 unless the seventh is present or the _top_ hypothesis is
   confident. Auto inference rarely reaches confidence (C major and A minor tie for
   C G Am; margin 0.58 for Am F C G), so V–I is under-rewarded in the default Auto mode.
7. **Priors and density**. iii prior 0.45 equals the applied V/vi prior, so Em and E tie
   on role after Am and voice leading picks E. Seventh chords inherit the full degree
   prior while gaining voice-leading, similarity and inversion advantages, offset only by
   −0.55 density. Sus and power chords keep 60 % of the degree prior and have no third to
   move, so B♭sus2, Dsus2, Fsus2, Csus4/G appear in general lists.
8. **V→I chip semantics**. `dominant` focus matches chords that _resolve_ the previous
   chord; after a non-dominant chord the list is empty. Users likely expect the dominant
   of the next or of the key. Spelling: applied leading-tone chords in major keys use flat
   canonical roots (D♭dim7/C♭♭ for vii°7/ii).

## Completion

- A line needs an inverted chord: an inverted previous chord starts one, a step from an
  inverted earlier chord continues one; root motion alone never does.
- Rank, score and bar agree: the diversity penalty is a reported `variety` component
  inside `score`; it skips the root under a move focus and is small enough that the
  plain triad of a top harmony survives its seventh-chord variant.
- Voice leading is a tie-breaker; tonic returns are not penalised; V–I counts as dominant
  when the weighted hypotheses hear the chord as dominant.
- Regression cases pass as focused unit tests; weights documented in
  `docs/chord-recommendations.md` and s0003.

## Progress

- Engine changes in `packages/music/src/recommendations/`: `detectBassLine` requires an
  inversion; voice leading ×−0.5; density mismatch −0.7 thicker / −0.3 thinner; return
  penalty −0.75 × (1 − tonic weight); dominant heard by hypothesis weight ≥ 0.5; iii
  prior 0.55; colour discounts (sus 0.5, extended 0.8) in `chordRole`; diversity −1 same
  root / −0.5 same bass / −0.75 × overlap over the smaller set, reported as `variety`;
  leading-tone chords respelled on the raised degree (`leadingToneRoot`).
- Results after the change (limit 4): Replace Em → C, Cmaj7, F, G. C G Am → C, F, Dm, G;
  ↑5th → Em, E, Esus4, Edim. F G → C, Cmaj7, Dm, Am (auto: C, D, Am, E). Am F C G auto →
  C, Dm, E, Am. C Dm → G, F, C, Am. G7 auto → Cmaj7, Dm7, C, Fmaj7. E7 in A minor → Am7,
  Am, Dm7, G7. C F → C, Am, G, Dm. Colour after C includes C♯dim. Genuine lines still
  work: C Em/B → Am, C, G, F/A; C/E → F, G/D, Fmaj7, Am.
- Unchanged by design: the V→I chip keeps s0003's "chord making the move relative to a
  neighbor" meaning, so it is empty after a non-dominant chord.
- Verified: 116 unit tests (six new regression cases, prior-ordering assertions), types,
  lint, formatting, production build, 12 Chrome desktop/portrait recommendation checks.
