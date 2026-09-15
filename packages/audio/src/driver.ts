/** Minimal instrument port: native audio and deterministic tests implement the same lifecycle. */
export interface Voice {
  release(at: number): number;
  stop(): void;
}

export interface AudioDriver {
  readonly currentTime: number;
  readonly running: boolean;
  prepare(): Promise<void>;
  resume(): Promise<void>;
  schedule(
    frequency: number,
    gain: number,
    start: number,
    end: number,
    onEnded: () => void,
  ): Voice;
  close(): Promise<void>;
}
