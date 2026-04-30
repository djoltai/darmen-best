// FRM-VaR v2 — narrative SVG visuals built from anchor JSON.
// One render call per screen viz container. Colors come from CSS vars
// (--mode-line, --mode-coral) so palette switches recolor SVG for free.

import { normalPdf } from './distributions';
import { histogram } from './calc';

// ============================================================
// Types
// ============================================================

interface AnchorPoint {
  date: string;
  rate: number;
  dailyReturn: number;
}
interface ShockEvent {
  id: string;
  date: string;
  label_ru: string;
  label_en: string;
  rate_before: number;
  rate_after: number;
}
interface AnchorData {
  series: AnchorPoint[];
  shockEvents: ShockEvent[];
  calmPeriod: { label: string; sigma: number };
}

// ============================================================
// SVG primitives
// ============================================================

const NS = 'http://www.w3.org/2000/svg';
const W = 700;
const H = 300;

function svgEl(width = W, height = H): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg') as SVGSVGElement;
  s.setAttribute('viewBox', `0 0 ${width} ${height}`);
  s.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return s;
}

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e as SVGElementTagNameMap[K];
}

function text(content: string, attrs: Record<string, string | number>): SVGTextElement {
  const t = el('text', attrs);
  t.textContent = content;
  return t;
}

function mount(hostId: string, svg: SVGSVGElement): void {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.innerHTML = '';
  host.appendChild(svg);
}

// ============================================================
// Helpers
// ============================================================

function filterRange(series: AnchorPoint[], from?: string, to?: string): AnchorPoint[] {
  return series.filter(p => (!from || p.date >= from) && (!to || p.date <= to));
}

function calmReturns(series: AnchorPoint[]): number[] {
  return filterRange(series, '2018-01-01', '2019-12-31').map(p => p.dailyReturn);
}

// ============================================================
// 1. Price line — 16-year, 2-year zoom, mini-fragment, splits, highlights
// ============================================================

interface PriceLineOpts {
  from?: string;
  to?: string;
  highlightDates?: string[];
  splitDate?: string;
  height?: number;       // override H (e.g. compact bottom-third for screen 12)
  yPad?: number;         // top padding (used to push line into bottom)
  thin?: boolean;        // for opening screen 1 — just a thin line, no markers
}

function priceLineSvg(series: AnchorPoint[], opts: PriceLineOpts = {}): SVGSVGElement {
  const points = filterRange(series, opts.from, opts.to);
  const height = opts.height ?? H;
  const svg = svgEl(W, height);
  if (points.length < 2) return svg;

  const padX = 24;
  const padTop = opts.yPad ?? 30;
  const padBottom = 30;
  const innerW = W - 2 * padX;
  const innerH = height - padTop - padBottom;

  const t0 = new Date(points[0].date).getTime();
  const tEnd = new Date(points[points.length - 1].date).getTime();
  const tRange = tEnd - t0 || 1;
  let yMin = Infinity, yMax = -Infinity;
  for (const p of points) {
    if (p.rate < yMin) yMin = p.rate;
    if (p.rate > yMax) yMax = p.rate;
  }
  const yPad = (yMax - yMin) * 0.05;
  yMin -= yPad; yMax += yPad;
  const yRange = yMax - yMin || 1;

  const xOf = (date: string) =>
    padX + ((new Date(date).getTime() - t0) / tRange) * innerW;
  const yOf = (rate: number) =>
    padTop + innerH - ((rate - yMin) / yRange) * innerH;

  if (!opts.thin) {
    svg.appendChild(el('line', {
      class: 'grid',
      x1: padX, y1: padTop, x2: W - padX, y2: padTop,
    }));
    svg.appendChild(el('line', {
      class: 'grid',
      x1: padX, y1: height - padBottom, x2: W - padX, y2: height - padBottom,
    }));
  }

  let d = '';
  for (let i = 0; i < points.length; i++) {
    d += (i === 0 ? 'M' : 'L') + xOf(points[i].date).toFixed(1) + ' ' + yOf(points[i].rate).toFixed(1) + ' ';
  }
  svg.appendChild(el('path', {
    class: 'price-line',
    d: d.trim(),
    'stroke-width': opts.thin ? 1 : 1.5,
  }));

  if (opts.splitDate) {
    const x = xOf(opts.splitDate);
    svg.appendChild(el('line', {
      class: 'axis',
      x1: x, y1: padTop, x2: x, y2: height - padBottom,
      'stroke-dasharray': '4 4',
    }));
  }

  if (opts.highlightDates) {
    for (const date of opts.highlightDates) {
      const point = points.find(p => p.date >= date) || points[points.length - 1];
      svg.appendChild(el('circle', {
        class: 'coral',
        cx: xOf(point.date),
        cy: yOf(point.rate),
        r: 5,
      }));
    }
  }

  return svg;
}

