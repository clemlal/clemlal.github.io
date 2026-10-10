// Interactive demo in the September 2026 news item of index.html, illustrating
// "Minimax Private Estimation of Smooth Optimal-Transport Maps" (NeurIPS 2026)
// in dimension 1.
//
// On [0, 1], the optimal transport map from the source density f_X to the
// target density f_Y is T = F_Y^{-1} ∘ F_X (dashed curve). The densities have
// K modes (set by a slider) on a floor, at different places in the
// source and the target, so that more bumps give a map with more steep and
// flat stretches; their max/min ratio stays below 14 for every K. The paper's
// 1D result (Theorem 3.2) only needs such bounds, so the error does not depend
// on K. The map sends each
// quantile of f_X to the same quantile of f_Y. The paper's 1D estimator
// (Section 3, Equation (3)) privately estimates the quantiles of orders k/m,
// k = 1, ..., m - 1, of the X-sample (q_X) and of the Y-sample (q_Y), and
// outputs the staircase T̂ = q_Y[k] on (q_X[k-1], q_X[k]], and 1 after
// q_X[m-1] (orange). The strips under the densities alternate between these
// quantiles: the k-th slab of the source is matched to the k-th of the target.
//
// The quantiles come from the recursive mechanism of Kaplan, Schnapp and
// Stemmer (ICML 2022), as in the paper: the median is drawn with the
// exponential mechanism, the sample is split at it, and each half recursively
// provides the remaining quantiles. With m = 2^L, each point is used once per
// level, so a budget of ε/L per level makes each sample's quantiles ε-DP. As
// neighbouring datasets differ in one of the two samples only, T̂ is ε-DP.
// m follows the paper's tuning m ≍ min(√n, nε) up to log factors (here a
// factor 10), rounded to a power of 2 between 2 and 64.
//
// The animation reveals the levels one by one (2, 4, 8, ... steps), sends a
// few particles drawn from f_X through T̂ into the target, then starts over on
// fresh samples, RUNS times in all. Earlier estimates stay as faint
// staircases, which shows the variability that privacy adds. Nothing runs
// while the demo is off screen; visitors who ask for reduced motion see a
// single final estimate, without particles.

