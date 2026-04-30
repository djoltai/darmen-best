// FRM-VaR v2 — lab interactivity (Chart.js bell + scenarios + Monte Carlo).
// Lab is always cream mode, so colors are hardcoded; narrative SVGs use CSS vars.

import { normalPdf, tStdPdf, type Distribution } from './distributions';
import { parametricVarEs, histogram } from './calc';
import { runMonteCarlo } from './mc';

declare const Chart: any;

const COLOR_LINE = '#323232';
const COLOR_LINE_MUTED = 'rgba(50, 50, 50, 0.55)';
const COLOR_CORAL = '#d97062';
const COLOR_CORAL_TAIL = 'rgba(217, 112, 98, 0.18)';
const COLOR_HIST = 'rgba(50, 50, 50, 0.35)';

interface AnchorPoint { date: string; rate: number; dailyReturn: number }
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

interface LabState {
  sigma: number;
  dist: Distribution;
  alpha: number;
  scenarioId: string;
}

const DEFAULTS: LabState = {
  sigma: 0.0140,
  dist: 'normal',
  alpha: 0.99,
  scenarioId: 'calm',
};

let state: LabState = { ...DEFAULTS };
let data: AnchorData | null = null;
let bellChart: any = null;
let mcChart: any = null;

// ============================================================
// 1. Bell chart (screen 32 — also used by scenarios on 33)
// ============================================================

function pdfFn(dist: Distribution, sigma: number) {
  return dist === 'normal'
    ? (x: number) => normalPdf(x, sigma)
    : (x: number) => tStdPdf(x, sigma);
}

function buildBell(sigma: number, dist: Distribution) {
  const xExtent = Math.max(0.06, sigma * 5);
  const N = 200;
  const f = pdfFn(dist, sigma);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const x = -xExtent + (i / N) * 2 * xExtent;
    points.push({ x, y: f(x) });
  }
  return { points, xMin: -xExtent, xMax: xExtent, peakY: f(0) };
}

function updateNumbers(varX: number, esX: number) {
  const v = document.getElementById('lab-var-value');
  const e = document.getElementById('lab-es-value');
  if (v) v.textContent = (varX * 100).toFixed(1) + '%';
  if (e) e.textContent = (esX * 100).toFixed(1) + '%';
}

interface ScenarioOverlay {
  bars?: { centers: number[]; counts: number[] };
  outlierX?: number;
}

function buildBellDatasets(
  points: { x: number; y: number }[],
  varX: number,
  esX: number,
  peakY: number,
  overlay?: ScenarioOverlay
): any[] {
  const datasets: any[] = [
    {
      label: 'tail',
      data: points.filter(p => p.x >= varX),
      borderColor: 'transparent',
      backgroundColor: COLOR_CORAL_TAIL,
      pointRadius: 0,
      fill: 'origin',
      order: 5,
    },
    {
      label: 'bell',
      data: points,
      borderColor: COLOR_LINE,
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
      tension: 0.4,
      order: 4,
    },
    {
      label: 'var-line',
      data: [{ x: varX, y: 0 }, { x: varX, y: peakY * 1.05 }],
      borderColor: COLOR_LINE,
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      order: 3,
    },
    {
      label: 'es-line',
      data: [{ x: esX, y: 0 }, { x: esX, y: peakY * 1.05 }],
      borderColor: COLOR_LINE,
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      fill: false,
      order: 2,
    },
  ];

  if (overlay?.bars) {
    const { centers, counts } = overlay.bars;
    const maxCount = Math.max(...counts) || 1;
    const histPoints = centers.map((c, i) => ({
      x: c,
      y: (counts[i] / maxCount) * peakY * 0.85,
    }));
    datasets.push({
      label: 'hist',
      type: 'bar',
      data: histPoints,
      backgroundColor: COLOR_HIST,
      borderWidth: 0,
      barPercentage: 0.95,
      categoryPercentage: 1.0,
      order: 6,
    });
  }

  if (overlay?.outlierX != null) {
    datasets.push({
      label: 'outlier',
      type: 'scatter',
      data: [{ x: overlay.outlierX, y: peakY * 0.04 }],
      backgroundColor: COLOR_CORAL,
      borderColor: COLOR_CORAL,
      pointRadius: 7,
      pointHoverRadius: 7,
      order: 1,
    });
  }

  return datasets;
}

