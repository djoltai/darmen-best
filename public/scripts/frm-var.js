// FRM Value at Risk v1.5 — KZT/USD BVU контекст.
// Реальный исторический ряд + наложенная параметрическая плотность + Monte Carlo.
// Vanilla JS, Chart.js через global Chart-объект, JSON через fetch.

(() => {
  const POSITION_KZT_DEFAULT = 1_000_000_000;
  const N_MC = 10000;
  const MC_PATHS_TO_SHOW = 100;
  const HIST_BINS = 60;
  const RATE_TODAY = 502; // курс из последней точки JSON

  const state = {
    capKzt: POSITION_KZT_DEFAULT,
    sigma: null,           // подставится из calmPeriod после загрузки
    T: 1,
    alpha: 0.99,
    dist: 'normal',
    shockId: 'calm',
    customShock: 10,
  };

  let data = null; // загруженный JSON
  let charts = { status: null, shock: null, lab: null, mc: null };

  // ---- генераторы случайных чисел ----
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Стандартизованный t(df=4): t / sqrt(df/(df-2)) = t/sqrt(2). std=1, как у Normal.
  function randt4_std() {
    const Z = randn();
    const chi2 = randn() ** 2 + randn() ** 2 + randn() ** 2 + randn() ** 2;
    const t = Z / Math.sqrt(chi2 / 4);
    return t / Math.SQRT2;
  }

  function innovation(dist) {
    return dist === 'normal' ? randn() : randt4_std();
  }

  // ---- параметрические pdf для оверлея ----
  function normalPdf(x, sigma) {
    return Math.exp(-x * x / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
  }
  // Student-t(df=4), нормированный к std=sigma.
  function tStdPdf(x, sigma) {
    const scale = sigma * Math.SQRT2; // std итогового распределения = sigma
    const z = x / scale;
    const pdf = (3 / 8) * Math.pow(1 + z * z / 4, -2.5);
    return pdf / scale;
  }

  // ---- расчёт VaR/CVaR ----
  function historicalVarCvar(losses, alpha) {
    const sorted = [...losses].sort((a, b) => b - a); // убывание по убытку
    const n = sorted.length;
    const idx = Math.max(0, Math.floor((1 - alpha) * n) - 1);
    const v = sorted[idx];
    let sum = 0;
    for (let i = 0; i <= idx; i++) sum += sorted[i];
    const c = sum / (idx + 1);
    return { var: v, cvar: c };
  }

  function parametricVarCvar(sigma, T, alpha, dist) {
    const sqrtT = Math.sqrt(T);
    if (dist === 'normal') {
      const z = invNormalCdf(alpha);
      const v = z * sigma * sqrtT;
      const phi = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
      const c = sigma * sqrtT * phi / (1 - alpha);
      return { var: v, cvar: c };
    } else {
      // Student-t(4) — эмпирический квантиль на 50000 sample
      const sample = new Float64Array(50000);
      for (let i = 0; i < 50000; i++) sample[i] = randt4_std() * sigma * sqrtT;
      const sorted = Array.from(sample).sort((a, b) => a - b);
      const tailIdx = Math.floor((1 - alpha) * 50000);
      const v = -sorted[tailIdx];
      let sum = 0;
      for (let i = 0; i <= tailIdx; i++) sum += sorted[i];
      const c = -sum / (tailIdx + 1);
      return { var: v, cvar: c };
    }
  }

  // Обратная функция нормального CDF (Acklam).
  function invNormalCdf(p) {
    if (p <= 0 || p >= 1) return p < 0.5 ? -Infinity : Infinity;
    const a = [-3.969683028665376e+01,  2.209460984245205e+02, -2.759285104469687e+02,  1.383577518672690e+02, -3.066479806614716e+01,  2.506628277459239e+00];
    const b = [-5.447609879822406e+01,  1.615858368580409e+02, -1.556989798598866e+02,  6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00,  4.374664141464968e+00,  2.938163982698783e+00];
    const d = [ 7.784695709041462e-03,  3.224671290700398e-01,  2.445134137142996e+00,  3.754408661907416e+00];
    const pl = 0.02425, ph = 1 - pl;
    let q, r;
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

  // ---- форматирование ----
  function fmtKzt(x) {
    if (Math.abs(x) >= 1e9) return (x / 1e9).toFixed(2) + ' млрд ₸';
    if (Math.abs(x) >= 1e6) return (x / 1e6).toFixed(1) + ' млн ₸';
    if (Math.abs(x) >= 1e3) return (x / 1e3).toFixed(0) + ' тыс ₸';
    return x.toFixed(0) + ' ₸';
  }
  function fmtUsd(x) {
    if (Math.abs(x) >= 1e6) return '$' + (x / 1e6).toFixed(2) + 'M';
    if (Math.abs(x) >= 1e3) return '$' + (x / 1e3).toFixed(0) + 'K';
    return '$' + x.toFixed(0);
  }
  function fmtKztSpace(x) {
    return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
  }

  // ---- секция 1: статус-кво ----
  function calmReturns() {
    return data.series
      .filter(p => p.date.startsWith('2018') || p.date.startsWith('2019'))
      .map(p => p.dailyReturn);
  }
  function allLosses() {
    // loss для тенгового владельца = positive dailyReturn (KZT девальвация)
    return data.series.map(p => p.dailyReturn);
  }

  function renderStatusChart() {
    const sigma = data.calmPeriod.sigma;
    const xs = [], ys = [];
    for (let i = -50; i <= 50; i++) {
      const x = (i / 10) * sigma;
      xs.push((x * 100).toFixed(2) + '%');
      ys.push(normalPdf(x, sigma));
    }
    if (charts.status) charts.status.destroy();
    const ctx = document.getElementById('status-chart').getContext('2d');
    charts.status = new Chart(ctx, {
      type: 'line',
      data: { labels: xs, datasets: [{
        data: ys, borderColor: 'rgba(31,41,55,0.7)', borderWidth: 2,
        pointRadius: 0, fill: true, backgroundColor: 'rgba(31,41,55,0.05)',
      }]},
      options: {
        responsive: true, animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { ticks: { maxTicksLimit: 6 }, grid: { display: false }, title: { display: true, text: 'Дневная доходность KZT/USD, %' } },
                  y: { display: false } },
      },
    });
  }

  function updateCapital() {
    document.getElementById('cap-kzt').textContent = fmtKztSpace(state.capKzt);
    document.getElementById('cap-usd').textContent = fmtUsd(state.capKzt / RATE_TODAY);
  }

  function updateStatusSummary() {
    const sigma = data.calmPeriod.sigma;
    const v = parametricVarCvar(sigma, 1, 0.99, 'normal');
    const summary = document.getElementById('status-summary');
    const varKzt = state.capKzt * v.var;
    const cvarKzt = state.capKzt * v.cvar;
    summary.innerHTML = `Дневная волатильность 2018–2019: ~${(sigma*100).toFixed(2)}%. VaR(99%, 1 день) на нормальном распределении: <span class="font-mono">${fmtKzt(varKzt)}</span>. CVaR(99%): <span class="font-mono">${fmtKzt(cvarKzt)}</span>.`;
  }

  // ---- секция 2: исторические шоки ----
  function renderShockChart(shockId) {
    let returns, label, beforeRate, afterRate, eventLabel;
    if (shockId === 'calm') {
      returns = calmReturns();
      label = '2018–2019 (спокойный период)';
      // Калм = нет шока. USD-карточка показывает сегодняшний курс, не исторический калм-курс ~350.
      beforeRate = RATE_TODAY; afterRate = RATE_TODAY;
      eventLabel = 'Спокойный период. Курс держится в коридоре. Дневная волатильность ~1.4%.';
    } else {
      const ev = data.shockEvents.find(e => e.id === shockId);
      const idx = data.series.findIndex(p => p.date >= ev.date);
      const lo = Math.max(0, idx - 60);
      const hi = Math.min(data.series.length, idx + 60);
      returns = data.series.slice(lo, hi).map(p => p.dailyReturn);
      label = ev.label_ru;
      beforeRate = ev.rate_before;
      afterRate = ev.rate_after;
      eventLabel = ev.label_ru;
    }
    const bins = histogram(returns, HIST_BINS);
    if (charts.shock) charts.shock.destroy();
    const ctx = document.getElementById('shock-chart').getContext('2d');
    charts.shock = new Chart(ctx, {
      type: 'bar',
      data: { labels: bins.labels, datasets: [{
        data: bins.counts,
        backgroundColor: bins.centers.map(c => c >= 0.02 ? 'rgba(220,38,38,0.65)' : 'rgba(31,41,55,0.7)'),
        borderWidth: 0,
      }]},
      options: {
        responsive: true, animation: { duration: 600 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { ticks: { maxTicksLimit: 8 }, grid: { display: false }, title: { display: true, text: 'Дневная доходность KZT/USD, %' } },
                  y: { title: { display: true, text: 'Частота' } } },
      },
    });
    const usdRateLabel = document.getElementById('usd-rate-label');
    const capUsd = document.getElementById('cap-usd');
    usdRateLabel.textContent = `(по ${afterRate.toFixed(0)} ₸/$)`;
    capUsd.textContent = fmtUsd(state.capKzt / afterRate);

    const ctxBox = document.getElementById('shock-context');
    if (shockId === 'calm') {
      ctxBox.innerHTML = eventLabel;
    } else {
      const usdBefore = state.capKzt / beforeRate;
      const usdAfter = state.capKzt / afterRate;
      const lossUsd = usdBefore - usdAfter;
      ctxBox.innerHTML = `<strong>${label}.</strong> KZT/USD: ${beforeRate} → ${afterRate} (рост курса на ${((afterRate/beforeRate-1)*100).toFixed(1)}%). Капитал в тенге не изменился. В долларах: <span class="font-mono">${fmtUsd(usdBefore)}</span> → <span class="font-mono">${fmtUsd(usdAfter)}</span>. Минус <span class="font-mono">${fmtUsd(lossUsd)}</span> в долларовой покупательной способности. Параметрический VaR на нормальном распределении событие такого масштаба не предусматривал.`;
    }
  }

  // ---- секция 3: лаборатория ----
  function renderLabChart() {
    const all = allLosses();
    const bins = histogram(all, HIST_BINS);
    const sigmaT = state.sigma * Math.sqrt(state.T);
    const pdfFn = state.dist === 'normal' ? (x) => normalPdf(x, sigmaT) : (x) => tStdPdf(x, sigmaT);
    const totalArea = bins.counts.reduce((a, b) => a + b, 0) * bins.binW;
    const pdfData = bins.centers.map(c => pdfFn(c) * totalArea);

    if (charts.lab) charts.lab.destroy();
    const ctx = document.getElementById('lab-chart').getContext('2d');
    charts.lab = new Chart(ctx, {
      data: {
        labels: bins.labels,
        datasets: [
          { type: 'bar', label: 'Реальные доходности', data: bins.counts, backgroundColor: 'rgba(31,41,55,0.55)', borderWidth: 0, order: 2 },
          { type: 'line', label: state.dist === 'normal' ? 'Normal pdf' : 'Student-t(4) pdf', data: pdfData, borderColor: 'rgba(220,38,38,0.9)', borderWidth: 2, pointRadius: 0, fill: false, order: 1 },
        ],
      },
      options: {
        responsive: true, animation: { duration: 400 },
        plugins: { legend: { display: true, position: 'top' }, tooltip: { enabled: false } },
        scales: { x: { ticks: { maxTicksLimit: 8 }, grid: { display: false }, title: { display: true, text: 'Дневная доходность KZT/USD, %' } },
                  y: { title: { display: true, text: 'Частота / плотность × площадь' } } },
      },
    });
  }

  function updateLabNumbers() {
    const all = allLosses();
    const histVc = historicalVarCvar(all, state.alpha);
    const paramVc = parametricVarCvar(state.sigma, state.T, state.alpha, state.dist);
    const cap = state.capKzt;

    document.getElementById('hist-var').textContent = fmtKzt(cap * histVc.var);
    document.getElementById('hist-cvar').textContent = fmtKzt(cap * histVc.cvar);
    document.getElementById('param-var').textContent = fmtKzt(cap * paramVc.var);
    document.getElementById('param-cvar').textContent = fmtKzt(cap * paramVc.cvar);

    const ratio = histVc.var / Math.max(paramVc.var, 1e-9);
    const distName = state.dist === 'normal' ? 'нормальная модель' : 'Student-t(4)';
    let comment = `На выбранной σ = ${(state.sigma*100).toFixed(2)}% ${distName} даёт VaR ${fmtKzt(cap*paramVc.var)}. Реальный исторический VaR — ${fmtKzt(cap*histVc.var)}. `;
    if (ratio > 1.5) comment += `Реальность недооценена моделью в ${ratio.toFixed(1)} раз.`;
    else if (ratio < 0.7) comment += `Модель переоценивает реальный риск в ${(1/ratio).toFixed(1)} раз.`;
    else comment += `Модель и реальность сходятся.`;
    document.getElementById('lab-commentary').textContent = comment;
  }

  // ---- секция 4: Монте-Карло ----
  function runMonteCarlo() {
    const T = state.T;
    const sigma = state.sigma;
    const dt = 1, sqrtDt = Math.sqrt(dt);
    const drift = -0.5 * sigma * sigma * dt;
    const paths = [];
    const finals = new Float64Array(N_MC);
    for (let i = 0; i < N_MC; i++) {
      let logS = 0;
      const path = i < MC_PATHS_TO_SHOW ? [1.0] : null;
      for (let t = 0; t < T; t++) {
        logS += drift + sigma * sqrtDt * innovation(state.dist);
        if (path) path.push(Math.exp(logS));
      }
      finals[i] = Math.exp(logS) - 1;
      if (path) paths.push(path);
    }
    const losses = Array.from(finals);
    const histVc = historicalVarCvar(losses, state.alpha);
    const varBound = histVc.var;
    const breaches = losses.filter(x => x >= varBound).length;

    const labels = Array.from({ length: T + 1 }, (_, i) => i);
    const datasets = paths.map((p) => {
      const final = p[p.length - 1] - 1;
      const breach = final >= varBound;
      return {
        data: p,
        borderColor: breach ? 'rgba(220,38,38,0.6)' : 'rgba(31,41,55,0.12)',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      };
    });

    if (charts.mc) charts.mc.destroy();
    const ctx = document.getElementById('mc-chart').getContext('2d');
    charts.mc = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, animation: { duration: 1500 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { title: { display: true, text: 'Дни' }, grid: { display: false } },
                  y: { title: { display: true, text: 'S/S₀' } } },
      },
    });

    document.getElementById('mc-summary').innerHTML =
      `В ${breaches} из 10 000 будущих VaR(${(state.alpha*100).toFixed(0)}%) пробит. Средний убыток в этих ${breaches} = CVaR ≈ ${fmtKzt(state.capKzt * histVc.cvar)}.`;
  }

  // ---- утилита: histogram ----
  function histogram(values, bins) {
    let min = Infinity, max = -Infinity;
    for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
    const range = max - min || 1e-9;
    const binW = range / bins;
    const counts = new Array(bins).fill(0);
    const centers = [];
    const labels = [];
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

  // ---- UI ----
  function bindUI() {
    // capital пресеты
    document.querySelectorAll('.cap-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.cap;
        document.querySelectorAll('.cap-btn').forEach(b => b.classList.remove('bg-[#1F2937]', 'text-white'));
        btn.classList.add('bg-[#1F2937]', 'text-white');
        const customInput = document.getElementById('cap-custom');
        if (v === 'custom') {
          customInput.classList.remove('hidden');
          customInput.focus();
        } else {
          customInput.classList.add('hidden');
          if (v === 'usd-10m') state.capKzt = 10_000_000 * RATE_TODAY;
          else state.capKzt = parseInt(v, 10);
          updateCapital();
          updateStatusSummary();
          updateLabNumbers();
        }
      });
    });
    document.getElementById('cap-custom').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v > 0) {
        state.capKzt = v;
        updateCapital();
        updateStatusSummary();
        updateLabNumbers();
      }
    });

    // shocks
    document.querySelectorAll('.shock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shock-btn').forEach(b => b.classList.remove('bg-[#1F2937]', 'text-white'));
        btn.classList.add('bg-[#1F2937]', 'text-white');
        state.shockId = btn.dataset.shock;
        renderShockChart(state.shockId);
      });
    });

    // лабораторные ползунки
    let labTimer = null;
    const sigmaSlider = document.getElementById('sigma-slider');
    const sigmaValue = document.getElementById('sigma-value');
    sigmaSlider.addEventListener('input', e => {
      const pct = parseInt(e.target.value, 10) / 100;
      state.sigma = pct / 100;
      sigmaValue.textContent = pct.toFixed(2) + '%';
      clearTimeout(labTimer);
      labTimer = setTimeout(() => { renderLabChart(); updateLabNumbers(); }, 120);
    });

    function bindGroup(selector, attr, parser, key, after) {
      document.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll(selector).forEach(b => b.classList.remove('bg-[#1F2937]', 'text-white'));
          btn.classList.add('bg-[#1F2937]', 'text-white');
          state[key] = parser(btn.dataset[attr]);
          after();
        });
      });
    }
    bindGroup('.t-btn', 't', s => parseInt(s, 10), 'T', () => { renderLabChart(); updateLabNumbers(); });
    bindGroup('.alpha-btn', 'alpha', s => parseFloat(s), 'alpha', () => { renderLabChart(); updateLabNumbers(); });
    bindGroup('.dist-btn', 'dist', s => s, 'dist', () => { renderLabChart(); updateLabNumbers(); });

    // custom shock
    const cs = document.getElementById('custom-shock');
    const csValue = document.getElementById('custom-shock-value');
    const csSummary = document.getElementById('custom-shock-summary');
    cs.addEventListener('input', e => {
      const pct = parseInt(e.target.value, 10);
      state.customShock = pct;
      csValue.textContent = (pct >= 0 ? '+' : '') + pct + '%';
      const newRate = RATE_TODAY * (1 + pct / 100);
      const usdBefore = state.capKzt / RATE_TODAY;
      const usdAfter = state.capKzt / newRate;
      const diff = usdAfter - usdBefore;
      const sign = diff >= 0 ? '+' : '−';
      csSummary.innerHTML = `При движении KZT/USD ${pct >= 0 ? '+' : ''}${pct}% капитал в долларах: <span class="font-mono">${fmtUsd(usdBefore)}</span> → <span class="font-mono">${fmtUsd(usdAfter)}</span> (${sign}${fmtUsd(Math.abs(diff))}).`;
    });
    cs.dispatchEvent(new Event('input'));

    // мk
    document.getElementById('mc-run').addEventListener('click', runMonteCarlo);
  }

  // ---- init ----
  async function init() {
    if (typeof Chart === 'undefined') {
      setTimeout(init, 50);
      return;
    }
    try {
      const res = await fetch('/data/kzt-usd-anchors.json');
      data = await res.json();
    } catch (e) {
      console.error('Failed to load anchor data', e);
      return;
    }
    state.sigma = data.calmPeriod.sigma;
    document.getElementById('sigma-slider').value = Math.round(state.sigma * 10000);
    document.getElementById('sigma-value').textContent = (state.sigma * 100).toFixed(2) + '%';

    bindUI();
    renderStatusChart();
    updateCapital();
    updateStatusSummary();
    renderShockChart('calm');
    renderLabChart();
    updateLabNumbers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
