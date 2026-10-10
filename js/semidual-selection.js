// Interactive demo in the July 2025 item of news_archive.html, illustrating
// "On the Private Estimation of Smooth Transport Maps" (ICML 2025) with a 1D
// version of the paper's experiment (Section 6).
//
// Brenier potentials are "Gaussian attraction/repulsion" potentials on
// [-1/2, 1/2]: f(x) = x^2/2 + ALPHA N(x | mu1, SIGMA) - ALPHA N(x | mu2, SIGMA),
// with N(x | mu, s) = exp(-(x - mu)^2 / (2 s^2)) and mu1, mu2 ~ N(0, SIGMA^2).
// One of them is the truth f0; the data are X_i uniform on [-1/2, 1/2] and
// Y_i = f0'(U_i) with fresh uniforms U_i. The candidates are N other potentials
// drawn the same way. Each candidate f is scored by the clipped semi-dual on a
// grid (Equation (30)),
//   S(f) = 1/n sum_i clip_C f(X_i) + 1/n sum_i clip_C f*(Y_i),
// where f*(y) = max over the grid of x y - f(x) and the data are snapped to the
// grid, and the estimator is the report noisy argmin (Equation (29)):
//   i = argmin_i S(f_i) + 4C/(n eps) L_i, with L_i i.i.d. standard Laplace,
// which is eps-DP; the map is the gradient of the chosen potential (finite
// differences on the grid). In 1D the maps stay close to the identity, so the
// left chart shows their displacement T(x) - x.
//
// After each change of the settings, the candidates are examined one by one:
// each gets its score and its noisy score as it appears, and the candidates
// with the smallest score and noisy score so far are followed (navy and
// orange). Since the noise of each candidate is drawn independently, the
// orange candidate at the end of the scan is exactly the noisy argmin over all
// of them: the first private draw. ROUNDS - 1 more draws of the noise then run
// on the same data; earlier choices stay as faint curves. Nothing runs while
// the demo is off screen; visitors who ask for reduced motion see the last
// round only.

