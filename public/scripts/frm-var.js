// FRM Value at Risk — Monte Carlo интерактив.
// Vanilla JS, Chart.js через global Chart-объект.

(() => {
  const N = 10000;          // число траекторий
  const PATHS_TO_SHOW = 100;
  const POSITION = 10_000_000; // $10M фикс
  const HIST_BINS = 60;

  const state = {
    sigma: 0.015, // 1.5% дневная
    T: 10,
    alpha: 0.99,
    dist: 'normal',
  };

  // ---- генераторы ----
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Стандартизованный t(df=4): t / sqrt(df/(df-2)) = t / sqrt(2).
  // Так std(innovation) = 1, σ-параметр сопоставим между Normal и t.
  function randt4_std() {
    const Z = randn();
    const chi2 = randn() ** 2 + randn() ** 2 + randn() ** 2 + randn() ** 2;
    const t = Z / Math.sqrt(chi2 / 4);
    return t / Math.SQRT2;
  }

  function innovation() {
    return state.dist === 'normal' ? randn() : randt4_std();
  }

  // ---- симуляция ----
  function simulate() {
    const { sigma, T } = state;
    const dt = 1;
    const drift = -0.5 * sigma * sigma * dt; // μ = 0
    const sqrtDt = Math.sqrt(dt);

    const paths = [];
    const finals = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      let logS = 0;
      const path = i < PATHS_TO_SHOW ? [1.0] : null;
      for (let t = 0; t < T; t++) {
        logS += drift + sigma * sqrtDt * innovation();
        if (path) path.push(Math.exp(logS));
      }
      finals[i] = Math.exp(logS) - 1;
      if (path) paths.push(path);
    }
    return { paths, finals };
  }

  function varCvar(finals, alpha) {
    const sorted = Array.from(finals).sort((a, b) => a - b);
    const idx = Math.max(0, Math.floor((1 - alpha) * N) - 1);
    const v = -sorted[idx];
    let sum = 0;
    for (let i = 0; i <= idx; i++) sum += sorted[i];
    const c = -sum / (idx + 1);
    return { var: v, cvar: c };
  }

  // ---- графики ----
  let pathsChart = null;
  let histChart = null;

  function renderPaths(paths) {
    const T = state.T;
    const labels = Array.from({ length: T + 1 }, (_, i) => i);
    const datasets = paths.map(p => ({
      data: p,
      borderColor: 'rgba(31, 41, 55, 0.12)',
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
    }));

    if (pathsChart) pathsChart.destroy();
    const ctx = document.getElementById('paths-chart').getContext('2d');
    pathsChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { title: { display: true, text: 'Дни' }, grid: { display: false } },
          y: { title: { display: true, text: 'S / S₀' } },
        },
      },
    });
  }

  function renderHist(finals, varVal) {
    let min = finals[0], max = finals[0];
    for (let i = 1; i < N; i++) {
      if (finals[i] < min) min = finals[i];
      if (finals[i] > max) max = finals[i];
    }
    const range = max - min || 1e-9;
    const binW = range / HIST_BINS;
    const bins = new Array(HIST_BINS).fill(0);
    const labels = [];
    for (let b = 0; b < HIST_BINS; b++) {
      labels.push(((min + (b + 0.5) * binW) * 100).toFixed(2) + '%');
    }
    for (let i = 0; i < N; i++) {
      let bi = Math.floor((finals[i] - min) / binW);
      if (bi >= HIST_BINS) bi = HIST_BINS - 1;
      if (bi < 0) bi = 0;
      bins[bi]++;
    }
    const colors = bins.map((_, b) => {
      const center = min + (b + 0.5) * binW;
      return center < -varVal
        ? 'rgba(220, 38, 38, 0.65)'
        : 'rgba(31, 41, 55, 0.7)';
    });

    if (histChart) histChart.destroy();
    const ctx = document.getElementById('hist-chart').getContext('2d');
    histChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: bins, backgroundColor: colors, borderWidth: 0 }] },
      options: {
        responsive: true,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { title: { display: true, text: 'P&L, %' }, ticks: { maxTicksLimit: 8 }, grid: { display: false } },
          y: { title: { display: true, text: 'Частота' } },
        },
      },
    });
  }

  // ---- форматирование ----
  function fmtMoney(x) {
    const abs = Math.abs(x);
    const sign = x < 0 ? '-' : '';
    if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(0) + 'K';
    return sign + '$' + abs.toFixed(0);
  }

  function update() {
    const { paths, finals } = simulate();
    const { var: v, cvar: c } = varCvar(finals, state.alpha);
    renderPaths(paths);
    renderHist(finals, v);
    document.getElementById('var-value').textContent = fmtMoney(v * POSITION);
    document.getElementById('cvar-value').textContent = fmtMoney(c * POSITION);

    const sigmaPct = (state.sigma * 100).toFixed(2);
    const alphaPct = (state.alpha * 100).toFixed(state.alpha === 0.995 ? 1 : 0);
    const distName = state.dist === 'normal' ? 'нормальное' : 'Student-t(4)';
    document.getElementById('commentary').textContent =
      `σ = ${sigmaPct}% в день · T = ${state.T} дней · α = ${alphaPct}% · распределение: ${distName} · позиция $10M.`;
  }

  // ---- UI ----
  function bindUI() {
    const sigmaSlider = document.getElementById('sigma-slider');
    const sigmaValue = document.getElementById('sigma-value');
    let timer = null;
    sigmaSlider.addEventListener('input', e => {
      const pct = parseInt(e.target.value, 10) / 100; // value 50..500 → 0.50..5.00 (%)
      state.sigma = pct / 100;                        // → доля
      sigmaValue.textContent = pct.toFixed(2) + '%';
      clearTimeout(timer);
      timer = setTimeout(update, 120);                // дебаунс
    });

    function bindGroup(selector, attr, parser, key) {
      document.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('click', () => {
          state[key] = parser(btn.dataset[attr]);
          document.querySelectorAll(selector).forEach(b => {
            b.classList.remove('bg-[#1F2937]', 'text-white');
          });
          btn.classList.add('bg-[#1F2937]', 'text-white');
          update();
        });
      });
    }
    bindGroup('.t-btn',     't',     s => parseInt(s, 10),  'T');
    bindGroup('.alpha-btn', 'alpha', s => parseFloat(s),    'alpha');
    bindGroup('.dist-btn',  'dist',  s => s,                'dist');
  }

  function init() {
    if (typeof Chart === 'undefined') {
      setTimeout(init, 50); // ждём, пока CDN-Chart.js дойдёт
      return;
    }
    bindUI();
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
