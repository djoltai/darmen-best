// FRM · Volatility Drag · v3 — canvas drawing
// All five charts: trajectory + histogram for all-in (screen 2),
// trajectory + g(f) curve for slider (screen 3), density schematic
// for the asymmetry block (screen 2).

import { N, geomReturn, arithExpectedValue, fmtAxisTick, fmtMoney } from './coin';
import type { PrecomputedDist } from './dist';

// Palette literals — keep in sync with --v3-* CSS vars.
const COL = {
  bg:        '#faf3dd',
  text:      '#1a1a1a',
  textMuted: 'rgba(26,26,26,0.7)',
  textFaint: 'rgba(26,26,26,0.45)',
  teal:      '#07434b',
  tealSoft:  'rgba(7,67,75,0.10)',
  tealHi:    'rgba(7,67,75,0.4)',
  coral:     '#d97062',
  coralSoft: 'rgba(217,112,98,0.10)',
  coralHi:   'rgba(217,112,98,0.35)',
  refDot:    'rgba(26,26,26,0.22)',
  bgScenLine:'rgba(7,67,75,0.10)',
};

// Theoretical median + mean for the all-in distribution.
//   ln R ~ Bernoulli(0.5) on {ln 1.5, ln 0.6}
//   μ = 0.5*(ln 1.5 + ln 0.6) = -0.0527,  σ² ≈ 0.2099
// median(X_T) = exp(μT) ≈ $0.005,  mean = exp((μ+σ²/2)T) ≈ $131
const ALL_IN_MEDIAN = Math.exp(0.5 * (Math.log(1.5) + Math.log(0.6)) * N);
const ALL_IN_MEAN   = Math.pow(0.5 * 1.5 + 0.5 * 0.6, N); // = 1.05^100 ≈ $131.5