(function () {
  const GRID = 201;                // points of the uniform grid on [-1/2, 1/2]
  const ALPHA = 0.005, SIGMA = 0.1, C = 0.25;  // the values of the paper
  const POOL = 1000;               // candidates drawn once; the first N are used
  const SHOWN_CANDIDATES = 80;     // candidate maps drawn on the left
  const SCAN_MS = 3000;             // to examine all the candidates, whatever N
  const ROUNDS = 8;
  const ROUND_MS = 1500;

  const root = document.querySelector('.sd-demo');
  if (!root) return;

  const mapsSvg = root.querySelector('.sd-maps');
  const scoresSvg = root.querySelector('.sd-scores');
  const readout = root.querySelector('.sd-readout');
  const sliders = {}, outputs = {};
  for (const name of ['eps', 'n', 'N']) {
    sliders[name] = root.querySelector(`input[name="${name}"]`);
    outputs[name] = root.querySelector(`output[data-for="${name}"]`);
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Potentials, maps and scores ----

  const grid = Float64Array.from({ length: GRID }, (_, i) => -0.5 + i / (GRID - 1));
  const gaussian = () => {
    let u = 0;
    while (!u) u = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
  };
  const laplace = () => {
    const u = Math.random() - 0.5;
    return -Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  };
  const bump = (x, mu) => Math.exp(-((x - mu) ** 2) / (2 * SIGMA * SIGMA));

  // A potential on the grid, its conjugate on the grid and its map.
  function newPotential() {
    const mu1 = SIGMA * gaussian(), mu2 = SIGMA * gaussian();
    const f = grid.map(x => x * x / 2 + ALPHA * bump(x, mu1) - ALPHA * bump(x, mu2));
    // f is convex, so x y - f(x) is unimodal in x and its argmax grows with y.
    const conjugate = new Float64Array(GRID);
    let best = 0;
    for (let j = 0; j < GRID; j++) {
      const y = grid[j];
      while (best + 1 < GRID && grid[best + 1] * y - f[best + 1] >= grid[best] * y - f[best]) best++;
      conjugate[j] = grid[best] * y - f[best];
    }
    // Map by finite differences (one-sided at the ends).
    const map = f.map((_, i) => {
      const lo = Math.max(0, i - 1), hi = Math.min(GRID - 1, i + 1);
      return (f[hi] - f[lo]) / (grid[hi] - grid[lo]);
    });
    return { mu1, mu2, f, conjugate, map };
  }

  const exactMap = (p, x) => x - ALPHA * (x - p.mu1) / SIGMA ** 2 * bump(x, p.mu1) + ALPHA * (x - p.mu2) / SIGMA ** 2 * bump(x, p.mu2);
  const snap = v => Math.min(GRID - 1, Math.max(0, Math.round((v + 0.5) * (GRID - 1))));
  const clip = v => Math.max(-C, Math.min(C, v));

  // ‖T - T0‖^2 in L^2 of the uniform distribution, on the grid.
  function squaredError(candidate, truth) {
    let s = 0;
    for (let g = 0; g < GRID; g++) s += (candidate.map[g] - exactMap(truth, grid[g])) ** 2 / GRID;
    return s;
  }

  // ---- Drawing ----

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function element(parent, tag, attributes, text) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
    if (text) el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  // Maps chart: x in [-1/2, 1/2] on 34..310, displacement in [-0.065, 0.065] on 200..10.
  const DISPLACEMENT = 0.065;
  const mx = x => 34 + (x + 0.5) * 276;
  const my = d => 105 - d / DISPLACEMENT * 95;
  element(mapsSvg, 'line', { x1: 34, x2: 310, y1: my(0), y2: my(0), class: 'sd-axis' });
  for (const d of [-0.05, 0.05]) {
    element(mapsSvg, 'line', { x1: 34, x2: 310, y1: my(d), y2: my(d), class: 'sd-grid' });
    element(mapsSvg, 'text', { x: 30, y: my(d) + 3, class: 'sd-label sd-label-y' }, d.toFixed(2));
  }
  element(mapsSvg, 'text', { x: 30, y: my(0) + 3, class: 'sd-label sd-label-y' }, '0');
  for (const x of [-0.5, 0, 0.5]) element(mapsSvg, 'text', { x: mx(x), y: 216, class: 'sd-label' }, String(x));
  const candidateLayer = element(mapsSvg, 'g', {});  // one polyline per examined candidate
  const ghostLayer = element(mapsSvg, 'g', {});
  const cleanPath = element(mapsSvg, 'polyline', { class: 'sd-clean' });
  const chosenPath = element(mapsSvg, 'polyline', { class: 'sd-chosen' });
  const truthPath = element(mapsSvg, 'polyline', { class: 'sd-truth' });  // on top, visible when matched

  // Scores chart: rank on 40..310, score minus the best score on 196..12.
  const scoreZero = element(scoresSvg, 'line', { x1: 40, x2: 310, class: 'sd-axis' });
  const scoreTicks = [0, 1, 2].map(() => element(scoresSvg, 'text', { x: 36, class: 'sd-label sd-label-y' }));
  element(scoresSvg, 'text', { x: 175, y: 216, class: 'sd-label' }, 'candidates, from best to worst score on the data');
  const noiseLines = element(scoresSvg, 'path', { class: 'sd-noise-line' });
  const cleanDots = element(scoresSvg, 'path', { class: 'sd-dots sd-dots-clean' });
  const noisyDots = element(scoresSvg, 'path', { class: 'sd-dots sd-dots-noisy' });
  const chosenRing = element(scoresSvg, 'circle', { r: 6, class: 'sd-ring' });

  // `values` is a typed array, whose own map() would turn these strings into numbers.
  const pointList = values => Array.from(values, (v, g) => `${mx(grid[g]).toFixed(1)},${my(v - grid[g]).toFixed(1)}`).join(' ');

  // ---- State ----

  let truth = null, pool = null;
  let state = null;                // data-dependent part
  let running = false, visible = false, last = 0;

  const settings = () => ({
    eps: Math.pow(10, Number(sliders.eps.value)),
    n: Math.round(Math.pow(10, Number(sliders.n.value)) / 100) * 100,
    N: Math.round(Math.pow(10, Number(sliders.N.value))),
  });

  function formatNumber(v) {
    if (v === 0) return '0';
    let e = Math.floor(Math.log10(Math.abs(v)));
    if (Math.abs(Number((v / 10 ** e).toFixed(1))) >= 10) e++;  // 9.96e-5 is 1.0 × 10⁻⁴
    if (e >= -2 && e <= 2) return v.toPrecision(2);
    const superscript = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const power = String(Math.abs(e)).split('').map(c => superscript[c]).join('');
    return `${(v / 10 ** e).toFixed(1)} × 10${e < 0 ? '⁻' : ''}${power}`;
  }

  // Short axis labels: 0.021, 1.0e−4.
  function formatTick(v) {
    if (v === 0) return '0';
    if (Math.abs(v) >= 0.01 && Math.abs(v) < 100) return v.toPrecision(2);
    return v.toExponential(1).replace('e-', 'e−').replace('-', '−');
  }

  function renderSettings() {
    const { eps, n, N } = settings();
    outputs.eps.textContent = `ε = ${eps >= 1 ? eps.toFixed(1) : eps.toFixed(2)}`;
    outputs.n.textContent = `n = ${n.toLocaleString('en-US')}`;
    outputs.N.textContent = `N = ${N}`;
  }

  function newProblem() {
    truth = newPotential();
    pool = Array.from({ length: POOL }, newPotential);
    pool.forEach(c => { c.error = squaredError(c, truth); });
    truthPath.setAttribute('points', pointList(grid.map(x => exactMap(truth, x))));
  }

  // Data, scores and the ranking by score, for the current n and N.
  function newData() {
    const { eps, n, N } = settings();
    const countX = new Float64Array(GRID), countY = new Float64Array(GRID);
    for (let i = 0; i < n; i++) {
      countX[snap(Math.random() - 0.5)]++;
      countY[snap(exactMap(truth, Math.random() - 0.5))]++;
    }
    const candidates = pool.slice(0, N);
    const scores = candidates.map(c => {
      let s = 0;
      for (let g = 0; g < GRID; g++) s += (countX[g] * clip(c.f[g]) + countY[g] * clip(c.conjugate[g])) / n;
      return s;
    });
    const order = candidates.map((_, i) => i).sort((i, j) => scores[i] - scores[j]);
    const best = scores[order[0]];
    const scale = 4 * C / (n * eps);
    // Vertical range: the score spread, plus room for the noise.
    const spread = scores[order[N - 1]] - best;
    const low = -Math.min(4 * scale * Math.log(N + 1), 10 * spread + 4 * scale), high = spread + 2 * scale;
    const rankOf = new Int32Array(N);
    order.forEach((i, rank) => { rankOf[i] = rank; });
    // Candidates whose map is drawn (all of them up to SHOWN_CANDIDATES).
    const shown = new Set(Array.from({ length: Math.min(SHOWN_CANDIDATES, N) }, (_, k) => Math.floor(k * N / Math.min(SHOWN_CANDIDATES, N))));
    state = {
      eps, n, N, candidates, scores, order, rankOf, shown, best, scale, low, high,
      noisy: scores.map(v => v + scale * laplace()),  // first draw, revealed during the scan
      examined: 0, bestSoFar: -1, noisyBestSoFar: -1, bestErrorSoFar: Infinity,
      dots: '', noisyDots: '', noiseLines: '', current: null,
      round: 0, time: 0, chosen: [],
    };

    candidateLayer.textContent = '';
    cleanPath.setAttribute('points', '');
    ghostLayer.textContent = '';
    chosenPath.setAttribute('points', '');

    const sy = v => 196 - (v - low) / (high - low) * 184;
    scoreZero.setAttribute('y1', sy(0));
    scoreZero.setAttribute('y2', sy(0));
    [low, 0, high].forEach((v, k) => {
      scoreTicks[k].setAttribute('y', sy(v) + 3);
      scoreTicks[k].textContent = v && Math.abs(sy(v) - sy(0)) < 14 ? '' : formatTick(v);  // no overlap with 0
    });
    cleanDots.setAttribute('d', '');
    noisyDots.setAttribute('d', '');
    noiseLines.setAttribute('d', '');
    chosenRing.style.display = 'none';
    state.sy = sy;
    renderReadout();
  }

  const rankX = rank => 40 + (state.N === 1 ? 0 : rank / (state.N - 1)) * 270;

  // Marks of candidate i on the scores chart: its noisy score (kept within the
  // chart) and the segment from its score to it.
  function noiseMarks(i, noisyScore) {
    const { scores, rankOf, best, sy, low, high } = state;
    const x = rankX(rankOf[i]).toFixed(1);
    const y = sy(Math.max(low, Math.min(high, noisyScore - best))).toFixed(1);
    return [`M${x} ${y}h0.01`, `M${x} ${sy(scores[i] - best).toFixed(1)}V${y}`];
  }

  // Shows candidate i as the private choice: its map in orange, a ring on its
  // noisy score.
  function showChoice(i, noisyScore) {
    const { candidates, rankOf, best, sy, low, high } = state;
    chosenPath.setAttribute('points', pointList(candidates[i].map));
    chosenRing.style.display = '';
    chosenRing.setAttribute('cx', rankX(rankOf[i]));
    chosenRing.setAttribute('cy', sy(Math.max(low, Math.min(high, noisyScore - best))));
  }

  // Examines the candidates up to (not including) index `count`: draws their
  // map, their score and their noisy score, and follows the smallest score
  // and noisy score so far.
  function examineUpTo(count) {
    const { candidates, scores, noisy, rankOf, shown, best, sy } = state;
    if (count <= state.examined) return;
    for (let i = state.examined; i < count; i++) {
      if (shown.has(i)) {
        if (state.current) state.current.classList.remove('sd-current');
        state.current = element(candidateLayer, 'polyline', { points: pointList(candidates[i].map), class: 'sd-candidate sd-current' });
      }
      state.dots += `M${rankX(rankOf[i]).toFixed(1)} ${sy(scores[i] - best).toFixed(1)}h0.01`;
      const [dot, line] = noiseMarks(i, noisy[i]);
      state.noisyDots += dot;
      state.noiseLines += line;
      if (state.bestSoFar < 0 || scores[i] < scores[state.bestSoFar]) state.bestSoFar = i;
      if (state.noisyBestSoFar < 0 || noisy[i] < noisy[state.noisyBestSoFar]) state.noisyBestSoFar = i;
      state.bestErrorSoFar = Math.min(state.bestErrorSoFar, candidates[i].error);
    }
    state.examined = count;
    if (count === state.N) {
      if (state.current) state.current.classList.remove('sd-current');
      state.chosen.push(state.noisyBestSoFar);  // the first private draw
      state.round = 1;
    }
    cleanDots.setAttribute('d', state.dots);
    noisyDots.setAttribute('d', state.noisyDots);
    noiseLines.setAttribute('d', state.noiseLines);
    cleanPath.setAttribute('points', pointList(candidates[state.bestSoFar].map));
    showChoice(state.noisyBestSoFar, noisy[state.noisyBestSoFar]);
    renderReadout();
  }

  // One private selection: fresh Laplace noise on the same scores.
  // A later private draw, after the scan: fresh Laplace noise on the same scores.
  function selectOnce() {
    const { candidates, scores, order, scale } = state;
    const noisy = scores.map(v => v + scale * laplace());
    let chosen = 0;
    noisy.forEach((v, i) => { if (v < noisy[chosen]) chosen = i; });
    let dots = '', lines = '';
    order.forEach(i => {
      const [dot, line] = noiseMarks(i, noisy[i]);
      dots += dot;
      lines += line;
    });
    noisyDots.setAttribute('d', dots);
    noiseLines.setAttribute('d', lines);
    const previous = state.chosen[state.chosen.length - 1];
    element(ghostLayer, 'polyline', { points: pointList(candidates[previous].map), class: 'sd-ghost' });
    state.chosen.push(chosen);
    showChoice(chosen, noisy[chosen]);
    state.round++;
    renderReadout();
  }

  function renderReadout() {
    const { candidates, scale, chosen, N, examined, rankOf } = state;
    let html = `Laplace noise scale 4C/(nε) = <strong>${formatNumber(scale)}</strong><br>`;
    if (!examined) {
      html += '<br><br>';
    } else if (examined < N) {
      html += `Examining candidate <strong>${examined}</strong> of ${N}: its score on the data, plus Laplace noise<br>` +
        `Smallest noisy score so far: its map has error <strong>${formatNumber(candidates[state.noisyBestSoFar].error)}</strong><br>`;
    } else {
      const pick = chosen[chosen.length - 1];
      html += `Draw ${state.round} of ${ROUNDS}: the private choice has rank <strong>${rankOf[pick] + 1}</strong> of ${N} by score<br>` +
        `Squared error of its map: <strong>${formatNumber(candidates[pick].error)}</strong><br>`;
    }
    if (examined) {
      const soFar = examined < N ? ' so far' : '';
      html += `Without noise${soFar}: ${formatNumber(candidates[state.bestSoFar].error)} · best candidate${soFar}: ${formatNumber(state.bestErrorSoFar)}`;
    }
    readout.innerHTML = html;
  }

  // ---- Animation ----

  function frame(now) {
    if (!visible) {
      running = false;
      return;
    }
    state.time += Math.max(0, Math.min(now - last, 50));  // no jump after a pause
    last = now;
    examineUpTo(Math.min(state.N, Math.floor(state.time * state.N / SCAN_MS) + 1));
    while (state.round >= 1 && state.round < ROUNDS && state.time >= SCAN_MS + state.round * ROUND_MS) selectOnce();
    if (state.round >= ROUNDS) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function resume() {
    if (running || !visible || state.round >= ROUNDS) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function restart() {
    newData();
    if (reduceMotion) {
      examineUpTo(state.N);
      while (state.round < ROUNDS) selectOnce();
    } else {
      resume();
    }
  }

  for (const slider of Object.values(sliders)) {
    slider.addEventListener('input', renderSettings);
    slider.addEventListener('change', restart);
  }
  root.querySelector('.sd-new').addEventListener('click', () => {
    newProblem();
    restart();
  });

  new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    resume();
  }).observe(root);

  renderSettings();
  newProblem();
  restart();
})();
