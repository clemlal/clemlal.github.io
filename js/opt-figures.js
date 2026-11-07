// Interactive figures on optimization, each built in every element of the page
// that has its class (texts and controls in the page's markup, the few words
// drawn on the canvases in STRINGS below):
//   .opt-fig-gd1d       gradient descent on F(θ) = (a/2) θ², iterate by iterate
//   .opt-fig-descent    the descent lemma: F, its tangent, the two parabolas of
//                       L-smoothness, and the step θ⁺ = θ − γ F'(θ)
//   .opt-fig-cloud      mini-batch gradients of least squares around ∇F(θ),
//                       their mean and their variance against σ²/b
//   .opt-fig-floor      500 runs of SGD on F(θ) = θ²/2 with noisy gradients:
//                       the law of θ_t, its bias and variance, and
//                       E[F(θ_t)] = ½ bias² + ½ variance, against the exact formulas,
//                       for a constant step, γ/(1 + t/20), or 1/t (the running mean)
//   .opt-fig-tradeoff   the same example at a fixed horizon t: ½ bias², ½ variance
//                       and their sum as functions of a constant step γ (the
//                       U-shaped curve), the best γ, and the error of the step 1/s
//   .opt-fig-weights    momentum as an average of past gradients, weights β^k
//   .opt-fig-adam-bias  the bias of Adam's moving averages without correction
//   .opt-fig-schedules  step-size schedules: decay, cosine, warmup
// Used by teaching/2026_2027_SID_Advanced_Statistical_Learning/optimisation-sgd.html.
// Needs js/lab-kit.js, and js/opt-engine.js for .opt-fig-cloud.

