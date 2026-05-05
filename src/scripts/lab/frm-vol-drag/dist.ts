// FRM · Volatility Drag · v3 — distribution precompute
// Generates 30 background trajectories + 1000-sample log-binned histogram
// for the all-in (f=1) screen. Called once at mount.

import { N, flipCoin, multiplier } from './coin';

const SCENARIOS = 30;        // background trajectories on screen 2
const DIST_SAMPLES = 1000;   // sample size for the histogram
const HIST_BINS = 30;        // log10-binned histogram bins
const Y_MIN = -7;            // log10 lower bound of histogram
const Y_MAX = 3;             // log10 upper bound of histogram

export interface PrecomputedDist {
  bgScenarios: number[][];   // [SCENARIOS][N+1] trajectories at f=1
  histogramBins: number[];   // [HIST_BINS] counts of finals binned in log10
  yMin: number;
  yMax: number;
  histBins: number;
}

// One trajectory of length N+1 (start + N flips) at fraction f.
export function generateTraj(f: number = 1): number[] {
  const traj = [1];
  for (let r = 0; r < N; r++) {
    const side = flipCoin();
    traj.push(traj[r] * multiplier(side, f));
  }
  return traj;
}

// Full precompute for screen 2 (all-in). bg scenarios + histogram.
export function precomputeAllInDist(): PrecomputedDist {
  const f = 1; // all-in for screen 2
  const bgScenarios: number[][] = [];
  for (let i = 0; i < SCENARIOS; i++) bgScenarios.push(generateTraj(f));

  const bins = new Array(HIST_BINS).fill(0);
  for (let i = 0; i < DIST_SAMPLES; i++) {
    let v = 1;
    for (let r = 0; r < N; r++) {
      const side = flipCoin();
      v *= multiplier(side, f);
    }
    const lv = Math.log10(Math.max(v, 1e-10));
    let idx = Math.floor((lv - Y_MIN) / (Y_MAX - Y_MIN) * HIST_BINS);
    if (idx < 0) idx = 0;
    if (idx >= HIST_BINS) idx = HIST_BINS - 1;
    bins[idx]++;
  }

  return {
    bgScenarios,
    histogramBins: bins,
    yMin: Y_MIN,
    yMax: Y_MAX,
    histBins: HIST_BINS,
  };
}
