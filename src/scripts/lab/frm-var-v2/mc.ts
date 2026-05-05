// FRM-VaR v2 — Monte Carlo simulation under GBM.
// Migrated from v1.5 runMonteCarlo() into a pure function.

import { innovation, type Distribution } from './distributions';
import { parametricVarEs } from './calc';

export interface McParams {
  sigma: number;
  T: number;
  alpha: number;
  dist: Distribution;
  nSim?: number;
  nPaths?: number;
}

export interface McResult {
  paths: number[][];
  pathBreached: boolean[];
  finals: Float64Array;
  varBound: number;
  esBound: number;
  breaches: number;
  avgBreachLoss: number;
}

export function runMonteCarlo(params: McParams): McResult {
  const { sigma, T, alpha, dist, nSim = 10_000, nPaths = 100 } = params;
  const sqrtDt = 1;
  const drift = -0.5 * sigma * sigma;

  const { var: varBound, es: esBound } = parametricVarEs(sigma, T, alpha, dist);

  const paths: number[][] = [];
  const pathBreached: boolean[] = [];
  const finals = new Float64Array(nSim);

  for (let i = 0; i < nSim; i++) {
    let logS = 0;
    const trace: number[] | null = i < nPaths ? [1.0] : null;
    for (let t = 0; t < T; t++) {
      logS += drift + sigma * sqrtDt * innovation(dist);
      if (trace) trace.push(Math.exp(logS));
    }
    const finalRet = Math.exp(logS) - 1;
    finals[i] = finalRet;
    if (trace) {
      paths.push(trace);
      pathBreached.push(finalRet >= varBound);
    }
  }

  let breaches = 0;
  let breachSum = 0;
  for (let i = 0; i < nSim; i++) {
    if (finals[i] >= varBound) {
      breaches++;
      breachSum += finals[i];
    }
  }

  return {
    paths,
    pathBreached,
    finals,
    varBound,
    esBound,
    breaches,
    avgBreachLoss: breaches > 0 ? breachSum / breaches : 0,
  };
}
