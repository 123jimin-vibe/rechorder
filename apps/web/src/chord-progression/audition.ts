import type {
  PlaybackEngine,
  PlaybackHandle,
  ActiveNote,
} from '@rechorder/audio';
import type { ResolvedNote } from '@rechorder/music';

/** The page's audition policy; scheduling and voice ownership remain in the engine. */
export class AuditionController {
  private revision = 0;
  private pendingSource: string | null = null;
  private disposed = false;
  private readonly auditions = new Map<
    string,
    { handle: PlaybackHandle; source: string }
  >();

  constructor(
    private readonly engine: PlaybackEngine,
    private readonly reportError: (error: unknown) => void = (error) =>
      console.error('Chord playback failed.', error),
  ) {}

  async play(notes: readonly ResolvedNote[], source: string): Promise<void> {
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
    for (const [id, audition] of this.auditions) {
      if (
        audition.handle.state === 'completed' ||
        audition.handle.state === 'cancelled'
      )
        this.auditions.delete(id);
    }
    return this.engine.activeNotes();
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
}
