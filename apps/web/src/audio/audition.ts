import type {
  PlaybackEngine,
  PlaybackHandle,
  ActiveNote,
} from '@rechorder/audio';
import type { ResolvedNote } from '@rechorder/music';

export const progressionBpm = 120;
export const tempoLimits = { min: 1, max: 600 } as const;
export const progressionBeatsPerChord = 2;
export const progressionChordDuration =
  (60 / progressionBpm) * progressionBeatsPerChord;

export type ProgressionPlaybackStatus = 'stopped' | 'playing' | 'paused';

export interface ProgressionChord {
  readonly source: string;
  readonly notes: readonly ResolvedNote[];
}

export interface ProgressionPlaybackState {
  readonly status: ProgressionPlaybackStatus;
  readonly currentIndex: number | null;
}

interface ProgressionSession {
  readonly chords: readonly ProgressionChord[];
  status: ProgressionPlaybackStatus;
  offset: number;
  origin: number | null;
  nextIndex: number;
}

/** The page's audition and transport policy; voice ownership remains in the engine. */
export class AuditionController {
  private static readonly progressionLookahead = 0.9;
  private bpm = progressionBpm;
  private revision = 0;
  private progressionRevision = 0;
  private pendingSource: string | null = null;
  private disposed = false;
  private readonly held = new Map<string, { handle?: PlaybackHandle }>();
  private readonly auditions = new Map<
    string,
    { handle: PlaybackHandle; source: string }
  >();
  private progression: ProgressionSession | null = null;
  private readonly progressionHandles = new Map<string, PlaybackHandle>();
  private progressionTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly engine: PlaybackEngine,
    private readonly reportError: (error: unknown) => void = (error) =>
      console.error('Chord playback failed.', error),
  ) {}

  tempo(): number {
    return this.bpm;
  }

  setTempo(bpm: number): void {
    if (!Number.isFinite(bpm) || bpm < tempoLimits.min || bpm > tempoLimits.max)
      throw new RangeError('Tempo is outside the supported playback range.');
    if (bpm === this.bpm) return;
    this.refreshProgression();
    const progression = this.progression;
    const position = progression
      ? this.currentProgressionOffset(progression) / this.chordDuration()
      : 0;
    this.bpm = bpm;
    if (!progression) return;
    this.cancelProgressionHandles();
    progression.offset = position * this.chordDuration();
    progression.nextIndex = Math.floor(position);
    if (progression.origin !== null)
      progression.origin = this.engine.currentTime - progression.offset;
    this.refreshProgression();
  }

  private chordDuration(): number {
    return (60 / this.bpm) * progressionBeatsPerChord;
  }

  /** Load the renderer ahead of the first gesture without starting audio. */
  async prepare(): Promise<void> {
    if (this.disposed) return;
    try {
      await this.engine.prepare();
    } catch (error) {
      if (!this.disposed) this.reportError(error);
    }
  }

  async play(notes: readonly ResolvedNote[], source: string): Promise<void> {
    this.pauseProgression();
    const revision = ++this.revision;
    if (this.disposed) return;
    this.pendingSource = source;
    const snapshot = notes.map((note) => ({ ...note }));
    try {
      if (!this.engine.running) await this.engine.initialize();
      if (this.disposed || revision !== this.revision) return;
      this.pendingSource = null;
      const handle = this.engine.schedule({
        notes: snapshot,
        startTime: this.engine.currentTime,
        duration: 1,
      });
      const previous = [...this.auditions.values()];
      this.auditions.set(handle.id, { handle, source });
      for (const audition of previous) audition.handle.cancel();
    } catch (error) {
      if (!this.disposed && revision === this.revision) {
        this.pendingSource = null;
        this.reportError(error);
      }
    }
  }

  notes(): readonly ActiveNote[] {
    this.refreshProgression();
    for (const [id, audition] of this.auditions) {
      if (
        audition.handle.state === 'completed' ||
        audition.handle.state === 'cancelled'
      )
        this.auditions.delete(id);
    }
    return this.engine.activeNotes();
  }

  activeAuditionSources(): readonly string[] {
    return [...this.auditions.values()]
      .filter(
        ({ handle }) =>
          handle.state === 'playing' || handle.state === 'releasing',
      )
      .map(({ source }) => source);
  }

  async playProgression(
    chords: readonly ProgressionChord[],
    startIndex = 0,
  ): Promise<void> {
    if (this.disposed || this.progression?.status === 'playing') return;
    if (!this.progression || this.progression.status === 'stopped') {
      if (chords.length === 0) return;
      if (
        !Number.isInteger(startIndex) ||
        startIndex < 0 ||
        startIndex >= chords.length
      )
        throw new RangeError('Progression start index does not exist.');
      this.progression = {
        chords: chords.map((chord) => ({
          source: chord.source,
          notes: chord.notes.map((note) => ({ ...note })),
        })),
        status: 'stopped',
        offset: startIndex * this.chordDuration(),
        origin: null,
        nextIndex: 0,
      };
    }

    const progression = this.progression;
    progression.status = 'playing';
    progression.origin = null;
    const revision = ++this.progressionRevision;
    this.cancelAuditions();
    try {
      if (!this.engine.running) await this.engine.initialize();
      if (
        this.disposed ||
        revision !== this.progressionRevision ||
        progression !== this.progression ||
        progression.status !== 'playing'
      )
        return;
      progression.origin = this.engine.currentTime - progression.offset;
      progression.nextIndex = Math.floor(
        progression.offset / this.chordDuration(),
      );
      this.refreshProgression();
      if (progression !== this.progression || progression.status !== 'playing')
        return;
      this.progressionTimer = setInterval(() => this.refreshProgression(), 50);
    } catch (error) {
      if (
        !this.disposed &&
        revision === this.progressionRevision &&
        progression === this.progression
      ) {
        progression.status = progression.offset > 0 ? 'paused' : 'stopped';
        progression.origin = null;
        this.cancelProgressionHandles();
        this.reportError(error);
      }
    }
  }

  pauseProgression(): void {
    const progression = this.progression;
    if (!progression || progression.status !== 'playing') return;
    if (progression.origin !== null)
      progression.offset = this.currentProgressionOffset(progression);
    progression.status = 'paused';
    progression.origin = null;
    this.progressionRevision++;
    this.clearProgressionTimer();
    this.cancelProgressionHandles();
  }

  stopProgression(): void {
    if (!this.progression) return;
    this.progressionRevision++;
    this.clearProgressionTimer();
    this.cancelProgressionHandles();
    this.progression = null;
  }

  progressionState(): ProgressionPlaybackState {
    this.refreshProgression();
    const progression = this.progression;
    if (!progression) return { status: 'stopped', currentIndex: null };
    const offset =
      progression.status === 'playing' && progression.origin !== null
        ? this.currentProgressionOffset(progression)
        : progression.offset;
    return {
      status: progression.status,
      currentIndex: Math.min(
        progression.chords.length - 1,
        Math.floor(offset / this.chordDuration()),
      ),
    };
  }

  /** Each finger/key owns its release, including gestures released during audio resume. */
  async press(source: string, note: ResolvedNote): Promise<void> {
    if (this.disposed || this.held.has(source) || this.held.size >= 10) return;
    const held: { handle?: PlaybackHandle } = {};
    this.held.set(source, held);
    try {
      if (!this.engine.running) await this.engine.initialize();
      if (this.disposed || this.held.get(source) !== held) return;
      held.handle = this.engine.schedule({
        notes: [note],
        startTime: this.engine.currentTime,
        // The backend requires a finite safety bound; interaction release normally
        // ends this voice, while one day avoids changing a human-length hold.
        duration: 24 * 60 * 60,
        level: 0.25,
      });
    } catch (error) {
      if (this.held.get(source) === held) {
        this.held.delete(source);
        this.reportError(error);
      }
    }
  }

  release(source: string): void {
    this.held.get(source)?.handle?.cancel();
    this.held.delete(source);
  }

  stopSource(source: string): void {
    if (this.pendingSource === source) {
      this.revision++;
      this.pendingSource = null;
    }
    for (const audition of this.auditions.values()) {
      if (audition.source === source) audition.handle.cancel();
    }
  }

  stopAll(): void {
    this.revision++;
    this.pendingSource = null;
    this.progressionRevision++;
    this.clearProgressionTimer();
    this.progression = null;
    this.progressionHandles.clear();
    this.held.clear();
    this.engine.stopAll();
    this.auditions.clear();
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.stopAll();
    try {
      await this.engine.dispose();
    } catch (error) {
      this.reportError(error);
    }
  }

  private cancelAuditions(): void {
    this.revision++;
    this.pendingSource = null;
    for (const audition of this.auditions.values()) audition.handle.cancel();
    this.auditions.clear();
  }

  private currentProgressionOffset(progression: ProgressionSession): number {
    if (progression.origin === null) return progression.offset;
    return Math.min(
      progression.chords.length * this.chordDuration(),
      Math.max(0, this.engine.currentTime - progression.origin),
    );
  }

  private refreshProgression(): void {
    const progression = this.progression;
    if (
      !progression ||
      progression.status !== 'playing' ||
      progression.origin === null
    )
      return;

    for (const [id, handle] of this.progressionHandles) {
      if (handle.state === 'completed' || handle.state === 'cancelled')
        this.progressionHandles.delete(id);
    }

    const offset = this.currentProgressionOffset(progression);
    const total = progression.chords.length * this.chordDuration();
    if (offset >= total) {
      this.clearProgressionTimer();
      this.progressionHandles.clear();
      this.progression = null;
      return;
    }

    const horizon =
      offset +
      Math.min(
        AuditionController.progressionLookahead,
        this.chordDuration() * 2,
      );
    while (
      progression.nextIndex < progression.chords.length &&
      progression.nextIndex * this.chordDuration() < horizon
    ) {
      const index = progression.nextIndex++;
      const chord = progression.chords[index];
      if (!chord) continue;
      const chordStart = index * this.chordDuration();
      const chordEnd = chordStart + this.chordDuration();
      const segmentStart = Math.max(offset, chordStart);
      if (segmentStart >= chordEnd) continue;
      try {
        const handle = this.engine.schedule({
          notes: chord.notes,
          startTime: progression.origin + segmentStart,
          duration: chordEnd - segmentStart,
        });
        this.progressionHandles.set(handle.id, handle);
      } catch (error) {
        this.stopProgression();
        this.reportError(error);
        return;
      }
    }
  }

  private cancelProgressionHandles(): void {
    for (const handle of this.progressionHandles.values()) handle.cancel();
    this.progressionHandles.clear();
  }

  private clearProgressionTimer(): void {
    if (this.progressionTimer !== undefined) {
      clearInterval(this.progressionTimer);
      this.progressionTimer = undefined;
    }
  }
}
