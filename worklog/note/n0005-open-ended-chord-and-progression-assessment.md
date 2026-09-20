+++
id = "n0005"
title = "Open-ended chord and progression assessment"
+++

## Principles

- Research findings from t0035, checked 2026-09-20; this note does not change behavior governed by s0003, s0005, or s0007.
- A vocabulary match answers what a collection can be called. It does not establish whether that collection is musically useful.
- Evaluate arbitrary sounding note collections independently of names, roots, catalogue IDs, and example progressions. Preserve exact musical identity separately from perceptual similarity.
- "Better" requires an objective and context. Measurements can describe smoothness, fusion, contrast, or movement; no one measurement establishes aesthetic quality. No style, melody, target tension, or preferred tuning is assumed here.

## 1. Current restrictions

### Hard vocabulary and representation gates

| Layer                       | Evidence                                                                                                              | Consequence                                                                                                                                                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grid recognition/completion | `apps/web/src/harmonic-grid/harmony.ts`: `qualities`, `chordCompletions`, `chordName`                                 | Nine shapes: major, minor, diminished, augmented, sus2, sus4, dominant 7, major 7, minor 7. Every selected fifth-chain class must fit a template. More than four distinct classes immediately returns no completions. Root transposition is unrestricted within the Pythagorean adapter, but relative shapes are closed. |
| Grid interpretation         | Same file; `apps/web/src/harmonic-grid/page.tsx`                                                                      | Matching ignores octave placement while preserving comma distinctions. Results sort by missing-tone count, then label length, not acoustic or contextual merit. Unrecognized collections show "No matching chord". Previous/candidate comparison is audition, not a numerical transition assessment.                     |
| Progression construction    | `packages/music/src/western.ts`: `createChord`, `alterChord`                                                          | Nine basic plus eighteen jazz definitions. Creation and modifier reconstruction reject unknown definition IDs. The editor permits combinations beyond those 27 presets, but they must be expressible through the preset recipe.                                                                                          |
| Modifier grammar            | `western.ts`: `chordAlterations`; `chord-manipulation.ts`: `setDegreeIncluded`                                        | Six alteration choices: flat/sharp 5, flat/sharp 9, sharp 11, flat 13. Add/omit controls cover degrees 2–13; conflicting alterations of one degree are excluded. The root remains a required harmonic reference even when a voicing mutes it. This is not direct arbitrary-note authoring.                               |
| Persistence                 | `packages/music/src/chord-data.ts`: `WesternChordData`, `chordFromData`; `apps/web/src/chord-progression/document.ts` | Stores catalogue ID plus modifiers, not arbitrary interval content or exact note arrays. Unknown definitions cannot round-trip. The generic `ChordDefinition` type allows arbitrary intervals, but the conventional construction/storage path does not.                                                                  |
| Recommendation generation   | `packages/music/src/recommendations/recommend.ts`: `vocabulary`, `pool`; `tonality.ts`: `recommendationRoots`         | Twelve pitch-class roots × 27 unmodified qualities = 324 initial root/quality candidates before filtering. Does not generate modifier combinations, independent note sets, or arbitrary voicings. Fixed-bass search additionally requires the bass to belong to the generated chord.                                     |
| Function pads               | `apps/web/src/chord-progression/function-pads.tsx`; `tonality.ts`: `diatonicChord`                                    | Seven degrees, triads/sevenths, thirds-based construction and fixed interval-to-definition maps. Minor V/vii use the raised leading tone. These are useful shortcuts, not general harmonic generation.                                                                                                                   |
| Generic chord shape         | `packages/music/src/model.ts`: `Chord`; s0005                                                                         | Requires a root and definition. Does not require an enumerated definition at the type level, but still privileges root-based interpretation. The grid already uses a separate exact-note-array model (`GridChord`).                                                                                                      |

### Stylistic scoring assumptions and search bounds

