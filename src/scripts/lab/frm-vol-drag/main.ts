// FRM · Volatility Drag · v3 — page orchestration
// Mounts canvases, wires the all-in play button + slider/presets,
// handles resize so HiDPI canvases stay sharp.

import { N, flipCoin, multiplier, geomReturn, arithExpectedValue, fmtMoney } from './coin';
import type { Side } from './coin';
import { precomputeAllInDist, precomputeSideSequences } from './dist';
import type { PrecomputedDist } from './dist';
import {
  drawTrajectoryAllIn,
  drawHistogramAllIn,
  drawTrajectorySlider,
  drawCurveSlider,
  drawDensitySchematic,
} from './charts';

type CoinSide = 'heads' | 'tails' | null;

const PRESET_F = [0, 10, 25, 50, 100];

function $<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function init() {
  const dist: PrecomputedDist = precomputeAllInDist();
  // Pre-generate fixed coin-flip sequences for screen 3's background
  // sample trajectories. Same sequences are reused across all f values
  // — slider drag morphs the paths smoothly instead of reshuffling.
  const bgSides: Side[][] = precomputeSideSequences(22);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Screen 2 — all-in simulator =====
  const trajCanvas2 = $<HTMLCanvasElement>('traj-canvas-2');
  const histCanvas2 = $<HTMLCanvasElement>('hist-canvas-2');
  const densityCanvas = $<HTMLCanvasElement>('density-canvas');
  const playBtn = $<HTMLButtonElement>('play-btn-2');
  const attemptEl = $<HTMLSpanElement>('attempt-num-2');
  const finalCapEl = $<HTMLSpanElement>('final-cap-2');
  const coinCircle = $<HTMLDivElement>('coin-circle-2');
  const coinSub = $<HTMLDivElement>('coin-sub-2');

  let attempt = 0;
  let lastFinal: number | null = null;
  let animTimer: number | null = null;
  let isPlaying = false;
  let currentTraj: number[] | null = null;

  function showCoin(side: CoinSide) {
    if (!coinCircle || !coinSub) return;
    coinCircle.classList.remove('is-heads', 'is-tails');
    coinSub.classList.remove('is-heads', 'is-tails');
    if (side === 'heads') {
      coinCircle.classList.add('is-heads');
      coinSub.classList.add('is-heads');
      coinCircle.textContent = 'орёл';
      coinSub.textContent = '+50%';
    } else if (side === 'tails') {
      coinCircle.classList.add('is-tails');
      coinSub.classList.add('is-tails');
      coinCircle.textContent = 'решка';
      coinSub.textContent = '−40%';
    } else {
      coinCircle.textContent = '—';
      coinSub.textContent = '';
    }
  }

  function setFinalCap(v: number | null) {
    if (!finalCapEl) return;
    finalCapEl.classList.remove('is-win', 'is-lose');
    if (v === null) {
      finalCapEl.textContent = '—';
      return;
    }
    finalCapEl.textContent = fmtMoney(v);
    finalCapEl.classList.add(v >= 1 ? 'is-win' : 'is-lose');
  }

  function setAttempt(n: number) {
    if (attemptEl) attemptEl.textContent = String(n);
  }

  function renderAllIn(activeTraj: number[] | null) {
    if (trajCanvas2) drawTrajectoryAllIn(trajCanvas2, dist, activeTraj);
    if (histCanvas2) drawHistogramAllIn(histCanvas2, dist, lastFinal);
  }

  function play() {
    if (isPlaying) return;
    isPlaying = true;
    if (playBtn) {
      playBtn.classList.remove('is-pristine');
      playBtn.disabled = true;
      playBtn.textContent = 'бросаю...';
    }

    // pre-roll all 100 sides + trajectory at f=1
    const sides: CoinSide[] = [];
    const traj = [1];
    for (let r = 0; r < N; r++) {
      const s = flipCoin();
      sides.push(s);
      traj.push(traj[r] * multiplier(s, 1));
    }
    currentTraj = traj;

    if (prefersReducedMotion) {
      renderAllIn(traj);
      showCoin(sides[N - 1]);
      finalize(traj[N]);
      return;
    }

    let frame = 0;
    animTimer = window.setInterval(() => {
      frame++;
      const partial = traj.slice(0, frame + 1);
      renderAllIn(partial);
      showCoin(sides[frame - 1] ?? null);
      if (frame >= N) {
        if (animTimer !== null) {
          window.clearInterval(animTimer);
          animTimer = null;
        }
        finalize(traj[N]);
      }
    }, 22);
  }

  function finalize(final: number) {
    lastFinal = final;
    attempt += 1;
    setAttempt(attempt);
    setFinalCap(final);
    renderAllIn(currentTraj);
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.textContent = 'ещё раз';
    }
    isPlaying = false;
  }

  // initial mount for screen 2
  if (densityCanvas) drawDensitySchematic(densityCanvas);
  renderAllIn(null);
  showCoin(null);
  setAttempt(0);
  setFinalCap(null);
  if (playBtn) playBtn.addEventListener('click', play);

  // ===== Screen 3 — slider =====
  const trajCanvas3 = $<HTMLCanvasElement>('traj-canvas-3');
  const curveCanvas3 = $<HTMLCanvasElement>('curve-canvas-3');
  const slider = $<HTMLInputElement>('f-slider');
  const fValueEl = $<HTMLSpanElement>('f-value');
  const meanEl = $<HTMLSpanElement>('mean-value');
  const medianEl = $<HTMLSpanElement>('median-value');
  const presets = Array.from(document.querySelectorAll<HTMLButtonElement>('.v3-preset'));

  let currentF = 0.25;

  function updateSlider(f: number) {
    currentF = f;
    if (trajCanvas3)  drawTrajectorySlider(trajCanvas3, f, bgSides);
    if (curveCanvas3) drawCurveSlider(curveCanvas3, f);
    if (fValueEl)     fValueEl.textContent = Math.round(f * 100) + '%';

    const median = Math.exp(geomReturn(f) * N);
    const mean   = Math.pow(arithExpectedValue(f), N);
    if (meanEl)   meanEl.textContent   = fmtMoney(mean);
    if (medianEl) medianEl.textContent = fmtMoney(median);
  }

  function setActivePreset(activeF: number) {
    presets.forEach(b => {
      const bf = parseInt(b.dataset.f || '-1', 10);
      b.classList.toggle('is-active', bf === activeF);
    });
  }

  if (slider) {
    slider.addEventListener('input', e => {
      slider.classList.remove('is-pristine');
      const raw = parseInt((e.target as HTMLInputElement).value, 10);
      const f = raw / 100;
      updateSlider(f);
      const matching = PRESET_F.includes(raw) ? raw : -1;
      setActivePreset(matching);
    });
  }

  presets.forEach(b => {
    b.addEventListener('click', () => {
      const f = parseInt(b.dataset.f || '0', 10);
      if (slider) {
        slider.classList.remove('is-pristine');
        slider.value = String(f);
      }
      updateSlider(f / 100);
      setActivePreset(f);
    });
  });

  // default: Kelly · 25%
  if (slider) slider.value = '25';
  updateSlider(0.25);
  setActivePreset(25);

  // ===== Resize handling — re-render all canvases on viewport change =====
  let resizeTimer: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      renderAllIn(currentTraj);
      if (densityCanvas) drawDensitySchematic(densityCanvas);
      if (trajCanvas3)  drawTrajectorySlider(trajCanvas3, currentF, bgSides);
      if (curveCanvas3) drawCurveSlider(curveCanvas3, currentF);
    }, 120);
  });

  // ===== Finale coin flip — fires once when screen 4 enters viewport =====
  // Animation stays in CSS (.finale-coin svg.is-flipping). We just toggle
  // the class when the user actually scrolls down to the finale, otherwise
  // the spin happens off-screen and the coin is already settled by the
  // time the reader gets there. prefers-reduced-motion already nulls the
  // animation in CSS, so we still add the class — it'll just show static.
  const finaleSection = document.querySelector('.screen--finale');
  const finaleCoinSvg = document.querySelector('.finale-coin svg');
  if (finaleSection && finaleCoinSvg && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          finaleCoinSvg.classList.add('is-flipping');
          obs.disconnect();
          break;
        }
      }
    }, { threshold: 0.4 });
    obs.observe(finaleSection);
  } else if (finaleCoinSvg) {
    // No IntersectionObserver support — just trigger right away.
    finaleCoinSvg.classList.add('is-flipping');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
