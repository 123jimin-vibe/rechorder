export const maximumVoices = 64;

export function validateString(frequency: number, sampleRate: number): void {
  if (
    !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000 ||
    !Number.isFinite(frequency) || frequency <= 0 || frequency >= sampleRate / 2 ||
    2 * sampleRate / frequency > 65536
  ) throw new RangeError('Frequency or sample rate exceeds the bowed-string model range.');
}

export type BowedEvent =
  | { type: 'start'; id: number; frequency: number; gain: number; start: number; end: number; seed: number }
  | { type: 'release'; id: number; at: number; end: number }
  | { type: 'stop'; id: number }
  | { type: 'dispose' };

export type BowedReply = { type: 'ended'; id: number } | { type: 'error'; message: string };