- `tonality.ts` offers seven diatonic modes; automatic inference considers only 12 major and 12 minor keys and retains three hypotheses. Function labels, degree priors, and borrowed-chord priors are hand-authored. The page supplies an assumed C-major key before any progression exists (`recommendations.tsx`, `tonal-context.ts`), although the standalone API supports unknown context.
- `recommend.ts` favors familiar functions and qualities, gives voice-leading relatively little weight, penalizes extensions/density changes/repeated harmony, and uses the fixed root-motion strengths in `recommendations/harmony.ts`. The penalties do not forbid those outcomes, but make discovery less likely. `n0004` supplies stylistic generalizations; its claims about inversions, repetition, and genre are not universal musical laws.
- Harmony is preselected before concrete voicing: best 48 candidates by default, up to 72 at the largest allowed result count. `chooseVoicing` explores close-position catalogue chords, bass choices through degree 7 when an inferred bass line or following inversion permits them, and whole-register shifts of −2, −1, 0, +1 octaves (or the shift needed for fixed bass). No arbitrary open-spacing/per-voice search. Actual movement chooses a voicing within one harmony; the returned `movement` does not replace the pitch-class proxy used to rank harmonies.
- The ranker inspects at most four chords on either side for key context, adjacent chords for motion, and two earlier chords for bass/repetition effects. It is local recommendation, not whole-sequence assessment. No finite progression-template matcher was found in this path; the closure is in its chord vocabulary and favored relationships.
- Recommendation bars rescale the returned list to 15–100 (all ties receive 100). They are relative heuristic rankings, not probabilities, perceptual measurements, or comparable whole-progression grades.

### Restrictions that are different from a chord catalogue

- Grid selection/playback accepts unnamed collections up to 16 distinct exact pitches in 20–16,000 Hz. Optional major/minor highlighting does not block other notes. The nine templates constrain assistance, not what can sound.
- Three grid axis presets select coordinate layouts. They are not chord lists. The default fifth/third layout reaches only one octave-coordinate parity at a fixed surface shift; the other layouts reach the full integer fifth/octave lattice. Surface/per-note octave controls also expose missing copies.
- Pythagorean tuning itself restricts pitch ratios to products of powers of 2 and 3. It preserves comma variants and has no twelve-fifth wrap, but cannot represent exact 5:4 or 7:4 ratios. This is an independent tuning limitation, not something adding chord names can fix. Changing it would be a separate product decision.
- The conventional progression adapter uses 12-EDO pitch-class comparisons and C1–B6/16-note audition bounds. Its keyboard auditions notes without authoring arbitrary chords. These adapter bounds should not be mistaken for generic definitions of musical validity.
- In 12 pitch classes, even all 4,095 nonempty pitch-class subsets form a finite space. The useful requirement is freedom from a curated chord-example whitelist, not literally infinite computation. Register, tuning, multiplicity, and timing add further distinctions.

## 2. Assessing an arbitrary chord

### Evidence and limits

