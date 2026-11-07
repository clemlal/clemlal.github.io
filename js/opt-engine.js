// Engine of the optimization playground (js/opt-playground.js): objective
// functions of two parameters θ = (θ₁, θ₂), their exact and stochastic
// gradients, and the algorithms (gradient descent, momentum, Adam), written by
// hand without any library. Nothing here touches the page. Exposed as
// window.OPT; needs Lab.random (js/lab-kit.js, loaded before this file).
//
// A landscape is built by OPT.landscape(id, options) and has
//   f(θ), grad(θ) → [g₁, g₂]          the objective F and its gradient
//   stochastic(θ, rand, batch) → g    an unbiased estimate of grad(θ):
//                                     a mini-batch gradient on data landscapes,
//                                     grad(θ) + σ ξ with ξ ~ N(0, I₂) otherwise
//   n                                 number of data points (null: no data)
//   thetaStar, fStar                  the global minimizer and the minimum
//   L, mu                             smoothness and strong convexity constants
//                                     (largest and smallest eigenvalues of the
//                                     Hessian; at θ* when it is not constant;
//                                     null when meaningless)
//   view                              { x: [a, b], y: [c, d] }, the square shown
//   start                             the default starting point
//
// A run is created by OPT.run(landscape, config, seed), with config
//   rule        'gd' | 'momentum' | 'adam'
//   lr          the step γ (γ₀ of the schedule)
//   schedule    'constant' | 'sqrt' | 'inv': γ_t = γ, γ / √(1 + t/τ), γ / (1 + t/τ)
//   tau         τ of the schedule, in iterations (default 50)
//   stochastic  false: exact gradients; true: OPT.stochastic estimates
//   batch       mini-batch size on data landscapes
//   sigma       noise level σ on the other landscapes
//   beta        momentum β (heavy ball: m ← β m + g, θ ← θ − γ m)
//   beta1, beta2, delta   Adam's constants (0.9, 0.999, 10⁻⁸ by default)
//   start       starting point θ₀
// and run.step() makes one iteration. A run keeps its path (the iterates), its
// averaged path θ̄_t = (θ₁ + … + θ_t)/t, and a trace of F(θ_t) − F*, which
// js/opt-playground.js plots. run.done() tells when there is nothing left to
// see: diverged, or exact gradients at a critical point (‖∇F‖ < 10⁻¹⁰ or
// F − F* < 10⁻¹⁵).
//
// OPT.tick(runs, byCost) advances several runs together: one step each, or,
// with byCost on data, steps that keep them at the same number of passes
// over the data (equal computation), so that GD makes one step while SGD with
// batches of b makes n/b of them. Every random draw comes from a seeded
// generator, so that a guided experiment always gives the run described in
// its text.

