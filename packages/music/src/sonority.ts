/** Descriptors of sounding frequencies, independent of names and chord recipes.
 * Roughness assumes six harmonic partials with amplitudes falling as 1/h. It is
 * a comparative model value, not a probability or a measured listener rating.
 */
export interface SonorityProfile {
  readonly roughness: number;
  readonly spanCents: number;
}

const harmonics = 6;

function partialRoughness(a: number, b: number): number {
  const lower = Math.min(a, b);
  const scaledGap = (0.24 * Math.abs(a - b)) / (0.021 * lower + 19);
  return Math.exp(-3.5 * scaledGap) - Math.exp(-5.75 * scaledGap);
}

export function measureSonority(
  frequencies: readonly number[],
): SonorityProfile {
  if (
    frequencies.some(
      (frequency) => !Number.isFinite(frequency) || frequency <= 0,
    )
  )
    throw new RangeError('Sounding frequencies must be finite and positive.');
  if (!frequencies.length) return { roughness: 0, spanCents: 0 };
  let roughness = 0;
  let pairs = 0;
  for (let i = 0; i < frequencies.length; i++) {
    for (let j = i + 1; j < frequencies.length; j++) {
      pairs++;
      for (let a = 1; a <= harmonics; a++) {
        for (let b = 1; b <= harmonics; b++) {
          roughness +=
            partialRoughness(frequencies[i]! * a, frequencies[j]! * b) /
            (a * b);
        }
      }
    }
  }
  return {
    roughness: pairs ? roughness / pairs : 0,
    spanCents:
      1200 * Math.log2(Math.max(...frequencies) / Math.min(...frequencies)),
  };
}

/** Minimum ordered voice movement in cents. Insertion/deletion costs 300 cents;
 * this policy is explicit because no voice identities are supplied.
 */
export function voiceMotion(
  from: readonly number[],
  to: readonly number[],
): number {
  if (
    [...from, ...to].some(
      (frequency) => !Number.isFinite(frequency) || frequency <= 0,
    )
  )
    throw new RangeError('Sounding frequencies must be finite and positive.');
  if (!from.length && !to.length) return 0;
  const a = from.map((value) => 1200 * Math.log2(value)).sort((x, y) => x - y);
  const b = to.map((value) => 1200 * Math.log2(value)).sort((x, y) => x - y);
  const change = 300;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j * change);
  for (let i = 1; i <= a.length; i++) {
    const row = [i * change];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        previous[j - 1]! + Math.abs(a[i - 1]! - b[j - 1]!),
        previous[j]! + change,
        row[j - 1]! + change,
      );
    }
    previous = row;
  }
  return previous[b.length]! / Math.max(a.length, b.length);
}
