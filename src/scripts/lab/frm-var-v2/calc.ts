// FRM-VaR v2 — VaR + Expected Shortfall calculations.
// Logic migrated from v1.5; CVaR renamed to ES to match design.md §6 screen 29.

import { invNormalCdf, randt4_std, type Distribution } from './distributions';

export interface VarEs {
  var: number;
  es: number;
}

export interface HistogramBins {
  counts: number[];
  centers: number[];
  labels: string[];
  binW: number;
  min: number;
  max: number;
}

export function historicalVarEs(losses: number[], alpha: number): VarEs {
  const sorted = [...losses].sort((a, b) => b - a);
  const n = sorted.length;
  const idx = Math.max(0, Math.floor((1 - alpha) * n) - 1);
  const v = sorted[idx];
  let sum = 0;
  for (let i = 0; i <= idx; i++) sum += sorted[i];
  const e = sum / (idx + 1);
  return { var: v, es: e };
}

// t(4) quantile + ES are deterministic functions of alpha — compute once per
// alpha and cache. Without caching, each slider tick triggered a 50k sort
// (~30ms). Cache lets sigma slider update at native rate.
const tMultiplierCache = new Map<number, { var: number; es: number }>();

function tMultipliers(alpha: number): { var: number; es: number } {
  const cached = tMultiplierCache.get(alpha);
  if (cached) return cached;
  const N = 50_000;
  const sample = new Float64Array(N);
  for (let i = 0; i < N; i++) sample[i] = randt4_std();
  const sorted = Array.from(sample).sort((a, b) => a - b);
  const tailIdx = Math.floor((1 - alpha) * N);
  const v = -sorted[tailIdx];
  let sum = 0;
  for (let i = 0; i <= tailIdx; i++) sum += sorted[i];
  const e = -sum / (tailIdx + 1);
  const m = { var: v, es: e };
  tMultiplierCache.set(alpha, m);
  return m;
}

export function parametricVarEs(
  sigma: number,
  T: number,
  alpha: number,
  dist: Distribution
): VarEs {
  const sqrtT = Math.sqrt(T);
  if (dist === 'normal') {
    const z = invNormalCdf(alpha);
    const v = z * sigma * sqrtT;
    const phi = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    const e = sigma * sqrtT * phi / (1 - alpha);
    return { var: v, es: e };
  }
  const m = tMultipliers(alpha);
  return { var: m.var * sigma * sqrtT, es: m.es * sigma * sqrtT };
}

export function histogram(values: number[], bins: number): HistogramBins {
  let min = Infinity, max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1e-9;
  const binW = range / bins;
  const counts = new Array(bins).fill(0);
  const centers: number[] = [];
  const labels: string[] = [];
  for (let b = 0; b < bins; b++) {
    const center = min + (b + 0.5) * binW;
    centers.push(center);
    labels.push((center * 100).toFixed(2) + '%');
  }
  for (const v of values) {
    let bi = Math.floor((v - min) / binW);
    if (bi >= bins) bi = bins - 1;
    if (bi < 0) bi = 0;
    counts[bi]++;
  }
  return { counts, centers, labels, binW, min, max };
}