(function () {
  const FLOOR = 0.12;              // keeps the densities bounded below
  const GRID = 1000;              // resolution of the CDF tables
  const MAX_LEVELS = 6;           // m ≤ 64
  const LEVEL_MS = 700;           // delay between two levels of the animation
  const HOLD_MS = 4500;           // time on each final estimate
  const SPAWN_MS = 120;           // one particle every SPAWN_MS, during the hold
  const SPAWN_STOP_MS = 2000;     // no new particle in the last SPAWN_STOP_MS of the hold
  const SPEED = 0.35;             // of the particles, in SVG units per ms
  const RUNS = 6;                 // estimates shown after each change of the settings
  const SHOWN_SAMPLES = 400;      // samples drawn as dots in each density strip

  // Figure layout, in SVG units (viewBox 0 0 370 366): the map in a square
  // panel, the source density hanging below it, the target density on its left.
  const PANEL = { left: 92, top: 8, size: 270 };
  const STRIP = 55;               // depth of the density strips
  const BOTTOM = PANEL.top + PANEL.size + 8;  // baseline of the source strip
  const LEFT = PANEL.left - 8;                // baseline of the target strip
  const X = u => PANEL.left + PANEL.size * u;
  const Y = v => PANEL.top + PANEL.size * (1 - v);

  const root = document.querySelector('.ot-demo');
  if (!root) return;

  const svg = root.querySelector('svg');
  const sliders = {}, outputs = {};
  for (const name of ['eps', 'n', 'modes']) {
    sliders[name] = root.querySelector(`input[name="${name}"]`);
    outputs[name] = root.querySelector(`output[data-for="${name}"]`);
  }
  const status = root.querySelector('.ot-status');
  const errorText = root.querySelector('.ot-error');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Distributions ----

  // K bumps of width 0.18/K on the floor, the j-th one at (j - offset)/K. The
  // weights decrease from left to right, or increase if `rising`, so that the
  // map also moves mass across [0, 1] and does not get closer to the identity
  // as K grows.
  function density(K, offset, rising) {
    const sd = 0.18 / K;
    const weight = j => (K === 1 ? 1 : rising ? 0.5 + (j - 1) / (K - 1) : 1.5 - (j - 1) / (K - 1));
    return x => {
      let s = FLOOR;
      for (let j = 1; j <= K; j++) s += weight(j) * Math.exp(-0.5 * ((x - (j - offset) / K) / sd) ** 2);
      return s;
    };
  }

  function cdfTable(f) {
    const F = new Float64Array(GRID + 1);
    for (let i = 1; i <= GRID; i++) F[i] = F[i - 1] + f((i - 0.5) / GRID) / GRID;
    const total = F[GRID];
    return { F: F.map(v => v / total), norm: total };
  }

  // Inverse of the piecewise-linear CDF.
  function quantile(table, u) {
    const F = table.F;
    let lo = 0, hi = GRID;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (F[mid] <= u) lo = mid;
      else hi = mid;
    }
    return (lo + (u - F[lo]) / (F[hi] - F[lo])) / GRID;
  }

  function cdf(table, x) {
    const i = Math.min(GRID - 1, Math.max(0, Math.floor(x * GRID)));
    return table.F[i] + (x * GRID - i) * (table.F[i + 1] - table.F[i]);
  }

  // Set by setDistributions().
  let SOURCE, TARGET, source, target, scale;
  const trueMap = x => quantile(target, cdf(source, x));
  const sample = (table, n) => Float64Array.from({ length: n }, () => quantile(table, Math.random())).sort();

  // ---- Private quantiles (Kaplan, Schnapp and Stemmer) ----

  // Exponential mechanism for the quantile of order p of the sorted sample z
  // in [a, b]: an interval between consecutive points is drawn with probability
  // proportional to its length times exp(-ε |rank error| / 2), then a point of it.
  function privateQuantile(z, p, eps, a, b) {
    const k = z.length, at = j => (j === 0 ? a : j === k + 1 ? b : z[j - 1]);
    const weights = new Float64Array(k + 1);
    let max = -Infinity;
    for (let j = 0; j <= k; j++) {
      const length = at(j + 1) - at(j);
      weights[j] = length > 0 ? Math.log(length) - eps * Math.abs(j - p * k) / 2 : -Infinity;
      max = Math.max(max, weights[j]);
    }
    let total = 0;
    for (let j = 0; j <= k; j++) total += (weights[j] = Math.exp(weights[j] - max));
    let u = Math.random() * total, j = 0;
    while (j < k && u > weights[j]) u -= weights[j++];
    return at(j) + Math.random() * (at(j + 1) - at(j));
  }

  // Fills out[from..] with the quantiles of orders ps (increasing) of the sorted
  // sample z in [a, b], with budget eps per level of the recursion. eps = Infinity
  // gives the empirical quantiles (the non-private estimator).
  function privateQuantiles(z, ps, eps, a, b, out, from) {
    if (!ps.length) return;
    const i = ps.length >> 1, p = ps[i];
    const v = eps === Infinity
      ? (z.length ? z[Math.min(z.length - 1, Math.floor(p * z.length))] : (a + b) / 2)
      : privateQuantile(z, p, eps, a, b);
    out[from + i] = v;
    privateQuantiles(z.filter(x => x < v), ps.slice(0, i).map(q => q / p), eps, a, v, out, from);
    privateQuantiles(z.filter(x => x > v), ps.slice(i + 1).map(q => (q - p) / (1 - p)), eps, v, b, out, from + i + 1);
  }

  function estimate(xs, ys, levels, eps) {
    const m = 2 ** levels, ps = Array.from({ length: m - 1 }, (_, k) => (k + 1) / m);
    const qx = [], qy = [];
    privateQuantiles(xs, ps, eps / levels, 0, 1, qx, 0);
    privateQuantiles(ys, ps, eps / levels, 0, 1, qy, 0);
    return { qx, qy, levels };
  }

  // Quantiles of orders j / 2^level only: the estimate after `level` levels.
  function truncate(est, level) {
    const step = 2 ** (est.levels - level), qx = [], qy = [];
    for (let k = step; k < 2 ** est.levels; k += step) {
      qx.push(est.qx[k - 1]);
      qy.push(est.qy[k - 1]);
    }
    return { qx, qy };
  }

  function evaluate(est, x) {
    let k = 0;
    while (k < est.qx.length && x > est.qx[k]) k++;
    return k < est.qy.length ? est.qy[k] : 1;
  }

  // ‖T̂ - T‖² in L²(P_X).
  function squaredError(est) {
    let s = 0;
    for (let i = 0; i < 500; i++) {
      const x = (i + 0.5) / 500;
      s += (evaluate(est, x) - trueMap(x)) ** 2 * SOURCE(x) / source.norm / 500;
    }
    return s;
  }

  const levelsFor = (n, eps) => Math.min(MAX_LEVELS, Math.max(1, Math.round(Math.log2(Math.min(Math.sqrt(n), n * eps / 10)))));

  // ---- Drawing ----

  function svgElement(tag, attributes, parent = svg) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
    parent.appendChild(el);
    return el;
  }

  const pointList = points => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const unit = Array.from({ length: 201 }, (_, i) => i / 200);

  // Each strip maps a position u in [0, 1] and a depth r in [0, 1] (from the
  // baseline to the density curve) to SVG coordinates.
  const strips = [
    { at: (u, r) => [X(u), BOTTOM + r * scale * SOURCE(u) / source.norm] },
    { at: (u, r) => [LEFT - r * scale * TARGET(u) / target.norm, Y(u)] },
  ];

  // Region of a strip between positions a and b, under the density curve.
  function stripRegion(strip, a, b) {
    const inside = unit.filter(u => u > a && u < b);
    return pointList([strip.at(a, 0), ...[a, ...inside, b].map(u => strip.at(u, 1)), strip.at(b, 0)]);
  }

  svgElement('rect', { x: PANEL.left, y: PANEL.top, width: PANEL.size, height: PANEL.size, class: 'ot-panel' });
  const bandLayers = strips.map(() => svgElement('g', {}));
  const dotPaths = strips.map(() => svgElement('path', { class: 'ot-dots' }));
  const outlines = strips.map(() => svgElement('polygon', { class: 'ot-density' }));
  const ticks = svgElement('g', {});
  const trueCurve = svgElement('polyline', { class: 'ot-true' });
  const ghostLayer = svgElement('g', {});
  const staircase = svgElement('path', { class: 'ot-estimate' });
  const particleLayer = svgElement('g', {});

  // "<text> f<sub>" labels of the strips.
  function label(x, y, text, sub, rotate) {
    const el = svgElement('text', { x, y, class: 'ot-label', transform: rotate ? `rotate(-90 ${x} ${y})` : '' });
    el.textContent = text;
    svgElement('tspan', { 'baseline-shift': 'sub', 'font-size': '0.75em' }, el).textContent = sub;
  }
  label(X(0.5), BOTTOM + STRIP + 18, 'source density f', 'X', false);
  label(LEFT - STRIP - 12, Y(0.5), 'target density f', 'Y', true);

  function setDistributions(K) {
    SOURCE = density(K, 0.65, false);
    TARGET = density(K, 0.35, true);
    source = cdfTable(SOURCE);
    target = cdfTable(TARGET);
    scale = STRIP / Math.max(...unit.map(u => Math.max(SOURCE(u) / source.norm, TARGET(u) / target.norm)));
    outlines.forEach((outline, s) => outline.setAttribute('points', stripRegion(strips[s], 0, 1)));
    trueCurve.setAttribute('points', pointList(unit.map(x => [X(x), Y(trueMap(x))])));
  }

  // Samples as dots scattered under their density curve, drawn as tiny
  // segments with round caps.
  function renderSamples(samples) {
    samples.forEach((values, s) => {
      const shown = Math.min(values.length, SHOWN_SAMPLES);
      let d = '';
      for (let i = 0; i < shown; i++) {
        const [x, y] = strips[s].at(values[Math.floor(i * values.length / shown)], 0.08 + 0.84 * Math.random());
        d += `M${x.toFixed(1)} ${y.toFixed(1)}h0.01`;
      }
      dotPaths[s].setAttribute('d', d);
    });
  }

  function staircasePath(est) {
    let d = `M${X(0)} ${Y(est.qy[0])}`;
    est.qx.forEach((qx, k) => {
      d += `H${X(qx).toFixed(1)}V${Y(k + 1 < est.qy.length ? est.qy[k + 1] : 1).toFixed(1)}`;
    });
    return `${d}H${X(1)}`;
  }

  // The staircase and the alternating slabs after `level` levels; while
  // revealing, the quantiles of that level are drawn across the strips.
  function renderEstimate(est, level, revealing) {
    const shown = truncate(est, level);
    staircase.setAttribute('d', staircasePath(shown));
    [shown.qx, shown.qy].forEach((quantiles, s) => {
      const bounds = [0, ...quantiles, 1];
      bandLayers[s].textContent = '';
      for (let k = 0; k + 1 < bounds.length; k++) {
        svgElement('polygon', { points: stripRegion(strips[s], bounds[k], bounds[k + 1]), class: `ot-band-${k % 2}` }, bandLayers[s]);
      }
    });
    ticks.textContent = '';
    if (!revealing) return;
    for (let k = 2 ** (est.levels - level); k < 2 ** est.levels; k += 2 ** (est.levels - level + 1)) {
      const qx = X(est.qx[k - 1]), qy = Y(est.qy[k - 1]);
      svgElement('line', { x1: qx, x2: qx, y1: BOTTOM, y2: BOTTOM + STRIP, class: 'ot-tick' }, ticks);
      svgElement('line', { x1: LEFT - STRIP, x2: LEFT, y1: qy, y2: qy, class: 'ot-tick' }, ticks);
    }
  }

  // ---- Runs and animation ----

  let run = null;
  let particles = [];
  let runCount = 0;
  let running = false;
  let visible = false;
  let last = 0;

  const settings = () => ({
    eps: Math.pow(10, Number(sliders.eps.value)),
    n: Math.round(Math.pow(10, Number(sliders.n.value)) / 10) * 10,
    modes: Number(sliders.modes.value),
  });

  function formatError(e) {
    const exponent = Math.floor(Math.log10(e)), superscript = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const power = String(-exponent).split('').map(c => superscript[c]).join('');
    return `${(e / 10 ** exponent).toFixed(1)} × 10⁻${power}`;
  }

  function renderSettings() {
    const { eps, n } = settings();
    outputs.eps.textContent = `ε = ${eps >= 1 ? eps.toFixed(1) : eps >= 0.1 ? eps.toFixed(2) : eps.toFixed(3)}`;
    outputs.n.textContent = `n = ${n}`;
    outputs.modes.textContent = `K = ${settings().modes}`;
  }

  function newRun() {
    const { eps, n } = settings();
    const xs = sample(source, n), ys = sample(target, n);
    const levels = levelsFor(n, eps);
    const est = estimate(xs, ys, levels, eps);
    const nonPrivate = estimate(xs, ys, levelsFor(n, Infinity), Infinity);
    run = { est, levels, time: 0, level: -1, revealing: true, spawned: 0, error: squaredError(est), nonPrivateError: squaredError(nonPrivate) };
    runCount++;
    renderSamples([xs, ys]);
    errorText.textContent = '';
    if (reduceMotion) run.time = levels * LEVEL_MS;
    step(0);
  }

  // Starts over after a change of the settings: forgets the earlier estimates.
  function restart() {
    setDistributions(settings().modes);
    ghostLayer.textContent = '';
    particleLayer.textContent = '';
    particles = [];
    runCount = 0;
    newRun();
    resume();
  }

  function step(dt) {
    run.time += dt;
    if (!reduceMotion) moveParticles(dt);
    const revealing = run.time < run.levels * LEVEL_MS;
    const level = Math.min(run.levels, Math.floor(run.time / LEVEL_MS) + 1);
    if (level === run.level && revealing === run.revealing) return;
    run.level = level;
    run.revealing = revealing;
    renderEstimate(run.est, level, revealing);
    if (revealing) {
      status.textContent = `Private quantiles, level ${level} of ${run.levels}: ${2 ** level} steps`;
    } else {
      status.textContent = `${2 ** run.levels} steps, budget ε/${run.levels} per level · sample ${runCount} of ${reduceMotion ? 1 : RUNS}`;
      errorText.innerHTML = `Squared error: <strong>${formatError(run.error)}</strong><br>Same data without privacy: ${formatError(run.nonPrivateError)}`;
    }
  }

  // Particles leave the source strip at x, go up to the staircase, then left
  // into the target strip at height T̂(x).
  function moveParticles(dt) {
    const flowTime = run.time - run.levels * LEVEL_MS;
    while (flowTime > 0 && flowTime < HOLD_MS - SPAWN_STOP_MS && run.spawned * SPAWN_MS < flowTime) {
      const x = quantile(source, Math.random()), y = evaluate(run.est, x);
      const start = strips[0].at(x, 0.1 + 0.8 * Math.random());
      const corner = [X(x), Y(y)];
      const end = strips[1].at(y, 0.1 + 0.8 * Math.random());
      const el = svgElement('circle', { r: 2.6, class: 'ot-particle' }, particleLayer);
      particles.push({ el, start, corner, travelled: 0, up: start[1] - corner[1], total: start[1] - corner[1] + corner[0] - end[0] });
      run.spawned++;
    }
    particles = particles.filter(p => {
      p.travelled += SPEED * dt;
      if (p.travelled >= p.total) {
        p.el.remove();
        return false;
      }
      const [x, y] = p.travelled < p.up
        ? [p.start[0], p.start[1] - p.travelled]
        : [p.corner[0] - (p.travelled - p.up), p.corner[1]];
      p.el.setAttribute('cx', x.toFixed(1));
      p.el.setAttribute('cy', y.toFixed(1));
      p.el.setAttribute('opacity', Math.min(1, p.travelled / 15, (p.total - p.travelled) / 15).toFixed(2));
      return true;
    });
  }

  function frame(now) {
    if (!visible) {
      running = false;
      return;
    }
    step(Math.max(0, Math.min(now - last, 50)));  // no jump after a pause
    last = now;
    if (run.time >= run.levels * LEVEL_MS + HOLD_MS) {
      if (runCount < RUNS) {
        svgElement('path', { d: staircasePath(run.est), class: 'ot-ghost' }, ghostLayer);
        newRun();
      } else if (!particles.length) {
        running = false;
        return;
      }
    }
    requestAnimationFrame(frame);
  }

  function resume() {
    if (running || !visible || reduceMotion) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  for (const slider of Object.values(sliders)) {
    slider.addEventListener('input', renderSettings);
    slider.addEventListener('change', restart);
  }
  root.querySelector('.ot-resample').addEventListener('click', restart);

  new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    resume();
  }).observe(root);

  renderSettings();
  restart();
})();
