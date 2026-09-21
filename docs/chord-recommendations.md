# Chord recommendations

## API and ownership

`recommendChords` is exported from `@rechorder/music`. It accepts immutable
`WesternChord` data and returns concrete chords, structured reasons, score
components, and tonal hypotheses. It does not read UI state, play audio, or edit
the progression. The engine belongs to the conventional music adapter; it imposes
no tonal or tuning restrictions on the generic music model.

```ts
import { createChord, recommendChords, roots } from '@rechorder/music';

const result = recommendChords({
  progression: [createChord('D', 'minor7'), createChord('G', 'dominant7')],
  target: { kind: 'insert', index: 2 },
  key: { tonic: roots.find((root) => root.id === 'C')!.pitch, mode: 'major' },
  focus: 'dominant',
  limit: 4,
});
```

- `insert` places a recommendation before `index`; the progression length means append.
- `replace` evaluates an existing index against both neighbors, excluding its old harmony from tonal inference.
- `bass` accepts a candidate and an index at which it would replace a chord, or the progression length to follow the last chord. The candidate's actual lowest sounding pitch is preserved, including spelling and octave. Its bass must be a member of the recommended harmony; other roots and inversions are searched.
- Omitting `key` permits uncertain major/minor inference. Explicit keys support all seven diatonic modes. `focus` keeps only chords that make one move relative to a neighbor (`dominant`, `ii-v`, `fifth-down`, `fifth-up`, `step`, `third`, `leading-tone`, `same-root`, `tritone`) or, with `color`, applied and borrowed harmony. `limit` defaults to four and accepts 0–24. Invalid indices and limits throw `RangeError`.
- Inputs must be valid conventional chords. Results satisfy the editor's existing C1–B6, 16-note audition bounds. No audition duration is interpreted as musical rhythm.
- Each result carries an `assessment` of its chosen voicing: modeled harmonicity, roughness with the bass shifted to C4, span in semitones, and mean voice movement from the neighbors in semitones (null without neighbors). `components.acoustic` is the score term derived from it. Only compare `score` values within one result.

Companion exports: `chordRole(chord, key)` returns the Roman numeral, harmonic
function and idiom prior of a chord in a key; `diatonicChord(key, degree, seventh?)`
builds the triad or seventh on a scale degree (minor keys raise the leading tone
for V and vii°); `motion(from, to)` names the root move between two chords.

## Sounding-note assessment

`measureSonority(frequencies)` accepts any nonempty or empty collection of finite
positive frequencies and returns three descriptors. **Roughness** models six
harmonic partials of each tone with amplitude `1/h` for partial `h`; for every
pair of _different notes_ it sums a frequency-dependent roughness curve over
their partial pairs, then averages by the number of note pairs, so adding notes
does not raise the value merely through pair count. It rises in low registers.
**Harmonicity** is Milne's spectral pitch-class similarity: each note contributes
twelve partials with amplitude `h^-0.67`, smeared by a 6.8-cent Gaussian into a
1200-bin pitch-class spectrum, and the value is the best cosine similarity with a
single harmonic series over candidate fundamentals (the subharmonics of every
note). It is register-free; a lone harmonic tone scores 1, a major or minor
triad about 0.72, sus chords about 0.80, seventh chords 0.61–0.67, augmented
0.62, diminished 0.59, diminished seventh 0.51. **Span** is the range between the
lowest and highest frequencies in cents. These are fixed, disclosed
ideal-harmonic models, not the measured spectrum of the bowed-string renderer or
listener preference scores.

`voiceMotion(from, to)` works in cents on the actual sounding frequencies. It
finds the lowest-cost ordered voice match; entering or leaving a voice costs 300
cents. Matching is allowed without names, roots, pitch-class rounding, or a
defined key. These explicit matching choices are an engineering descriptor, not
a claim that every musician perceives voices in this way.

