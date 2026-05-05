// FRM · Volatility Drag · v3 — coin module
// Base constants, RNG, multipliers, formatters.

export const N = 100;             // tosses per game
export const HEADS_RETURN = 0.5;  // +50% on heads
export const TAILS_RETURN = -0.4; // −40% on tails
export const HEADS_PROB = 0.5;

export type Side = 'heads' | 'tails';

export function flipCoin(): Side {
  return Math.random() < HEADS_PROB ? 'heads' : 'tails';
}

// Multiplier for one round at fraction-of-capital f.
//   heads → 1 + 0.5*f
//   tails → 1 − 0.4*f
// Clamped to ≥ 1e-9 so log doesn't explode at f → 1 with bad luck streak.
export function multiplier(side: Side, f: number): number {
  const r = side === 'heads' ? HEADS_RETURN : TAILS_RETURN;
  return Math.max(1 + r * f, 1e-9);
}

// E[ln R] — log-return per round at fraction f. The "growth rate" g(f).
export function geomReturn(f: number): number {
  return HEADS_PROB * Math.log(1 + HEADS_RETURN * f) +
         (1 - HEADS_PROB) * Math.log(Math.max(1 + TAILS_RETURN * f, 1e-9));
}

// E[1 + delta] — arithmetic per-round multiplier at fraction f.
// EV per round = +5% × f; mean across T rounds = (1 + 0.05f)^T.
export function arithExpectedValue(f: number): number {
  return 1 + 0.05 * f;
}

// Money formatter — no scientific notation, decimals scale with magnitude.
export function fmtMoney(v: number): string {
  if (!isFinite(v) || v <= 0) return '$0';
  if (v >= 1000)   return '$' + Math.round(v).toLocaleString('en-US');
  if (v >= 10)     return '$' + v.toFixed(1);
  if (v >= 1)      return '$' + v.toFixed(2);
  if (v >= 0.01)   return '$' + v.toFixed(2);
  if (v >= 0.0001) return '$' + v.toFixed(4);
  return '$' + v.toFixed(6);
}

// Axis-tick label from a log10 value — used on both trajectory + histogram.
export function fmtAxisTick(lv: number): string {
  if (lv >= 4) return '$10k';
  if (lv >= 3) return '$1k';
  if (lv >= 1) return '$' + Math.round(Math.pow(10, lv));
  if (lv >= 0) return '$1';
  const v = Math.pow(10, lv);
  const decimals = Math.abs(Math.round(lv));
  return '$' + v.toFixed(decimals);
}