function renderBell(canvas: HTMLCanvasElement, overlay?: ScenarioOverlay) {
  const { points, xMin, xMax, peakY } = buildBell(state.sigma, state.dist);
  const { var: varX, es: esX } = parametricVarEs(state.sigma, 1, state.alpha, state.dist);

  const xViewMax = Math.max(xMax, (overlay?.outlierX ?? 0) + 0.01);
  const xViewMin = xMin;

  const datasets = buildBellDatasets(points, varX, esX, peakY, overlay);

  if (!bellChart) {
    bellChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200, easing: 'easeOutCubic' },
        parsing: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: { type: 'linear', min: xViewMin, max: xViewMax, display: false },
          y: { display: false, min: 0, max: peakY * 1.1 },
        },
        elements: { line: { tension: 0.4 }, point: { radius: 0 } },
      },
    });
  } else {
    // Update in place — destroying/recreating chart on every slider input
    // caused massive lag. With 'none' update mode and no animation, slider
    // feels native.
    bellChart.data.datasets = datasets;
    bellChart.options.scales.x.min = xViewMin;
    bellChart.options.scales.x.max = xViewMax;
    bellChart.options.scales.y.max = peakY * 1.1;
    bellChart.update('none');
  }

  updateNumbers(varX, esX);
}

// ============================================================
// 2. Scenarios (screen 33)
// ============================================================

function scenarioPayload(scenarioId: string): { sigma: number; bars?: { centers: number[]; counts: number[] }; outlierX?: number; eventReturn?: number } {
  if (!data) return { sigma: DEFAULTS.sigma };
  if (scenarioId === 'calm') return { sigma: data.calmPeriod.sigma };

  const ev = data.shockEvents.find(s => s.id === scenarioId);
  if (!ev) return { sigma: DEFAULTS.sigma };

  const idx = data.series.findIndex(p => p.date >= ev.date);
  const lo = Math.max(0, idx - 60);
  const hi = Math.min(data.series.length, idx + 60);
  const returns = data.series.slice(lo, hi).map(p => p.dailyReturn);

  const mean = returns.reduce((a, b) => a + b, 0) / Math.max(returns.length, 1);
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(returns.length - 1, 1);
  const sigma = Math.sqrt(variance);

  const eventReturn = ev.rate_after / ev.rate_before - 1;
  const h = histogram(returns, 30);

  return {
    sigma,
    bars: { centers: h.centers, counts: h.counts },
    outlierX: eventReturn,
    eventReturn,
  };
}

function setScenario(scenarioId: string, canvas: HTMLCanvasElement) {
  state.scenarioId = scenarioId;
  const payload = scenarioPayload(scenarioId);
  state.sigma = payload.sigma;

  const slider = document.getElementById('lab-sigma') as HTMLInputElement | null;
  if (slider) slider.value = String(Math.round(state.sigma * 10000));
  const sigmaLabel = document.getElementById('lab-sigma-value');
  if (sigmaLabel) sigmaLabel.textContent = (state.sigma * 100).toFixed(2) + '%';

  renderBell(canvas, { bars: payload.bars, outlierX: payload.outlierX });

  const callout = document.getElementById('scenario-callout');
  if (callout) {
    if (scenarioId === 'calm') {
      callout.textContent = 'Спокойный период. σ ≈ 1.4% — типичный размер дневного колебания.';
    } else if (payload.eventReturn != null) {
      callout.textContent = `Реальное колебание этого дня — ${(payload.eventReturn * 100).toFixed(0)}%. За пределами расчёта.`;
    }
  }

  document.querySelectorAll<HTMLElement>('.scenario-btn').forEach(b => {
    b.classList.toggle('is-active', b.dataset.scenario === scenarioId);
  });

  // Smooth scroll to bell — required on mobile (design §7.2.5)
  const screen32 = document.querySelector('[data-screen="32"]') as HTMLElement | null;
  if (screen32) {
    window.scrollTo({ top: screen32.offsetTop, behavior: 'smooth' });
  }
}

function resetScenario(canvas: HTMLCanvasElement) {
  state = { ...DEFAULTS };
  const slider = document.getElementById('lab-sigma') as HTMLInputElement | null;
  if (slider) slider.value = String(Math.round(state.sigma * 10000));
  const sigmaLabel = document.getElementById('lab-sigma-value');
  if (sigmaLabel) sigmaLabel.textContent = (state.sigma * 100).toFixed(2) + '%';

  document.querySelectorAll<HTMLElement>('.lab-dist').forEach(b => {
    b.classList.toggle('is-active', b.dataset.dist === DEFAULTS.dist);
  });
  document.querySelectorAll<HTMLElement>('.lab-alpha').forEach(b => {
    b.classList.toggle('is-active', parseFloat(b.dataset.alpha!) === DEFAULTS.alpha);
  });
  document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('is-active'));

  const callout = document.getElementById('scenario-callout');
  if (callout) callout.textContent = '';

  renderBell(canvas);
}