// Two-point hero fragment (screens 13/19/25 sub-charts):
// just a baseline + before/after dots + thin line connecting them.
function twoPointFragmentSvg(
  beforeRate: number,
  afterRate: number,
  beforeLabel: string,
  afterLabel: string
): SVGSVGElement {
  const height = 200;
  const svg = svgEl(W, height);
  const padX = 80, padTop = 40, padBottom = 50;
  const innerW = W - 2 * padX;
  const innerH = height - padTop - padBottom;
  const yMin = Math.min(beforeRate, afterRate) * 0.9;
  const yMax = Math.max(beforeRate, afterRate) * 1.05;
  const yRange = yMax - yMin;

  const yOf = (r: number) => padTop + innerH - ((r - yMin) / yRange) * innerH;
  const xA = padX, xB = W - padX;

  svg.appendChild(el('line', {
    class: 'price-line',
    x1: xA, y1: yOf(beforeRate), x2: xB, y2: yOf(afterRate),
    'stroke-width': 1.5,
  }));
  svg.appendChild(el('circle', {
    class: 'price-line', cx: xA, cy: yOf(beforeRate), r: 4,
    fill: 'currentColor',
  }));
  svg.appendChild(el('circle', {
    class: 'coral', cx: xB, cy: yOf(afterRate), r: 5,
  }));
  svg.appendChild(text(beforeLabel, {
    class: 'muted', x: xA, y: yOf(beforeRate) + 22, 'text-anchor': 'middle',
  }));
  svg.appendChild(text(afterLabel, {
    class: 'muted', x: xB, y: yOf(afterRate) - 14, 'text-anchor': 'middle',
  }));
  svg.appendChild(text(beforeRate.toFixed(0), {
    x: xA, y: yOf(beforeRate) - 12, 'text-anchor': 'middle', 'font-size': 14,
  }));
  svg.appendChild(text(afterRate.toFixed(0), {
    x: xB, y: yOf(afterRate) + 24, 'text-anchor': 'middle', 'font-size': 14,
  }));
  return svg;
}

// ============================================================
// 2. Bell curve — with optional VaR line, ES line, coral tail, outlier marker, histogram bars
// ============================================================

interface BellOpts {
  sigma: number;
  varSigmas?: number;          // e.g. 2.326 for 99% one-tail
  esSigmas?: number;           // ES line position (in sigma units of normal)
  coralTail?: boolean;
  outlierSigmas?: number;      // mark a point at this sigma distance (right tail)
  outlierLabel?: string;       // small caption near outlier
  histogramBars?: { centers: number[]; counts: number[] };
  width?: number;
  height?: number;
  sMax?: number;               // x-axis half-width in sigma units
  small?: boolean;             // shrink margins for thumb-bell on screens 15/29
}

