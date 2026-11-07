// The optimization playground: one or two algorithms run side by side on an
// objective of two parameters, drawn on its level sets, with the curve of
// F(θ_t) − F* and the guided experiments below. Used by
// teaching/2026_2027_SID_Advanced_Statistical_Learning/optimisation-sgd.html.
//
// A page needs only <section class="lab-panel opt-playground"></section>:
// this script writes the whole interface into it, in the page's language
// (<html lang>, strings below). The experiments come from
// window.OPT_EXPERIMENTS, window.OPT_DEFAULTS and window.OPT_PARTS
// (js/opt-experiments-fr.js), the computations from js/opt-engine.js, the
// drawing helpers and the experiment panel from js/lab-kit.js.
//
// Every animation frame runs a few iterations of each algorithm (the speed)
// and redraws the paths on the map (the level sets are drawn once per
// landscape, into an offscreen canvas), the curves and the readouts.

(function () {
  const root = document.querySelector('.opt-playground');
  if (!root || !window.OPT || !window.Lab) return;
  const { rgba, mix, fmt, format } = Lab;

  const T = Lab.strings({
    en: {
      play: '▶ Run', pause: '❚❚ Pause', step: 'Step', stepTitle: 'One iteration of each algorithm', reset: '↻ Start again', speed: 'Speed',
      perFrame: '{s} iteration(s) per frame', counter: 'iteration {t}',
      objective: 'Objective', display: 'Display', average: 'Also draw the averages θ̄_t of the iterates (dashed)',
      algorithm: 'Algorithm {k}', compare: 'Compare with a second algorithm',
      rules: { gd: 'Gradient', momentum: 'Momentum', adam: 'Adam' },
      stochastic: 'Stochastic gradient', lr: 'Step γ', lrL: 'γ L = {v}', batch: 'Batch size b', beta: 'Momentum β',
      schedule: 'Step along time', schedules: { constant: 'constant', sqrt: 'γ/√(1 + t/50)', inv: 'γ/(1 + t/50)' },
      kappa: 'Condition number κ', rotated: 'Ellipse turned by 45°', centred: 'Centre the x_i', sigma: 'Noise σ of the gradient',
      landscapes: { quadratic: 'Quadratic', rosenbrock: 'Valley', wells: 'Two wells', leastSquares: 'Least squares', logistic: 'Logistic' },
      notes: {
        quadratic: 'F(θ) = ½ θᵀAθ, eigenvalues L = 1 and μ = 1/κ.',
        rosenbrock: 'Rosenbrock: F(θ) = (1 − θ₁)² + 10 (θ₂ − θ₁²)², minimum at (1, 1).',
        wells: 'F(θ) = (θ₁² − 1)² + 0.3 θ₁ + θ₂²: two minima and a saddle point.',
        leastSquares: 'F(w, b) = (1/2n) Σ (w xᵢ + b − yᵢ)², n = 100 points.',
        logistic: 'F(w, b) = (1/n) Σ log(1 + exp(−yᵢ (w xᵢ + b))), n = 100 points.',
      },
      noiseNote: 'Without data, the stochastic gradient is ∇F(θ) + σξ, ξ ~ N(0, I).',
      axis: { iterations: 'iterations', epochs: 'passes over the data' },
      legendGap: 'F(θ_t) − F*, log scale', mapAria: 'Level sets of F and the paths of the algorithms',
      mapCaption: 'Level lines of F, its minimizer ✕, and the iterates of each algorithm. Click on the map to choose the starting point θ₀.',
      rows: { t: 'iterations t', epochs: 'passes over the data', gap: 'F(θ_t) − F*', grad: '‖∇F(θ_t)‖', theta: 'θ_t', avg: 'F(θ̄_t) − F*' },
      constants: 'L = {L}, μ = {mu}, κ = {k}{local}', local: ' (at θ*)',
      diverged: '{k} diverges: the iterates go to infinity. Lower its step γ.',
      converged: 'Stopped: ‖∇F(θ_t)‖ < 10⁻¹⁰ (or F(θ_t) − F* < 10⁻¹⁵), a critical point is reached.', stopped: 'Paused at {t}, where the experiment stops. Press Run to go on.',
      epochsAt: '{e} passes over the data', iterationAt: 'iteration {t}', listAria: 'Guided experiments',
      saddle: 'saddle', localMin: 'local min.', globalMin: 'global min.', tipGap: 'F(θ) − F* = {v}',
    },
    fr: {
      play: '▶ Lancer', pause: '❚❚ Pause', step: 'Un pas', stepTitle: 'Une itération de chaque algorithme', reset: '↻ Recommencer', speed: 'Vitesse',
      perFrame: '{s} itération(s) par image', counter: 'itération {t}',
      objective: 'Fonction', display: 'Affichage', average: 'Tracer aussi les moyennes θ̄_t des itérés (tirets)',
      algorithm: 'Algorithme {k}', compare: 'Comparer avec un second algorithme',
      rules: { gd: 'Gradient', momentum: 'Momentum', adam: 'Adam' },
      stochastic: 'Gradient stochastique', lr: 'Pas γ', lrL: 'γ L = {v}', batch: 'Taille de lot b', beta: 'Momentum β',
      schedule: 'Pas au cours du temps', schedules: { constant: 'constant', sqrt: 'γ/√(1 + t/50)', inv: 'γ/(1 + t/50)' },
      kappa: 'Conditionnement κ', rotated: 'Ellipse tournée de 45°', centred: 'Centrer les xᵢ', sigma: 'Bruit σ du gradient',
      landscapes: { quadratic: 'Quadratique', rosenbrock: 'Vallée', wells: 'Deux puits', leastSquares: 'Moindres carrés', logistic: 'Logistique' },
      notes: {
        quadratic: 'F(θ) = ½ θᵀAθ, de valeurs propres L = 1 et μ = 1/κ.',
        rosenbrock: 'Rosenbrock : F(θ) = (1 − θ₁)² + 10 (θ₂ − θ₁²)², minimum en (1, 1).',
        wells: 'F(θ) = (θ₁² − 1)² + 0,3 θ₁ + θ₂² : deux minima et un point selle.',
        leastSquares: 'F(w, b) = (1/2n) Σ (w xᵢ + b − yᵢ)², n = 100 points.',
        logistic: 'F(w, b) = (1/n) Σ log(1 + exp(−yᵢ (w xᵢ + b))), n = 100 points.',
      },
      noiseNote: 'Sans données, le gradient stochastique est ∇F(θ) + σξ, ξ ~ N(0, I).',
      axis: { iterations: 'itérations', epochs: 'passages sur les données' },
      legendGap: 'F(θ_t) − F*, échelle log', mapAria: 'Lignes de niveau de F et trajectoires des algorithmes',
      mapCaption: 'Lignes de niveau de F, son minimiseur ✕, et les itérés de chaque algorithme. Cliquez sur la carte pour choisir le point de départ θ₀.',
      rows: { t: 'itérations t', epochs: 'passages sur les données', gap: 'F(θ_t) − F*', grad: '‖∇F(θ_t)‖', theta: 'θ_t', avg: 'F(θ̄_t) − F*' },
      constants: 'L = {L}, μ = {mu}, κ = {k}{local}', local: ' (en θ*)',
      diverged: '{k} diverge : les itérés partent à l’infini. Baissez son pas γ.',
      converged: 'Arrêt : ‖∇F(θ_t)‖ < 10⁻¹⁰ (ou F(θ_t) − F* < 10⁻¹⁵), un point critique est atteint.', stopped: 'En pause à {t}, où s’arrête l’expérience. Appuyez sur Lancer pour continuer.',
      epochsAt: '{e} passages sur les données', iterationAt: 'l’itération {t}', listAria: 'Expériences guidées',
      saddle: 'selle', localMin: 'min. local', globalMin: 'min. global', tipGap: 'F(θ) − F* = {v}',
    },
  });

  // Positions of the sliders.
  const RATES = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.08, 0.1, 0.15, 0.17, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 1.9, 2.1, 3];
  const BATCHES = [1, 2, 5, 10, 20, 50, 100];
  const BETAS = [0, 0.5, 0.8, 0.9, 0.95, 0.99];
  const KAPPAS = [1, 2, 5, 10, 20, 50, 100, 200];
  const SIGMAS = [0, 0.1, 0.2, 0.5, 1, 2, 5];
  const SPEEDS = [1, 5, 20, 100];
  const RULES = ['gd', 'momentum', 'adam'];
  const SCHEDULES = ['constant', 'sqrt', 'inv'];
  const LANDSCAPES = ['quadratic', 'rosenbrock', 'wells', 'leastSquares', 'logistic'];
  const GRID = 120;          // the level sets are computed on GRID × GRID points
  const MAX_ITERATIONS = 200000;
  const FLOOR = 1e-14;       // smallest gap shown on the curve

  const EXPERIMENTS = window.OPT_EXPERIMENTS || [];
  const DEFAULTS = window.OPT_DEFAULTS || {
    landscape: 'quadratic', kappa: 10, rotated: false, centred: false, sigma: 1, start: null,
    runs: [{ rule: 'gd', lr: 1, schedule: 'constant', stochastic: false, batch: 1, beta: 0.9 },
      { rule: 'momentum', lr: 0.5, schedule: 'constant', stochastic: false, batch: 1, beta: 0.9 }],
    compare: false, average: false, axis: 'iterations', speed: 5, stopAt: null, stopEpochs: null, seed: 1,
  };
  const PARTS = window.OPT_PARTS || {};

  const clone = s => ({ ...s, runs: s.runs.map(r => ({ ...r })), start: s.start && s.start.slice() });
  let state = clone(DEFAULTS);
  let ls = null, runs = [], playing = false, notice = null, panel = null, C = null;
  const map = { canvas: null, size: 0, image: document.createElement('canvas'), key: '' };
  const chart = { canvas: null, width: 0, height: 210 };

  // ---- The interface ----

  root.innerHTML = `
    <div class="lab-toolbar">
      <button type="button" class="demo-button lab-play" data-action="play"></button>
      <button type="button" class="demo-button" data-action="step" title="${T.stepTitle}">${T.step}</button>
      <button type="button" class="demo-button" data-action="reset">${T.reset}</button>
      <span class="lab-counter" data-out="counter"></span>
      <span class="lab-speed"><span class="lab-label">${T.speed}</span> <span class="lab-pills" data-group="speed"></span></span>
    </div>
    <div class="opt-columns">
      <div class="lab-settings">
        <h3>${T.objective}</h3>
        <div class="lab-pills" data-group="landscape"></div>
        <p class="opt-note" data-out="note"></p>
        <div class="opt-options"></div>
        ${[0, 1].map(k => `<div class="opt-run" data-run="${k}"></div>`).join('')}
        <h3>${T.display}</h3>
        <label class="lab-check"><input type="checkbox" data-input="average"> ${T.average}</label>
      </div>
      <div class="opt-map">
        <canvas role="img" aria-label="${T.mapAria}"></canvas>
        <div class="lab-tooltip" hidden></div>
        <p class="lab-caption">${T.mapCaption}</p>
      </div>
      <div class="opt-side">
        <div class="lab-chart-legend"><span class="lab-muted">${T.legendGap}</span></div>
        <div class="lab-pills" data-group="axis"></div>
        <div class="lab-chart"><canvas role="img" aria-label="${T.legendGap}"></canvas></div>
        <div class="lab-message" role="status" hidden></div>
        <table class="lab-readouts"></table>
        <p class="opt-note" data-out="constants"></p>
      </div>
    </div>
    <div class="lab-experiments">
      <div class="lab-exp-list" aria-label="${T.listAria}"></div>
      <div class="lab-exp-detail" aria-live="polite"></div>
    </div>`;

  const $ = selector => root.querySelector(selector);
  map.canvas = $('.opt-map canvas');
  chart.canvas = $('.lab-chart canvas');
  const runBox = k => $(`.opt-run[data-run="${k}"]`);

  // The controls of algorithm k (A or B), written once.
  [0, 1].forEach(k => {
    runBox(k).innerHTML = `
      <h3><span class="lab-swatch ${k ? 'lab-swatch-neg' : 'lab-swatch-pos'}"></span> ${format(T.algorithm, { k: 'AB'[k] })}</h3>
      ${k ? `<label class="lab-check"><input type="checkbox" data-input="compare"> ${T.compare}</label>` : ''}
      <div class="opt-run-body">
        <div class="lab-pills" data-group="rule"></div>
        <label class="lab-check"><input type="checkbox" data-input="stochastic"> ${T.stochastic}</label>
        <label class="demo-control">${T.lr} = <output data-out="lr"></output> <span class="lab-muted" data-out="lrL"></span>
          <input type="range" data-input="lr" min="0" max="${RATES.length - 1}" step="1"></label>
        <label class="demo-control" data-when="batch">${T.batch} = <output data-out="batch"></output>
          <input type="range" data-input="batch" min="0" max="${BATCHES.length - 1}" step="1"></label>
        <label class="demo-control" data-when="beta">${T.beta} = <output data-out="beta"></output>
          <input type="range" data-input="beta" min="0" max="${BETAS.length - 1}" step="1"></label>
        <div class="lab-label">${T.schedule}</div>
        <div class="lab-pills" data-group="schedule"></div>
      </div>`;
  });

  // ---- Building the landscape and the runs ----

  function buildLandscape() {
    const s = state;
    ls = OPT.landscape(s.landscape, { kappa: s.kappa, angle: s.rotated ? 45 : 0, centred: s.centred, sigma: s.sigma });
  }

  function buildRuns() {
    const start = state.start || ls.start;
    runs = state.runs.map((r, k) => (k === 0 || state.compare
      ? OPT.run(ls, { ...r, sigma: state.sigma, start }, state.seed + 101 * k)
      : null));
    notice = null;
  }

  function rebuild(what) {
    if (what === 'landscape') buildLandscape();
    buildRuns();
    sync();
    draw();
  }

  // ---- Colours and the level sets ----

  // Level sets of F − F*, at levels evenly spaced in log scale, and a shading
  // that darkens towards the minimum; drawn once per landscape into map.image.
  function paintLandscape() {
    const key = [state.landscape, state.kappa, state.rotated, state.centred, map.size, C.dark, C.pos.join()].join('|');
    if (key === map.key) return;
    map.key = key;
    const S = map.size, ratio = Math.min(window.devicePixelRatio || 1, 2);
    map.image.width = Math.round(S * ratio);
    map.image.height = Math.round(S * ratio);
    const ctx = map.image.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const { x: [x0, x1], y: [y0, y1] } = ls.view, n = GRID + 1;
    const field = new Float64Array(n * n);
    let lo = Infinity, hi = -Infinity;
    for (let gy = 0; gy < n; gy++) {
      for (let gx = 0; gx < n; gx++) {
        const v = Math.log10(Math.max(ls.f([x0 + (x1 - x0) * gx / GRID, y1 - (y1 - y0) * gy / GRID]) - ls.fStar, 1e-8));
        field[gy * n + gx] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    // Shading, on a small image scaled up: from the paper at the highest
    // values to a tint of the first colour on the lowest tenth of the plot.
    const sorted = Float64Array.from(field).sort(), low = sorted[Math.floor(0.1 * sorted.length)];
    const floor = Math.max(lo, hi - 5);
    const small = document.createElement('canvas');
    small.width = small.height = n;
    const sctx = small.getContext('2d'), image = sctx.createImageData(n, n);
    for (let g = 0; g < n * n; g++) {
      const t = Math.max(0, Math.min(1, (hi - field[g]) / Math.max(hi - low, 1e-9)));
      const c = mix(C.paper, C.pos, 0.03 + 0.2 * t * t);
      image.data[4 * g] = c[0];
      image.data[4 * g + 1] = c[1];
      image.data[4 * g + 2] = c[2];
      image.data[4 * g + 3] = 255;
    }
    sctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0.5, 0.5, GRID, GRID, 0, 0, S, S);
    // Level lines of F − F*, every third of a decade, over five decades below the highest value.
    ctx.beginPath();
    for (let level = Math.ceil(floor * 3) / 3; level < hi; level += 1 / 3) Lab.contourPath(ctx, field, n, n, level, S, S);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = rgba(C.faint, 0.75);
    ctx.stroke();
  }

  const toPx = t => [(t[0] - ls.view.x[0]) / (ls.view.x[1] - ls.view.x[0]) * map.size, (ls.view.y[1] - t[1]) / (ls.view.y[1] - ls.view.y[0]) * map.size];
  const fromPx = (px, py) => [ls.view.x[0] + px / map.size * (ls.view.x[1] - ls.view.x[0]), ls.view.y[1] - py / map.size * (ls.view.y[1] - ls.view.y[0])];

  // Every k-th point of a long path, and its last one.
  function thin(list, max) {
    if (list.length <= max) return list;
    const k = Math.ceil(list.length / max), out = [];
    for (let i = 0; i < list.length; i += k) out.push(list[i]);
    out.push(list[list.length - 1]);
    return out;
  }

  function drawMap() {
    const S = map.size;
    if (!S) return;
    const { ctx } = Lab.fit(map.canvas, S, S);
    paintLandscape();
    ctx.drawImage(map.image, 0, 0, S, S);
    const font = Lab.font();
    ctx.font = `11px ${font}`;

    // Critical points: the minimizer, and the other ones of the two wells.
    const cross = (t, label) => {
      const [px, py] = toPx(t);
      ctx.strokeStyle = rgba(C.ink);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 5, py - 5); ctx.lineTo(px + 5, py + 5);
      ctx.moveTo(px + 5, py - 5); ctx.lineTo(px - 5, py + 5);
      ctx.stroke();
      if (label) {
        ctx.fillStyle = rgba(C.soft);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, px, py + 8);
      }
    };
    if (ls.critical) {
      cross(ls.critical.globalMin, T.globalMin);
      cross(ls.critical.localMin, T.localMin);
      const [px, py] = toPx(ls.critical.saddle);
      Lab.dot(ctx, px, py, 4, C.paper, C.ink);
      ctx.fillStyle = rgba(C.soft);
      ctx.fillText(T.saddle, px, py + 8);
    } else {
      cross(ls.thetaStar);
    }

    // The paths, oldest first; the averages dashed.
    runs.forEach((r, k) => {
      if (!r) return;
      const color = C.series[k];
      if (state.average) Lab.polyline(ctx, thin(r.averaged, 3000).map(toPx), { color, width: 1.6, dash: [5, 4], alpha: 0.9 });
      const path = thin(r.path, 3000);
      Lab.polyline(ctx, path.map(toPx), { color, width: 1.4, alpha: 0.85 });
      if (r.path.length <= 300) for (const t of r.path) {
        const [px, py] = toPx(t);
        Lab.dot(ctx, px, py, 2, color);
      }
      const [px, py] = toPx(r.theta);
      Lab.dot(ctx, px, py, 5, color, C.paper);
    });
    const [sx, sy] = toPx(state.start || ls.start);
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, 2 * Math.PI);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rgba(C.ink);
    ctx.stroke();
    ctx.fillStyle = rgba(C.ink);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('θ₀', sx + 7, sy - 4);
  }

  function drawChart() {
    const W = chart.canvas.clientWidth;
    if (!W) return;
    const { ctx, width, height } = Lab.fit(chart.canvas, chart.height);
    const key = state.axis === 'epochs' ? 'epochs' : 't';
    const live = runs.filter(Boolean);
    const values = [];
    let tMax = 10;
    for (const r of live) {
      for (const h of r.trace) {
        if (h.gap > 0) values.push(h.gap);
        if (state.average && h.gapAvg > 0) values.push(h.gapAvg);
      }
      tMax = Math.max(tMax, r.trace[r.trace.length - 1][key]);
    }
    let lo = -2, hi = 1;
    if (values.length) {
      lo = Math.floor(Math.log10(Math.max(FLOOR, Math.min(...values))));
      hi = Math.ceil(Math.log10(Math.max(...values)));
      if (hi - lo < 2) lo = hi - 2;
    }
    const step = Math.max(1, Math.ceil((hi - lo) / 6));
    const yTicks = [];
    for (let e = hi; e >= lo; e -= step) yTicks.push(e);
    const box = { left: 44, top: 10, width: width - 56, height: height - 38 };
    const axes = Lab.axes(ctx, box, { x: [0, tMax], y: [lo, hi], logY: true, yTicks, xLabel: T.axis[state.axis] });
    Lab.clip(ctx, box);
    live.forEach(r => {
      const k = runs.indexOf(r), color = C.series[k];
      const pts = h => [axes.X(h[key]), axes.Y(Math.log10(Math.max(FLOOR, h.gap)))];
      Lab.polyline(ctx, thin(r.trace, 2000).map(pts), { color, width: 1.8 });
      if (state.average) Lab.polyline(ctx, thin(r.trace, 2000).map(h => [axes.X(h[key]), axes.Y(Math.log10(Math.max(FLOOR, h.gapAvg)))]), { color, width: 1.6, dash: [5, 4] });
    });
    ctx.restore();
  }

  function renderReadouts() {
    const live = runs.map((r, k) => (r ? k : null)).filter(k => k !== null);
    const cell = f => live.map(k => `<td>${f(runs[k])}</td>`).join('');
    const rows = [
      ['', live.map(k => `<td><span class="lab-swatch ${k ? 'lab-swatch-neg' : 'lab-swatch-pos'}"></span> ${'AB'[k]}</td>`).join('')],
      [T.rows.t, cell(r => r.t)],
      ...(ls.n ? [[T.rows.epochs, cell(r => fmt(r.evaluations / ls.n, 2))]] : []),
      [T.rows.gap, cell(r => (r.diverged ? '∞' : fmt(Math.max(0, r.trace[r.trace.length - 1].gap), 4)))],
      ...(state.average ? [[T.rows.avg, cell(r => (r.diverged ? '∞' : fmt(Math.max(0, r.trace[r.trace.length - 1].gapAvg), 4)))]] : []),
      [T.rows.grad, cell(r => (r.diverged ? '∞' : fmt(r.gradNorm(), 4)))],
      [T.rows.theta, cell(r => (r.diverged ? '–' : `(${r.theta.map(v => fmt(v, 3)).join(', ')})`))],
    ];
    $('.lab-readouts').innerHTML = rows.map(([h, d]) => `<tr><th>${h}</th>${d}</tr>`).join('');
    const t = Math.max(...live.map(k => runs[k].t));
    $('[data-out="counter"]').textContent = format(T.counter, { t });
    const play = $('[data-action="play"]');
    play.textContent = playing ? T.pause : T.play;
    play.setAttribute('aria-pressed', String(playing));
    const box = $('.lab-message');
    box.hidden = !notice;
    if (notice) box.textContent = notice;
    $('[data-out="constants"]').textContent = ls.L ? format(T.constants, { L: fmt(ls.L, 3), mu: fmt(ls.mu, 3), k: fmt(ls.L / ls.mu, 1), local: ls.local ? T.local : '' }) : '';
  }

  function draw() {
    C = Lab.colours();
    drawMap();
    drawChart();
    renderReadouts();
  }

  // ---- Animation ----

  // count ticks of OPT.tick: at equal computation on the axis of passes over
  // the data, one step of each algorithm otherwise. False when the animation
  // should stop (end of the experiment, or nothing left to see).
  function advance(count) {
    const live = runs.filter(Boolean), byCost = state.axis === 'epochs' && !!ls.n;
    for (let s = 0; s < count; s++) {
      const t = Math.max(...live.map(r => r.t)), epochs = Math.max(...live.map(r => r.epochs()));
      if ((state.stopAt && t >= state.stopAt) || (state.stopEpochs && epochs >= state.stopEpochs - 1e-9)) {
        notice = format(T.stopped, { t: state.stopEpochs ? format(T.epochsAt, { e: state.stopEpochs }) : format(T.iterationAt, { t }) });
        state.stopAt = state.stopEpochs = null;
        return false;
      }
      OPT.tick(live, byCost);
      live.forEach(r => { if (r.diverged && !notice) notice = format(T.diverged, { k: 'AB'[runs.indexOf(r)] }); });
      if (live.every(r => r.done() || r.t >= MAX_ITERATIONS)) {
        if (!live.every(r => r.diverged)) notice = notice || T.converged;
        return false;
      }
    }
    return true;
  }

  const animation = Lab.animate(root, () => {
    const going = advance(state.speed);
    draw();
    return going;
  }, now => {
    playing = now;
    renderReadouts();
  });

  // ---- Controls ----

  const nearest = (list, value) => {
    let best = 0;
    const d = v => Math.abs(Math.log((v || 1e-7)) - Math.log(value || 1e-7));
    list.forEach((v, i) => { if (d(v) < d(list[best])) best = i; });
    return best;
  };

  // Landscape options: κ and the rotation (quadratic), centring (least squares), σ (no data).
  function renderOptions() {
    const box = $('.opt-options'), parts = [];
    if (state.landscape === 'quadratic') {
      parts.push(`<label class="demo-control">${T.kappa} = <output data-out="kappa"></output><input type="range" data-input="kappa" min="0" max="${KAPPAS.length - 1}" step="1"></label>`);
      parts.push(`<label class="lab-check"><input type="checkbox" data-input="rotated"> ${T.rotated}</label>`);
    }
    if (state.landscape === 'leastSquares') parts.push(`<label class="lab-check"><input type="checkbox" data-input="centred"> ${T.centred}</label>`);
    if (!ls.n) parts.push(`<label class="demo-control">${T.sigma} = <output data-out="sigma"></output><input type="range" data-input="sigma" min="0" max="${SIGMAS.length - 1}" step="1"></label><p class="opt-note">${T.noiseNote}</p>`);
    box.innerHTML = parts.join('');
  }

  function sync() {
    Lab.pills($('[data-group="landscape"]'), LANDSCAPES.map(id => ({ label: T.landscapes[id], value: id })), v => v === state.landscape, v => {
      state.landscape = v;
      state.start = null;
      manual();
      rebuild('landscape');
    });
    Lab.pills($('[data-group="speed"]'), SPEEDS.map(s => ({ label: `×${s}`, value: s, title: format(T.perFrame, { s }) })), v => v === state.speed, v => {
      state.speed = v;
      sync();
    });
    Lab.pills($('[data-group="axis"]'), ['iterations', 'epochs'].filter(a => a === 'iterations' || ls.n).map(a => ({ label: T.axis[a], value: a })),
      v => v === state.axis || (!ls.n && v === 'iterations'), v => {
        state.axis = v;
        sync();
        draw();
      });
    $('[data-out="note"]').textContent = T.notes[state.landscape];
    renderOptions();
    const set = (key, v) => { const el = $(`.opt-options [data-input="${key}"]`); if (el) el.value = v; };
    const out = (key, v) => { const el = $(`.opt-options [data-out="${key}"]`); if (el) el.textContent = v; };
    set('kappa', nearest(KAPPAS, state.kappa));
    out('kappa', state.kappa);
    set('sigma', SIGMAS.indexOf(state.sigma) >= 0 ? SIGMAS.indexOf(state.sigma) : nearest(SIGMAS, state.sigma));
    out('sigma', state.sigma);
    const rotated = $('.opt-options [data-input="rotated"]');
    if (rotated) rotated.checked = state.rotated;
    const centred = $('.opt-options [data-input="centred"]');
    if (centred) centred.checked = state.centred;
    $('[data-input="average"]').checked = state.average;

    [0, 1].forEach(k => {
      const box = runBox(k), r = state.runs[k], q = sel => box.querySelector(sel);
      const on = k === 0 || state.compare;
      if (k) q('[data-input="compare"]').checked = state.compare;
      q('.opt-run-body').hidden = !on;
      Lab.pills(q('[data-group="rule"]'), RULES.map(v => ({ label: T.rules[v], value: v })), v => v === r.rule, v => {
        r.rule = v;
        changed();
      });
      Lab.pills(q('[data-group="schedule"]'), SCHEDULES.map(v => ({ label: T.schedules[v], value: v })), v => v === r.schedule, v => {
        r.schedule = v;
        changed();
      });
      q('[data-input="stochastic"]').checked = r.stochastic;
      q('[data-input="lr"]').value = nearest(RATES, r.lr);
      q('[data-out="lr"]').textContent = String(r.lr);
      q('[data-out="lrL"]').textContent = ls.L && !ls.local && r.rule !== 'adam' ? `(${format(T.lrL, { v: fmt(r.lr * ls.L, 2) })})` : '';
      q('[data-input="batch"]').value = nearest(BATCHES, r.batch);
      q('[data-out="batch"]').textContent = r.batch;
      q('[data-when="batch"]').hidden = !(r.stochastic && ls.n);
      q('[data-input="beta"]').value = nearest(BETAS, r.beta);
      q('[data-out="beta"]').textContent = r.beta;
      q('[data-when="beta"]').hidden = r.rule !== 'momentum';
    });
    renderReadouts();
  }

  // A setting of an algorithm changed: restart both runs from θ₀.
  function changed() {
    manual();
    animation.pause();
    rebuild();
  }

  function manual() {
    if (panel) panel.manual();
  }

  root.addEventListener('input', event => {
    const input = event.target.closest('[data-input]');
    if (!input || input.type !== 'range') return;
    const run = input.closest('.opt-run'), i = Number(input.value), key = input.dataset.input;
    if (run) {
      const r = state.runs[Number(run.dataset.run)];
      if (key === 'lr') r.lr = RATES[i];
      if (key === 'batch') r.batch = BATCHES[i];
      if (key === 'beta') r.beta = BETAS[i];
      changed();
      return;
    }
    if (key === 'kappa') state.kappa = KAPPAS[i];
    if (key === 'sigma') state.sigma = SIGMAS[i];
    manual();
    animation.pause();
    rebuild(key === 'kappa' ? 'landscape' : undefined);
  });

  root.addEventListener('change', event => {
    const input = event.target.closest('[data-input]');
    if (!input || input.type !== 'checkbox') return;
    const run = input.closest('.opt-run'), key = input.dataset.input;
    if (key === 'compare') state.compare = input.checked;
    else if (key === 'stochastic') state.runs[Number(run.dataset.run)].stochastic = input.checked;
    else if (key === 'average') {
      state.average = input.checked;
      sync();
      draw();
      return;
    } else {
      state[key] = input.checked;
      if (key === 'centred') state.start = null;
      manual();
      animation.pause();
      rebuild('landscape');
      return;
    }
    changed();
  });

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'play') {
      if (!playing && runs.every(r => !r || r.done())) return;
      notice = null;
      animation.toggle();
    }
    if (action === 'step') {
      animation.pause();
      notice = null;
      advance(1);
      draw();
    }
    if (action === 'reset') {
      animation.pause();
      buildRuns();
      draw();
    }
  });

  // Clicking on the map chooses θ₀; hovering gives F(θ) − F*.
  const tip = $('.opt-map .lab-tooltip');
  map.canvas.addEventListener('click', event => {
    const rect = map.canvas.getBoundingClientRect();
    state.start = fromPx(event.clientX - rect.left, event.clientY - rect.top);
    manual();
    animation.pause();
    buildRuns();
    draw();
  });
  map.canvas.addEventListener('mousemove', event => {
    const rect = map.canvas.getBoundingClientRect(), px = event.clientX - rect.left, py = event.clientY - rect.top;
    const t = fromPx(px, py);
    tip.innerHTML = `θ = (${t.map(v => v.toFixed(2)).join(', ')})<br>${format(T.tipGap, { v: fmt(ls.f(t) - ls.fStar, 3) })}`;
    tip.hidden = false;
    tip.style.left = `${px + 14 + tip.offsetWidth > rect.width ? px - tip.offsetWidth - 14 : px + 14}px`;
    tip.style.top = `${Math.max(0, py - tip.offsetHeight - 10)}px`;
  });
  map.canvas.addEventListener('mouseleave', () => { tip.hidden = true; });

  function resize() {
    map.size = map.canvas.parentElement.clientWidth;
    draw();
  }

  // ---- Experiments ----

  function loadSetup(setup) {
    animation.pause();
    const base = clone(DEFAULTS);
    state = { ...base, ...setup, runs: base.runs.map((r, k) => ({ ...r, ...((setup.runs || [])[k] || {}) })), start: setup.start ? setup.start.slice() : null };
    buildLandscape();
    buildRuns();
    sync();
    draw();
    animation.play();
  }

  // ---- Start ----

  C = Lab.colours();
  buildLandscape();
  buildRuns();
  sync();
  panel = Lab.experiments({
    root, list: $('.lab-exp-list'), detail: $('.lab-exp-detail'), items: EXPERIMENTS, parts: PARTS,
    load: loadSetup, action: () => {},
  });
  window.addEventListener('sitethemechange', () => { map.key = ''; draw(); });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(root);
  resize();
})();
