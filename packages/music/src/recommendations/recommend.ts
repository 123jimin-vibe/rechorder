import type { WesternChord } from '../western';
import {
  chordDefinitions,
  jazzDefinitions,
  createChord,
  chromaticPosition,
  standardTuning,
} from '../western';
import { measureSonority, voiceMotion } from '../sonority';
import {
  isAuditionable,
  setChordDegree,
  voiceChord,
} from '../chord-manipulation';
import type { HarmonicFunction, TonalContext, TonalKey } from './tonality';
import {
  chordRole,
  inferTonality,
  leadingToneRoot,
  recommendationRoots,
} from './tonality';
import type { Move } from './harmony';
import {
  commonToneCount,
  hasInterval,
  hasThird,
  isExtended,
  motion,
  pitchClass,
  pitchClasses,
} from './harmony';
import {
  chooseVoicing,
  detectBassLine,
  pitchClassMovement,
} from './voice-leading';

export type RecommendationTarget =
  | { readonly kind: 'insert'; readonly index: number }
  | { readonly kind: 'replace'; readonly index: number }
  | {
      readonly kind: 'bass';
      readonly chord: WesternChord;
      readonly index: number;
    };
/** A design focus narrows results to one kind of move; `color` keeps applied and
 * borrowed harmony only.
 */
export type RecommendationFocus = Move | 'color';
export type RecommendationLens = 'explore' | 'blend' | 'contrast' | 'tonal';
export interface RecommendationRequest {
  readonly progression: readonly WesternChord[];
  readonly target: RecommendationTarget;
  readonly key?: TonalKey;
  readonly focus?: RecommendationFocus;
  readonly limit?: number;
  readonly lens?: RecommendationLens;
}
export type RecommendationReason =
  | {
      readonly kind: 'role';
      readonly numeral: string;
      readonly function: HarmonicFunction;
    }
  | {
      readonly kind: 'motion';
      readonly move: Move;
      readonly side: 'before' | 'after';
    }
  | {
      readonly kind:
        'bass-line' | 'fixed-bass' | 'smooth-voices' | 'starting-point';
    };
export interface RecommendationScore {
  readonly role: number;
  readonly motion: number;
  readonly bassLine: number;
  readonly voiceLeading: number;
  readonly similarity: number;
  readonly complexity: number;
  /** Diversity penalty against the suggestions listed before this one. */
  readonly variety: number;
  /** Only the selected acoustic lens contributes these terms. */
  readonly acoustic?: number;
  readonly transition?: number;
}
export interface ChordRecommendation {
  readonly chord: WesternChord;
  readonly score: number;
  readonly components: RecommendationScore;
  readonly reasons: readonly RecommendationReason[];
  readonly basis?: 'blend' | 'contrast' | 'voices' | 'tonal';
  readonly assessment?: {
    readonly roughness: number;
    readonly spanSemitones: number;
    readonly movementSemitones: number | null;
    readonly roughnessChange: number | null;
  };
}
export interface RecommendationResult {
  readonly context: TonalContext;
  readonly recommendations: readonly ChordRecommendation[];
}

const harmonicIdentity = (chord: WesternChord) =>
  pitchClass(chord.root) +
  ':' +
  pitchClasses(chord)
    .sort((a, b) => a - b)
    .join(',');

const frequencies = (chord: WesternChord) =>
  voiceChord(chord).map((pitch) => standardTuning.frequency(pitch.position));

function assessSoundingChord(
  chord: WesternChord,
  before?: WesternChord,
  after?: WesternChord,
) {
  const sound = frequencies(chord);
  const profile = measureSonority(sound);
  const neighbors = [before, after].filter(
    (value): value is WesternChord => value !== undefined,
  );
  const movement = neighbors.length
    ? neighbors.reduce(
        (sum, value) => sum + voiceMotion(frequencies(value), sound),
        0,
      ) /
      neighbors.length /
      100
    : null;
  const roughnessChange = neighbors.length
    ? neighbors.reduce(
        (sum, value) =>
          sum +
          Math.abs(
            profile.roughness - measureSonority(frequencies(value)).roughness,
          ),
        0,
      ) / neighbors.length
    : null;
  return {
    roughness: profile.roughness,
    spanSemitones: profile.spanCents / 100,
    movementSemitones: movement,
    roughnessChange,
  };
}

