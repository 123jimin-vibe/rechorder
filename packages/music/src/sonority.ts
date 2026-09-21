/** Descriptors of sounding frequencies, independent of names and chord recipes.
 * Roughness assumes six harmonic partials with amplitudes falling as 1/h.
 * Harmonicity is the best cosine similarity between the collection's
 * pitch-class spectrum and one harmonic series (Milne's spectral pitch-class
 * similarity: twelve partials, amplitude h^-0.67, 6.8-cent Gaussian smearing),
 * so 1 is a single harmonic tone and symmetric or clustered collections score
 * low. Both are comparative model values, not probabilities or measured
 * listener ratings.
 */
export interface SonorityProfile {
  readonly roughness: number;
  readonly harmonicity: number;
  readonly spanCents: number;
}

const harmonics = 6;
const templatePartials = 12;
const templateRolloff = 0.67;
const smearCents = 6.8;
const bins = 1200;

function pitchClassSpectrum(frequencies: readonly number[]): Float64Array {
  const spectrum = new Float64Array(bins);
  const reach = Math.ceil(3 * smearCents);
  for (const frequency of frequencies) {
    for (let h = 1; h <= templatePartials; h++) {
      const centre = (1200 * Math.log2(frequency * h)) % bins;
      const weight = h ** -templateRolloff;
      for (let offset = -reach; offset <= reach; offset++) {
        const bin = (((Math.round(centre) + offset) % bins) + bins) % bins;
        const distance = bin - centre;
        const wrapped =
          Math.abs(distance) > bins / 2
            ? distance - Math.sign(distance) * bins
            : distance;
        spectrum[bin] =
          spectrum[bin]! +
          weight * Math.exp(-(wrapped * wrapped) / (2 * smearCents ** 2));
      }
    }
  }
  return spectrum;
}

/** One harmonic series with its fundamental at 0 cents, as sparse bins. */
const template = (() => {
  const spectrum = pitchClassSpectrum([1]);
  const entries: { bin: number; value: number }[] = [];
  let norm = 0;
  spectrum.forEach((value, bin) => {
    if (value > 0) entries.push({ bin, value });
    norm += value * value;
  });
  return { entries, norm: Math.sqrt(norm) };
})();

function harmonicityOf(frequencies: readonly number[]): number {
  const spectrum = pitchClassSpectrum(frequencies);
  const norm = Math.sqrt(
    spectrum.reduce((sum, value) => sum + value * value, 0),
  );
  if (!norm) return 0;
  // Candidate fundamentals are the subharmonics of every sounding note; the
  // best fit among them is the best fit overall up to smearing resolution.
  const candidates = new Set<number>();
  for (const frequency of frequencies)
    for (let n = 1; n <= templatePartials; n++)
      candidates.add(
        ((Math.round(1200 * Math.log2(frequency / n)) % bins) + bins) % bins,
      );
  let best = 0;
  for (const shift of candidates) {
    let dot = 0;
    for (const { bin, value } of template.entries)
      dot += value * spectrum[(bin + shift) % bins]!;
    best = Math.max(best, dot / (norm * template.norm));
  }
  return best;
}

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
  if (!frequencies.length)
    return { roughness: 0, harmonicity: 0, spanCents: 0 };
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
    harmonicity: harmonicityOf(frequencies),
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
