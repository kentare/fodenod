/**
 * Pure scoring math for the belly check: zero-shot CLIP, two classes.
 * Kept free of DOM and model code so it can be sanity-checked in Node.
 */

export type Vector = ArrayLike<number>;

/** Scales a vector to unit length (L2). A zero vector comes back as zeros. */
export function l2Normalize(v: Vector): Float32Array {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum);
  const out = new Float32Array(v.length);
  if (norm === 0) return out;
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

/** Element-wise mean of equally long vectors. */
export function meanVector(vectors: readonly Vector[]): Float32Array {
  if (vectors.length === 0) throw new Error("meanVector: no vectors");
  const out = new Float32Array(vectors[0].length);
  for (const v of vectors) {
    if (v.length !== out.length) throw new Error("meanVector: length mismatch");
    for (let i = 0; i < v.length; i++) out[i] += v[i];
  }
  for (let i = 0; i < out.length; i++) out[i] /= vectors.length;
  return out;
}

/** Cosine similarity. */
export function cosine(a: Vector, b: Vector): number {
  if (a.length !== b.length) throw new Error("cosine: length mismatch");
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

/** Numerically stable softmax. */
export function softmax(logits: readonly number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / total);
}

/** One class embedding: normalise each prompt, average them, normalise again. */
export function classEmbedding(promptEmbeds: readonly Vector[]): Float32Array {
  return l2Normalize(meanVector(promptEmbeds.map(l2Normalize)));
}

/** CLIP's logit scale. */
export const LOGIT_SCALE = 100;

/** P(pregnant) for one image embedding against the two class embeddings. */
export function pregnantProbability(
  imageEmbed: Vector,
  pregnant: Vector,
  notPregnant: Vector,
): number {
  const image = l2Normalize(imageEmbed);
  const [p] = softmax([
    LOGIT_SCALE * cosine(image, pregnant),
    LOGIT_SCALE * cosine(image, notPregnant),
  ]);
  return p;
}

/** Weight of the newest frame in the running score. */
export const SMOOTHING = 0.4;

/** Exponential smoothing for live video: 0.4 × new + 0.6 × previous. */
export function smooth(previous: number | null, latest: number): number {
  if (previous === null) return latest;
  return SMOOTHING * latest + (1 - SMOOTHING) * previous;
}

export const PREGNANT_THRESHOLD = 0.5;

export function isPregnant(score: number): boolean {
  return score >= PREGNANT_THRESHOLD;
}
