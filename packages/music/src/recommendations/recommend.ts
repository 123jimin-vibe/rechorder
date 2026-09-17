import type { WesternChord } from '../western';
import {
  chordDefinitions,
  jazzDefinitions,
  createChord,
  chromaticPosition,
} from '../western';
import { isAuditionable, voiceChord } from '../chord-manipulation';
import type { TonalContext, TonalKey } from './tonality';
import { inferTonality, keyFit, recommendationRoots } from './tonality';
import type { Relation } from './harmony';
import {
  commonToneCount,
  hasInterval,
  mod12,
  pitchClass,
  pitchClasses,
  relation,
  tendencyResolution,
} from './harmony';
import { chooseVoicing } from './voice-leading';

export type RecommendationTarget =
  | { readonly kind: 'insert'; readonly index: number }
  | { readonly kind: 'replace'; readonly index: number }
  | {
      readonly kind: 'bass';
      readonly chord: WesternChord;
      readonly index: number;
    };
export interface RecommendationRequest {
  readonly progression: readonly WesternChord[];
  readonly target: RecommendationTarget;
  readonly key?: TonalKey;
  readonly limit?: number;
}
export type RecommendationReason =
  | { readonly kind: Relation; readonly side: 'before' | 'after' }
  | {
      readonly kind:
        | 'key-fit'
        | 'borrowed'
        | 'deceptive'
        | 'fixed-bass'
        | 'smooth-voices'
        | 'shared-tones'
        | 'starting-point';
    };
export interface RecommendationScore {
  readonly tonality: number;
  readonly relationships: number;
  readonly commonTones: number;
  readonly similarity: number;
  readonly complexity: number;
  readonly voiceLeading: number;
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

function harmonicIdentity(chord: WesternChord): string {
  return (
    pitchClass(chord.root) +
    ':' +
    pitchClasses(chord)
      .sort((a, b) => a - b)
      .join(',')
  );
}

/** Pure, bounded conventional-tonal search. See docs/chord-recommendations.md for
 * score terms and limits. Scores are heuristic preferences, never probabilities.
 */
export function recommendChords(
  request: RecommendationRequest,
): RecommendationResult {
  const { progression, target } = request;
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
  const fixedBass =
    target.kind === 'bass' ? voiceChord(target.chord)[0] : undefined;
  const neighbor = before ?? after ?? original;
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
      const tonality =
        context.hypotheses.reduce(
          (sum, hypothesis) =>
            sum + keyFit(chord, hypothesis.key) * hypothesis.weight,
          0,
        ) * (context.source === 'explicit' ? 1.5 : context.confident ? 1 : 0.5);
      let relationships = 0;
      for (const side of ['before', 'after'] as const) {
        const adjacent = side === 'before' ? before : after;
        if (!adjacent) continue;
        const from = side === 'before' ? adjacent : chord;
        const to = side === 'before' ? chord : adjacent;
        const connection = relation(from, to);
        if (connection) {
          relationships += connection.score + tendencyResolution(from, to);
          reasons.push({ kind: connection.kind, side });
        }
      }
      const key = context.hypotheses[0]?.key;
      if (key && (context.source === 'explicit' || context.confident)) {
        const degree = mod12(pitchClass(chord.root) - pitchClass(key.tonic));
        if (!before && !after && degree === 0 && keyFit(chord, key) === 3)
          relationships += 2;
        if (keyFit(chord, key) === 3) reasons.push({ kind: 'key-fit' });
        // Parallel-minor mixture remains available, with a modest contextual bonus.
        if (
          key.mode === 'major' &&
          ((degree === 5 && hasInterval(chord, 3)) ||
            ([8, 10].includes(degree) && hasInterval(chord, 4)))
        ) {
          relationships += 2;
          reasons.push({ kind: 'borrowed' });
        }
        if (
          before &&
          (key.mode === 'major' || key.mode === 'minor') &&
          mod12(pitchClass(before.root) - pitchClass(key.tonic)) === 7 &&
          hasInterval(before, 4) &&
          degree === (key.mode === 'minor' ? 8 : 9) &&
          hasInterval(chord, key.mode === 'minor' ? 4 : 3)
        ) {
          relationships += 4;
          reasons.push({ kind: 'deceptive' });
        }
      }
      const adjacent = [before, after].filter(
        (value): value is WesternChord => !!value,
      );
      const commonTones = adjacent.reduce(
        (sum, value) =>
          sum +
          commonToneCount(chord, value) /
            Math.max(pitchClasses(chord).length, pitchClasses(value).length),
        0,
      );
      if (commonTones >= 0.5) reasons.push({ kind: 'shared-tones' });
      const similarity = original ? commonToneCount(chord, original) * 0.45 : 0;
      // Match the local vocabulary's density; do not let extensions win merely by
      // containing more common tones. Penalize repeated harmony on a continuation.
      const density = neighbor?.definition.intervals.length ?? 3;
      const complexity =
        -0.55 * Math.abs(chord.definition.intervals.length - density) -
        (before && harmonicIdentity(chord) === harmonicIdentity(before)
          ? 3
          : 0) -
        (after && harmonicIdentity(chord) === harmonicIdentity(after) ? 3 : 0) -
        (chord.definition.intervals.length > 5
          ? 0.4 * (chord.definition.intervals.length - 5)
          : 0);
      if (fixedBass) reasons.unshift({ kind: 'fixed-bass' });
      if (!reasons.length) reasons.push({ kind: 'starting-point' });
      const components = {
        tonality,
        relationships,
        commonTones,
        similarity,
        complexity,
        voiceLeading: 0,
      };
      return {
        chord,
        components,
        reasons,
        score: Object.values(components).reduce((a, b) => a + b, 0),
      };
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
      );
      const voiceLeading = -0.65 * chosen.movement;
      return {
        chord: chosen.chord,
        score: item.score + voiceLeading,
        components: { ...item.components, voiceLeading },
        reasons:
          chosen.movement <= 2 && neighbor
            ? [
                ...item.reasons.filter(
                  (reason) => reason.kind !== 'starting-point',
                ),
                { kind: 'smooth-voices' },
              ]
            : item.reasons,
      };
    })
    .filter(
      (item) =>
        isAuditionable(item.chord) &&
        (!fixedBass ||
          chromaticPosition(voiceChord(item.chord)[0]!.position) ===
            chromaticPosition(fixedBass.position)),
    );

  // Greedy diversity reranking keeps useful alternatives across roots and pitch
  // sets. Stable catalogue order breaks exact ties; no randomness or mutation.
  const recommendations: ChordRecommendation[] = [];
  while (recommendations.length < limit && voiced.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (const [candidateIndex, item] of voiced.entries()) {
      const repeatedRoots = recommendations.filter(
        (value) => pitchClass(value.chord.root) === pitchClass(item.chord.root),
      ).length;
      const overlap = recommendations.reduce(
        (max, value) =>
          Math.max(
            max,
            commonToneCount(value.chord, item.chord) /
              Math.max(
                pitchClasses(value.chord).length,
                pitchClasses(item.chord).length,
              ),
          ),
        0,
      );
      const score = item.score - repeatedRoots * 4 - overlap * 1.5;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = candidateIndex;
      }
    }
    const [chosen] = voiced.splice(bestIndex, 1);
    if (chosen) recommendations.push(chosen);
  }
  return { context, recommendations };
}
