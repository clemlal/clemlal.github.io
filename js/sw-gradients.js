// Interactive demo in the June 2026 item of news_archive.html, illustrating
// "Learning with Differentially Private Sliced Wasserstein Gradients" (TMLR).
//
// A private dataset X of n points in the plane is encoded by g(x) = A x + b,
// trained so that the encoded points match a public prior N(0, I) in sliced
// Wasserstein distance, as the encoder of the paper's private sliced
// Wasserstein autoencoders (Section 6). At each of the STEPS steps:
//  - DIRECTIONS random directions are drawn; along each one, the projected
//    encoded points are matched in sorted order with the prior's quantiles
//    (one-dimensional optimal transport), which gives the gradient of SW_2^2
//    (Proposition 3.2);
//  - the encoded points are clipped to radius M and the data to radius R, so
//    that the per-sample Jacobians of g have norm at most L1 = sqrt(R^2 + 1)
//    (the "inner clipping" of Section 5.1);
//  - Gaussian noise of standard deviation σ = Δ / μ_step is added to the
//    gradient, where Δ = 4 M (3 L1) / n bounds its sensitivity (Theorem 4.1,
//    with L2 = 0 since the prior is public), and μ_step = μ / sqrt(STEPS)
//    makes the whole training μ-GDP, μ being chosen so that it is (ε, δ)-DP.
// The optimizer is Adam, which worked best in the paper's experiments, with a
// learning rate decreasing linearly to 0; it only sees the noisy gradients, so
// it keeps the privacy guarantee (post-processing). A run on the same data and
// directions without noise is shown for reference. Nothing runs while the demo
// is off screen; visitors who ask for reduced motion get the trained state.

