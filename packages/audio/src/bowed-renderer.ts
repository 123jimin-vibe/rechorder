import { BowedString } from './string-model';
import { maximumVoices, type BowedEvent } from './bowed-protocol';
import { PeakLimiter } from './peak-limiter';

interface RenderVoice {
  model: BowedString;
  gain: number;
  start: number;
  end: number;
  attack: number;
  release: number;
  releaseLevel: number;
}

/** Same deterministic renderer is used by AudioWorklet and offline verification. */
export class BowedRenderer {
  private readonly voices = new Map<number, RenderVoice>();
  private readonly rate: number;
  private readonly ended: (id: number) => void;
  private readonly limiter: PeakLimiter;

  constructor(sampleRate: number, ended: (id: number) => void) {
    this.rate = sampleRate;
    this.ended = ended;
    this.limiter = new PeakLimiter(sampleRate);
  }

  get voiceCount(): number { return this.voices.size; }

  event(event: BowedEvent): void {
    if (event.type === 'dispose') {
      this.voices.clear();
      this.limiter.clear();
      return;
    }
    if (event.type === 'start') {
      if (this.voices.size >= maximumVoices) throw new RangeError('Bowed voice limit reached.');
      const start = Math.round(event.start * this.rate), end = Math.round(event.end * this.rate);
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start ||
          !Number.isFinite(event.gain) || event.gain < 0 || event.gain > 1)
        throw new RangeError('Invalid bowed voice schedule.');
      this.voices.set(event.id, {
        model: new BowedString(event.frequency, this.rate, event.seed), gain: event.gain,
        start, end, attack: Math.min(this.rate * 0.065, (end - start) / 4),
        release: end - Math.min(this.rate * 0.1, (end - start) / 4), releaseLevel: 1,
      });
      return;
    }
    const voice = this.voices.get(event.id);
    if (!voice) return;
    if (event.type === 'stop') {
      this.voices.delete(event.id);
      this.ended(event.id);
      if (this.voices.size === 0) this.limiter.clear();
    } else {
      const at = Math.round(event.at * this.rate);
      if (at < voice.start) {
        this.event({ type: 'stop', id: event.id });
        return;
      }
      const end = Math.min(voice.end, Math.round(event.end * this.rate));
      const level = this.envelope(voice, at);
      voice.release = at;
      voice.releaseLevel = level;
      voice.end = end;
    }
  }

  private envelope(voice: RenderVoice, frame: number): number {
    if (frame < voice.start || frame >= voice.end) return 0;
    if (frame >= voice.release)
      return voice.releaseLevel * (voice.end - frame) / Math.max(1, voice.end - voice.release);
    return Math.min(1, (frame - voice.start) / voice.attack);
  }

  render(output: Float32Array, firstFrame: number): void {
    output.fill(0);
    for (const [id, voice] of this.voices) {
      const begin = Math.max(0, voice.start - firstFrame);
      const end = Math.min(output.length, voice.end - firstFrame);
      for (let index = begin; index < end; index++) {
        const frame = firstFrame + index;
        const level = this.envelope(voice, frame);
        // Lift the bow on release while the string/body continue ringing.
        const contact = frame < voice.release ? 1 : Math.max(0, 1 - (frame - voice.release) / (this.rate * 0.02));
        output[index] = output[index]! + voice.model.tick(contact) * voice.gain * level;
      }
      if (firstFrame + output.length >= voice.end + this.limiter.latency) {
        this.voices.delete(id);
        this.ended(id);
      }
    }
    for (let index = 0; index < output.length; index++) output[index] = this.limiter.tick(output[index]!);
  }
}
