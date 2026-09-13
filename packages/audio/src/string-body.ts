/*!
 * The Synthesis ToolKit in C++ (STK)
 * Copyright (c) 1995-2023 Perry R. Cook and Gary P. Scavone
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * Any person wishing to distribute modifications to the Software is
 * asked to send the modifications to the original developer so that they
 * can be incorporated into the canonical version. This is, however, not
 * a binding provision of this license.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/** Violin radiation filter from STK Bowed (Esteban Maestre, 2011).
 * STK defaults to 44.1 kHz. This six-section response is outside the feedback
 * loop: its poles/zeros describe radiated sound, not bridge admittance.
 * Attribution and redistribution terms: ../THIRD_PARTY_NOTICES.md.
 */
const violin = [
  [1, 1.5667, 0.3133, -0.5509, -0.3925],
  [1, -1.9537, 0.9542, -1.6357, 0.8697],
  [1, -1.6683, 0.8852, -1.7674, 0.8735],
  [1, -1.8585, 0.9653, -1.8498, 0.9516],
  [1, -1.9299, 0.9621, -1.9354, 0.959],
  [1, -1.98, 0.9888, -1.9867, 0.9923],
] as const;

export class StringBody {
  private readonly coefficients: Float64Array;
  private readonly state = new Float64Array(12);

  constructor(sampleRate: number, size = 1) {
    // Inverse bilinear transform at the reference rate, then transform to the
    // real render rate. Stability is preserved; no raw 44.1 kHz coefficients at 48 kHz.
    const a = (44100 * size - sampleRate) / (44100 * size + sampleRate);
    const transform = (x: number, y: number, z: number) => [
      x + a * y + a * a * z,
      2 * a * x + (1 + a * a) * y + 2 * a * z,
      a * a * x + a * y + z,
    ];
    this.coefficients = new Float64Array(30);
    for (let index = 0; index < violin.length; index++) {
      const [b0, b1, b2, a1, a2] = violin[index]!;
      const b = transform(b0, b1, b2),
        d = transform(1, a1, a2);
      this.coefficients.set(
        [
          b[0]! / d[0]!,
          b[1]! / d[0]!,
          b[2]! / d[0]!,
          d[1]! / d[0]!,
          d[2]! / d[0]!,
        ],
        index * 5,
      );
    }
  }

  tick(input: number): number {
    let value = input * 0.1248;
    for (let index = 0; index < 6; index++) {
      const c = index * 5,
        s = index * 2;
      const output = this.coefficients[c]! * value + this.state[s]!;
      this.state[s] =
        this.coefficients[c + 1]! * value -
        this.coefficients[c + 3]! * output +
        this.state[s + 1]!;
      this.state[s + 1] =
        this.coefficients[c + 2]! * value - this.coefficients[c + 4]! * output;
      value = output;
    }
    return value;
  }
}