(function () {
  const STEPS = 150;
  const DIRECTIONS = 4;            // per step
  const LEARNING_RATE = 0.15;      // initial value, decreased linearly to 0
  const BETAS = [0.9, 0.999];      // Adam's moment decay rates
  const M = 3;                     // clipping radius of the encoded points
  const R = 3;                     // clipping radius of the data
  const L1 = Math.sqrt(R * R + 1);
  const DELTA_DP = 1e-5;
  const STEP_MS = 60;              // animation time per training step
  const SHOWN = 500;               // points drawn in the scatter plot
  const MATCHES = 24;              // matched pairs drawn in the slice strip
  const FINAL_DIRECTIONS = 32;     // for the final distances to the prior

  const root = document.querySelector('.sw-demo');
  if (!root) return;

  const scatter = root.querySelector('.sw-scatter');
  const strip = root.querySelector('.sw-strip');
  const chart = root.querySelector('.sw-chart');
  const sliders = { eps: root.querySelector('input[name="eps"]'), n: root.querySelector('input[name="n"]') };
  const outputs = { eps: root.querySelector('output[data-for="eps"]'), n: root.querySelector('output[data-for="n"]') };
  const readout = root.querySelector('.sw-readout');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Probability tools ----

  const gaussian = () => {
    let u = 0;
    while (!u) u = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
  };

  // Complementary error function (Numerical Recipes' erfcc, relative error
  // below 1.2e-7, enough for δ around 1e-5).
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const normalCdf = x => 0.5 * erfc(-x / Math.SQRT2);

  // Inverse of the standard normal CDF (Acklam's algorithm).
  function normalQuantile(p) {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const tail = q => (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    if (p < 0.02425) return tail(Math.sqrt(-2 * Math.log(p)));
    if (p > 1 - 0.02425) return -tail(Math.sqrt(-2 * Math.log(1 - p)));
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  // δ of a μ-GDP mechanism at a given ε (Dong, Roth and Su), and the μ that
  // gives (ε, DELTA_DP)-DP.
  const deltaOf = (eps, mu) => normalCdf(-eps / mu + mu / 2) - Math.exp(eps) * normalCdf(-eps / mu - mu / 2);
  function muFor(eps) {
    let lo = 1e-4, hi = 50;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (deltaOf(eps, mid) > DELTA_DP) hi = mid;
      else lo = mid;
    }
    return lo;
  }

  // ---- Data, encoder and gradients ----

  // An elongated, off-centre cloud, clipped to radius R.
  function privateData(n) {
    const xs = new Float64Array(n), ys = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = 1.5 * gaussian(), c = 0.5 * gaussian(), angle = 0.6;
      let x = 1 + a * Math.cos(angle) - c * Math.sin(angle);
      let y = -0.6 + a * Math.sin(angle) + c * Math.cos(angle);
      const r = Math.hypot(x, y);
      if (r > R) {
        x *= R / r;
        y *= R / r;
      }
      xs[i] = x;
      ys[i] = y;
    }
    return { xs, ys, n };
  }

  const newModel = () => ({ A: [1, 0, 0, 1], b: [0, 0], m: new Float64Array(6), v: new Float64Array(6), t: 0, loss: [] });

  // Gradient of the Monte Carlo SW_2^2 over the given directions, and the
  // loss itself. Fills `slice` with the sorted projections along the first
  // direction (for the strip).
  function gradient(model, data, quantiles, directions, scratch, slice) {
    const { xs, ys, n } = data, { A, b } = model;
    const g = new Float64Array(6);
    let loss = 0;
    directions.forEach(([c, s], l) => {
      for (let i = 0; i < n; i++) {
        let u = A[0] * xs[i] + A[1] * ys[i] + b[0], v = A[2] * xs[i] + A[3] * ys[i] + b[1];
        const r = Math.hypot(u, v);
        if (r > M) {
          u *= M / r;
          v *= M / r;
        }
        scratch.proj[i] = c * u + s * v;
      }
      scratch.sorted.set(scratch.proj);
      scratch.sorted.sort();
      if (l === 0 && slice) slice.set(scratch.sorted);
      for (let i = 0; i < n; i++) {
        const p = scratch.proj[i];
        let lo = 0, hi = n - 1;  // rank of p among the sorted projections
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (scratch.sorted[mid] < p) lo = mid + 1;
          else hi = mid;
        }
        const residual = p - quantiles[lo];
        loss += residual * residual / n / directions.length;
        const w = 2 * residual / n / directions.length;
        g[0] += w * c * xs[i];
        g[1] += w * c * ys[i];
        g[2] += w * s * xs[i];
        g[3] += w * s * ys[i];
        g[4] += w * c;
        g[5] += w * s;
      }
    });
    return { g, loss };
  }

  // Adam step on the gradient g plus Gaussian noise of standard deviation sigma.
  function update(model, g, sigma) {
    const [b1, b2] = BETAS;
    const rate = LEARNING_RATE * (1 - model.t / STEPS);
    model.t++;
    for (let k = 0; k < 6; k++) {
      const noisy = g[k] + sigma * gaussian();
      model.m[k] = b1 * model.m[k] + (1 - b1) * noisy;
      model.v[k] = b2 * model.v[k] + (1 - b2) * noisy * noisy;
      const step = rate * (model.m[k] / (1 - b1 ** model.t)) / (Math.sqrt(model.v[k] / (1 - b2 ** model.t)) + 1e-8);
      if (k < 4) model.A[k] -= step;
      else model.b[k - 4] -= step;
    }
  }

  // ---- Drawing ----

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function element(parent, tag, attributes) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
    parent.appendChild(el);
    return el;
  }

  // Scatter plot: [-4.5, 4.5]^2 on 0..300.
  const sx = v => 150 + v * 300 / 9, sy = v => 150 - v * 300 / 9;
  element(scatter, 'rect', { x: 0, y: 0, width: 300, height: 300, class: 'sw-frame' });
  element(scatter, 'line', { x1: 0, x2: 300, y1: 150, y2: 150, class: 'sw-axis' });
  element(scatter, 'line', { x1: 150, x2: 150, y1: 0, y2: 300, class: 'sw-axis' });
  const priorDots = element(scatter, 'path', { class: 'sw-dots sw-prior' });
  const directionLine = element(scatter, 'line', { class: 'sw-direction' });
  const dataDots = element(scatter, 'path', { class: 'sw-dots sw-data' });

  // Slice strip: projections along the current direction, [-4.5, 4.5] on 0..300.
  const px = v => 150 + v * 300 / 9;
  element(strip, 'line', { x1: 0, x2: 300, y1: 14, y2: 14, class: 'sw-axis' });
  element(strip, 'line', { x1: 0, x2: 300, y1: 56, y2: 56, class: 'sw-axis' });
  const matchLines = element(strip, 'path', { class: 'sw-match' });
  const dataTicks = element(strip, 'path', { class: 'sw-tick sw-tick-data' });
  const priorTicks = element(strip, 'path', { class: 'sw-tick sw-tick-prior' });

  // Loss chart: steps 0..STEPS on 30..250, SW_2^2 on a log scale from 0.003 to 3.
  const cx = t => 30 + t * 220 / STEPS;
  const LOG = [Math.log10(0.003), Math.log10(3)];
  const cy = v => 96 - (Math.log10(Math.min(3, Math.max(0.003, v))) - LOG[0]) / (LOG[1] - LOG[0]) * 86;
  for (const v of [0.01, 0.1, 1]) {
    element(chart, 'line', { x1: 30, x2: 250, y1: cy(v), y2: cy(v), class: 'sw-grid' });
    element(chart, 'text', { x: 26, y: cy(v) + 3, class: 'sw-label sw-label-y' }).textContent = String(v);
  }
  element(chart, 'line', { x1: 30, x2: 250, y1: 96, y2: 96, class: 'sw-axis' });
  element(chart, 'text', { x: 140, y: 112, class: 'sw-label' }).textContent = 'training step';
  const referenceCurve = element(chart, 'polyline', { class: 'sw-curve sw-curve-reference' });
  const privateCurve = element(chart, 'polyline', { class: 'sw-curve sw-curve-private' });

  // ---- State and animation ----

  let run = null;
  let running = false;
  let visible = false;
  let last = 0;

  const settings = () => ({
    eps: Math.pow(10, Number(sliders.eps.value)),
    n: Math.round(Math.pow(10, Number(sliders.n.value)) / 100) * 100,
  });

  function renderSettings() {
    const { eps, n } = settings();
    outputs.eps.textContent = `ε = ${eps >= 10 ? eps.toFixed(0) : eps >= 1 ? eps.toFixed(1) : eps.toFixed(2)}`;
    outputs.n.textContent = `n = ${n.toLocaleString('en-US')}`;
  }

  function newRun() {
    const { eps, n } = settings();
    const data = privateData(n);
    const quantiles = Float64Array.from({ length: n }, (_, k) => normalQuantile((k + 0.5) / n));
    const sensitivity = 4 * M * 3 * L1 / n;
    const sigma = sensitivity / (muFor(eps) / Math.sqrt(STEPS));
    const scratch = { proj: new Float64Array(n), sorted: new Float64Array(n) };
    const shown = Array.from({ length: Math.min(SHOWN, n) }, (_, i) => Math.floor(i * n / Math.min(SHOWN, n)));
    let priorPath = '';
    for (let i = 0; i < SHOWN; i++) priorPath += `M${sx(gaussian()).toFixed(1)} ${sy(gaussian()).toFixed(1)}h0.01`;
    priorDots.setAttribute('d', priorPath);
    run = {
      eps, n, data, quantiles, sensitivity, sigma, scratch, shown,
      private: newModel(), reference: newModel(),
      slice: new Float64Array(n), direction: [1, 0], step: 0, time: 0, final: null,
    };
    render();
  }

  function trainStep() {
    const directions = Array.from({ length: DIRECTIONS }, () => {
      const angle = Math.PI * Math.random();
      return [Math.cos(angle), Math.sin(angle)];
    });
    const priv = gradient(run.private, run.data, run.quantiles, directions, run.scratch, run.slice);
    const ref = gradient(run.reference, run.data, run.quantiles, directions, run.scratch, null);
    run.private.loss.push(priv.loss);
    run.reference.loss.push(ref.loss);
    update(run.private, priv.g, run.sigma);
    update(run.reference, ref.g, 0);
    run.direction = directions[0];
    run.step++;
    if (run.step === STEPS) {
      // Final distances, with FINAL_DIRECTIONS evenly spaced directions
      // rather than the few random ones of a step.
      const even = Array.from({ length: FINAL_DIRECTIONS }, (_, l) => [Math.cos(Math.PI * l / FINAL_DIRECTIONS), Math.sin(Math.PI * l / FINAL_DIRECTIONS)]);
      run.final = ['private', 'reference'].map(key => gradient(run[key], run.data, run.quantiles, even, run.scratch, null).loss);
    }
  }

  function render() {
    const { A, b } = run.private, { xs, ys } = run.data;
    let path = '';
    for (const i of run.shown) {
      const u = A[0] * xs[i] + A[1] * ys[i] + b[0], v = A[2] * xs[i] + A[3] * ys[i] + b[1];
      path += `M${sx(u).toFixed(1)} ${sy(v).toFixed(1)}h0.01`;
    }
    dataDots.setAttribute('d', path);

    const [c, s] = run.direction;
    directionLine.setAttribute('x1', sx(-6 * c));
    directionLine.setAttribute('y1', sy(-6 * s));
    directionLine.setAttribute('x2', sx(6 * c));
    directionLine.setAttribute('y2', sy(6 * s));

    let ticks = '', priors = '', matches = '';
    if (run.step) {
      for (let k = 0; k < MATCHES; k++) {
        const rank = Math.floor((k + 0.5) * run.n / MATCHES);
        const top = px(run.slice[rank]), bottom = px(run.quantiles[rank]);
        ticks += `M${top.toFixed(1)} 8v12`;
        priors += `M${bottom.toFixed(1)} 50v12`;
        matches += `M${top.toFixed(1)} 20L${bottom.toFixed(1)} 50`;
      }
    }
    dataTicks.setAttribute('d', ticks);
    priorTicks.setAttribute('d', priors);
    matchLines.setAttribute('d', matches);

    const curve = losses => losses.map((v, t) => `${cx(t).toFixed(1)},${cy(v).toFixed(1)}`).join(' ');
    privateCurve.setAttribute('points', curve(run.private.loss));
    referenceCurve.setAttribute('points', curve(run.reference.loss));

    const lastLoss = model => (model.loss.length ? model.loss[model.loss.length - 1] : null);
    const fmt = v => (v === null ? '–' : v < 0.01 ? v.toExponential(1) : v.toFixed(3));
    const [priv, ref] = run.final || [lastLoss(run.private), lastLoss(run.reference)];
    readout.innerHTML =
      `Gradient sensitivity Δ = 12·M·L<sub>1</sub>/n = <strong>${run.sensitivity.toFixed(4)}</strong><br>` +
      `Noise added to each gradient: σ = <strong>${run.sigma.toFixed(2)}</strong><br>` +
      `${run.final ? 'Final' : `Step ${run.step} of ${STEPS} ·`} SW<sub>2</sub><sup>2</sup> to the prior: <strong>${fmt(priv)}</strong> ` +
      `(without privacy: ${fmt(ref)})`;
  }

  function frame(now) {
    if (!visible) {
      running = false;
      return;
    }
    run.time += Math.max(0, Math.min(now - last, 50));  // no jump after a pause
    last = now;
    let changed = false;
    while (run.step < STEPS && run.time >= (run.step + 1) * STEP_MS) {
      trainStep();
      changed = true;
    }
    if (changed) render();
    if (run.step >= STEPS) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function resume() {
    if (running || !visible || run.step >= STEPS) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function restart() {
    newRun();
    if (reduceMotion) {
      while (run.step < STEPS) trainStep();
      render();
    } else {
      resume();
    }
  }

  for (const slider of Object.values(sliders)) {
    slider.addEventListener('input', renderSettings);
    slider.addEventListener('change', restart);
  }
  root.querySelector('.sw-restart').addEventListener('click', restart);

  new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    resume();
  }).observe(root);

  renderSettings();
  restart();
})();
