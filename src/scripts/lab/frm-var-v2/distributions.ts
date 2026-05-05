// FRM-VaR v2 — random number generators and PDFs.
// Migrated verbatim from v1.5 public/scripts/frm-var.js.

export type Distribution = 'normal' | 't';

export function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Standardised t(df=4): t / sqrt(df/(df-2)) = t/sqrt(2). std = 1, matches Normal.
export function randt4_std(): number {
  const Z = randn();
  const chi2 = randn() ** 2 + randn() ** 2 + randn() ** 2 + randn() ** 2;
  const t = Z / Math.sqrt(chi2 / 4);
  return t / Math.SQRT2;
}

export function innovation(dist: Distribution): number {
  return dist === 'normal' ? randn() : randt4_std();
}

export function normalPdf(x: number, sigma: number): number {
  return Math.exp(-x * x / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

// Student-t(df=4), normalised so std of distribution = sigma.
export function tStdPdf(x: number, sigma: number): number {
  const scale = sigma * Math.SQRT2;
  const z = x / scale;
  const pdf = (3 / 8) * Math.pow(1 + z * z / 4, -2.5);
  return pdf / scale;
}

// Inverse standard normal CDF — Acklam approximation.
export function invNormalCdf(p: number): number {
  if (p <= 0 || p >= 1) return p < 0.5 ? -Infinity : Infinity;
  const a = [-3.969683028665376e+01,  2.209460984245205e+02, -2.759285104469687e+02,  1.383577518672690e+02, -3.066479806614716e+01,  2.506628277459239e+00];
  const b = [-5.447609879822406e+01,  1.615858368580409e+02, -1.556989798598866e+02,  6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00,  4.374664141464968e+00,  2.938163982698783e+00];
  const d = [ 7.784695709041462e-03,  3.224671290700398e-01,  2.445134137142996e+00,  3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  let q: number, r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= ph) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}