The **acoustic** score term is measured on each candidate's chosen voicing, with
its bass shifted to C4 so the octave picked for voice leading does not change
it: `3 × (harmonicity − 0.724) − 12 × max(0, roughness − 0.090)`, where the
constants are the root-position close C major triad's own values. Plain triads
therefore score about 0, seventh chords about −0.3, sus chords about +0.2, an
augmented triad about −0.3, diminished triads and sevenths about −0.8 (rough and
inharmonic under both models), and a close-voiced added second or fourth about
−0.4 through excess roughness on top of its colour discount. Only excess
roughness costs, so a hollow or thin voicing earns nothing for being smooth
(n0005 §2). The term exists to separate sonorities the tonal terms cannot tell
apart, so an unconventional chord can climb when it is consonant and an
unnamed-sounding cluster cannot; it does not re-rank idiomatic harmony, and it
is not a listener rating. The weights are application design choices.

The exploratory pool also applies one add/omit degree edit (2, 4, 6, 9, 11, 13
or omission of 3/5) to major/minor seeds at all twelve roots and to the adjacent
or replaced user chords. It uses the editor's existing recipe operations, so an
accepted suggestion persists normally. This expands discovery beyond the 27
named definitions while remaining bounded; it does not yet encode arbitrary
interval collections.

Every request applies one declared candidate policy before scoring: a suggestion
has at least three distinct pitch classes, and it is not the harmony of the chord
it sits beside or replaces. Pair-averaged roughness is not comparable across
cardinalities, and repeating a neighbor is not a suggestion.

## Ranking pipeline

1. Read at most four chords on each side. Infer 24 major/minor hypotheses from harmonic tone coverage, recency, resolved dominants and root-position tonic chords (an inverted chord is never tonic evidence; a key whose tonic never sounds in root position loses 0.8). Combine the three best hypotheses; weights are relative evidence, not calibrated probabilities. A possible key is exposed in the UI only with at least three distinct roots and a score margin of two. Explicit key/mode bypasses inference.
2. Enumerate one spelling per pitch class across the basic and jazz catalogues. Prefer the chosen key's spelling and observed roots. Minor-key leading-tone roots receive the raised-seventh spelling. Remove the unchanged replacement and the neighbors' own harmony, require three pitch classes, and enforce any fixed bass.
3. Score each harmony (register-free):
   - **Role** (×3): the idiom prior of the chord's key role, averaged over hypotheses — I, V, IV, vi, ii high; iii, vii° lower; applied dominants and leading-tone chords, parallel-mode mixture and ♭II as color; other chromatic chords near zero. Colour variants of a degree are discounted: sus and power chords keep 50 %; ninths and beyond, added sixths, and seconds or fourths added beside a third 80 %; augmented triads are color. Uncertain inference blends 15 % toward plain qualities; without any context plain qualities alone rank. The tonic gains 1 when starting a progression.
   - **Motion** (×2 from the previous chord, ×1 into the next): root-move frequency — dominant 1 (0.9 without a seventh; a triad only counts as dominant when it has a seventh or the hypotheses hearing it as dominant/applied weigh at least half), ii–V 0.9, leading tone 0.8, fifth down 0.7, fifth up 0.6, whole step 0.6, third 0.55, semitone 0.45, same root 0.4, tritone 0.2.
   - **Voice leading** (×−0.5): symmetric nearest-tone distance between pitch-class sets, averaged over neighbors. Smoothness is a tie-breaker between plausible functions, not a function-scale term: common-tone chromatic chords may not outrank diatonic step relations on it alone.
   - **Complexity**: −0.7 per interval thicker than the neighbor, −0.3 per interval thinner (a triad is never foreign), −0.4 for such colour the neighbor lacks, −0.4 per interval past the fifth, −1.5 for repeating a neighbor's root (its harmony is excluded from the pool), −0.75 × (1 − tonic weight) for returning to the root heard two chords earlier — I–V–I, I–IV–I and loop restarts are idiomatic; other returns oscillate.
   - **Similarity** (replace only): 0.45 per tone shared with the replaced chord.
   - A `focus` filters the pool before ranking.