function bellSvg(opts: BellOpts): SVGSVGElement {
  const W2 = opts.width ?? W;
  const H2 = opts.height ?? H;
  const padX = opts.small ? 16 : 40;
  const padTop = opts.small ? 14 : 30;
  const padBottom = opts.small ? 14 : 30;
  const innerW = W2 - 2 * padX;
  const innerH = H2 - padTop - padBottom;
  const sMax = opts.sMax ?? Math.max(4, (opts.outlierSigmas ?? 0) + 1.5);
  const xRange = 2 * sMax;
  const sigma = opts.sigma;

  const svg = svgEl(W2, H2);

  const xOfSigmas = (s: number) => padX + ((s + sMax) / xRange) * innerW;
  const xOfReturn = (r: number) => xOfSigmas(r / sigma);
  const peakPdf = normalPdf(0, sigma);
  const yOfPdf = (pdf: number) => padTop + innerH - (pdf / peakPdf) * innerH * 0.85;

  svg.appendChild(el('line', {
    class: 'axis',
    x1: padX, y1: H2 - padBottom, x2: W2 - padX, y2: H2 - padBottom,
  }));

  if (opts.histogramBars) {
    const { centers, counts } = opts.histogramBars;
    const maxCount = Math.max(...counts) || 1;
    const barW = (innerW / centers.length) * 0.9;
    for (let i = 0; i < centers.length; i++) {
      const x = xOfReturn(centers[i]);
      if (x < padX || x > W2 - padX) continue;
      const h = (counts[i] / maxCount) * innerH * 0.7;
      svg.appendChild(el('rect', {
        class: 'bar',
        x: x - barW / 2,
        y: H2 - padBottom - h,
        width: barW,
        height: h,
        opacity: 0.45,
      }));
    }
  }

  // Coral tail must render BEFORE bell stroke so the line stays on top.
  if (opts.coralTail && opts.varSigmas) {
    const startS = opts.varSigmas;
    const M = 40;
    let dt = '';
    for (let i = 0; i <= M; i++) {
      const s = startS + (i / M) * (sMax - startS);
      const x = xOfSigmas(s);
      const y = yOfPdf(normalPdf(s * sigma, sigma));
      dt += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    dt += `L ${xOfSigmas(sMax).toFixed(1)} ${(H2 - padBottom).toFixed(1)} `;
    dt += `L ${xOfSigmas(startS).toFixed(1)} ${(H2 - padBottom).toFixed(1)} Z`;
    svg.appendChild(el('path', { class: 'coral-tail', d: dt }));
  }

  const N = 200;
  let d = '';
  for (let i = 0; i <= N; i++) {
    const s = -sMax + (i / N) * xRange;
    const x = xOfSigmas(s);
    const y = yOfPdf(normalPdf(s * sigma, sigma));
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  svg.appendChild(el('path', { class: 'bell', d: d.trim() }));

  if (opts.varSigmas != null) {
    const x = xOfSigmas(opts.varSigmas);
    svg.appendChild(el('line', {
      class: 'var-line',
      x1: x, y1: padTop, x2: x, y2: H2 - padBottom,
    }));
  }
  if (opts.esSigmas != null) {
    const x = xOfSigmas(opts.esSigmas);
    svg.appendChild(el('line', {
      class: 'var-line',
      x1: x, y1: padTop, x2: x, y2: H2 - padBottom,
      'stroke-dasharray': '3 3',
    }));
    svg.appendChild(text('ES', {
      class: 'muted', x: x + 6, y: padTop + 12, 'font-size': 12,
    }));
  }

  if (opts.outlierSigmas != null) {
    const ox = xOfSigmas(opts.outlierSigmas);
    svg.appendChild(el('circle', {
      class: 'coral',
      cx: ox,
      cy: H2 - padBottom - 6,
      r: 5,
    }));
    if (opts.outlierLabel) {
      svg.appendChild(text(opts.outlierLabel, {
        class: 'muted',
        x: ox,
        y: H2 - padBottom - 16,
        'text-anchor': 'middle',
        'font-size': 11,
      }));
    }
  }

  return svg;
}

// ============================================================
// 3. Daily ticks (screen 5) + calm histogram (screen 6)
// ============================================================

function dailyTicksSvg(returns: number[], sigma: number): SVGSVGElement {
  const padX = 24, padY = 30;
  const innerW = W - 2 * padX;
  const innerH = H - 2 * padY;
  const baseline = padY + innerH / 2;
  const scale = (innerH / 2) * 0.85 / (sigma * 4);
  const svg = svgEl();

  svg.appendChild(el('line', {
    class: 'axis',
    x1: padX, y1: baseline, x2: W - padX, y2: baseline,
  }));

  const N = returns.length;
  for (let i = 0; i < N; i++) {
    const x = padX + (i / Math.max(N - 1, 1)) * innerW;
    const y = baseline - returns[i] * scale;
    svg.appendChild(el('line', {
      class: 'price-line',
      'stroke-width': 0.8,
      x1: x, y1: baseline, x2: x, y2: y,
    }));
  }
  return svg;
}

function calmHistogramSvg(returns: number[]): SVGSVGElement {
  const bins = histogram(returns, 40);
  const maxCount = Math.max(...bins.counts) || 1;
  const padX = 40, padY = 30;
  const innerW = W - 2 * padX;
  const innerH = H - 2 * padY;
  const xR = bins.max - bins.min || 1;
  const barW = (innerW / bins.counts.length) * 0.9;
  const svg = svgEl();

  svg.appendChild(el('line', {
    class: 'axis',
    x1: padX, y1: H - padY, x2: W - padX, y2: H - padY,
  }));

  for (let i = 0; i < bins.counts.length; i++) {
    const x = padX + ((bins.centers[i] - bins.min) / xR) * innerW;
    const h = (bins.counts[i] / maxCount) * innerH * 0.85;
    svg.appendChild(el('rect', {
      class: 'bar',
      x: x - barW / 2,
      y: H - padY - h,
      width: barW,
      height: h,
    }));
  }
  return svg;
}

// ============================================================
// 4. Two bells side-by-side (screens 21, 23)
// ============================================================

interface TwoBellsOpts {
  sigmaA: number;
  sigmaB: number;
  labels: [string, string];
  varAlpha99?: boolean;
}

function twoBellsSvg(opts: TwoBellsOpts): SVGSVGElement {
  const padX = 40, padTop = 30, padBottom = 50;
  const halfW = (W - 2 * padX) / 2 - 24;
  const innerH = H - padTop - padBottom;
  const svg = svgEl();
  const sMax = 4;
  const z99 = 2.326;

  function drawBell(sigma: number, x0: number, w: number, label: string) {
    const peakPdf = normalPdf(0, sigma);
    const xOf = (s: number) => x0 + ((s + sMax) / (2 * sMax)) * w;
    const yOf = (s: number) =>
      padTop + innerH - (normalPdf(s * sigma, sigma) / peakPdf) * innerH * 0.85;
    let d = '';
    const N = 100;
    for (let i = 0; i <= N; i++) {
      const s = -sMax + (i / N) * 2 * sMax;
      d += (i === 0 ? 'M' : 'L') + xOf(s).toFixed(1) + ' ' + yOf(s).toFixed(1) + ' ';
    }
    svg.appendChild(el('path', { class: 'bell', d: d.trim() }));
    svg.appendChild(el('line', {
      class: 'axis',
      x1: x0, y1: H - padBottom, x2: x0 + w, y2: H - padBottom,
    }));
    svg.appendChild(text(label, {
      class: 'muted',
      x: x0 + w / 2,
      y: H - 14,
      'text-anchor': 'middle',
      'font-size': 12,
    }));
    if (opts.varAlpha99) {
      const xv = xOf(z99);
      svg.appendChild(el('line', {
        class: 'var-line',
        x1: xv, y1: padTop, x2: xv, y2: H - padBottom,
      }));
    }
  }

  drawBell(opts.sigmaA, padX, halfW, opts.labels[0]);
  drawBell(opts.sigmaB, padX + halfW + 48, halfW, opts.labels[1]);
  return svg;
}

// ============================================================
// 5. Multi-asset stylized (screen 26 — KZT real, others stylized)
//    Screen 27 — calm vs stress, two states.
// ============================================================

function fourAssetsSvg(kztSeries: AnchorPoint[]): SVGSVGElement {
  const padX = 40, padTop = 30, padBottom = 50;
  const innerW = W - 2 * padX;
  const innerH = H - padTop - padBottom;
  const svg = svgEl();
  if (kztSeries.length < 2) return svg;

  const slotH = innerH / 4;
  const lineH = slotH * 0.7;

  function plot(values: number[], slotIdx: number, label: string) {
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min || 1;
    const top = padTop + slotIdx * slotH;
    let d = '';
    for (let i = 0; i < values.length; i++) {
      const x = padX + (i / Math.max(values.length - 1, 1)) * innerW;
      const yNorm = (values[i] - min) / range;
      const y = top + (1 - yNorm) * lineH;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    svg.appendChild(el('path', { class: 'price-line', d: d.trim(), 'stroke-width': 1, opacity: 0.7 }));
    svg.appendChild(text(label, {
      class: 'muted',
      x: padX,
      y: top - 4,
      'font-size': 11,
    }));
  }

  // KZT: plot tenge purchasing power (1/rate) so it visually drops along with others.
  const kztPP = kztSeries.map(p => 1 / p.rate);
  plot(kztPP, 0, 'Тенге');

  const N = kztSeries.length;
  const stocks: number[] = [], oil: number[] = [], ruble: number[] = [];
  for (let i = 0; i < N; i++) {
    const phase = i / Math.max(N - 1, 1);
    stocks.push(1 - phase * 0.18 + 0.04 * Math.sin(phase * Math.PI * 4 + 1.3));
    oil.push(1 - phase * 0.22 + 0.03 * Math.sin(phase * Math.PI * 5 + 0.8));
    ruble.push(1 - phase * 0.26 + 0.05 * Math.sin(phase * Math.PI * 3 + 0.4));
  }
  plot(stocks, 1, 'Акции');
  plot(oil, 2, 'Нефть');
  plot(ruble, 3, 'Рубль');

  svg.appendChild(text(
    'Стилизованная схема со-движения. Реальные индексы — на KASE, MOEX, нефтяных рынках.',
    { class: 'muted', x: W / 2, y: H - 14, 'text-anchor': 'middle', 'font-size': 11 }
  ));

  return svg;
}

function calmVsStressSvg(): SVGSVGElement {
  // Two side-by-side panels: "calm" (4 lines independent walks) and "stress" (4 lines collapse to one direction).
  const padX = 24, padTop = 30, padBottom = 60;
  const halfW = (W - 2 * padX) / 2 - 16;
  const innerH = H - padTop - padBottom;
  const svg = svgEl();

  function genWalk(seed: number, common = 0): number[] {
    const out: number[] = [];
    let v = 0.5;
    let s = seed;
    for (let i = 0; i < 60; i++) {
      // pseudo-random step, deterministic from seed
      s = (s * 9301 + 49297) % 233280;
      const r = (s / 233280 - 0.5) * 0.04;
      const phase = i / 59;
      v += r + common * (-0.012);
      v = Math.max(0.05, Math.min(0.95, v));
      out.push(v + (common ? -phase * 0.35 : 0));
    }
    return out;
  }

  function panel(x0: number, w: number, common: boolean, title: string) {
    const seeds = [11, 47, 89, 131];
    for (let k = 0; k < 4; k++) {
      const vals = genWalk(seeds[k], common ? 1 : 0);
      let d = '';
      for (let i = 0; i < vals.length; i++) {
        const x = x0 + (i / (vals.length - 1)) * w;
        const y = padTop + (1 - vals[i]) * innerH;
        d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      }
      svg.appendChild(el('path', {
        class: common ? 'coral' : 'price-line',
        d: d.trim(),
        'stroke-width': 1,
        fill: 'none',
        opacity: 0.7,
      }));
    }
    svg.appendChild(text(title, {
      class: 'muted',
      x: x0 + w / 2,
      y: H - padBottom + 24,
      'text-anchor': 'middle',
      'font-size': 12,
    }));
  }

  panel(padX, halfW, false, 'Спокойно');
  panel(padX + halfW + 32, halfW, true, 'Стресс');

  return svg;
}

// ============================================================
// 6. Bell grid (screen 28) — several overlapping bells with shifted means
// ============================================================

function bellGridSvg(sigma: number): SVGSVGElement {
  const padX = 40, padTop = 30, padBottom = 30;
  const innerW = W - 2 * padX;
  const innerH = H - padTop - padBottom;
  const svg = svgEl();

  const sMax = 5;
  const peakPdf = normalPdf(0, sigma);
  const xOfSigmas = (s: number) => padX + ((s + sMax) / (2 * sMax)) * innerW;
  const yOfPdf = (pdf: number) => padTop + innerH - (pdf / peakPdf) * innerH * 0.85;

  const offsets = [-1.2, -0.4, 0.4, 1.2]; // four overlapping assets
  for (const off of offsets) {
    let d = '';
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const s = -sMax + (i / N) * 2 * sMax;
      const x = xOfSigmas(s);
      const y = yOfPdf(normalPdf((s - off) * sigma, sigma));
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    svg.appendChild(el('path', {
      class: 'bell',
      d: d.trim(),
      'stroke-width': 1,
      opacity: 0.55,
    }));
  }

  // shared coral tail across all four (the "stress overlap" idea)
  const z = 2.326;
  let dt = '';
  const M = 40;
  for (let i = 0; i <= M; i++) {
    const s = z + (i / M) * (sMax - z);
    const x = xOfSigmas(s);
    // envelope: max of pdfs (largest bell at each x)
    let pdf = 0;
    for (const off of offsets) pdf = Math.max(pdf, normalPdf((s - off) * sigma, sigma));
    const y = yOfPdf(pdf);
    dt += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  dt += `L ${xOfSigmas(sMax).toFixed(1)} ${(H - padBottom).toFixed(1)} `;
  dt += `L ${xOfSigmas(z).toFixed(1)} ${(H - padBottom).toFixed(1)} Z`;
  svg.appendChild(el('path', { class: 'coral-tail', d: dt }));

  svg.appendChild(el('line', {
    class: 'axis',
    x1: padX, y1: H - padBottom, x2: W - padX, y2: H - padBottom,
  }));

  return svg;
}

// ============================================================
// initScreens — fetches anchor JSON and mounts every viz
// ============================================================

const Z_99 = 2.326; // standard normal one-tail at 99%
const Z_995 = 2.576;

export async function initScreens(): Promise<void> {
  let data: AnchorData;
  try {
    const res = await fetch('/data/kzt-usd-anchors.json');
    data = await res.json();
  } catch (e) {
    console.error('FRM-VaR: failed to load anchor JSON', e);
    return;
  }

  const series = data.series;
  const sigma = data.calmPeriod.sigma;
  const calm = calmReturns(series);
  const calmBins = histogram(calm, 30);
  const shocks = data.shockEvents;
  const shockDates = shocks.map(s => s.date);
  // Outlier sigma units: 2014 was ~16% in one day vs sigma ~1.4% → ~11.4σ.
  const outlier2014 = (shocks[0].rate_after / shocks[0].rate_before - 1) / sigma;

  // Opening
  mount('viz-1', priceLineSvg(series, { from: '2018-01-01', to: '2019-12-31', thin: true }));
  mount('viz-2', priceLineSvg(series, { highlightDates: shockDates }));
  mount('viz-3', priceLineSvg(series, { highlightDates: shockDates, height: 220, yPad: 100 }));

  // Act 1 — calm
  mount('viz-4', priceLineSvg(series, { from: '2018-01-01', to: '2019-12-31' }));
  mount('viz-5', dailyTicksSvg(calm, sigma));
  mount('viz-6', calmHistogramSvg(calm));
  mount('viz-7', bellSvg({ sigma, histogramBars: { centers: calmBins.centers, counts: calmBins.counts } }));

  // Act 2 — VaR (cream)
  mount('viz-8', bellSvg({ sigma }));
  mount('viz-9', bellSvg({ sigma, varSigmas: Z_99, coralTail: true }));
  mount('viz-10', bellSvg({ sigma, varSigmas: Z_99, coralTail: true }));
  mount('viz-11', bellSvg({ sigma, varSigmas: Z_99, coralTail: true }));

  // Act 3 — 11 Feb 2014
  mount('viz-12', priceLineSvg(series, {
    highlightDates: [shocks[0].date], height: 200, yPad: 80,
  }));
  mount('viz-13-mini', twoPointFragmentSvg(
    shocks[0].rate_before, shocks[0].rate_after, '10 февраля', '11 февраля'
  ));
  mount('viz-14', bellSvg({
    sigma, varSigmas: Z_99, coralTail: true,
    outlierSigmas: outlier2014, outlierLabel: '16%',
  }));
  mount('viz-15', bellSvg({
    sigma, varSigmas: Z_99, coralTail: true,
    outlierSigmas: outlier2014, outlierLabel: '16%',
    small: true, width: 320, height: 160, sMax: outlier2014 + 1,
  }));
  mount('viz-16', bellSvg({
    sigma, varSigmas: Z_99, coralTail: true,
    outlierSigmas: outlier2014, outlierLabel: '16%',
  }));
  mount('viz-17', priceLineSvg(series, { highlightDates: [shocks[0].date] }));

  // Act 4 — 20 Aug 2015
  mount('viz-18', priceLineSvg(series, { highlightDates: [shocks[1].date] }));
  mount('viz-20', priceLineSvg(series, { from: '2015-07-01', to: '2015-09-30' }));
  mount('viz-21', twoBellsSvg({
    sigmaA: sigma, sigmaB: sigma * 3,
    labels: ['До 2015 — узкий коридор', 'После 2015 — открытый рынок'],
  }));
  mount('viz-22', priceLineSvg(series, {
    from: '2014-01-01', to: '2017-12-31', splitDate: shocks[1].date,
  }));
  mount('viz-23', twoBellsSvg({
    sigmaA: sigma, sigmaB: sigma * 3,
    labels: ['Режим 1', 'Режим 2'],
    varAlpha99: true,
  }));

  // Act 5 — Feb–Mar 2022
  mount('viz-24', priceLineSvg(series, { highlightDates: [shocks[2].date] }));
  mount('viz-26', fourAssetsSvg(filterRange(series, '2022-01-01', '2022-04-30')));
  mount('viz-27', calmVsStressSvg());
  mount('viz-28', bellGridSvg(sigma));
  mount('viz-29', bellSvg({
    sigma, varSigmas: Z_99, esSigmas: 2.665, coralTail: true,
  }));

  // Bridge
  mount('viz-30', priceLineSvg(series, { highlightDates: shockDates }));
  mount('viz-31', priceLineSvg(series, { highlightDates: shockDates }));
}
