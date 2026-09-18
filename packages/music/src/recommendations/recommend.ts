import type { WesternChord } from '../western';
import {
  chordDefinitions,
  jazzDefinitions,
  createChord,
  chromaticPosition,
} from '../western';
import { isAuditionable, voiceChord } from '../chord-manipulation';
import type { HarmonicFunction, TonalContext, TonalKey } from './tonality';
import { chordRole, inferTonality, recommendationRoots } from './tonality';
import type { Move } from './harmony';
import {
  commonToneCount,
  hasInterval,
  hasThird,
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
export interface RecommendationRequest {
  readonly progression: readonly WesternChord[];
  readonly target: RecommendationTarget;
  readonly key?: TonalKey;
  readonly focus?: RecommendationFocus;
  readonly limit?: number;
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
}
export interface ChordRecommendation {
  readonly chord: WesternChord;
  readonly score: number;
  readonly components: RecommendationScore;
  readonly reasons: readonly RecommendationReason[];
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
/** Ninths and beyond, plus added sixths, are colour that neighbors must justify. */
const isExtended = (chord: WesternChord) =>
  chord.definition.intervals.some(
    (value) =>
      value.chromaticSteps > 12 ||
      (value.diatonicSteps === 5 && value.chromaticSteps === 9),
  );

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

/** Pure, bounded conventional-tonal search. See docs/chord-recommendations.md for
 * score terms and limits. Scores are heuristic preferences, never probabilities.
 */
export function recommendChords(
  request: RecommendationRequest,
): RecommendationResult {
  const { progression, target, focus } = request;
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
  const pool = roots
    .flatMap((root) =>
      vocabulary.map((definition) => ({
        ...createChord('C', definition.id),
        root,
      })),
    )
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
      let voiceLeading = 0;
      for (const side of ['before', 'after'] as const) {
        const adjacent = side === 'before' ? before : after;
        if (!adjacent) continue;
        const raw =
          side === 'before' ? motion(adjacent, chord) : motion(chord, adjacent);
        const from = side === 'before' ? adjacent : chord;
        // A triad a fifth above is only a dominant when it carries a seventh or the
        // key hears it as one; otherwise I–IV is fifth motion, not a resolution.
        const step =
          raw.move === 'dominant' &&
          !hasInterval(from, 10) &&
          !(
            primaryKey &&
            ['dominant', 'applied'].includes(
              chordRole(from, primaryKey).function,
            )
          )
            ? { move: 'fifth-down' as const, strength: 0.7 }
            : raw;
        motionScore += (side === 'before' ? 2 : 1) * step.strength;
        reasons.push({ kind: 'motion', move: step.move, side });
        voiceLeading -= pitchClassMovement(adjacent, chord);
      }
      voiceLeading /= Number(!!before) + Number(!!after) || 1;
      const similarity = original ? commonToneCount(chord, original) * 0.45 : 0;
      // Match the local vocabulary's density; penalize repeating recent harmony.
      const density = neighbor?.definition.intervals.length ?? 3;
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
        -0.55 * Math.abs(chord.definition.intervals.length - density) -
        (isExtended(chord) && !(neighbor && isExtended(neighbor)) ? 0.4 : 0) -
        repeats(before) -
        repeats(after) -
        (earlier && pitchClass(earlier.root) === pitchClass(chord.root)
          ? 1.5
          : 0) -
        (chord.definition.intervals.length > 5
          ? 0.4 * (chord.definition.intervals.length - 5)
          : 0);
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
  const voiced = pool
    .slice(0, Math.max(48, limit * 3))
    .map((item): ChordRecommendation => {
      const chosen = chooseVoicing(
        item.chord,
        before ?? (target.kind === 'bass' ? original : undefined),
        after,
        fixedBass,
        line,
      );
      // A stepping bass helps a plausible chord; it does not rescue an implausible one.
      const bassLine =
        1.5 * chosen.bassLine * Math.min(1, item.components.role / 2.4);
      const reasons = [
        ...(chosen.bassLine >= 0.75 ? [{ kind: 'bass-line' } as const] : []),
        ...item.reasons,
        ...(item.components.voiceLeading >= -0.7 && neighbor
          ? [{ kind: 'smooth-voices' } as const]
          : []),
      ];
      return {
        chord: chosen.chord,
        score: item.score + bassLine,
        components: { ...item.components, bassLine },
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

  // Greedy diversity reranking keeps useful alternatives across roots, basses and
  // pitch sets. Stable catalogue order breaks exact ties; no randomness or mutation.
  const recommendations: ChordRecommendation[] = [];
  while (recommendations.length < limit && distinctVoicings.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (const [candidateIndex, item] of distinctVoicings.entries()) {
      const bass = pitchClass(voiceChord(item.chord)[0]!);
      let repeatedRoots = 0;
      let repeatedBasses = 0;
      let overlap = 0;
      for (const value of recommendations) {
        if (pitchClass(value.chord.root) === pitchClass(item.chord.root))
          repeatedRoots++;
        if (pitchClass(voiceChord(value.chord)[0]!) === bass) repeatedBasses++;
        overlap = Math.max(
          overlap,
          commonToneCount(value.chord, item.chord) /
            Math.max(
              pitchClasses(value.chord).length,
              pitchClasses(item.chord).length,
            ),
        );
      }
      const score =
        item.score - repeatedRoots * 1.5 - repeatedBasses * 0.75 - overlap;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = candidateIndex;
      }
    }
    const [chosen] = distinctVoicings.splice(bestIndex, 1);
    if (chosen) recommendations.push(chosen);
  }
  return { context, recommendations };
}