// HiDPI canvas setup. Returns logical (CSS-pixel) width/height + ctx
// pre-scaled by devicePixelRatio so drawing math uses CSS units.
function setupHiDPI(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D, w: number, h: number } {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  canvas.width  = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

// ============================================================
// 1. drawTrajectoryAllIn — screen 2 left chart
// ============================================================

const TICKS_ALL_IN = [3, 1, 0, -2, -4]; // log10 → $1k $10 $1 $0.01 $0.0001

export function drawTrajectoryAllIn(
  canvas: HTMLCanvasElement,
  dist: PrecomputedDist,
  activeTraj: number[] | null
) {
  const { ctx, w, h } = setupHiDPI(canvas);
  // padL bumped from 44 to 52 so "$0.0001" doesn't clip on narrow viewports.
  const padL = 52, padR = 12, padT = 12, padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const yMin = dist.yMin, yMax = dist.yMax;

  const yPx = (v: number) => {
    const lv = Math.log10(Math.max(v, 1e-10));
    return padT + (1 - (lv - yMin) / (yMax - yMin)) * plotH;
  };
  const xPx = (t: number) => padL + (t / N) * plotW;

  // axis frame (left + bottom)
  ctx.strokeStyle = 'rgba(26,26,26,0.18)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // Y ticks + labels
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillStyle = COL.textFaint;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const lv of TICKS_ALL_IN) {
    const y = yPx(Math.pow(10, lv));
    ctx.fillText(fmtAxisTick(lv), padL - 6, y);
    ctx.strokeStyle = 'rgba(26,26,26,0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
  }

  // dotted reference at $1
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = COL.refDot;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, yPx(1));
  ctx.lineTo(padL + plotW, yPx(1));
  ctx.stroke();
  ctx.setLineDash([]);

  // 30 background scenarios
  ctx.lineWidth = 1;
  ctx.strokeStyle = COL.bgScenLine;
  for (const traj of dist.bgScenarios) {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = xPx(i), y = yPx(traj[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // active trajectory — segment-coloured by mid-segment value
  if (activeTraj && activeTraj.length > 1) {
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const drawn = activeTraj.length;
    for (let i = 1; i < drawn; i++) {
      const v0 = activeTraj[i - 1], v1 = activeTraj[i];
      const avg = (v0 + v1) / 2;
      ctx.strokeStyle = avg >= 1 ? COL.teal : COL.coral;
      ctx.beginPath();
      ctx.moveTo(xPx(i - 1), yPx(v0));
      ctx.lineTo(xPx(i),     yPx(v1));
      ctx.stroke();
    }
    // end dot
    if (drawn === N + 1) {
      const last = activeTraj[N];
      ctx.fillStyle = last >= 1 ? COL.teal : COL.coral;
      ctx.beginPath();
      ctx.arc(xPx(N), yPx(last), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // x label
  ctx.fillStyle = COL.textFaint;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillText('0', padL, padT + plotH + 4);
  ctx.fillText('100', padL + plotW, padT + plotH + 4);
}

// ============================================================
// 2. drawHistogramAllIn — screen 2 right chart
// ============================================================

export function drawHistogramAllIn(
  canvas: HTMLCanvasElement,
  dist: PrecomputedDist,
  lastFinal: number | null
) {
  const { ctx, w, h } = setupHiDPI(canvas);
  const padL = 8, padR = 56, padT = 12, padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const yMin = dist.yMin, yMax = dist.yMax;

  const yPx = (v: number) => {
    const lv = Math.log10(Math.max(v, 1e-10));
    return padT + (1 - (lv - yMin) / (yMax - yMin)) * plotH;
  };

  const maxCount = Math.max(...dist.histogramBins, 1);
  const binSpan = (yMax - yMin) / dist.histBins;
  const binPxH = plotH / dist.histBins;

  // bars (horizontal, left-to-right)
  for (let i = 0; i < dist.histBins; i++) {
    const count = dist.histogramBins[i];
    if (count === 0) continue;
    const lvMid = yMin + (i + 0.5) * binSpan;
    const barW = Math.max(1, (count / maxCount) * plotW);
    const yTop = padT + (1 - (i + 1) / dist.histBins) * plotH;
    const isWin = lvMid >= 0;
    ctx.fillStyle = isWin ? COL.tealHi : COL.coralHi;
    ctx.fillRect(padL, yTop + 0.5, barW, Math.max(1, binPxH - 1));
  }

  // dotted reference at $1
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = COL.refDot;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, yPx(1));
  ctx.lineTo(padL + plotW, yPx(1));
  ctx.stroke();
  ctx.setLineDash([]);

  // theoretical median — solid horizontal
  ctx.strokeStyle = COL.textMuted;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  const medY = yPx(ALL_IN_MEDIAN);
  ctx.moveTo(padL, medY);
  ctx.lineTo(padL + plotW, medY);
  ctx.stroke();

  // theoretical mean — dashed horizontal
  ctx.strokeStyle = COL.textMuted;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  const meanY = yPx(ALL_IN_MEAN);
  ctx.moveTo(padL, meanY);
  ctx.lineTo(padL + plotW, meanY);
  ctx.stroke();
  ctx.setLineDash([]);

  // labels right of each line
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillStyle = COL.textMuted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('медиана', padL + plotW + 6, medY - 6);
  ctx.fillText(fmtMoney(ALL_IN_MEDIAN), padL + plotW + 6, medY + 6);
  ctx.fillText('среднее', padL + plotW + 6, meanY - 6);
  ctx.fillText(fmtMoney(ALL_IN_MEAN),  padL + plotW + 6, meanY + 6);

  // last attempt marker — horizontal line + left-edge dot
  if (lastFinal !== null) {
    const y = yPx(lastFinal);
    const c = lastFinal >= 1 ? COL.teal : COL.coral;
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(padL, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// 3. drawTrajectorySlider — screen 3 left chart
// ============================================================

const TICKS_SLIDER = [3, 1, 0, -1, -3]; // log10 → $1k $10 $1 $0.1 $0.001

export function drawTrajectorySlider(canvas: HTMLCanvasElement, f: number) {
  const { ctx, w, h } = setupHiDPI(canvas);
  // padL matches drawTrajectoryAllIn so y-axis labels never clip on narrow widths.
  const padL = 52, padR = 12, padT = 14, padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const yMin = -3, yMax = 3;

  const yPx = (v: number) => {
    const lv = Math.log10(Math.max(v, 1e-10));
    const norm = Math.min(1, Math.max(0, (lv - yMin) / (yMax - yMin)));
    return padT + (1 - norm) * plotH;
  };
  const xPx = (t: number) => padL + (t / N) * plotW;

  // axis
  ctx.strokeStyle = 'rgba(26,26,26,0.18)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // Y ticks
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillStyle = COL.textFaint;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const lv of TICKS_SLIDER) {
    const y = yPx(Math.pow(10, lv));
    ctx.fillText(fmtAxisTick(lv), padL - 6, y);
    ctx.strokeStyle = 'rgba(26,26,26,0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
  }

  // $1 reference dotted
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = COL.refDot;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, yPx(1));
  ctx.lineTo(padL + plotW, yPx(1));
  ctx.stroke();
  ctx.setLineDash([]);

  // theoretical mean — dashed graphite
  ctx.strokeStyle = COL.textMuted;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  const meanBase = arithExpectedValue(f);
  for (let t = 0; t <= N; t++) {
    const v = Math.pow(meanBase, t);
    const x = xPx(t), y = yPx(v);
    if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // theoretical median — solid teal
  ctx.strokeStyle = COL.teal;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const g = geomReturn(f);
  for (let t = 0; t <= N; t++) {
    const v = Math.exp(g * t);
    const x = xPx(t), y = yPx(v);
    if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // x label
  ctx.fillStyle = COL.textFaint;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillText('0', padL, padT + plotH + 4);
  ctx.fillText('100', padL + plotW, padT + plotH + 4);
}

// ============================================================
// 4. drawCurveSlider — screen 3 right chart, g(f) curve
// ============================================================

export function drawCurveSlider(canvas: HTMLCanvasElement, fCurrent: number) {
  const { ctx, w, h } = setupHiDPI(canvas);
  const padL = 44, padR = 12, padT = 16, padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const yMin = -0.06, yMax = 0.01;

  const xPx = (f: number) => padL + f * plotW; // f in 0..1
  const yPx = (g: number) => {
    const norm = (g - yMin) / (yMax - yMin);
    return padT + (1 - norm) * plotH;
  };

  // axis frame
  ctx.strokeStyle = 'rgba(26,26,26,0.18)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // Y ticks (1%, 0%, -2%, -4%, -6%)
  const Y_TICKS = [0.01, 0, -0.02, -0.04, -0.06];
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillStyle = COL.textFaint;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const yv of Y_TICKS) {
    const y = yPx(yv);
    const lbl = (yv * 100 >= 0 ? '' : '−') + Math.abs(Math.round(yv * 100)) + '%';
    ctx.fillText(lbl, padL - 6, y);
    ctx.strokeStyle = yv === 0 ? 'rgba(26,26,26,0.18)' : 'rgba(26,26,26,0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
  }

  // X ticks (0, 25, 50, 75, 100%)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const xv of [0, 0.25, 0.5, 0.75, 1]) {
    ctx.fillText(Math.round(xv * 100) + '%', xPx(xv), padT + plotH + 4);
  }

  // sample g(f) once at high resolution, classify positive/negative regions
  const STEPS = 200;
  const samples: { f: number, g: number }[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const f = i / STEPS;
    const g = geomReturn(f);
    samples.push({ f, g });
  }

  // fill positive zone (g > 0) — teal soft
  ctx.fillStyle = COL.tealSoft;
  ctx.beginPath();
  ctx.moveTo(xPx(0), yPx(0));
  for (const s of samples) {
    if (s.g > 0) ctx.lineTo(xPx(s.f), yPx(s.g));
    else ctx.lineTo(xPx(s.f), yPx(0));
  }
  ctx.lineTo(xPx(1), yPx(0));
  ctx.closePath();
  ctx.fill();

  // fill negative zone (g < 0) — coral soft
  ctx.fillStyle = COL.coralSoft;
  ctx.beginPath();
  ctx.moveTo(xPx(0), yPx(0));
  for (const s of samples) {
    if (s.g < 0) ctx.lineTo(xPx(s.f), yPx(s.g));
    else ctx.lineTo(xPx(s.f), yPx(0));
  }
  ctx.lineTo(xPx(1), yPx(0));
  ctx.closePath();
  ctx.fill();

  // curve — solid teal 1.5px
  ctx.strokeStyle = COL.teal;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const x = xPx(s.f), y = yPx(Math.max(yMin, Math.min(yMax, s.g)));
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // f* = 25% peak marker (always)
  const F_STAR = 0.25;
  const G_STAR = geomReturn(F_STAR);
  ctx.fillStyle = COL.teal;
  ctx.beginPath();
  ctx.arc(xPx(F_STAR), yPx(G_STAR), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COL.teal;
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('f* = 25%', xPx(F_STAR), yPx(G_STAR) - 8);

  // current f marker (open circle) — only when far from f*
  if (Math.abs(fCurrent - F_STAR) > 0.005) {
    const gCur = Math.max(yMin, geomReturn(fCurrent));
    ctx.strokeStyle = COL.text;
    ctx.lineWidth = 1.2;
    ctx.fillStyle = COL.bg;
    ctx.beginPath();
    ctx.arc(xPx(fCurrent), yPx(gCur), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// ============================================================
// 5. drawDensitySchematic — screen 2 asymmetry block
// ============================================================

export function drawDensitySchematic(canvas: HTMLCanvasElement) {
  const { ctx, w, h } = setupHiDPI(canvas);
  // Number-line schematic: density curve fills upper area, baseline is the
  // X axis, all four landmark dots sit ON the baseline. Labels for median /
  // mean stack below the axis (name + value); lucky-point labels sit just
  // above each dot (curve is essentially flat there). No more collisions,
  // no more dashed connectors — alignment is achieved by being literally on
  // the same line.
  const padL = 18, padR = 18, padT = 14, padB = 36;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const xMin = -7, xMax = 6;
  const mu = -2.29;
  const sigma = 1.99;
  const lvMean = 2.12;
  const xPx = (lv: number) => padL + ((lv - xMin) / (xMax - xMin)) * plotW;
  const baseY  = padT + plotH * 0.86;
  const curveH = (baseY - padT) - 6;

  // density curve sampled on log10 X
  const STEPS = 240;
  const samples: { lv: number, p: number }[] = [];
  let pMax = 0;
  for (let i = 0; i <= STEPS; i++) {
    const lv = xMin + (i / STEPS) * (xMax - xMin);
    const z = (lv - mu) / sigma;
    const p = Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
    samples.push({ lv, p });
    if (p > pMax) pMax = p;
  }
  const yPxFor = (p: number) => baseY - (p / pMax) * curveH;

  // filled area under the density curve
  ctx.fillStyle = COL.tealSoft;
  ctx.beginPath();
  ctx.moveTo(xPx(xMin), baseY);
  for (const s of samples) ctx.lineTo(xPx(s.lv), yPxFor(s.p));
  ctx.lineTo(xPx(xMax), baseY);
  ctx.closePath();
  ctx.fill();

  // density curve drawn before baseline so the line sits on top
  ctx.strokeStyle = COL.teal;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const x = xPx(s.lv), y = yPxFor(s.p);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // baseline (the X axis the dots sit on) — strong enough to read as an axis
  ctx.strokeStyle = 'rgba(26,26,26,0.40)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(padL, baseY);
  ctx.lineTo(padL + plotW, baseY);
  ctx.stroke();

  // === DOTS — all four landmarks on the X axis ===
  const dotR = 3.8;

  // median: filled graphite (analogue of "solid line" in the histogram convention)
  ctx.fillStyle = COL.text;
  ctx.beginPath();
  ctx.arc(xPx(mu), baseY, dotR, 0, Math.PI * 2);
  ctx.fill();

  // mean: outlined graphite (analogue of "dashed line" — same hue, less weight)
  ctx.fillStyle = COL.bg;
  ctx.strokeStyle = COL.text;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(xPx(lvMean), baseY, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // lucky points: filled teal — the rare wins carrying the right tail
  const luckies: { lv: number, big: string }[] = [
    { lv: 3.68, big: '$4.8k' },
    { lv: 5.66, big: '$456k' },
  ];
  ctx.fillStyle = COL.teal;
  for (const p of luckies) {
    ctx.beginPath();
    ctx.arc(xPx(p.lv), baseY, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  // === LABELS ===
  ctx.font = '10px Inter, system-ui, sans-serif';

  // median + mean: stack below the X axis (name then value)
  ctx.fillStyle = COL.textMuted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('медиана', xPx(mu),     baseY + 9);
  ctx.fillText('$0.005',  xPx(mu),     baseY + 21);
  ctx.fillText('среднее', xPx(lvMean), baseY + 9);
  ctx.fillText('$131',    xPx(lvMean), baseY + 21);

  // lucky labels: just price, sit just above each dot. Rarity ("1 из 1000",
  // "1 из 25k") is in the surrounding paragraph, no need to repeat here.
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = COL.teal;
  for (const p of luckies) {
    ctx.fillText(p.big, xPx(p.lv), baseY - 9);
  }
}