function interpretationIdentity(item: ChordRecommendation): string {
  return item.reasons
    .flatMap((reason) =>
      reason.kind === 'motion'
        ? [`${reason.move}:${reason.side}`]
        : reason.kind === 'role' &&
            (reason.function === 'applied' || reason.function === 'borrowed')
          ? [reason.numeral]
          : [],
    )
    .sort()
    .join(',');
}

function soundingIdentity(chord: WesternChord): string {
  // Adapter-local 12-EDO equality. Spelled harmonic identity remains separate;
  // another temperament can supply different sounding equality at its boundary.
  return voiceChord(chord)
    .map((pitch) => chromaticPosition(pitch.position))
    .sort((a, b) => a - b)
    .join(',');
}

function hasSpelledRootBass(chord: WesternChord): boolean {
  const bass = voiceChord(chord)[0];
  return (
    bass?.position.letter === chord.root.position.letter &&
    bass.position.accidental === chord.root.position.accidental
  );
}

function deduplicateEquivalentVoicings(
  items: readonly ChordRecommendation[],
): ChordRecommendation[] {
  const kept: {
    item: ChordRecommendation;
    sound: string;
    interpretation: string;
    rootBass: boolean;
  }[] = [];
  for (const item of items) {
    const candidate = {
      item,
      sound: soundingIdentity(item.chord),
      interpretation: interpretationIdentity(item),
      rootBass: hasSpelledRootBass(item.chord),
    };
    const duplicateIndex = kept.findIndex(
      (existing) =>
        existing.sound === candidate.sound &&
        existing.interpretation === candidate.interpretation,
    );
    if (duplicateIndex < 0) {
      kept.push(candidate);
      continue;
    }
    const existing = kept[duplicateIndex]!;
    if (
      candidate.item.score > existing.item.score ||
      (candidate.item.score === existing.item.score &&
        candidate.rootBass &&
        !existing.rootBass)
    )
      kept[duplicateIndex] = candidate;
  }
  return kept.map(({ item }) => item);
}

/** Without tonal context, plain qualities are the safer starting point. */
function qualityPrior(chord: WesternChord): number {
  if (!hasThird(chord)) return 0.3;
  if (hasInterval(chord, 3) && hasInterval(chord, 6)) return 0.35;
  if (hasInterval(chord, 10) || hasInterval(chord, 11))
    return hasInterval(chord, 4) && hasInterval(chord, 10) ? 0.6 : 0.5;
  return hasInterval(chord, 4) ? 1 : 0.85;
}

/** Total weight of the hypotheses in which a key-relative claim holds. */
function hypothesisWeight(
  context: TonalContext,
  holds: (key: TonalKey) => boolean,
): number {
  return context.hypotheses.reduce(
    (sum, hypothesis) => sum + (holds(hypothesis.key) ? hypothesis.weight : 0),
    0,
  );
}

const isDominantRole = (chord: WesternChord, key: TonalKey) =>
  ['dominant', 'applied'].includes(chordRole(chord, key).function);

/** Pure, bounded conventional-tonal search. See docs/chord-recommendations.md for
 * score terms and limits. Scores are heuristic preferences, never probabilities.
 */