4. Voice every remaining harmony; the acoustic term can only be measured on a concrete voicing, and it is the only way an unconventional chord climbs. Detect a **bass line** from the two previous chords: only an inverted chord is evidence of a designed bass — an inverted previous chord starts a line, and a step from an inverted earlier chord into the previous one continues it; two root-position chords a step apart are root motion, not a line. With a line (or an inverted following chord) every inversion is tried and the bass continuing the line wins — 1 for a step in the line's direction, 0.5 against it, 0.25 for a leap, 0 for stalling; otherwise the root stays in the bass. The register then minimizes the ordered voice-matching distance (`voiceLeadingDistance`) against the neighbors. The bass-line value adds ×1.5, scaled by the harmony's role so a stepping bass cannot rescue an implausible chord. Add the **acoustic** term of the chosen voicing. Fixed-bass search preserves the exact sounding bass register. Leading-tone chords on chromatic roots are spelled on the raised degree (C♯dim7, not D♭dim7).
5. Remove exact-sounding duplicates whose interpretation matches, then rerank greedily for variety: −1 per earlier suggestion on the same root, else −0.5 per repeated bass and −0.75 × the largest shared-tone fraction (relative to the smaller set). A move focus fixes the root, so only overlap counts there. The penalty is reported as the `variety` component and included in `score`, so the list is in descending score order and the bar agrees with the rank. Stable catalogue order breaks exact ties.

Reasons carry the interpretation: `role` (numeral and function relative to a known key), `motion` (move and side), `bass-line`, `smooth-voices`, `fixed-bass`, `starting-point`. Weights are application design choices grounded in the progressions collected in `worklog/note/n0004-common-chord-progressions.md`; this is a bounded heuristic search, not an exhaustive optimizer or trained model.

`tonality.ts` (keys, roles, diatonic chords), `harmony.ts` (root motion) and `voice-leading.ts` (bass lines, registers) own independent musical concerns; `recommend.ts` composes them.

## Interaction

One four-choice panel serves Next, Replace, Between, and Bass. Preview auditions
without changing either draft or timeline; the adjacent action commits directly.
Next appends, Replace retains the selected ID, and Between inserts after the
selection when it has a successor. Bass Use loads the candidate for the existing
Append/Replace controls. Its inline bass picker avoids a trip to the lower editor.
Each suggestion shows its numeral (when the key is known) and strongest move; the
full reason list is in the tooltip. A scrollable row of move chips (Any, V→I,
ii–V, ↓5th, ↑5th, Step, 3rd, Color) narrows the list to one design move; chips are
disabled before the first chord, and an empty result says no chord makes that move.

The builder's **Function** pads design chords key-relatively: one pad per scale
degree of the explicit or best inferred key (marked `?` while uncertain, assuming
C major before any chord exists), showing numeral and symbol, with a `7` toggle for
seventh chords. Tapping a pad auditions the chord as the candidate; Root, Bass and
Chord type refine it as usual. Settings never start audio. Whole-progression
transposition carries an explicit tonic with it. Suggestion progression commits
stop stale transport.

## Limits and evidence

This implementation has no melody, rhythm, genre, phrase-goal, or explicit local
modulation input. Auto inference considers major/minor only; select other modes
explicitly. Borrowed chords and local tonicization are supported without claiming
a definitive global key. The candidate generator uses 27 conventional
root/quality definitions plus one-note edits within the existing recipe grammar.
Voicing search covers close-position inversions and register shifts, not every possible
open voicing. Returned alternatives need human audition; a high score does not
establish musical correctness.

The harmonic vocabulary follows the relationships described in
[Music Theory for the 21st-Century Classroom: Harmonic Function](https://musictheory.pugetsound.edu/mt21c/HarmonicFunction.html)
and [Open Music Theory: Tonicization](https://viva.pressbooks.pub/openmusictheory/chapter/tonicization/).
Focused tests cover cadences, bass-line continuation, focus filtering, roles and
diatonic chords, insertion/replacement context, minor/applied dominants,
uncertainty, fixed-bass register/spelling, determinism, and editor/browser commit
boundaries.