(function () {
  if (!window.Lab) return;
  const { rgba, fmt, format } = Lab;

  const T = Lab.strings({
    en: {
      iterate: 'iterate θ_t', theta: 'θ', step: 'step', tangent: 'tangent', upper: 'upper parabola', lower: 'lower parabola',
      gradientSpace: 'mini-batch gradients ĝ (each dot: one draw)', density: 'law of θ_t: histogram of the runs, exact density',
      expected: 'E[F(θ_t)] − F* = ½ bias² + ½ variance; floor (dotted)', time: 'iteration t (log scale)',
      bias: 'bias', spread: '± one standard deviation', stepAxis: 'step γ (log scale)', tradeoff: 'E[F(θ_t)] − F* after t steps, as a function of γ',
      age: 'age of the gradient, t − i', weight: 'weight in m_t', ratio: 'step without correction ÷ step with correction',
      fraction: 'γ_t / γ₀', iterations: 'iteration t', checked: '✓ the inequality holds', fails: 'no decrease guaranteed (γ > 2/L)',
    },
    fr: {
      iterate: 'itéré θ_t', theta: 'θ', step: 'pas', tangent: 'tangente', upper: 'parabole supérieure', lower: 'parabole inférieure',
      gradientSpace: 'gradients sur mini-lots ĝ (chaque point : un tirage)', density: 'loi de θ_t : histogramme des exécutions, densité exacte',
      expected: 'E[F(θ_t)] − F* = ½ biais² + ½ variance ; plancher (pointillés)', time: 'itération t (échelle log)',
      bias: 'biais', spread: '± un écart-type', stepAxis: 'pas γ (échelle log)', tradeoff: 'E[F(θ_t)] − F* après t pas, en fonction de γ',
      age: 'âge du gradient, t − i', weight: 'poids dans m_t', ratio: 'pas sans correction ÷ pas avec correction',
      fraction: 'γ_t / γ₀', iterations: 'itération t', checked: '✓ l’inégalité est vérifiée', fails: 'aucune décroissance garantie (γ > 2/L)',
    },
  });

  const out = (root, key, text) => root.querySelectorAll(`[data-out="${key}"]`).forEach(el => { el.textContent = text; });
  const input = (root, key) => root.querySelector(`[data-input="${key}"]`);
  const num = v => fmt(v, 4).replace(/^-/, '−');

  // ---- Gradient descent on a parabola ----

  Lab.figure('.opt-fig-gd1d', root => {
    const a = Number(root.dataset.a || 4), theta0 = 1, T_MAX = 20;
    const canvases = root.querySelectorAll('canvas');
    let t = 0;
    const gammaInput = input(root, 'gamma');
    const iterate = (k, gamma) => theta0 * (1 - gamma * a) ** k;
    const anim = Lab.animate(root, (() => {
      let last = 0;
      return () => {
        const now = performance.now();
        if (now - last > 450) {
          last = now;
          t += 1;
          draw();
        }
        return t < T_MAX;
      };
    })(), playing => { root.querySelector('[data-action="play"]').textContent = playing ? '❚❚' : '▶'; });
    root.addEventListener('click', event => {
      const action = event.target.closest('[data-action]');
      if (!action) return;
      if (action.dataset.action === 'play') {
        if (t >= T_MAX) t = 0;
        anim.toggle();
      }
      if (action.dataset.action === 'step') {
        anim.pause();
        t = Math.min(T_MAX, t + 1);
      }
      if (action.dataset.action === 'reset') {
        anim.pause();
        t = 0;
      }
      draw();
    });
    gammaInput.addEventListener('input', () => { t = 0; draw(); });

    function draw() {
      const C = Lab.colours(), gamma = Number(gammaInput.value);
      out(root, 'gamma', gamma.toFixed(2));
      out(root, 'ga', (gamma * a).toFixed(2));
      out(root, 'factor', (1 - gamma * a).toFixed(2).replace(/^-/, '−'));
      out(root, 't', t);
      out(root, 'theta', num(iterate(t, gamma)));
      const rows = Array.from({ length: 6 }, (_, k) => k);
      const table = root.querySelector('[data-out="table"]');
      if (table) table.innerHTML = `<tr><th>t</th>${rows.map(k => `<td>${k}</td>`).join('')}</tr><tr><th>θ_t</th>${rows.map(k => `<td>${num(iterate(k, gamma))}</td>`).join('')}</tr>`;

      // Left: the parabola and the iterates on it.
      {
        const { ctx, width, height } = Lab.fit(canvases[0], 240);
        const box = { left: 34, top: 12, width: width - 44, height: height - 40 };
        const map = Lab.axes(ctx, box, { x: [-1.6, 1.6], y: [0, 5.2], xTicks: [-1.5, -1, -0.5, 0, 0.5, 1, 1.5], yTicks: [0, 1, 2, 3, 4, 5], xLabel: T.theta });
        Lab.clip(ctx, box);
        Lab.curve(ctx, map, x => a / 2 * x * x, -1.6, 1.6, { color: C.ink, width: 2.2 });
        for (let k = 1; k <= t; k++) {
          const p = iterate(k - 1, gamma), q = iterate(k, gamma);
          Lab.arrow(ctx, map.X(p), map.Y(a / 2 * p * p), map.X(q), map.Y(a / 2 * q * q), { color: C.neg, width: 1.3, alpha: 0.75, head: 6 });
        }
        for (let k = 0; k <= t; k++) {
          const p = iterate(k, gamma);
          Lab.dot(ctx, map.X(p), map.Y(a / 2 * p * p), k === t ? 5 : 3, k === t ? C.pos : C.neg, C.paper);
        }
        ctx.restore();
      }
      // Right: θ_t against t.
      {
        const { ctx, width, height } = Lab.fit(canvases[1], 240);
        const box = { left: 34, top: 12, width: width - 44, height: height - 40 };
        const map = Lab.axes(ctx, box, { x: [0, T_MAX], y: [-1.6, 1.6], xTicks: [0, 5, 10, 15, 20], yTicks: [-1.5, -1, -0.5, 0, 0.5, 1, 1.5], xLabel: T.step + ' t', zeroY: true });
        Lab.clip(ctx, box);
        for (let k = 0; k <= t; k++) {
          const v = iterate(k, gamma), y = Math.max(-1.7, Math.min(1.7, v));
          Lab.polyline(ctx, [[map.X(k), map.Y(0)], [map.X(k), map.Y(y)]], { color: C.neg, width: 1.4, alpha: 0.7 });
          Lab.dot(ctx, map.X(k), map.Y(y), 3.5, Math.abs(v) > 1.6 ? C.muted : C.pos);
        }
        ctx.restore();
      }
    }
    return draw;
  });

  // ---- The descent lemma ----

  Lab.figure('.opt-fig-descent', root => {
    // F(θ) = θ²/4 + sin(2θ)/2, F''(θ) = 1/2 − 2 sin(2θ) ∈ [−3/2, 5/2]: F is L-smooth with L = 5/2.
    const L = 2.5;
    const F = x => x * x / 4 + Math.sin(2 * x) / 2, dF = x => x / 2 + Math.cos(2 * x);
    const canvas = root.querySelector('canvas');
    ['theta', 'gamma'].forEach(k => input(root, k).addEventListener('input', () => draw()));
    root.querySelectorAll('[data-gamma]').forEach(b => b.addEventListener('click', () => {
      input(root, 'gamma').value = Number(b.dataset.gamma) / L;
      draw();
    }));

    function draw() {
      const C = Lab.colours();
      const x = Number(input(root, 'theta').value), gamma = Number(input(root, 'gamma').value);
      const g = dF(x), xPlus = x - gamma * g, bound = F(x) - gamma * (1 - L * gamma / 2) * g * g;
      out(root, 'theta', x.toFixed(2).replace(/^-/, '−'));
      out(root, 'gamma', gamma.toFixed(3));
      out(root, 'gl', (gamma * L).toFixed(2));
      out(root, 'f', num(F(x)));
      out(root, 'df', num(g));
      out(root, 'fplus', num(F(xPlus)));
      out(root, 'bound', num(bound));
      out(root, 'verdict', gamma * L > 2 ? T.fails : F(xPlus) <= bound + 1e-12 ? T.checked : '');

      const { ctx, width, height } = Lab.fit(canvas, 300);
      const box = { left: 34, top: 12, width: width - 44, height: height - 40 };
      const map = Lab.axes(ctx, box, { x: [-3.5, 3.5], y: [-1.5, 4], xTicks: [-3, -2, -1, 0, 1, 2, 3], yTicks: [-1, 0, 1, 2, 3, 4], xLabel: T.theta, zeroY: true });
      Lab.clip(ctx, box);
      Lab.curve(ctx, map, y => F(x) + g * (y - x) - L / 2 * (y - x) ** 2, -3.5, 3.5, { color: C.pos, width: 1.4, dash: [5, 4], alpha: 0.7 });
      Lab.curve(ctx, map, y => F(x) + g * (y - x) + L / 2 * (y - x) ** 2, -3.5, 3.5, { color: C.pos, width: 2 });
      Lab.curve(ctx, map, y => F(x) + g * (y - x), -3.5, 3.5, { color: C.muted, width: 1.2, dash: [2, 3] });
      Lab.curve(ctx, map, F, -3.5, 3.5, { color: C.ink, width: 2.4 });
      // The step, along the θ axis, then the two values.
      Lab.arrow(ctx, map.X(x), map.Y(F(x)), map.X(xPlus), map.Y(F(x)), { color: C.neg, width: 1.6, head: 7 });
      Lab.polyline(ctx, [[map.X(xPlus), map.Y(F(x))], [map.X(xPlus), map.Y(F(xPlus))]], { color: C.neg, width: 1, dash: [3, 3] });
      Lab.dot(ctx, map.X(xPlus), map.Y(bound), 4, C.pos, C.paper);
      Lab.dot(ctx, map.X(x), map.Y(F(x)), 5, C.ink, C.paper);
      Lab.dot(ctx, map.X(xPlus), map.Y(F(xPlus)), 5, C.neg, C.paper);
      ctx.restore();
    }
    return draw;
  });

  // ---- Mini-batch gradients ----

  Lab.figure('.opt-fig-cloud', root => {
    if (!window.OPT) return null;
    const ls = OPT.landscape('leastSquares', { centred: true });
    const BATCHES = [1, 2, 5, 10, 20, 50, 100], DRAWS = 300;
    const POINTS = { far: [ls.thetaStar[0] - 1.5, ls.thetaStar[1] + 1.5], near: [ls.thetaStar[0] - 0.3, ls.thetaStar[1] + 0.3], star: ls.thetaStar.slice() };
    let where = 'far', seed = 1;
    const canvas = root.querySelector('canvas');
    Lab.bindPills(root, 'point', v => { where = v; draw(); });
    input(root, 'batch').addEventListener('input', () => draw());
    input(root, 'replace').addEventListener('change', () => draw());
    root.querySelector('[data-action="resample"]').addEventListener('click', () => { seed += 1; draw(); });

    function draw() {
      const C = Lab.colours(), theta = POINTS[where], n = ls.n;
      const b = BATCHES[Number(input(root, 'batch').value)], replace = input(root, 'replace').checked;
      const g = ls.grad(theta), per = Array.from({ length: n }, (_, i) => ls.sample(theta, i));
      const sigma2 = per.reduce((s, q) => s + (q[0] - g[0]) ** 2 + (q[1] - g[1]) ** 2, 0) / n;
      const rand = Lab.random(seed * 7919 + b), draws = [];
      for (let k = 0; k < DRAWS; k++) {
        let s0 = 0, s1 = 0;
        if (replace) {
          for (let j = 0; j < b; j++) { const q = per[Math.floor(rand() * n)]; s0 += q[0]; s1 += q[1]; }
        } else {
          const idx = Array.from({ length: n }, (_, i) => i);
          for (let j = 0; j < b; j++) {
            const r = j + Math.floor(rand() * (n - j));
            [idx[j], idx[r]] = [idx[r], idx[j]];
            s0 += per[idx[j]][0]; s1 += per[idx[j]][1];
          }
        }
        draws.push([s0 / b, s1 / b]);
      }
      const mean = draws.reduce((s, q) => [s[0] + q[0] / DRAWS, s[1] + q[1] / DRAWS], [0, 0]);
      const variance = draws.reduce((s, q) => s + (q[0] - g[0]) ** 2 + (q[1] - g[1]) ** 2, 0) / DRAWS;
      const theory = replace ? sigma2 / b : sigma2 / b * (n - b) / (n - 1);
      out(root, 'b', b);
      out(root, 'grad', `(${g.map(num).join(' ; ')})`);
      out(root, 'mean', `(${mean.map(num).join(' ; ')})`);
      out(root, 'sigma2', num(sigma2));
      out(root, 'variance', num(variance));
      out(root, 'theory', num(theory));

      const { ctx, width, height } = Lab.fit(canvas, 320);
      const side = Math.min(width - 50, height - 40);
      const box = { left: 40 + (width - 50 - side) / 2, top: 10, width: side, height: side - 10 };
      const half = Math.max(Math.hypot(...g) / 2 + 2.6 * Math.sqrt(sigma2), 0.8), c = [g[0] / 2, g[1] / 2];
      const map = Lab.axes(ctx, box, { x: [c[0] - half, c[0] + half], y: [c[1] - half * box.height / box.width, c[1] + half * box.height / box.width], zeroX: true, zeroY: true, xLabel: T.gradientSpace });
      Lab.clip(ctx, box);
      for (const q of draws) Lab.dot(ctx, map.X(q[0]), map.Y(q[1]), 2.2, Lab.mix(C.paper, C.pos, 0.55));
      // The circle of radius √(theoretical variance) around ∇F.
      ctx.beginPath();
      ctx.arc(map.X(g[0]), map.Y(g[1]), Math.sqrt(theory) * box.width / (2 * half), 0, 2 * Math.PI);
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba(C.neg);
      ctx.stroke();
      ctx.setLineDash([]);
      Lab.arrow(ctx, map.X(0), map.Y(0), map.X(g[0]), map.Y(g[1]), { color: C.ink, width: 2, head: 8 });
      Lab.dot(ctx, map.X(mean[0]), map.Y(mean[1]), 4.5, C.neg, C.paper);
      ctx.restore();
    }
    return draw;
  });

  // ---- The noise floor, on 500 runs ----

  Lab.figure('.opt-fig-floor', root => {
    const M = 500, THETA0 = 3, T_MAX = 10000, TAU = 20;
    const canvases = root.querySelectorAll('canvas');
    let theta, t, rand, history, exact, schedule = 'constant';
    Lab.bindPills(root, 'schedule', v => { schedule = v; reset(); draw(); });
    ['gamma', 'sigma'].forEach(k => input(root, k).addEventListener('input', () => { reset(); draw(); }));
    const gamma0 = () => Number(input(root, 'gamma').value), sigma = () => Number(input(root, 'sigma').value);
    // Step of iteration k + 1: constant, γ/(1 + k/τ), or 1/(k + 1), with which
    // θ_t is exactly the mean of the t noisy targets (exercise 3.3).
    const stepAt = k => (schedule === 'constant' ? gamma0() : schedule === 'mean' ? 1 / (k + 1) : gamma0() / (1 + k / TAU));

    // θ_t = θ_{t−1} − γ_t (θ_{t−1} + σ ξ_t) for M independent runs; the exact
    // mean m_t and variance v_t follow m_t = (1 − γ_t) m_{t−1} and
    // v_t = (1 − γ_t)² v_{t−1} + γ_t² σ².
    function reset() {
      theta = new Float64Array(M).fill(THETA0);
      t = 0;
      rand = Lab.random(17);
      history = [{ t: 0, mean: THETA0 * THETA0 / 2 }];
      exact = [{ t: 0, m: THETA0, v: 0 }];
    }
    function advance(count) {
      for (let s = 0; s < count && t < T_MAX; s++) {
        const gamma = stepAt(t), sd = sigma();
        let total = 0;
        for (let i = 0; i < M; i++) {
          theta[i] -= gamma * (theta[i] + sd * rand.normal());
          total += theta[i] * theta[i] / 2;
        }
        const e = exact[exact.length - 1];
        t += 1;
        exact.push({ t, m: (1 - gamma) * e.m, v: (1 - gamma) ** 2 * e.v + gamma * gamma * sd * sd });
        history.push({ t, mean: total / M });
      }
    }
    const anim = Lab.animate(root, () => {
      advance(Math.max(1, Math.floor(t / 25)));
      draw();
      return t < T_MAX;
    }, playing => { root.querySelector('[data-action="play"]').textContent = playing ? '❚❚' : '▶'; });
    root.addEventListener('click', event => {
      const action = event.target.closest('[data-action]');
      if (!action) return;
      if (action.dataset.action === 'play') {
        if (t >= T_MAX) reset();
        anim.toggle();
      }
      if (action.dataset.action === 'reset') {
        anim.pause();
        reset();
        draw();
      }
    });
    reset();

    function draw() {
      const C = Lab.colours(), g = gamma0(), sd = sigma(), e = exact[exact.length - 1];
      const floor = schedule === 'constant' && g < 2 ? g * sd * sd / (2 * (2 - g)) : null;
      out(root, 'formula', schedule === 'constant' ? `γσ²/(2(2 − γ)) = ${floor === null ? '∞' : num(floor)}` : schedule === 'mean' ? `σ²/(2t) = ${num(sd * sd / (2 * Math.max(t, 1)))}` : '→ 0');
      out(root, 'gamma', g.toFixed(2));
      out(root, 'sigma', sd.toFixed(1));
      out(root, 't', t);
      out(root, 'empirical', num(history[history.length - 1].mean));
      out(root, 'exact', num((e.m * e.m + e.v) / 2));
      out(root, 'gammaT', num(stepAt(Math.max(0, t - 1))));
      // The bias and the variance of θ_t over the runs, against the exact m_t and v_t.
      let sum = 0, squares = 0;
      for (let i = 0; i < M; i++) {
        sum += theta[i];
        squares += theta[i] * theta[i];
      }
      const runMean = sum / M;
      out(root, 'biasEmp', num(runMean));
      out(root, 'biasExact', num(e.m));
      out(root, 'varEmp', num(Math.max(squares / M - runMean * runMean, 0)));
      out(root, 'varExact', num(e.v));

      // Left: histogram of θ_t over the runs, and the density of N(m_t, v_t).
      {
        const { ctx, width, height } = Lab.fit(canvases[0], 250);
        const box = { left: 30, top: 18, width: width - 40, height: height - 46 };
        const lo = -4, hi = 4, bins = 48, counts = new Array(bins).fill(0);
        for (let i = 0; i < M; i++) {
          const k = Math.floor((theta[i] - lo) / (hi - lo) * bins);
          if (k >= 0 && k < bins) counts[k] += 1;
        }
        const w = (hi - lo) / bins, density = counts.map(c => c / (M * w));
        const sdv = Math.sqrt(Math.max(e.v, 1e-12));
        const peak = Math.max(1.2 * Math.max(...density), e.v > 1e-6 ? 1.15 / (sdv * Math.sqrt(2 * Math.PI)) : 1, 0.2);
        const map = Lab.axes(ctx, box, { x: [lo, hi], y: [0, peak], xTicks: [-4, -2, 0, 2, 4], yTicks: [], xLabel: 'θ_t' });
        ctx.fillStyle = rgba(C.muted);
        ctx.font = `11px ${Lab.font()}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(T.density, box.left, 10);
        Lab.clip(ctx, box);
        density.forEach((d, k) => {
          ctx.fillStyle = rgba(C.pos, 0.45);
          ctx.fillRect(map.X(lo + k * w) + 0.5, map.Y(d), map.X(lo + (k + 1) * w) - map.X(lo + k * w) - 1, map.Y(0) - map.Y(d));
        });
        if (e.v > 1e-8) Lab.curve(ctx, map, x => Math.exp(-((x - e.m) ** 2) / (2 * e.v)) / (sdv * Math.sqrt(2 * Math.PI)), lo, hi, { color: C.neg, width: 2, dash: [6, 4] });
        else Lab.polyline(ctx, [[map.X(e.m), map.Y(0)], [map.X(e.m), map.Y(peak)]], { color: C.neg, width: 2 });
        // θ*, the bias (an arrow from θ* to E[θ_t]) and one standard deviation around E[θ_t].
        Lab.polyline(ctx, [[map.X(0), map.Y(0)], [map.X(0), map.Y(peak)]], { color: C.muted, width: 1, dash: [3, 3] });
        const yBias = box.top + 18, ySpread = box.top + 36, centre = Math.max(lo, Math.min(hi, e.m));
        ctx.font = `11px ${Lab.font()}`;
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = rgba(C.muted);
        ctx.textAlign = 'right';
        ctx.fillText('θ*', map.X(0) - 4, box.top + 13);
        if (Math.abs(map.X(centre) - map.X(0)) > 6) {
          Lab.arrow(ctx, map.X(0), yBias, map.X(centre), yBias, { color: C.third, width: 2, head: 7 });
          ctx.fillStyle = rgba(C.third);
          ctx.textAlign = 'center';
          ctx.fillText(T.bias, (map.X(0) + map.X(centre)) / 2, yBias - 3);
        }
        if (sdv > 1e-3) {
          const a = map.X(centre - sdv), b = map.X(centre + sdv);
          Lab.polyline(ctx, [[a, ySpread], [b, ySpread]], { color: C.ink, width: 2 });
          Lab.polyline(ctx, [[a, ySpread - 4], [a, ySpread + 4]], { color: C.ink, width: 2 });
          Lab.polyline(ctx, [[b, ySpread - 4], [b, ySpread + 4]], { color: C.ink, width: 2 });
          ctx.fillStyle = rgba(C.ink);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(T.spread, b + 5, ySpread);
        }
        ctx.restore();
      }
      // Right: E[F(θ_t)], mean of the runs and exact value, log-log, with the floor.
      {
        const { ctx, width, height } = Lab.fit(canvases[1], 250);
        const box = { left: 40, top: 18, width: width - 50, height: height - 46 };
        const map = Lab.axes(ctx, box, { x: [0, 4], y: [-5, 1], logX: true, logY: true, xTicks: [0, 1, 2, 3, 4], yTicks: [1, 0, -1, -2, -3, -4, -5], xLabel: T.time });
        ctx.fillStyle = rgba(C.muted);
        ctx.font = `11px ${Lab.font()}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(T.expected, box.left, 10);
        Lab.clip(ctx, box);
        const P = (k, v) => [map.X(Math.log10(Math.max(k, 1))), map.Y(Math.log10(Math.max(v, 1e-6)))];
        if (floor) Lab.polyline(ctx, [P(1, floor), P(1e4, floor)], { color: C.muted, width: 1.4, dash: [2, 4] });
        // The two terms of the exact value: ½ bias² (cut once it is out of the
        // frame, it is exactly 0 for the step 1/t) and ½ variance.
        Lab.polyline(ctx, exact.filter(h => h.t >= 1 && h.m * h.m / 2 > 1e-7).map(h => P(h.t, h.m * h.m / 2)), { color: C.third, width: 1.6 });
        Lab.polyline(ctx, exact.filter(h => h.t >= 1).map(h => P(h.t, h.v / 2)), { color: C.ink, width: 1.6 });
        Lab.polyline(ctx, history.filter(h => h.t >= 1).map(h => P(h.t, h.mean)), { color: C.pos, width: 2 });
        Lab.polyline(ctx, exact.filter(h => h.t >= 1).map(h => P(h.t, (h.m * h.m + h.v) / 2)), { color: C.neg, width: 2, dash: [6, 4] });
        ctx.restore();
      }
    }
    return draw;
  });

  // ---- The step as a bias-variance trade-off, at a fixed horizon ----

  Lab.figure('.opt-fig-tradeoff', root => {
    const SIGMA = 1, canvas = root.querySelector('canvas');
    ['horizon', 'gamma', 'distance'].forEach(k => input(root, k).addEventListener('input', () => draw()));
    // The mean example after t steps of size γ, from |θ_0 − θ*| = D (exercises 3.3 and 3.4):
    // ½ bias² = ½ D² (1 − γ)^{2t} and ½ variance = ½ γσ²/(2 − γ) (1 − (1 − γ)^{2t}).
    const terms = (g, t, D) => {
      const q = (1 - g) ** (2 * t);
      return { bias2: D * D * q / 2, variance: g * SIGMA * SIGMA / (2 - g) * (1 - q) / 2 };
    };
    const total = s => s.bias2 + s.variance;
    const short = v => String(Number(v.toPrecision(3)));

    function draw() {
      const C = Lab.colours();
      const t = Math.round(10 ** Number(input(root, 'horizon').value));
      const g = 10 ** Number(input(root, 'gamma').value), D = Number(input(root, 'distance').value);
      // The best constant step, on a grid of 4001 values of log10 γ in [−4, 0].
      let best = { g: 1, e: Infinity };
      for (let k = 0; k <= 4000; k++) {
        const gk = 10 ** (-4 + k / 1000), e = total(terms(gk, t, D));
        if (e < best.e) best = { g: gk, e };
      }
      const here = terms(g, t, D), mean = SIGMA * SIGMA / (2 * t);
      out(root, 't', t);
      out(root, 'gamma', short(g));
      out(root, 'distance', short(D));
      out(root, 'bias2', num(here.bias2));
      out(root, 'variance', num(here.variance));
      out(root, 'error', num(total(here)));
      out(root, 'best', short(best.g));
      out(root, 'bestError', num(best.e));
      out(root, 'mean', num(mean));
      out(root, 'ratio', fmt(best.e / mean, 2));

      const { ctx, width, height } = Lab.fit(canvas, 260);
      const box = { left: 44, top: 20, width: width - 56, height: height - 50 };
      const map = Lab.axes(ctx, box, { x: [-4, 0], y: [-6, 2], logX: true, logY: true, xTicks: [-4, -3, -2, -1, 0], yTicks: [2, 0, -2, -4, -6], xLabel: T.stepAxis });
      ctx.fillStyle = rgba(C.muted);
      ctx.font = `11px ${Lab.font()}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(T.tradeoff, box.left, 12);
      Lab.clip(ctx, box);
      const P = (lg, v) => [map.X(lg), map.Y(Math.log10(Math.max(v, 1e-9)))];
      const curve = (f, style) => Lab.polyline(ctx, Array.from({ length: 401 }, (_, k) => P(-4 + k / 100, f(10 ** (-4 + k / 100)))), style);
      Lab.polyline(ctx, [P(-4, mean), P(0, mean)], { color: C.neg, width: 1.6, dash: [6, 4] });
      // The sum first, wide and light, so that each term stays visible where it dominates.
      curve(x => total(terms(x, t, D)), { color: C.pos, width: 5, alpha: 0.45 });
      curve(x => terms(x, t, D).bias2, { color: C.third, width: 1.8 });
      curve(x => terms(x, t, D).variance, { color: C.ink, width: 1.8 });
      const lg = Math.log10(g);
      Lab.polyline(ctx, [[map.X(lg), box.top], [map.X(lg), box.top + box.height]], { color: C.muted, width: 1, dash: [3, 3] });
      Lab.dot(ctx, ...P(lg, here.bias2), 4, C.third, C.paper);
      Lab.dot(ctx, ...P(lg, here.variance), 4, C.ink, C.paper);
      Lab.dot(ctx, ...P(lg, total(here)), 4.5, C.pos, C.paper);
      Lab.dot(ctx, ...P(Math.log10(best.g), best.e), 6, C.pos, C.paper);
      ctx.restore();
    }
    return draw;
  });

  // ---- Momentum: the weights of the past gradients ----

  Lab.figure('.opt-fig-weights', root => {
    const K = 60, canvas = root.querySelector('canvas');
    input(root, 'beta').addEventListener('input', () => draw());
    function draw() {
      const C = Lab.colours(), beta = Number(input(root, 'beta').value);
      const horizon = beta < 1 ? 1 / (1 - beta) : Infinity;
      out(root, 'beta', beta.toFixed(2));
      out(root, 'sum', fmt(horizon, 1));
      // Share of the total weight carried by the last ⌈1/(1 − β)⌉ gradients: 1 − β^⌈1/(1−β)⌉.
      out(root, 'share', `${Math.round(100 * (1 - beta ** Math.ceil(horizon)))} %`);
      const { ctx, width, height } = Lab.fit(canvas, 200);
      const box = { left: 34, top: 12, width: width - 44, height: height - 40 };
      const map = Lab.axes(ctx, box, { x: [-0.5, K - 0.5], y: [0, 1.05], xTicks: [0, 10, 20, 30, 40, 50], yTicks: [0, 0.5, 1], xLabel: T.age });
      const bar = box.width / K * 0.7;
      for (let k = 0; k < K; k++) {
        const w = beta ** k;
        ctx.fillStyle = rgba(k < Math.ceil(horizon) ? C.pos : C.faint, 0.85);
        ctx.fillRect(map.X(k) - bar / 2, map.Y(w), bar, map.Y(0) - map.Y(w));
      }
      if (Number.isFinite(horizon) && horizon < K) Lab.polyline(ctx, [[map.X(horizon - 0.5), box.top], [map.X(horizon - 0.5), box.top + box.height]], { color: C.neg, width: 1.4, dash: [4, 3] });
    }
    return draw;
  });

  // ---- Adam: the bias of the moving averages ----

  Lab.figure('.opt-fig-adam-bias', root => {
    const B1 = [0, 0.5, 0.9, 0.99], B2 = [0.9, 0.99, 0.999, 0.9999], canvas = root.querySelector('canvas');
    ['beta1', 'beta2'].forEach(k => input(root, k).addEventListener('input', () => draw()));
    function draw() {
      const C = Lab.colours(), b1 = B1[Number(input(root, 'beta1').value)], b2 = B2[Number(input(root, 'beta2').value)];
      const ratio = t => (1 - b1 ** t) / Math.sqrt(1 - b2 ** t);
      out(root, 'beta1', b1);
      out(root, 'beta2', b2);
      out(root, 'r1', ratio(1).toFixed(2));
      out(root, 'r10', ratio(10).toFixed(2));
      out(root, 'r100', ratio(100).toFixed(2));
      const { ctx, width, height } = Lab.fit(canvas, 220);
      const box = { left: 34, top: 12, width: width - 44, height: height - 40 };
      const hi = Math.max(4, Math.ceil(ratio(1)) + 1);
      const map = Lab.axes(ctx, box, { x: [0, 4], y: [0, hi], logX: true, xTicks: [0, 1, 2, 3, 4], xLabel: `${T.iterations} (log)` });
      Lab.clip(ctx, box);
      Lab.polyline(ctx, [[map.X(0), map.Y(1)], [map.X(4), map.Y(1)]], { color: C.muted, width: 1.2, dash: [4, 3] });
      const pts = [];
      for (let i = 0; i <= 400; i++) {
        const lt = 4 * i / 400, t = Math.max(1, Math.round(10 ** lt));
        pts.push([map.X(Math.log10(t)), map.Y(Math.min(hi, ratio(t)))]);
      }
      Lab.polyline(ctx, pts, { color: C.neg, width: 2.2 });
      ctx.restore();
    }
    return draw;
  });

  // ---- Step-size schedules ----

  Lab.figure('.opt-fig-schedules', root => {
    const N = 1000, canvas = root.querySelector('canvas');
    input(root, 'warmup').addEventListener('input', () => draw());
    function draw() {
      const C = Lab.colours(), W = Math.round(Number(input(root, 'warmup').value) * N);
      out(root, 'warmup', W);
      const curves = [
        { f: () => 1, color: C.muted, dash: [2, 3] },
        { f: t => (t < N / 2 ? 1 : t < 3 * N / 4 ? 0.1 : 0.01), color: C.third },
        { f: t => 1 / Math.sqrt(1 + t / 20), color: C.neg },
        { f: t => (1 + Math.cos(Math.PI * t / N)) / 2, color: C.pos },
        { f: t => (t < W ? t / W : (1 + Math.cos(Math.PI * (t - W) / (N - W))) / 2), color: C.ink, dash: [6, 4] },
      ];
      const { ctx, width, height } = Lab.fit(canvas, 220);
      const box = { left: 34, top: 12, width: width - 44, height: height - 40 };
      const map = Lab.axes(ctx, box, { x: [0, N], y: [0, 1.05], yTicks: [0, 0.25, 0.5, 0.75, 1], xLabel: T.iterations, yLabel: T.fraction });
      Lab.clip(ctx, box);
      for (const c of curves) Lab.curve(ctx, map, c.f, 0, N, { color: c.color, width: 2, dash: c.dash }, N);
      ctx.restore();
    }
    return draw;
  });
})();