[Harrison and Pearce (2020)](https://pure.au.dk/portal/en/publications/simultaneous-consonance-in-music-perception-and-composition/) distinguish interference, harmonicity/periodicity, and cultural familiarity. Their combined model is not a culture-free goodness function; its familiarity component depends on experience. A catalogue-free first version can expose acoustic descriptors without adopting that corpus component.

[Marjieh et al. (2024)](https://www.nature.com/articles/s41467-024-45812-z) experimentally varied timbre and continuously varied intervals. Consonance preferences changed with timbre; their model combines harmonicity, aversion to fast beats, and liking of slow beats. Therefore exact integer ratios and minimum beating are insufficient as universal objectives. Evidence from US/South Korean samples does not establish every listener's preferences.

[McDermott et al. (2016)](https://mcdermottlab.mit.edu/papers/McDermott_etal_2016_consonance.pdf) found cultural differences in consonance preferences, including indifference among Tsimane' participants. Acoustic description and listener preference must remain separate.

### Computable descriptors, without chord-name lookup

Input: exact pitch identities and registers resolved through the chosen tuning; distinct voices/doublings; an explicit instrument/spectral model and level assumptions. A harmonic spectrum approximation must be labeled as such. The current bowed-string instrument has time-varying output, so a static idealized spectrum is not a validated description of its sound.

| Descriptor                     | Computation and meaning                                                                                                                                                                               | When it can help                                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roughness and beating          | Model interactions between audible partials, using their frequency separation, auditory bandwidth, amplitudes, and time evolution. Track slow beats separately from rapid roughness.                  | Lower roughness can serve a smooth/blended target; a chosen amount can serve a beating/abrasive target.                                                           |
| Harmonicity / pitch salience   | Measure how well the combined spectrum fits a harmonic-series or periodicity model across candidate fundamentals, with perceptual tolerance and amplitude weighting. Report ambiguous/multiple peaks. | A stronger common pitch can serve fusion or stability; weak/competing centers can serve ambiguity. No named root must be forced.                                  |
| Register, spacing, and masking | Measure sounding span, local density, auditory-band overlap and relative level; distinguish bass and upper voices.                                                                                    | Identify obscured inner notes or compare more separated voicings when clarity is wanted. Identical pitch classes can sound very different in different registers. |
| Interval structure             | Retain the full pairwise log-frequency interval distribution, multiplicities and exact identities; derive symmetry or similarity descriptors as needed.                                               | Compare unnamed sonorities, recurring shapes and transformations. Symmetry is a description, not inherently good.                                                 |
| Supplied constraints           | Measure agreement with explicitly retained pitches, melody/bass, voice count/ranges or performance requirements.                                                                                      | A sonority is more useful when it satisfies the musician's actual task. Do not infer those requirements.                                                          |

For example, a model roughness term has the general form

`R(C) = sum over partial pairs (a,b) of weight(Aa, Ab) * kernel(fa, fb)`.

This is an evaluation of frequencies, not membership in a chord list. The kernel and amplitude law must come from a selected, documented model. [Sethares](https://sethares.engr.wisc.edu/consemi.html) describes spectral-pair dissonance curves and using their local minima to explore pitches for arbitrary timbres. Counting tones or adding a pitch can change a raw sum mechanically: comparisons need declared loudness/cardinality policies, and both absolute and normalized descriptors may be useful. Minimum roughness alone can prefer unison, thinning, or extreme spacing.

Simple-ratio complexity may be exposed as an optional structural descriptor, but should not replace perceptual tolerance: the grid's 81:64 third is close to 5:4, while exact denominator complexity differs dramatically. Harmonic partials are an acoustic model, not a whitelist of acceptable chord types; that model also has limitations for inharmonic sounds.

## 3. Assessing a progression without known progression examples

A progression requires a trajectory of descriptors and relationships, not a sum of isolated chord-consonance scores. The following is a proposed design synthesis, not a validated universal formula.

1. **Voice continuity.** Match actual voices between arbitrary note collections using log-frequency distance. For equal voice counts, one starting descriptor is `min over allowed assignments pi: sum_i |1200 * log2(g[pi(i)] / f[i])|`. Preserve supplied voice identities; otherwise report the inferred assignment. Unequal counts require explicit entry/exit costs, and crossing/large-leap policies must be chosen rather than hidden. Do not fold away register or merge comma variants. Geometry-based voice-leading models provide precedent ([Tymoczko, 2006](https://collaborate.princeton.edu/en/publications/the-geometry-of-musical-chords/)).
2. **Continuity versus contrast.** Track exact common tones, bass/melodic contour, changes in spectrum, register, density and interval structure. A sustained anchor plus changing upper voices and a wholesale shift can both be deliberate choices. Minimizing movement alone rewards staying still.
3. **Tension trajectory.** Keep roughness, harmonicity, density and ambiguity as separate time series. Compare them with a requested direction/curve, if provided: build, release, sustain or alternate. An acoustically smoother arrival may support a release, but does not by itself prove a tonal cadence or subjective resolution.
4. **Longer structure.** Compare recurring interval/voice-motion patterns, transformations, contrast between sections, and return to a supplied reference collection. Evaluate proposed chords with both neighbors and, where possible, several future steps. A locally smooth choice can block a later goal; pairwise compatibility does not establish phrase quality.
5. **Timing and melody.** Durations, accent, overlap and melodic activity determine how a sonority functions over time. The current untimed chord data cannot support a full assessment of harmonic rhythm or passing/suspension behavior. Equal two-beat playback is an audition policy, not evidence of compositional intent.
6. **Novelty and expectation.** Distance from previously explored collections can support discovery without any external examples. Call it structural novelty, not psychological surprise. Learned expectation requires a stated listener/style model. [Cheung et al. (2019)](https://pubmed.ncbi.nlm.nih.gov/31708393/) found that pleasure depends jointly on uncertainty and surprise in Western pop harmony; simply maximizing novelty is not justified, and their corpus model is not needed for the proposed example-free descriptors.

[Harrison and Pearce (2018)](https://arxiv.org/abs/1807.00790) demonstrate sequence modeling from continuous harmonicity, spectral-distance and voice-leading features, while questioning strong claims for spectral distance. Their corpus-fitted model is supporting evidence for feature-based analysis, not an example-free system to adopt unchanged.

## 4. Proposed direction for discovery tools

These are implementation options for a future scoped task, not approved new behavior.

1. Make exact note/voice collections first-class across evaluation and storage. Keep roots, names, Roman numerals and catalogue recipes as optional interpretations/authoring conveniences. Preserve existing recipes through explicit migration rather than silently rewriting saved material.
2. Separate `measure(collection, sound context)`, `compare(collections, context)`, `generate(constraints, budget)` and `name(collection)`. An empty naming result must not disable measurement or generation.
3. On the grid, generate pitch additions/movements from an explicit lattice region or sampling policy, preserving selected notes unless editing is requested. Rank the change in descriptors; do not require completion of a named shape. A frequency window alone does not give a practical exhaustive search on an unrestricted fifth chain: also bound coordinates, resolution or work budget. Reveal/expand the search region rather than declaring excluded pitches invalid.
4. For progressions, generate note-level candidates from both local mutations and independent seeds, explore voicings jointly with their pitches, and assess several steps when a phrase goal exists. Mutating catalogue seeds alone can leave the search biased toward the same old shapes.
5. Present separate measurements and diverse tradeoffs. If targets are supplied, select alternatives that are not worse on every chosen objective (a Pareto set), then let the musician audition. Without supplied targets, describe differences instead of issuing an absolute grade. Any weighted ranking needs documented units, normalization and weights.
6. Keep conventional tonal assistance available as an explicit lens. Merely replacing 27 presets with all pitch-class subsets while retaining the same function/complexity penalties would preserve much of the restriction the user identified.

### Verification before claiming success

- Unnamed collections, collections with more than four pitch classes, rootless collections and comma-distinct pitches survive editing/storage and receive descriptors.
- Naming changes alone do not alter acoustic scores; voicing/timbre changes can. Frequency proximity never erases musical identity.
- Generation reaches collections outside every current template while preserving supplied locks and respecting disclosed search budgets.
- Counterexamples cover unison/empty-set collapse, unchanging sequences, excessive leaps, high-density noise, and short-term choices that fail later constraints.
- Listener comparison checks whether explanations and proposed alternatives help discovery. Structural correctness tests cannot validate musical pleasure.

## Audit verification

- Read the relevant implementation, s0003/s0005/s0007, supporting notes and recommendation documentation. No application or governing-spec changes made.
- Existing suites `tests/unit/harmonic-grid.test.ts` and `tests/unit/recommendations.test.ts`: 34 tests passed. This corroborates current behavior; no perceptual model or replacement generator was implemented or empirically validated.

# Open-ended chord and progression assessment
