interface AudioProbe {
  readonly contexts: AudioContext[];
  readonly sources: { frequency: number; start: number; end: number }[];
  readonly worklets: AudioWorkletNode[];
  readonly starts: number[];
  resumeCalls: number;
  energy(): number;
  rms(): number;
}

declare global {
  interface Window {
    audioProbe: AudioProbe;
  }
}

/** Observe native audio, including its rendered waveform; no synthesized test output. */
export function installAudioProbe(): void {
  // Some platform-specific WebKit test builds omit Web Audio entirely.
  if (typeof AudioContext === 'undefined') return;
  const contexts: AudioContext[] = [];
  const sources: { frequency: number; start: number; end: number }[] = [];
  const worklets: AudioWorkletNode[] = [];
  const starts: number[] = [];
  const analysers: AnalyserNode[] = [];
  window.audioProbe = {
    contexts,
    sources,
    worklets,
    starts,
    resumeCalls: 0,
    energy() {
      let peak = 0;
      for (const analyser of analysers) {
        const samples = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(samples);
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
      }
      return peak;
    },
    rms() {
      let energy = 0;
      let count = 0;
      for (const analyser of analysers) {
        const samples = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(samples);
        for (const sample of samples) energy += sample * sample;
        count += samples.length;
      }
      return count ? Math.sqrt(energy / count) : 0;
    },
  };
  window.AudioContext = class extends AudioContext {
    constructor(options?: AudioContextOptions) {
      super(options);
      contexts.push(this);
    }

    override resume(): Promise<void> {
      window.audioProbe.resumeCalls++;
      return super.resume();
    }
  };
  window.AudioWorkletNode = class extends AudioWorkletNode {
    constructor(
      context: BaseAudioContext,
      name: string,
      options?: AudioWorkletNodeOptions,
    ) {
      super(context, name, options);
      worklets.push(this);
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analysers.push(analyser);
      const silent = context.createGain();
      silent.gain.value = 0;
      this.connect(analyser).connect(silent).connect(context.destination);
      // Observe actual voice events sent to the native renderer, without replacing DSP.
      const postMessage = this.port.postMessage.bind(this.port);
      this.port.postMessage = (message: unknown) => {
        if (
          typeof message === 'object' &&
          message !== null &&
          'type' in message &&
          message.type === 'start' &&
          'frequency' in message &&
          typeof message.frequency === 'number' &&
          'start' in message &&
          typeof message.start === 'number' &&
          'end' in message &&
          typeof message.end === 'number'
        ) {
          sources.push({
            frequency: message.frequency,
            start: message.start,
            end: message.end,
          });
          starts.push(context.currentTime);
        }
        postMessage(message);
      };
    }
  };
}
