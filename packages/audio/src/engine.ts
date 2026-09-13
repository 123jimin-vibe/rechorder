import type { ResolvedNote } from '@rechorder/music';
import type { AudioDriver, Voice } from './driver';
import { createWebAudioDriver } from './web-audio';

export type PlaybackState =
  | 'scheduled'
  | 'playing'
  | 'releasing'
  | 'suspended'
  | 'completed'
  | 'cancelled';

export interface PlaybackRequest {
  readonly notes: readonly ResolvedNote[];
  readonly startTime: number;
  readonly duration: number;
  readonly level?: number;
}

export interface PlaybackHandle {
  readonly id: string;
  readonly state: PlaybackState;
  cancel(): void;
}

export interface ActiveNote {
  readonly playbackId: string;
  readonly note: ResolvedNote;
  readonly startTime: number;
  readonly endTime: number;
}

export interface PlaybackEngine {
  readonly running: boolean;
  readonly currentTime: number;
  initialize(): Promise<void>;
  schedule(request: PlaybackRequest): PlaybackHandle;
  activeNotes(): readonly ActiveNote[];
  stopAll(): void;
  dispose(): Promise<void>;
}

interface Playback {
  readonly id: string;
  readonly notes: readonly ResolvedNote[];
  readonly voices: Voice[];
  readonly remaining: Set<string>;
  readonly start: number;
  end: number;
  cancelled: boolean;
  final: 'completed' | 'cancelled' | null;
}

export function createPlaybackEngine(
  factory: () => AudioDriver = createWebAudioDriver,
): PlaybackEngine {
  let driver: AudioDriver | undefined;
  let initializing: Promise<void> | undefined;
  let disposed = false;
  let sequence = 0;
  const playbacks = new Map<string, Playback>();

  function finish(playback: Playback) {
    playback.final = playback.cancelled ? 'cancelled' : 'completed';
    playbacks.delete(playback.id);
  }

  function state(playback: Playback): PlaybackState {
    if (playback.final) return playback.final;
    if (!driver || driver.currentTime >= playback.end) {
      return playback.cancelled ? 'cancelled' : 'completed';
    }
    if (!driver.running) return 'suspended';
    if (driver.currentTime < playback.start) return 'scheduled';
    return playback.cancelled ? 'releasing' : 'playing';
  }

  function stopAll() {
    for (const playback of [...playbacks.values()]) {
      playback.cancelled = true;
      finish(playback);
      for (const voice of playback.voices) voice.stop();
    }
  }

  return {
    get running() {
      return !disposed && Boolean(driver?.running);
    },
    get currentTime() {
      return driver?.currentTime ?? 0;
    },
    async initialize() {
      if (disposed) throw new Error('Audio engine is disposed.');
      driver ??= factory();
      if (driver.running) return;
      if (!initializing) {
        initializing = driver.resume().finally(() => {
          initializing = undefined;
        });
      }
      await initializing;
      if (disposed)
        throw new Error('Audio engine was disposed while starting.');
    },
    schedule(request) {
      if (disposed || !driver?.running)
        throw new Error('Initialize audio before scheduling.');
      const clock = driver;
      const { startTime, duration } = request;
      const level = request.level ?? 1;
      if (!Number.isFinite(level) || level < 0 || level > 1)
        throw new RangeError('Playback level must be between zero and one.');
      if (
        !Number.isFinite(startTime) ||
        startTime < 0 ||
        !Number.isFinite(duration) ||
        duration <= 0 ||
        !Number.isFinite(startTime + duration) ||
        startTime + duration <= startTime
      ) {
        throw new RangeError(
          'Playback requires a valid start and positive duration.',
        );
      }
      if (request.notes.length === 0)
        throw new RangeError('Playback requires notes.');
      const keys = new Set<string>();
      const notes = request.notes.map((note) => {
        if (
          !note.key ||
          keys.has(note.key) ||
          !Number.isFinite(note.frequency) ||
          note.frequency <= 0
        ) {
          throw new RangeError(
            'Notes require unique keys and finite positive frequencies.',
          );
        }
        keys.add(note.key);
        return { ...note };
      });
      const start = Math.max(startTime, clock.currentTime);
      if (!Number.isFinite(start + duration) || start + duration <= start) {
        throw new RangeError(
          'Playback duration exceeds the audio clock range.',
        );
      }
      const playback: Playback = {
        id: `playback-${++sequence}`,
        notes,
        voices: [],
        remaining: keys,
        start,
        end: start + duration,
        cancelled: false,
        final: null,
      };
      playbacks.set(playback.id, playback);
      try {
        for (const note of notes) {
          playback.voices.push(
            clock.schedule(
              note.frequency,
              (0.5 * level) / Math.sqrt(notes.length),
              start,
              playback.end,
              () => {
                playback.remaining.delete(note.key);
                if (playback.remaining.size === 0) finish(playback);
              },
            ),
          );
        }
      } catch (error) {
        playback.cancelled = true;
        finish(playback);
        for (const voice of playback.voices) voice.stop();
        throw error;
      }
      return {
        id: playback.id,
        get state() {
          return state(playback);
        },
        cancel() {
          if (playback.final || playback.cancelled) return;
          playback.cancelled = true;
          if (!clock.running || clock.currentTime < playback.start) {
            finish(playback);
            for (const voice of playback.voices) voice.stop();
          } else {
            for (const voice of playback.voices) {
              playback.end = Math.min(
                playback.end,
                voice.release(clock.currentTime),
              );
            }
          }
        },
      };
    },
    activeNotes() {
      if (!driver?.running || disposed) return [];
      const now = driver.currentTime;
      return [...playbacks.values()].flatMap((playback) =>
        now >= playback.start && now < playback.end
          ? playback.notes
              .filter((note) => playback.remaining.has(note.key))
              .map((note) => ({
                playbackId: playback.id,
                note,
                startTime: playback.start,
                endTime: playback.end,
              }))
          : [],
      );
    },
    stopAll,
    async dispose() {
      if (disposed) return;
      disposed = true;
      stopAll();
      await driver?.close();
    },
  };
}
