interface AudioProbe {
  readonly contexts: AudioContext[];
  readonly sources: AudioBufferSourceNode[];
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
  const contexts: AudioContext[] = [];
  const sources: AudioBufferSourceNode[] = [];
  const starts: number[] = [];
  const analysers: AnalyserNode[] = [];
  window.audioProbe = {
    contexts,
    sources,
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
    private readonly analyser: AnalyserNode;

    constructor(options?: AudioContextOptions) {
      super(options);
      contexts.push(this);
      this.analyser = this.createAnalyser();
      this.analyser.fftSize = 4096;
      analysers.push(this.analyser);
      // Observe the final instrument output, including its dynamics and ceiling.
      const silent = super.createGain();
      silent.gain.value = 0;
      this.analyser.connect(silent).connect(this.destination);
    }

    override createWaveShaper(): WaveShaperNode {
      const ceiling = super.createWaveShaper();
      ceiling.connect(this.analyser);
      return ceiling;
    }

    override createBufferSource(): AudioBufferSourceNode {
      const source = super.createBufferSource();
      starts.push(this.currentTime);
      sources.push(source);
      return source;
    }

    override resume(): Promise<void> {
      window.audioProbe.resumeCalls++;
      return super.resume();
    }
  };
}
