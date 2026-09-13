import { StringBody } from './string-body';
import { validateString } from './bowed-protocol';

/** Smith/STK bow-junction model; attribution and license: THIRD_PARTY_NOTICES.md. */
export function bowReflection(relativeVelocity: number, slope: number): number {
  const slip = Math.abs((relativeVelocity + 0.001) * slope) + 0.75;
  return Math.min(0.98, Math.max(0.01, 1 / (slip * slip * slip * slip)));
}

/** Read-before-write: both round trips contribute exactly their fractional delay. */
class StringDelay {
  private readonly samples: Float64Array;
  private position = 0;
  constructor(length: number) {
    this.samples = new Float64Array(Math.ceil(length) + 8);
  }
  read(delay: number): number {
    let position = this.position - delay;
    if (position < 0) position += this.samples.length;
    const left = Math.floor(position);
    const right = left + 1 === this.samples.length ? 0 : left + 1;
    const fraction = position - left;
    return (
      this.samples[left]! * (1 - fraction) + this.samples[right]! * fraction
    );
  }
  write(value: number): void {
    this.samples[this.position] = value;
    if (++this.position === this.samples.length) this.position = 0;
  }
}

/** One player: nonlinear bow contact between two reflected travelling-wave paths. */
class BowedPlayer {
  private readonly bridge: StringDelay;
  private readonly neck: StringDelay;
  private readonly pole: number;
  private readonly period: number;
  private readonly filterDelay: number;
  private readonly position: number;
  private readonly vibratoRate: number;
  private readonly vibratoPhase: number;
  private readonly motionPhase: number;
  private readonly rate: number;
  private readonly expressive: boolean;
  private seed: number;
  private filtered = 0;
  private motion = 0;
  private elapsed = 0;
  private bridgeLength = 0;
  private neckLength = 0;
  private bridgeStep = 0;
  private neckStep = 0;
  private velocity = 0;
  private velocityStep = 0;
  private slope = 3;
  private control = 0;

  constructor(
    frequency: number,
    rate: number,
    seed: number,
    expressive: boolean,
  ) {
    this.rate = rate;
    this.seed = seed >>> 0;
    this.expressive = expressive;
    this.period = rate / frequency;
    this.pole = Math.exp((-2 * Math.PI * 8000) / rate);
    const omega = (2 * Math.PI * frequency) / rate;
    // Compensate the bridge-loss filter's phase at the requested fundamental.
    this.filterDelay =
      Math.atan2(this.pole * Math.sin(omega), 1 - this.pole * Math.cos(omega)) /
      omega;
    this.position = Math.max(
      0.12 + 0.025 * this.random(),
      1.1 / (this.period - this.filterDelay),
    );
    this.vibratoRate = 4.7 + 0.9 * this.random();
    this.vibratoPhase = 2 * Math.PI * this.random();
    this.motionPhase = 2 * Math.PI * this.random();
    this.bridge = new StringDelay(this.period * 1.02);
    this.neck = new StringDelay(this.period * 1.02);
    this.bridgeLength = (this.period - this.filterDelay) * this.position;
    this.neckLength = (this.period - this.filterDelay) * (1 - this.position);
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  tick(contact: number): number {
    // Low-rate, smoothly interpolated bow motion keeps transcendental functions
    // out of the sample loop. Noise perturbs the contact, never the mixed output.
    if (this.control === 0) {
      const time = this.elapsed / this.rate;
      this.motion += 0.12 * (this.random() * 2 - 1 - this.motion);
      const vibrato = this.expressive
        ? 0.002 *
          Math.min(1, time / 0.35) *
          Math.sin(2 * Math.PI * this.vibratoRate * time + this.vibratoPhase)
        : 0;
      const length = this.period / (1 + vibrato) - this.filterDelay;
      this.bridgeStep = (length * this.position - this.bridgeLength) / 64;
      this.neckStep = (length * (1 - this.position) - this.neckLength) / 64;
      const gesture = this.expressive
        ? 0.025 * Math.sin(2 * Math.PI * 0.8 * time + this.motionPhase) +
          0.012 * this.motion
        : 0;
      const velocity = 0.18 * Math.min(1, time / 0.065) * (1 + gesture);
      this.velocityStep = (velocity - this.velocity) / 64;
      this.slope = 3 * (1 + gesture * 0.3);
      this.control = 64;
    }
    this.control--;
    this.elapsed++;
    this.velocity += this.velocityStep;
    this.bridgeLength += this.bridgeStep;
    this.neckLength += this.neckStep;
    this.filtered =
      this.pole * this.filtered +
      (1 - this.pole) * this.bridge.read(this.bridgeLength);
    const bridgeReflection = -0.98 * this.filtered;
    const nutReflection = -this.neck.read(this.neckLength);
    const relative = this.velocity - (bridgeReflection + nutReflection);
    const force = contact * relative * bowReflection(relative, this.slope);
    this.neck.write(bridgeReflection + force);
    this.bridge.write(nutReflection + force);
    return this.filtered;
  }
}

class LowPass {
  private readonly b0: number;
  private readonly b1: number;
  private readonly b2: number;
  private readonly a1: number;
  private readonly a2: number;
  private z1 = 0;
  private z2 = 0;
  constructor(frequency: number, rate: number, q: number) {
    const omega = (2 * Math.PI * frequency) / rate;
    const cosine = Math.cos(omega),
      alpha = Math.sin(omega) / (2 * q);
    this.b0 = (1 - cosine) / (2 * (1 + alpha));
    this.b1 = 2 * this.b0;
    this.b2 = this.b0;
    this.a1 = (-2 * cosine) / (1 + alpha);
    this.a2 = (1 - alpha) / (1 + alpha);
  }
  tick(input: number): number {
    const output = this.b0 * input + this.z1;
    this.z1 = this.b1 * input - this.a1 * output + this.z2;
    this.z2 = this.b2 * input - this.a2 * output;
    return output;
  }
}

/** Streaming physical source; no note buffers, MIDI pitches, or duration allocation.
 * Two independent players share a fixed radiation profile. The larger-body profile
 * is an artistic scaling of the violin filter, not measured cello coefficients.
 */
export class BowedString {
  private readonly players: BowedPlayer[];
  private readonly body: StringBody;
  private readonly lowPass: LowPass[];
  private readonly gain: number;

  constructor(
    frequency: number,
    sampleRate: number,
    seed = 1,
    expressive = true,
  ) {
    validateString(frequency, sampleRate);
    this.players = [
      new BowedPlayer(frequency, sampleRate * 2, seed, expressive),
      new BowedPlayer(frequency, sampleRate * 2, seed ^ 0x9e3779b9, expressive),
    ];
    const bodyScale =
      0.65 + 0.35 * Math.min(1, Math.max(0, Math.log2(frequency / 130.8128)));
    this.body = new StringBody(sampleRate, bodyScale);
    this.lowPass = [
      new LowPass(Math.min(9000, sampleRate * 0.4), sampleRate * 2, 0.5411961),
      new LowPass(Math.min(9000, sampleRate * 0.4), sampleRate * 2, 1.306563),
    ];
    this.gain = 1.6 * Math.min(1.6, Math.sqrt(130.8128 / frequency));
  }

  /** Zero contact lifts the bow; stored string/body energy then decays passively. */
  tick(contact = 1): number {
    let output = 0;
    for (let sample = 0; sample < 2; sample++) {
      output =
        (this.players[0]!.tick(contact) + this.players[1]!.tick(contact)) *
        Math.SQRT1_2;
      output = this.lowPass[1]!.tick(this.lowPass[0]!.tick(output));
    }
    return this.body.tick(output) * this.gain;
  }
}
