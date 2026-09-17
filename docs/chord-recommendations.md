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
  limit: 4,
});
```

- `insert` places a recommendation before `index`; the progression length means append.
- `replace` evaluates an existing index against both neighbors, excluding its old harmony from tonal inference.
- `bass` accepts a candidate and an index at which it would replace a chord, or the progression length to follow the last chord. The candidate's actual lowest sounding pitch is preserved, including spelling and octave. Its bass must be a member of the recommended harmony; other roots and inversions are searched.
- Omitting `key` permits uncertain major/minor inference. Explicit keys support all seven diatonic modes. `limit` defaults to four and accepts 0–24. Invalid indices and limits throw `RangeError`.
- Inputs must be valid conventional chords. Results satisfy the editor's existing C1–B6, 16-note audition bounds. No audition duration is interpreted as musical rhythm.

## Ranking pipeline

1. Read at most four chords on each side. Infer 24 major/minor hypotheses from harmonic tone coverage, recency, tonic evidence, and resolved dominants. Combine the three best hypotheses; weights are relative evidence, not calibrated probabilities. A possible key is exposed in the UI only with at least three distinct roots and a score margin of two. Explicit key/mode bypasses inference.
2. Enumerate one spelling per pitch class across the basic and jazz catalogues. Prefer the chosen key's spelling and observed roots. Minor-key leading-tone roots receive the raised-seventh spelling. Remove the unchanged replacement and enforce any fixed bass.
3. Score key fit, directed dominant/leading-tone resolution, ii–V motion, fifths/plagal relationships, shared tones, replacement similarity, and local chord density. Account for raised leading tones in minor dominants, applied dominants, parallel-minor mixture, and deceptive resolutions. Outside-scale notes reduce key fit but are never forbidden.
4. Search concrete inversions and registers for the best 48 harmonic candidates (up to 72 for larger result limits). Minimize voice movement against both neighbors. A dynamic program matches ordered upper voices with no crossing or many-to-one matching; added/removed voices cost three semitones. Bass travel has a 1.3 multiplier. Unmatched voices model entering/leaving voices, not silent omissions from the returned chord. Fixed-bass search preserves the exact sounding bass register.
5. Rerank greedily for variety, penalizing repeated roots and highly overlapping pitch sets. Stable catalogue order breaks ties. Returned `score` is the musical score before diversity reranking, so list order need not be numerically descending.

The named score components are intentionally inspectable. Explicit key fit is
weighted more strongly than inference; directed resolutions dominate weak common
tone matches; chord density discourages adding extensions just to increase overlap.
The voicing movement penalty is 0.65 per normalized movement unit. This is a
bounded heuristic search, not an exhaustive optimizer or trained model.

`tonality.ts`, `harmony.ts`, and `voice-leading.ts` own independent musical concerns;
`recommend.ts` composes them. `inferTonality`, `scalePitches`, and
`voiceLeadingDistance` are also public exports. The UI translates reason codes
into short labels and memoizes results independently of sounding-note updates.

## Interaction

One four-choice panel serves Next, Replace, Between, and Bass. Preview auditions
without changing either draft or timeline; the adjacent action commits directly.
Next appends, Replace retains the selected ID, and Between inserts after the
selection when it has a successor. Bass Use loads the candidate for the existing
Append/Replace controls. Its inline bass picker avoids a trip to the lower editor.
Settings never start audio. Whole-progression transposition carries an explicit
tonic with it. Suggestion progression commits stop stale transport.

## Limits and evidence

This first implementation has no melody, rhythm, genre, phrase-goal, or explicit
local modulation input. Auto inference considers major/minor only; select other
modes explicitly. Borrowed chords and local tonicization are supported without
claiming a definitive global key. Voicing search covers close-position inversions
and register shifts, not every possible open voicing. Returned alternatives need
human audition; a high score does not establish musical correctness.

The harmonic vocabulary follows the relationships described in
[Music Theory for the 21st-Century Classroom: Harmonic Function](https://musictheory.pugetsound.edu/mt21c/HarmonicFunction.html)
and [Open Music Theory: Tonicization](https://viva.pressbooks.pub/openmusictheory/chapter/tonicization/).
Numerical weights and search limits are application design choices, not claims
from those sources. Focused tests cover cadences, insertion/replacement context,
minor/applied dominants, uncertainty, fixed-bass register/spelling, determinism,
and editor/browser commit boundaries.