(function () {
  const random = window.Lab.random;

  // ---- Landscapes ----

  // Eigenvalues of a symmetric 2 × 2 matrix [[a, b], [b, c]].
  function eigen2(a, b, c) {
    const m = (a + c) / 2, r = Math.sqrt(((a - c) / 2) ** 2 + b * b);
    return [m + r, m - r];
  }

  // F(θ) = ½ θᵀ A θ with A = R diag(μ, L) Rᵀ, L = 1, μ = 1/κ and R the
  // rotation of angle (in degrees): an ellipse κ times longer than wide.
  function quadratic({ kappa = 10, angle = 0, sigma = 1 } = {}) {
    const L = 1, mu = 1 / kappa, a = angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const A11 = mu * c * c + L * s * s, A12 = (mu - L) * c * s, A22 = mu * s * s + L * c * c;
    const grad = t => [A11 * t[0] + A12 * t[1], A12 * t[0] + A22 * t[1]];
    return {
      f: t => 0.5 * (A11 * t[0] * t[0] + 2 * A12 * t[0] * t[1] + A22 * t[1] * t[1]),
      grad, noise: sigma, n: null, thetaStar: [0, 0], fStar: 0, L, mu, convex: true,
      view: { x: [-5, 5], y: [-5, 5] }, start: angle ? [-4.2, -0.6] : [-4.5, 3],
    };
  }

  // Rosenbrock's valley, F(θ) = (1 − θ₁)² + 10 (θ₂ − θ₁²)², minimum 0 at (1, 1).
  function rosenbrock({ sigma = 1 } = {}) {
    const B = 10;
    const H = eigen2(2 + 8 * B, -4 * B, 2 * B);  // the Hessian at (1, 1)
    return {
      f: t => (1 - t[0]) ** 2 + B * (t[1] - t[0] * t[0]) ** 2,
      grad: t => [-2 * (1 - t[0]) - 4 * B * t[0] * (t[1] - t[0] * t[0]), 2 * B * (t[1] - t[0] * t[0])],
      noise: sigma, n: null, thetaStar: [1, 1], fStar: 0, L: H[0], mu: H[1], local: true, convex: false,
      view: { x: [-2, 2], y: [-1, 3] }, start: [-1.6, 2.6],
    };
  }

  // Two wells: F(θ) = (θ₁² − 1)² + 0.3 θ₁ + θ₂², a global minimum near
  // (−1.04, 0), a local one near (0.96, 0) and a saddle point between them.
  function wells({ sigma = 1 } = {}) {
    const f = t => (t[0] * t[0] - 1) ** 2 + 0.3 * t[0] + t[1] * t[1];
    const grad = t => [4 * t[0] * (t[0] * t[0] - 1) + 0.3, 2 * t[1]];
    // The critical points on θ₂ = 0, by Newton's method on 4x(x² − 1) + 0.3 = 0.
    const root = x => {
      for (let k = 0; k < 60; k++) x -= (4 * x * (x * x - 1) + 0.3) / (12 * x * x - 4);
      return x;
    };
    const xs = [root(-1.1), root(0.1), root(1.1)];
    return {
      f, grad, noise: sigma, n: null, thetaStar: [xs[0], 0], fStar: f([xs[0], 0]),
      critical: { globalMin: [xs[0], 0], saddle: [xs[1], 0], localMin: [xs[2], 0] },
      L: null, mu: null, convex: false,
      view: { x: [-2, 2], y: [-2, 2] }, start: [0.3, 1.6],
    };
  }

  // Data of the two data landscapes: n points, seeded.
  //   regression: x_i equally spaced on [1, 5] (or [−2, 2] once centred),
  //               y_i = 1.5 x_i − 2 + 0.8 ε_i, ε_i ~ N(0, 1)
  //   logistic:   y_i = ±1 alternately, x_i ~ N(y_i, 1)
  function data(kind, n, seed, centred) {
    const rand = random(seed), X = new Float64Array(n), Y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (kind === 'regression') {
        X[i] = 1 + 4 * i / (n - 1);
        Y[i] = 1.5 * X[i] - 2 + 0.8 * rand.normal();
      } else {
        Y[i] = i % 2 === 0 ? 1 : -1;
        X[i] = Y[i] + rand.normal();
      }
    }
    if (centred) {
      const mean = X.reduce((a, b) => a + b, 0) / n;
      for (let i = 0; i < n; i++) X[i] -= mean;
    }
    return { X, Y, n };
  }

  // Least squares, F(w, b) = (1/2n) Σ (w x_i + b − y_i)²: a quadratic, with
  // Hessian [[mean x², mean x], [mean x, 1]], so that the conditioning depends
  // on whether the x_i are centred.
  function leastSquares({ n = 100, seed = 1, centred = false } = {}) {
    const d = data('regression', n, seed, centred);
    let sx = 0, sxx = 0, sy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      sx += d.X[i]; sxx += d.X[i] ** 2; sy += d.Y[i]; sxy += d.X[i] * d.Y[i];
    }
    sx /= n; sxx /= n; sy /= n; sxy /= n;
    const det = sxx - sx * sx, w = (sxy - sx * sy) / det, b = sy - w * sx;
    const f = t => {
      let s = 0;
      for (let i = 0; i < n; i++) s += (t[0] * d.X[i] + t[1] - d.Y[i]) ** 2;
      return s / (2 * n);
    };
    const grad = t => {
      let g0 = 0, g1 = 0;
      for (let i = 0; i < n; i++) {
        const r = t[0] * d.X[i] + t[1] - d.Y[i];
        g0 += r * d.X[i]; g1 += r;
      }
      return [g0 / n, g1 / n];
    };
    const sample = (t, i) => {
      const r = t[0] * d.X[i] + t[1] - d.Y[i];
      return [r * d.X[i], r];
    };
    const [L, mu] = eigen2(sxx, sx, 1);
    const centre = [w, b];
    return {
      f, grad, sample, data: d, n, thetaStar: [w, b], fStar: f([w, b]), L, mu, convex: true,
      view: { x: [centre[0] - 4, centre[0] + 4], y: [centre[1] - 4, centre[1] + 4] },
      start: [centre[0] - 3, centre[1] + 3],
    };
  }

  // Logistic regression on one feature, F(w, b) = (1/n) Σ log(1 + exp(−y_i (w x_i + b))).
  function logistic({ n = 100, seed = 1 } = {}) {
    const d = data('logistic', n, seed, false);
    const softplus = u => (u > 0 ? u + Math.log1p(Math.exp(-u)) : Math.log1p(Math.exp(u)));
    const sigmoid = u => 1 / (1 + Math.exp(-u));
    const f = t => {
      let s = 0;
      for (let i = 0; i < n; i++) s += softplus(-d.Y[i] * (t[0] * d.X[i] + t[1]));
      return s / n;
    };
    const sample = (t, i) => {
      const c = -d.Y[i] * sigmoid(-d.Y[i] * (t[0] * d.X[i] + t[1]));
      return [c * d.X[i], c];
    };
    const grad = t => {
      let g0 = 0, g1 = 0;
      for (let i = 0; i < n; i++) {
        const g = sample(t, i);
        g0 += g[0]; g1 += g[1];
      }
      return [g0 / n, g1 / n];
    };
    const hessian = t => {
      let a = 0, b = 0, c = 0;
      for (let i = 0; i < n; i++) {
        const s = sigmoid(t[0] * d.X[i] + t[1]), w = s * (1 - s);
        a += w * d.X[i] ** 2; b += w * d.X[i]; c += w;
      }
      return [a / n, b / n, c / n];
    };
    // The minimizer, by Newton's method from 0 (the data are not separable).
    let t = [0, 0];
    for (let k = 0; k < 50; k++) {
      const g = grad(t), [a, b, c] = hessian(t), det = a * c - b * b;
      t = [t[0] - (c * g[0] - b * g[1]) / det, t[1] - (a * g[1] - b * g[0]) / det];
    }
    const [L, mu] = eigen2(...hessian(t));
    return {
      f, grad, sample, data: d, n, thetaStar: t, fStar: f(t), L, mu, local: true, convex: true,
      view: { x: [t[0] - 3.5, t[0] + 3.5], y: [t[1] - 3.5, t[1] + 3.5] },
      start: [t[0] - 3, t[1] + 2.8],
    };
  }

  const LANDSCAPES = { quadratic, rosenbrock, wells, leastSquares, logistic };
  const landscape = (id, options) => LANDSCAPES[id](options || {});

  // ---- Stochastic gradients ----

  // An unbiased estimate of ∇F(θ). On data, the mean gradient of a mini-batch
  // of distinct points, drawn by going through a random permutation of the
  // data, reshuffled at every pass (as in practice; each point is in the batch
  // with probability batch/n). Elsewhere, ∇F(θ) + σ ξ.
  function sampler(ls, rand) {
    if (!ls.sample) {
      return (t, batch, sigma) => {
        const g = ls.grad(t);
        return [g[0] + sigma * rand.normal(), g[1] + sigma * rand.normal()];
      };
    }
    const n = ls.n, order = Int32Array.from({ length: n }, (_, i) => i);
    let position = n;
    return (t, batch) => {
      const size = Math.min(batch, n);
      if (position + size > n) {
        for (let i = n - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        position = 0;
      }
      let g0 = 0, g1 = 0;
      for (let k = 0; k < size; k++) {
        const g = ls.sample(t, order[position + k]);
        g0 += g[0]; g1 += g[1];
      }
      position += size;
      return [g0 / size, g1 / size];
    };
  }

  // ---- Algorithms ----

  function stepSize(config, t) {
    const tau = config.tau || 50;
    if (config.schedule === 'sqrt') return config.lr / Math.sqrt(1 + t / tau);
    if (config.schedule === 'inv') return config.lr / (1 + t / tau);
    return config.lr;
  }

  function run(ls, config, seed = 1) {
    const c = { rule: 'gd', lr: 0.1, schedule: 'constant', stochastic: false, batch: 1, sigma: ls.noise || 0, beta: 0.9, beta1: 0.9, beta2: 0.999, delta: 1e-8, ...config };
    const draw = sampler(ls, random(seed));
    const theta = (c.start || ls.start).slice();
    const m = [0, 0], v = [0, 0], sum = [0, 0];
    const r = {
      config: c, theta, t: 0, evaluations: 0, diverged: false,
      path: [theta.slice()], averaged: [theta.slice()],
      trace: [{ t: 0, epochs: 0, gap: ls.f(theta) - ls.fStar, gapAvg: ls.f(theta) - ls.fStar }],
    };
    // Gradients of single terms computed so far, in passes over the data
    // (one exact gradient costs n of them; without data, one per iteration).
    const epochs = () => (ls.n ? r.evaluations / ls.n : r.t);

    r.step = () => {
      if (r.diverged) return;
      const g = c.stochastic ? draw(theta, c.batch, c.sigma) : ls.grad(theta);
      r.evaluations += ls.n ? (c.stochastic ? Math.min(c.batch, ls.n) : ls.n) : 1;
      r.t += 1;
      const gamma = stepSize(c, r.t - 1);
      for (let k = 0; k < 2; k++) {
        if (c.rule === 'momentum') {
          m[k] = c.beta * m[k] + g[k];
          theta[k] -= gamma * m[k];
        } else if (c.rule === 'adam') {
          m[k] = c.beta1 * m[k] + (1 - c.beta1) * g[k];
          v[k] = c.beta2 * v[k] + (1 - c.beta2) * g[k] * g[k];
          const mHat = m[k] / (1 - c.beta1 ** r.t), vHat = v[k] / (1 - c.beta2 ** r.t);
          theta[k] -= gamma * mHat / (Math.sqrt(vHat) + c.delta);
        } else {
          theta[k] -= gamma * g[k];
        }
        sum[k] += theta[k];
      }
      if (!Number.isFinite(theta[0]) || !Number.isFinite(theta[1]) || Math.abs(theta[0]) + Math.abs(theta[1]) > 1e8) {
        r.diverged = true;
        return;
      }
      const avg = [sum[0] / r.t, sum[1] / r.t];
      r.path.push(theta.slice());
      r.averaged.push(avg);
      r.trace.push({ t: r.t, epochs: epochs(), gap: ls.f(theta) - ls.fStar, gapAvg: ls.f(avg) - ls.fStar });
    };
    r.gradNorm = () => Math.hypot(...ls.grad(theta));
    r.epochs = epochs;
    // Passes over the data that one step costs.
    r.cost = () => (ls.n ? (c.stochastic ? Math.min(c.batch, ls.n) : ls.n) / ls.n : 1);
    r.done = () => r.diverged || (!c.stochastic && (r.trace[r.trace.length - 1].gap < 1e-15 || r.gradNorm() < 1e-10));
    return r;
  }

  function tick(runs, byCost) {
    const live = runs.filter(r => r && !r.done());
    if (!byCost) {
      live.forEach(r => r.step());
      return;
    }
    const clock = Math.min(...live.map(r => r.epochs() + r.cost()));
    live.forEach(r => {
      while (!r.done() && r.epochs() + r.cost() <= clock + 1e-9) r.step();
    });
  }

  window.OPT = { landscape, LANDSCAPES, run, tick, stepSize, eigen2 };
})();
