import { BowedRenderer } from './bowed-renderer';
import type { BowedEvent, BowedReply } from './bowed-protocol';

// AudioWorklet globals are not included in TypeScript's DOM declarations.
declare const sampleRate: number;
declare const currentFrame: number;
declare class AudioWorkletProcessor { readonly port: MessagePort; }
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;

class BowedProcessor extends AudioWorkletProcessor {
  private readonly renderer = new BowedRenderer(sampleRate, (id) => this.reply({ type: 'ended', id }));
  private alive = true;
  constructor() {
    super();
    this.port.onmessage = (message: MessageEvent<BowedEvent>) => {
      try {
        this.renderer.event(message.data);
        if (message.data.type === 'dispose') this.alive = false;
      } catch (error) {
        this.reply({ type: 'error', message: String(error) });
        this.alive = false;
      }
    };
  }
  private reply(message: BowedReply): void { this.port.postMessage(message); }
  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0]?.[0];
    if (output && this.alive) this.renderer.render(output, currentFrame);
    return this.alive;
  }
}

registerProcessor('rechorder-bowed-strings', BowedProcessor);