export function recommendChords(
  request: RecommendationRequest,
): RecommendationResult {
  const { progression, target, focus } = request;
  const lens = request.lens ?? 'explore';
  const { index } = target;
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > progression.length ||
    (target.kind === 'replace' && index === progression.length)
  )
    throw new RangeError('Recommendation target is outside the progression.');
  const limit = request.limit ?? 4;
  if (!Number.isInteger(limit) || limit < 0 || limit > 24)
    throw new RangeError(
      'Recommendation limit must be an integer from 0 to 24.',
    );
  const replaces = target.kind !== 'insert';
  const before = progression[index - 1];
  const earlier = progression[index - 2];
  const after = progression[index + Number(replaces)];
  const original =
    target.kind === 'bass'
      ? target.chord
      : target.kind === 'replace'
        ? progression[index]
        : undefined;
  // The replaced chord is not evidence for the key of its own alternatives.
  const local = [
    ...progression.slice(Math.max(0, index - 4), index),
    ...progression.slice(
      index + Number(replaces),
      index + Number(replaces) + 4,
    ),
  ];
  const context = inferTonality(local, request.key);
  if (!limit) return { context, recommendations: [] };
  const known = context.source === 'explicit' || context.confident;
  const primaryKey = known ? context.hypotheses[0]?.key : undefined;
  const fixedBass =
    target.kind === 'bass' ? voiceChord(target.chord)[0] : undefined;
  const neighbor = before ?? after ?? original;
  const line = detectBassLine(before, earlier);
  const vocabulary = [...chordDefinitions, ...jazzDefinitions];
  const roots = recommendationRoots(context, [
    ...local,
    ...(original ? [original] : []),
  ]);
  const beforeDominant = before
    ? hypothesisWeight(context, (key) => isDominantRole(before, key))
    : 0;
  const catalogue = roots.flatMap((root) =>
    vocabulary.map((definition) => {
      const chord = { ...createChord('C', definition.id), root };
      const respelled = primaryKey && leadingToneRoot(chord, primaryKey);
      return respelled ? { ...chord, root: respelled } : chord;
    }),
  );
  // Generate one-note edits from simple independent seeds and the musician's
  // neighboring material. These use the editor's persistable recipe operations;
  // they are not another list of pre-named chord examples.
  const edits =
    lens === 'tonal'
      ? []
      : [
          ...roots.flatMap((root) =>
            (['major', 'minor'] as const).map((id) => ({
              ...createChord('C', id),
              root,
            })),
          ),
          ...[before, after, original].filter(
            (value): value is WesternChord => value !== undefined,
          ),
        ].flatMap((seed) => {
          const { bass: _bass, ...base } = seed;
          const chord = {
            ...base,
            voicing: { kind: 'close' as const, octave: 0, tones: [] },
          };
          return [
            ...[2, 4, 6, 9, 11, 13].map((degree) =>
              setChordDegree(chord, degree, true),
            ),
            ...[3, 5].map((degree) => setChordDegree(chord, degree, false)),
          ].filter(
            (edited) => harmonicIdentity(edited) !== harmonicIdentity(chord),
          );
        });
  const pool = [...catalogue, ...edits]
    .filter((chord) => {
      if (original && harmonicIdentity(chord) === harmonicIdentity(original))
        return false;
      // Fixed-bass choices include inversions of every catalogue quality. Keep the
      // bass a chord member; an arbitrary slash under every chord is not a useful match.
      return !fixedBass || pitchClasses(chord).includes(pitchClass(fixedBass));
    })
    .map((chord) => {
      const reasons: RecommendationReason[] = [];
      // Idiom frequency of the chord's key role, averaged over hypotheses. Uncertain
      // context blends toward plain qualities instead of trusting one key.
      const weightedPrior = context.hypotheses.reduce(
        (sum, hypothesis) =>
          sum + chordRole(chord, hypothesis.key).prior * hypothesis.weight,
        0,
      );
      const tonicWeight = hypothesisWeight(
        context,
        (key) => pitchClass(chord.root) === pitchClass(key.tonic),
      );
      const role =
        3 *
          (known
            ? weightedPrior
            : context.hypotheses.length
              ? 0.85 * weightedPrior + 0.15 * qualityPrior(chord)
              : 0.4 * qualityPrior(chord)) +
        (primaryKey &&
        !before &&
        !after &&
        pitchClass(chord.root) === pitchClass(primaryKey.tonic) &&
        chordRole(chord, primaryKey).function === 'tonic'
          ? 1
          : 0);
      if (primaryKey) {
        const interpretation = chordRole(chord, primaryKey);
        reasons.push({
          kind: 'role',
          numeral: interpretation.numeral,
          function: interpretation.function,
        });
      }
      let motionScore = 0;
      let movement = 0;
      for (const side of ['before', 'after'] as const) {
        const adjacent = side === 'before' ? before : after;
        if (!adjacent) continue;
        const raw =
          side === 'before' ? motion(adjacent, chord) : motion(chord, adjacent);
        const from = side === 'before' ? adjacent : chord;
        // A triad a fifth above is only a dominant when it carries a seventh or the
        // likely keys hear it as one; otherwise I–IV is fifth motion, not a resolution.
        const heardAsDominant =
          hasInterval(from, 10) ||
          (side === 'before'
            ? beforeDominant
            : hypothesisWeight(context, (key) => isDominantRole(chord, key))) >=
            0.5;
        const step =
          raw.move === 'dominant' && !heardAsDominant
            ? { move: 'fifth-down' as const, strength: 0.7 }
            : raw;
        motionScore += (side === 'before' ? 2 : 1) * step.strength;
        reasons.push({ kind: 'motion', move: step.move, side });
        movement += pitchClassMovement(adjacent, chord);
      }
      // Smoothness is coherence evidence (n0004 §5), weighted as a tie-breaker so a
      // chromatic common-tone chord cannot outrank a diatonic step relation on it.
      const voiceLeading =
        (-0.5 * movement) / (Number(!!before) + Number(!!after) || 1);
      const similarity = original ? commonToneCount(chord, original) * 0.45 : 0;
      // Match the local vocabulary's density; thinning is a lighter mismatch than
      // thickening, since a triad is never foreign. Penalize repeating recent harmony.
      const density = neighbor?.definition.intervals.length ?? 3;
      const size = chord.definition.intervals.length;
      const identity = harmonicIdentity(chord);
      const repeats = (value: WesternChord | undefined) =>
        !value
          ? 0
          : identity === harmonicIdentity(value)
            ? 3
            : pitchClass(value.root) === pitchClass(chord.root)
              ? 1.5
              : 0;
      const complexity =
        -0.7 * Math.max(0, size - density) -
        0.3 * Math.max(0, density - size) -
        (isExtended(chord) && !(neighbor && isExtended(neighbor)) ? 0.4 : 0) -
        repeats(before) -
        repeats(after) -
        // Returning to the root heard two chords earlier is idiomatic for the tonic
        // (I–V–I, I–IV–I, loop restarts) and oscillation elsewhere (n0004 §3).
        (earlier && pitchClass(earlier.root) === pitchClass(chord.root)
          ? 0.75 * (1 - tonicWeight)
          : 0) -
        (size > 5 ? 0.4 * (size - 5) : 0);
      if (fixedBass) reasons.unshift({ kind: 'fixed-bass' });
      if (!reasons.length) reasons.push({ kind: 'starting-point' });
      return {
        chord,
        reasons,
        components: {
          role,
          motion: motionScore,
          bassLine: 0,
          voiceLeading,
          similarity,
          complexity,
          variety: 0,
        },
        score: role + motionScore + voiceLeading + similarity + complexity,
      };
    })
    .filter((item) => {
      if (!focus) return true;
      if (focus === 'color')
        return item.reasons.some(
          (reason) =>
            reason.kind === 'role' &&
            (reason.function === 'applied' || reason.function === 'borrowed'),
        );
      return item.reasons.some(
        (reason) => reason.kind === 'motion' && reason.move === focus,
      );
    })
    .sort((a, b) => b.score - a.score);

  // Harmonic preselection caps the more expensive concrete-voicing search.
  const voiced = (
    lens === 'tonal' ? pool.slice(0, Math.max(48, limit * 3)) : pool
  )
    .map((item): ChordRecommendation => {
      const chosen = chooseVoicing(
        item.chord,
        before ?? (target.kind === 'bass' ? original : undefined),
        after,
        fixedBass,
        line,
        lens !== 'tonal',
      );
      // A stepping bass helps a plausible chord; it does not rescue an implausible one.
      const bassLine =
        1.5 * chosen.bassLine * Math.min(1, item.components.role / 2.4);
      const reasons = [
        ...(chosen.bassLine >= 0.75 ? [{ kind: 'bass-line' } as const] : []),
        ...item.reasons,
        ...(item.components.voiceLeading >= -0.35 && neighbor
          ? [{ kind: 'smooth-voices' } as const]
          : []),
      ];
      const assessment = assessSoundingChord(chosen.chord, before, after);
      const acoustic =
        lens === 'blend'
          ? -3 * assessment.roughness
          : lens === 'contrast'
            ? 3 * (assessment.roughnessChange ?? assessment.roughness)
            : 0;
      const transition =
        (lens === 'blend' ? -1 : lens === 'contrast' ? 1 : 0) *
        0.25 *
        (assessment.movementSemitones ?? 0);
      return {
        chord: chosen.chord,
        score: lens === 'tonal' ? item.score + bassLine : acoustic + transition,
        components:
          lens === 'tonal' || lens === 'explore'
            ? { ...item.components, bassLine }
            : {
                role: 0,
                motion: 0,
                bassLine: 0,
                voiceLeading: 0,
                similarity: 0,
                complexity: 0,
                variety: 0,
                acoustic,
                transition,
              },
        assessment,
        reasons:
          reasons.length > 1
            ? reasons.filter((reason) => reason.kind !== 'starting-point')
            : reasons,
      };
    })
    .filter(
      (item) =>
        isAuditionable(item.chord) &&
        (!fixedBass ||
          chromaticPosition(voiceChord(item.chord)[0]!.position) ===
            chromaticPosition(fixedBass.position)),
    );

  const distinctVoicings = deduplicateEquivalentVoicings(voiced);
  if (lens === 'explore') {
    const chosen: ChordRecommendation[] = [];
    const remaining = [...distinctVoicings];
    const choose = (
      basis: NonNullable<ChordRecommendation['basis']>,
      criterion: (item: ChordRecommendation) => number,
    ) => {
      remaining.sort((a, b) => criterion(b) - criterion(a));
      const index = remaining.findIndex(
        (item) =>
          !chosen.some(
            (value) =>
              pitchClass(value.chord.root) === pitchClass(item.chord.root),
          ),
      );
      const [item] = remaining.splice(index < 0 ? 0 : index, 1);
      if (item)
        chosen.push({
          ...item,
          basis,
          // A varied set has no shared scalar objective or score components.
          score: 0,
          components: {
            role: 0,
            motion: 0,
            bassLine: 0,
            voiceLeading: 0,
            similarity: 0,
            complexity: 0,
            variety: 0,
          },
        });
    };
    if (limit) choose('blend', (item) => -item.assessment!.roughness);
    if (chosen.length < limit && remaining.length)
      choose(
        'contrast',
        (item) =>
          item.assessment!.roughnessChange ?? item.assessment!.roughness,
      );
    if (chosen.length < limit && remaining.length)
      choose('voices', (item) => -(item.assessment!.movementSemitones ?? 0));
    if (chosen.length < limit && remaining.length)
      choose('tonal', (item) => item.components.role + item.components.motion);
    while (chosen.length < limit && remaining.length) {
      choose(
        'contrast',
        (item) =>
          item.assessment!.roughnessChange ?? item.assessment!.roughness,
      );
    }
    return { context, recommendations: chosen };
  }

  // Greedy diversity reranking keeps useful alternatives across roots, basses and
  // pitch sets; the penalty is reported as `variety` so rank and score agree. A
  // move focus fixes the root by construction, so only sound overlap counts there.
  // Stable catalogue order breaks exact ties; no randomness or mutation.
  const rootVariety = focus && focus !== 'color' ? 0 : 1;
  const recommendations: ChordRecommendation[] = [];
  while (recommendations.length < limit && distinctVoicings.length) {
    let best = { index: 0, variety: 0, score: -Infinity };
    for (const [index, item] of distinctVoicings.entries()) {
      const bass = pitchClass(voiceChord(item.chord)[0]!);
      let repeated = 0;
      let overlap = 0;
      for (const value of recommendations) {
        if (pitchClass(value.chord.root) === pitchClass(item.chord.root)) {
          repeated += rootVariety;
          continue;
        }
        if (pitchClass(voiceChord(value.chord)[0]!) === bass) repeated += 0.5;
        overlap = Math.max(
          overlap,
          commonToneCount(value.chord, item.chord) /
            Math.min(
              pitchClasses(value.chord).length,
              pitchClasses(item.chord).length,
            ),
        );
      }
      const variety = 0 - (repeated + 0.75 * overlap);
      if (item.score + variety > best.score)
        best = { index, variety, score: item.score + variety };
    }
    const [chosen] = distinctVoicings.splice(best.index, 1);
    if (chosen)
      recommendations.push({
        ...chosen,
        score: best.score,
        components: { ...chosen.components, variety: best.variety },
      });
  }
  return { context, recommendations };
}
