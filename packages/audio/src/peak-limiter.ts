/** Linear below the ceiling. A 3 ms lookahead reserves gain reduction for peaks;
 * it never applies a memoryless distortion curve to the chord mixture.
 */
export class PeakLimiter {
  readonly latency: number;
  private readonly delay: Float64Array;
  private readonly peaks: Float64Array;
  private readonly frames: Float64Array;
  private readonly recovery: number;
  private head = 0;
  private tail = 0;
  private frame = 0;
  private position = 0;
  private gain = 1;

  constructor(sampleRate: number) {
    this.latency = Math.ceil(sampleRate * 0.003);
    this.delay = new Float64Array(this.latency);
    this.peaks = new Float64Array(this.latency + 2);
    this.frames = new Float64Array(this.latency + 2);
    this.recovery = 1 - Math.exp(-1 / (sampleRate * 0.08));
  }

  tick(input: number): number {
    const size = this.peaks.length;
    while (this.head !== this.tail && this.frames[this.head]! < this.frame - this.latency)
      this.head = (this.head + 1) % size;
    const peak = Math.abs(input);
    while (this.head !== this.tail) {
      const previous = (this.tail + size - 1) % size;
      if (this.peaks[previous]! > peak) break;
      this.tail = previous;
    }
    this.peaks[this.tail] = peak;
    this.frames[this.tail] = this.frame++;
    this.tail = (this.tail + 1) % size;
    const target = Math.min(1, 0.88 / Math.max(0.88, this.peaks[this.head]!));
    this.gain = Math.min(target, this.gain + (1 - this.gain) * this.recovery);
    const output = this.delay[this.position]! * this.gain;
    this.delay[this.position] = input;
    if (++this.position === this.delay.length) this.position = 0;
    return output;
  }

  clear(): void {
    this.delay.fill(0);
    this.head = this.tail = this.frame = this.position = 0;
    this.gain = 1;
  }
}
