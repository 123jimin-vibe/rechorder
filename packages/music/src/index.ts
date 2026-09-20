export type {
  Pitch,
  Tuning,
  Chord,
  ChordDefinition,
  ResolvedNote,
} from './model';
export { resolvePitches } from './model';
export { measureSonority, voiceMotion } from './sonority';
export type { SonorityProfile } from './sonority';
export { pythagoreanPitch, pythagoreanTuning } from './pythagorean';
export type { PythagoreanPitch, PythagoreanPosition } from './pythagorean';
export type {
  WesternChord,
  WesternPosition,
  WesternInterval,
  ChordAlteration,
  ChordRecipe,
  WesternVoicing,
  WesternBass,
} from './western';
export {
  chordDefinitions,
  roots,
  createChord,
  chordSymbol,
  standardTuning,
  jazzDefinitions,
  chordAlterations,
  chordRecipe,
  alterChord,
  pianoPitches,
  defaultChordOctave,
  bassPitch,
  rootLabel,
  spelledPitch,
} from './western';
export { chordData, chordFromData } from './chord-data';
export type { WesternChordData } from './chord-data';
export {
  chordTones,
  bassRole,
  voicedTones,
  voiceChord,
  isAuditionable,
  setToneVoicing,
  setBass,
  chooseChord,
  setChordDegree,
  transposeChord,
  transposePitch,
  transpositionIntervals,
  enharmonicSpellings,
  respellChord,
} from './chord-manipulation';
export type { ChordTone, VoicedTone } from './chord-manipulation';
export type { ProgressionEntry } from './progression';
export {
  entryIndex,
  insertEntry,
  replaceEntry,
  removeEntry,
  moveEntry,
} from './progression';
export { recommendChords } from './recommendations/recommend';
export type {
  RecommendationTarget,
  RecommendationRequest,
  RecommendationFocus,
  RecommendationLens,
  RecommendationReason,
  RecommendationScore,
  ChordRecommendation,
  RecommendationResult,
} from './recommendations/recommend';
export {
  tonalModes,
  inferTonality,
  scalePitches,
  chordRole,
  diatonicChord,
} from './recommendations/tonality';
export type {
  TonalMode,
  TonalKey,
  TonalContext,
  TonalHypothesis,
  ChordRole,
  HarmonicFunction,
} from './recommendations/tonality';
export { motion } from './recommendations/harmony';
export type { Move, Motion } from './recommendations/harmony';
export { voiceLeadingDistance } from './recommendations/voice-leading';