// ============================================================
// 3. Monte Carlo (screen 34)
// ============================================================

function runMc(canvas: HTMLCanvasElement) {
  const result = runMonteCarlo({ sigma: state.sigma, T: 10, alpha: state.alpha, dist: state.dist });

  const labels = Array.from({ length: 11 }, (_, i) => i);
  const datasets: any[] = result.paths.map((path, i) => ({
    label: '',
    data: path,
    borderColor: result.pathBreached[i] ? 'rgba(217, 112, 98, 0.6)' : 'rgba(50, 50, 50, 0.18)',
    borderWidth: 1,
    pointRadius: 0,
    fill: false,
  }));

  datasets.push({
    label: 'var-threshold',
    data: Array(11).fill(1 + result.varBound),
    borderColor: COLOR_LINE_MUTED,
    borderDash: [4, 4],
    borderWidth: 1,
    pointRadius: 0,
    fill: false,
  });

  if (mcChart) mcChart.destroy();
  mcChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 2000, easing: 'easeOutCubic' },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: { x: { display: false }, y: { display: false } },
    },
  });

  const resultEl = document.getElementById('mc-result');
  if (resultEl) {
    if (result.breaches > 0) {
      const lossPct = (result.avgBreachLoss * 100).toFixed(1);
      resultEl.textContent = `В ${result.breaches} из 10 000 будущих курс пересёк границу VaR. В среднем по этим ${result.breaches} — потеря ${lossPct}%. Это и есть тот «один день из 100», который банк держит в запасе.`;
    } else {
      resultEl.textContent = `На этих параметрах ни один из 10 000 не пересёк границу. Поднимите σ или попробуйте Колокол с жирным хвостом.`;
    }
  }
}

// ============================================================
// 4. UI bindings
// ============================================================

function bindBaseControls(canvas: HTMLCanvasElement) {
  const sigmaSlider = document.getElementById('lab-sigma') as HTMLInputElement | null;
  const sigmaLabel = document.getElementById('lab-sigma-value');
  if (sigmaSlider) {
    sigmaSlider.addEventListener('input', () => {
      state.sigma = parseInt(sigmaSlider.value, 10) / 10000;
      if (sigmaLabel) sigmaLabel.textContent = (state.sigma * 100).toFixed(2) + '%';
      renderBell(canvas);
    });
  }

  document.querySelectorAll<HTMLButtonElement>('.lab-dist').forEach(btn => {
    btn.addEventListener('click', () => {
      state.dist = btn.dataset.dist as Distribution;
      document.querySelectorAll('.lab-dist').forEach(b => b.classList.toggle('is-active', b === btn));
      renderBell(canvas);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.lab-alpha').forEach(btn => {
    btn.addEventListener('click', () => {
      state.alpha = parseFloat(btn.dataset.alpha!);
      document.querySelectorAll('.lab-alpha').forEach(b => b.classList.toggle('is-active', b === btn));
      renderBell(canvas);
    });
  });
}

function bindScenarios(canvas: HTMLCanvasElement) {
  document.querySelectorAll<HTMLButtonElement>('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setScenario(btn.dataset.scenario!, canvas);
    });
  });
  const reset = document.getElementById('scenario-reset');
  if (reset) reset.addEventListener('click', () => resetScenario(canvas));
}

function bindMc(canvas: HTMLCanvasElement) {
  const btn = document.getElementById('mc-launch');
  if (btn) btn.addEventListener('click', () => runMc(canvas));
}

// ============================================================
// 5. Init
// ============================================================

export async function initLab(): Promise<void> {
  if (typeof Chart === 'undefined') {
    setTimeout(initLab, 50);
    return;
  }
  try {
    const res = await fetch('/data/kzt-usd-anchors.json');
    data = await res.json();
  } catch (e) {
    console.error('FRM-VaR lab: failed to load anchor JSON', e);
    return;
  }
  if (!data) return;

  const bellCanvas = document.getElementById('lab-bell') as HTMLCanvasElement | null;
  const mcCanvas = document.getElementById('mc-canvas') as HTMLCanvasElement | null;
  if (!bellCanvas) return;

  bindBaseControls(bellCanvas);
  bindScenarios(bellCanvas);
  if (mcCanvas) bindMc(mcCanvas);

  renderBell(bellCanvas);
}
