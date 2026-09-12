interface AudioProbe {
  readonly contexts: AudioContext[];
  readonly oscillators: OscillatorNode[];
  readonly starts: number[];
  resumeCalls: number;
  energy(): number;
}

declare global {
  interface Window {
    audioProbe: AudioProbe;
  }
}

/** Observe native audio, including its rendered waveform; no synthesized test output. */
export function installAudioProbe(): void {
  const contexts: AudioContext[] = [];
  const oscillators: OscillatorNode[] = [];
  const starts: number[] = [];
  const analysers: AnalyserNode[] = [];
  window.audioProbe = {
    contexts,
    oscillators,
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
  };
  window.AudioContext = class extends AudioContext {
    private readonly analyser: AnalyserNode;

    constructor(options?: AudioContextOptions) {
      super(options);
      contexts.push(this);
      this.analyser = this.createAnalyser();
      this.analyser.fftSize = 512;
      analysers.push(this.analyser);
      // The silent side branch observes each voice's actual gain envelope.
      const silent = super.createGain();
      silent.gain.value = 0;
      this.analyser.connect(silent).connect(this.destination);
    }

    override createGain(): GainNode {
      const gain = super.createGain();
      gain.connect(this.analyser);
      return gain;
    }

    override createOscillator(): OscillatorNode {
      const oscillator = super.createOscillator();
      starts.push(this.currentTime);
      oscillators.push(oscillator);
      return oscillator;
    }

    override resume(): Promise<void> {
      window.audioProbe.resumeCalls++;
      return super.resume();
    }
  };
}
