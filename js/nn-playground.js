// The neural network playground, used by
// teaching/2026_2027_MAPI3_Machine_Learning/neural-networks-playground.html
// (in English, experiments in js/nn-experiments.js) and
// teaching/2026_2027_SID_Advanced_Statistical_Learning/reseaux-de-neurones.html
// (in French, experiments in js/nn-experiments-fr.js). The page's language
// (<html lang>) picks the strings below; the experiments file sets
// window.NN_EXPERIMENTS, window.NN_DEFAULTS and window.NN_PARTS.
//
// Settings on the left (data, network, training), the network in the middle
// with one column per layer, the prediction and the risks on the right, and
// the guided experiments below (the panel of js/lab-kit.js). Every computation
// is done by js/nn-engine.js, the drawing helpers are those of js/lab-kit.js.
//
// Every animation frame runs a few iterations of SGD (the speed), measures the
// training and test risks, and redraws:
//   - the network on a lattice of the input square (classification, (GRID + 1)²
//     points) or on SAMPLES points of the input interval (regression), keeping
//     the activation of every unit at every point: the squares of the diagram
//     are these activation maps, and the plot on the right is the output;
//   - the boundary between classes: zero level sets of differences of logits,
//     by marching squares;
//   - the risk curves and the readouts.
// The gradient norms and the dead units, which need a pass over the training
// data, are measured every SLOW_EVERY frames only.
//
// Colours come from the site's theme (Lab.colours): positive values, weights
// and the first class in dataA, negative ones and the second class in
// highlight. The third class has a colour of its own.

(function () {
  const root = document.querySelector('.nn-playground');
  if (!root || !window.NN || !window.Lab) return;
  const NN = window.NN;
  const { rgba, mix, fmt, power, subscript, niceStep, format } = Lab;
  const EXPERIMENTS = window.NN_EXPERIMENTS || [];

  const T = Lab.strings({
    en: {
      parts: { I: 'Part I. Architectures', II: 'Part II. Optimization', III: 'Part III. Universal approximation', IV: 'Part IV. Generalization' },
      datasets: {},
      classification: 'Classification', regression: 'Regression',
      perFrame: '{s} iteration(s) per frame', fullBatch: 'full batch, {n} (GD)',
      train: '▶ Train', pause: '❚❚ Pause', counter: 'iteration {t} · epoch {e}',
      stopped: 'Paused at iteration {t}, where the experiment stops. Press Train to go on.',
      diverged: 'The risk is no longer finite: the steps are too large. Lower the learning rate γ, then start from a new initialization.',
      noData: 'no data', noDataHere: 'no data here',
      input: 'input', output: 'output', layer: 'layer {c}', removeUnit: 'Remove a unit from layer {c}', addUnit: 'Add a unit to layer {c}',
      tipInput: 'Input', tipOutput: 'Output {j}', tipOutputClass: 'sm(z){j}: the probability of class {k}, shaded from 0 to 1',
      tipOutputRegression: '<strong>Output</strong><br>f(x) = W h + b, no activation',
      tipUnit: 'Layer {c}, unit {j}', kink: 'kink at x = −b/w = {x}',
      dead: 'Dead: zero on every training point, so its gradient is zero too.',
      shaded: 'shaded by value, on the input square', asFunction: 'value as a function of x',
      rescaled: ', rescaled to its largest value', range: ', on the range of {a}',
    },
    fr: {
      parts: {},
      datasets: { blobs: 'Nuages', moons: 'Lunes', circles: 'Cercles', spirals: 'Spirales', sine: 'Sinus', kinks: '3 coudes' },
      classification: 'Classification', regression: 'Régression',
      perFrame: '{s} itération(s) par image', fullBatch: 'lot complet, {n} (GD)',
      train: '▶ Entraîner', pause: '❚❚ Pause', counter: 'itération {t} · époque {e}',
      stopped: 'En pause à l’itération {t}, où s’arrête l’expérience. Appuyez sur Entraîner pour continuer.',
      diverged: 'Le risque n’est plus fini : les pas sont trop grands. Baissez le pas γ, puis repartez d’une nouvelle initialisation.',
      noData: 'pas de données', noDataHere: 'pas de données ici',
      input: 'entrée', output: 'sortie', layer: 'couche {c}', removeUnit: 'Retirer une unité de la couche {c}', addUnit: 'Ajouter une unité à la couche {c}',
      tipInput: 'Entrée', tipOutput: 'Sortie {j}', tipOutputClass: 'sm(z){j} : la probabilité de la classe {k}, de 0 à 1',
      tipOutputRegression: '<strong>Sortie</strong><br>f(x) = W h + b, sans activation',
      tipUnit: 'Couche {c}, unité {j}', kink: 'coude en x = −b/w = {x}',
      dead: 'Morte : nulle sur tous les points d’entraînement, donc de gradient nul.',
      shaded: 'valeur en couleur, sur le carré des entrées', asFunction: 'valeur en fonction de x',
      rescaled: ', ramenée à sa plus grande valeur', range: ', sur l’intervalle de {a}',
    },
  });

  // Positions of the sliders.
  const LEARNING_RATES = [0.0001, 0.0003, 0.001, 0.003, 0.01, 0.03, 0.05, 0.1, 0.3, 1, 3, 10];
  const BATCH_SIZES = [1, 2, 4, 8, 16, 32, 64, 128, Infinity];  // Infinity: full batch
  const LAMBDAS = [0, 0.00001, 0.0001, 0.001, 0.003, 0.01, 0.03, 0.1];
  const SPEEDS = [1, 5, 20, 100];  // iterations per frame
  const ACTIVATIONS = ['relu', 'tanh', 'sigmoid', 'identity'];
  const PARTS = window.NN_PARTS || T.parts;

  const MAX_HIDDEN_LAYERS = 6;
  const MAX_WIDTH = 32;
  const TEST_SIZE = 1000;
  const GRID = 50;
  const SAMPLES = 301;
  const VIEW = 1.25;                  // classification: the plot shows [-VIEW, VIEW]²
  const VIEW_X = 1.5, VIEW_Y = 1.6;   // regression: [-VIEW_X, VIEW_X] × [-VIEW_Y, VIEW_Y], data in [-1, 1]
  const SLOW_EVERY = 8;
  const TRACE_MAX = 1200;
  const DIAGRAM_HEIGHT = 440;         // nodes area of the diagram, in CSS pixels
  const BARS_HEIGHT = 46;             // gradient norms below it

  const $ = selector => root.querySelector(selector);
  const $$ = selector => root.querySelectorAll(selector);

  // ---- State ----

  let state = { ...window.NN_DEFAULTS, showTest: false };
  let train, test, net, trainer;
  let trace = [], metrics = null, gradNorms = null, alive = null;
  let maps = [], logits = [], kinks = [];
  let running = false, notice = null, frameCount = 0, frameRequested = false, visible = true;
  let panel = null;  // the guided experiments (Lab.experiments)
  let C = null;  // colours of the theme

  const taskOf = name => NN.DATASETS[name].task;
  const classification = () => taskOf(state.dataset) === 'classification';
  const batchSize = () => Math.min(state.batch, state.n);

  function buildData() {
    train = NN.makeData(state.dataset, state.n, state.noise, state.dataSeed);
    if (state.randomLabels && classification()) train = NN.randomizeLabels(train, state.dataSeed + 3);
    test = NN.makeData(state.dataset, TEST_SIZE, state.noise, state.dataSeed + 7919);
  }

  function buildNetwork() {
    const set = NN.DATASETS[state.dataset];
    const sizes = [train.dim, ...state.hidden, set.task === 'classification' ? set.classes : 1];
    net = NN.createNetwork({ sizes, activation: state.activation, task: set.task, seed: state.seed, init: state.init || 'random' });
    trainer = NN.createTrainer(net, train, state.seed + 1);
    trace = [];
    notice = null;
    allocateMaps();
    measure(true);
  }

  function rebuild(what) {
    if (what === 'data') buildData();
    buildNetwork();
    syncControls();
    requestDraw();
  }

  // Risks of the current network, kept in the trace of the risk curves; with
  // slow, also the gradient norms and the dead units.
  function measure(slow) {
    const a = NN.evaluate(net, train), b = NN.evaluate(net, test);
    metrics = { trainRisk: a.risk, testRisk: b.risk, trainError: a.error, testError: b.error, penalty: NN.penalty(net, state.lambda) };
    const last = trace[trace.length - 1];
    if (!last || last.t !== trainer.iteration) trace.push({ t: trainer.iteration, train: a.risk, test: b.risk });
    if (trace.length > TRACE_MAX) trace = trace.filter((_, i) => i % 2 === 0 || i === trace.length - 1);
    if (slow) {
      gradNorms = NN.gradientNorms(net, train, state.lambda);
      alive = deadUnits();
    }
  }

  // alive[l][j] = 0 if hidden unit j of layer l is zero on every training
  // point (ReLU only): it gets no gradient, and will stay so.
  function deadUnits() {
    if (state.activation !== 'relu') return null;
    const flags = net.sizes.map(d => new Uint8Array(d));
    for (let i = 0; i < train.n; i++) {
      NN.forward(net, train.X, i * train.dim);
      for (let l = 1; l < net.sizes.length - 1; l++) {
        const a = net.A[l], f = flags[l];
        for (let j = 0; j < a.length; j++) if (a[j] > 0) f[j] = 1;
      }
    }
    return flags;
  }

  // ---- Activation maps ----

  function allocateMaps() {
    const points = classification() ? (GRID + 1) * (GRID + 1) : SAMPLES;
    maps = net.sizes.map(d => Array.from({ length: d }, () => new Float32Array(points)));
    logits = Array.from({ length: net.sizes[net.sizes.length - 1] }, () => new Float32Array(points));
  }

  // The input of lattice point g.
  function latticePoint(g, x) {
    if (classification()) {
      const gx = g % (GRID + 1), gy = Math.floor(g / (GRID + 1));
      x[0] = -VIEW + 2 * VIEW * gx / GRID;
      x[1] = VIEW - 2 * VIEW * gy / GRID;
    } else {
      x[0] = -VIEW_X + 2 * VIEW_X * g / (SAMPLES - 1);
    }
    return x;
  }

  // Forward pass at every lattice point. In classification the output maps
  // hold the probabilities sm(z)_k and logits the z_k. In regression with
  // ReLU, kinks receives the points where the pattern of active units
  // changes, which are the kinks of the network.
  function computeMaps() {
    const sizes = net.sizes, L = sizes.length - 1, points = maps[0][0].length;
    const isClassification = classification(), probs = new Float64Array(sizes[L]);
    const x = new Float64Array(sizes[0]);
    const trackKinks = !isClassification && state.activation === 'relu';
    let previous = null, pattern = [];
    kinks = [];
    for (let g = 0; g < points; g++) {
      const out = NN.forward(net, latticePoint(g, x), 0);
      for (let l = 0; l < L; l++) {
        const a = net.A[l], m = maps[l];
        for (let j = 0; j < a.length; j++) m[j][g] = a[j];
      }
      if (isClassification) {
        NN.softmax(out, probs);
        for (let k = 0; k < out.length; k++) {
          logits[k][g] = out[k];
          maps[L][k][g] = probs[k];
        }
      } else {
        maps[L][0][g] = out[0];
      }
      if (trackKinks) {
        pattern = [];
        for (let l = 1; l < L; l++) for (let j = 0; j < sizes[l]; j++) pattern.push(net.Z[l][j] > 0 ? 1 : 0);
        const key = pattern.join('');
        if (previous !== null && key !== previous) kinks.push(x[0] - VIEW_X / (SAMPLES - 1));
        previous = key;
      }
    }
  }

  // ---- Colours ----

  function readColours() {
    C = Lab.colours();
    root.style.setProperty('--nn-third', `rgb(${C.classes[2].join(', ')})`);
  }

  const fmtRate = v => (v >= 0.01 ? String(v) : fmt(v));

  // ---- Canvases ----

  // Sizes a canvas to width × height CSS pixels, sharp on high-density screens.
  const fit = (canvas, width, height) => Lab.fit(canvas, height, width).ctx;

  const plot = { canvas: $('.lab-plot canvas'), size: 0 };
  const chart = { canvas: $('.lab-chart canvas'), width: 0, height: 150 };
  const diagram = { canvas: $('.nn-diagram canvas'), width: 0, height: DIAGRAM_HEIGHT + BARS_HEIGHT, nodes: [] };
  const shade = document.createElement('canvas');
  shade.width = shade.height = GRID + 1;
  const shadeCtx = shade.getContext('2d');
  const shadeImage = shadeCtx.createImageData(GRID + 1, GRID + 1);
  const atlas = document.createElement('canvas');  // the activation maps, one below the other
  const atlasCtx = atlas.getContext('2d');
  let atlasImage = null;

  function resize() {
    plot.size = plot.canvas.parentElement.clientWidth;
    plot.ctx = fit(plot.canvas, plot.size, plot.size);
    chart.width = chart.canvas.parentElement.clientWidth;
    chart.ctx = fit(chart.canvas, chart.width, chart.height);
    diagram.width = diagram.canvas.parentElement.clientWidth;
    diagram.ctx = fit(diagram.canvas, diagram.width, diagram.height);
    renderLayerControls();
    requestDraw();
  }

  // ---- The plot of the output ----

  function drawPlot() {
    const ctx = plot.ctx, S = plot.size;
    if (!S) return;
    ctx.clearRect(0, 0, S, S);
    if (classification()) drawClassification(ctx, S);
    else drawRegression(ctx, S);
    const box = $('.lab-message');
    box.hidden = !notice;
    if (notice) box.textContent = notice;
  }

  function drawClassification(ctx, S) {
    const L = net.sizes.length - 1, K = net.sizes[L], n = GRID + 1, data = shadeImage.data;
    for (let g = 0; g < n * n; g++) {
      let best = 0;
      for (let k = 1; k < K; k++) if (maps[L][k][g] > maps[L][best][g]) best = k;
      const confidence = (maps[L][best][g] - 1 / K) / (1 - 1 / K);
      const color = mix(C.paper, C.classes[best], 0.45 * confidence);
      data[4 * g] = color[0];
      data[4 * g + 1] = color[1];
      data[4 * g + 2] = color[2];
      data[4 * g + 3] = 255;
    }
    shadeCtx.putImageData(shadeImage, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(shade, 0.5, 0.5, GRID, GRID, 0, 0, S, S);

    // The data square [-1, 1]².
    const inner = S / (2 * VIEW);
    ctx.strokeStyle = rgba(C.faint, 0.6);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.strokeRect(S / 2 - inner, S / 2 - inner, 2 * inner, 2 * inner);
    ctx.setLineDash([]);

    // Boundaries: where class k stops being the most likely one.
    const field = new Float32Array(n * n);
    for (let k = 0; k < (K === 2 ? 1 : K); k++) {
      for (let g = 0; g < n * n; g++) {
        let other = -Infinity;
        for (let j = 0; j < K; j++) if (j !== k && logits[j][g] > other) other = logits[j][g];
        field[g] = logits[k][g] - other;
      }
      drawLevelSet(ctx, field, S);
    }

    const toPx = (a, b) => [(a + VIEW) / (2 * VIEW) * S, (VIEW - b) / (2 * VIEW) * S];
    if (state.showTest) {
      for (let i = 0; i < test.n; i += 2) {
        const [px, py] = toPx(test.X[2 * i], test.X[2 * i + 1]);
        ctx.beginPath();
        ctx.arc(px, py, 2.6, 0, 2 * Math.PI);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(C.classes[test.Y[i]], 0.75);
        ctx.stroke();
      }
    }
    for (let i = 0; i < train.n; i++) {
      const [px, py] = toPx(train.X[2 * i], train.X[2 * i + 1]);
      drawMarker(ctx, px, py, train.Y[i]);
    }
  }

  // Disc, cross and triangle for classes 0, 1 and 2, with a halo of the page
  // colour that keeps them readable over the shading.
  function drawMarker(ctx, x, y, label, r = 4) {
    const color = rgba(C.classes[label]);
    ctx.beginPath();
    if (label === 0) {
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgba(C.paper);
      ctx.stroke();
    } else if (label === 1) {
      ctx.moveTo(x - r, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r);
      ctx.lineTo(x - r, y + r);
      ctx.lineCap = 'round';
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = rgba(C.paper);
      ctx.stroke();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = color;
      ctx.stroke();
    } else {
      ctx.moveTo(x, y - 1.2 * r);
      ctx.lineTo(x + 1.1 * r, y + 0.8 * r);
      ctx.lineTo(x - 1.1 * r, y + 0.8 * r);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgba(C.paper);
      ctx.stroke();
    }
  }

  // The zero level set of field on the lattice (Lab.contourPath).
  function drawLevelSet(ctx, field, S) {
    ctx.beginPath();
    Lab.contourPath(ctx, field, GRID + 1, GRID + 1, 0, S, S);
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rgba(C.ink, 0.85);
    ctx.stroke();
  }

  function drawRegression(ctx, S) {
    const toX = a => (a + VIEW_X) / (2 * VIEW_X) * S, toY = b => (VIEW_Y - b) / (2 * VIEW_Y) * S;
    // No data outside [-1, 1].
    ctx.fillStyle = rgba(C.faint, 0.16);
    ctx.fillRect(0, 0, toX(-1), S);
    ctx.fillRect(toX(1), 0, S - toX(1), S);
    ctx.fillStyle = rgba(C.muted);
    ctx.font = '11px ' + getComputedStyle(root).fontFamily;
    ctx.textAlign = 'center';
    ctx.fillText(T.noData, toX(-1.25), 16);
    ctx.fillText(T.noData, toX(1.25), 16);

    ctx.strokeStyle = rgba(C.faint, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, toY(0));
    ctx.lineTo(S, toY(0));
    ctx.moveTo(toX(0), 0);
    ctx.lineTo(toX(0), S);
    ctx.stroke();

    // The regression function g(x) = E[y | x], dashed.
    const g = x => NN.DATASETS[state.dataset].g(x);
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = -1 + 2 * i / 200;
      if (i === 0) ctx.moveTo(toX(x), toY(g(x)));
      else ctx.lineTo(toX(x), toY(g(x)));
    }
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(C.muted, 0.9);
    ctx.stroke();
    ctx.setLineDash([]);

    if (state.showTest) {
      for (let i = 0; i < test.n; i += 3) {
        ctx.beginPath();
        ctx.arc(toX(test.X[i]), toY(test.Y[i]), 2.2, 0, 2 * Math.PI);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(C.neg, 0.6);
        ctx.stroke();
      }
    }
    for (let i = 0; i < train.n; i++) {
      ctx.beginPath();
      ctx.arc(toX(train.X[i]), toY(train.Y[i]), 3.6, 0, 2 * Math.PI);
      ctx.fillStyle = rgba(C.pos);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(C.paper);
      ctx.stroke();
    }

    // The network, f_θ.
    const L = net.sizes.length - 1, f = maps[L][0];
    ctx.beginPath();
    for (let i = 0; i < SAMPLES; i++) {
      const x = -VIEW_X + 2 * VIEW_X * i / (SAMPLES - 1), y = Math.max(-10, Math.min(10, f[i]));
      if (i === 0) ctx.moveTo(toX(x), toY(y));
      else ctx.lineTo(toX(x), toY(y));
    }
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(C.ink);
    ctx.stroke();

    // Kinks, as ticks along the bottom.
    ctx.strokeStyle = rgba(C.ink, 0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const x of kinks) {
      ctx.moveTo(toX(x), S);
      ctx.lineTo(toX(x), S - 9);
    }
    ctx.stroke();
  }

  // ---- The risk curves ----

  function drawChart() {
    const ctx = chart.ctx, W = chart.width, H = chart.height;
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    const left = 44, right = 16, top = 8, bottom = 22;
    const values = trace.flatMap(h => [h.train, h.test]).filter(v => Number.isFinite(v) && v > 0);
    if (!values.length) return;
    let lo = Math.floor(Math.log10(Math.max(1e-6, Math.min(...values))));
    let hi = Math.ceil(Math.log10(Math.min(1e6, Math.max(...values))));
    if (hi - lo < 1) lo = hi - 1;
    const tMax = Math.max(50, trace[trace.length - 1].t);
    const X = t => left + (W - left - right) * t / tMax;
    const Y = v => top + (H - top - bottom) * (hi - Math.log10(Math.max(v, 10 ** lo))) / (hi - lo);
    const font = getComputedStyle(root).fontFamily;

    ctx.font = `10px ${font}`;
    ctx.fillStyle = rgba(C.muted);
    ctx.strokeStyle = rgba(C.border);
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const every = Math.ceil((hi - lo) / 4);
    for (let e = lo; e <= hi; e++) {
      ctx.beginPath();
      ctx.moveTo(left, Y(10 ** e));
      ctx.lineTo(W - right, Y(10 ** e));
      ctx.stroke();
      if ((e - lo) % every === 0) ctx.fillText(power(e), left - 6, Y(10 ** e));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = niceStep(tMax / 4);
    for (let t = 0; t <= tMax; t += step) ctx.fillText(String(t), X(t), H - bottom + 6);

    for (const [key, color] of [['test', C.neg], ['train', C.pos]]) {
      ctx.beginPath();
      let started = false;
      for (const h of trace) {
        if (!Number.isFinite(h[key])) continue;
        if (!started) ctx.moveTo(X(h.t), Y(h[key]));
        else ctx.lineTo(X(h.t), Y(h[key]));
        started = true;
      }
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = rgba(color);
      ctx.stroke();
    }
  }

  // ---- The network ----

  // Positions of the columns and of the nodes, shared by the drawing, the
  // controls above the columns and the hover.
  function layout() {
    const sizes = net.sizes, columns = sizes.length, W = diagram.width;
    const largest = Math.max(...sizes);
    const gap = largest > 16 ? 2 : 6;
    const size = Math.max(8, Math.min(40, (DIAGRAM_HEIGHT - 16) / largest - gap, (W / columns) * 0.42));
    const xs = sizes.map((_, c) => W * (c + 0.5) / columns);
    diagram.nodes = sizes.map((d, c) => {
      const height = d * size + (d - 1) * gap, y0 = (DIAGRAM_HEIGHT - height) / 2;
      return Array.from({ length: d }, (_, j) => ({ c, j, x: xs[c] - size / 2, y: y0 + j * (size + gap), size }));
    });
    diagram.xs = xs;
    diagram.size = size;
  }

  // How the values of a map are shown: v ↦ (v - centre) / scale, in [-1, 1].
  // Bounded activations keep their absolute scale, so that a saturated,
  // nearly constant unit looks pale and flat: tanh on [-1, 1], the sigmoid
  // on [0, 1] around σ(0) = 1/2. ReLU and identity units, unbounded, and the
  // inputs are rescaled by their largest value on the plot.
  function mapScale(l, m) {
    const hidden = l > 0 && l < net.sizes.length - 1;
    if (hidden && state.activation === 'tanh') return { centre: 0, scale: 1, rescaled: false };
    if (hidden && state.activation === 'sigmoid') return { centre: 0.5, scale: 0.5, rescaled: false };
    let scale = 0;
    for (let g = 0; g < m.length; g++) scale = Math.max(scale, Math.abs(m[g]));
    return { centre: 0, scale, rescaled: true };
  }

  // Writes the activation maps of every unit into the atlas (classification).
  function paintAtlas() {
    const n = GRID + 1, count = net.sizes.reduce((a, b) => a + b, 0);
    if (atlas.width !== n || atlas.height !== n * count) {
      atlas.width = n;
      atlas.height = n * count;
      atlasImage = atlasCtx.createImageData(n, n * count);
    }
    const image = atlasImage, data = image.data, L = net.sizes.length - 1;
    let row = 0;
    for (let l = 0; l <= L; l++) {
      for (let j = 0; j < net.sizes[l]; j++, row++) {
        const m = maps[l][j], { centre, scale } = l < L ? mapScale(l, m) : {};
        for (let g = 0; g < m.length; g++) {
          let color;
          if (l === L) color = mix(C.paper, C.classes[j], m[g]);
          else {
            const t = scale > 0 ? Math.max(-1, Math.min(1, (m[g] - centre) / scale)) : 0;
            color = mix(C.paper, t >= 0 ? C.pos : C.neg, Math.abs(t));
          }
          const k = 4 * (row * n * n + g);
          data[k] = color[0];
          data[k + 1] = color[1];
          data[k + 2] = color[2];
          data[k + 3] = 255;
        }
      }
    }
    atlasCtx.putImageData(image, 0, 0);
  }

  // Index of unit j of layer l in the atlas.
  const atlasRow = (l, j) => net.sizes.slice(0, l).reduce((a, b) => a + b, 0) + j;

  // Draws the activation map of unit j of layer l in the box (x, y, w, h).
  function drawMap(ctx, l, j, x, y, w, h) {
    const L = net.sizes.length - 1;
    if (classification()) {
      const n = GRID + 1;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(atlas, 0.5, atlasRow(l, j) * n + 0.5, GRID, GRID, x, y, w, h);
      return;
    }
    ctx.fillStyle = rgba(C.paper);
    ctx.fillRect(x, y, w, h);
    // Vertical range: that of the plot for the output, of the activation
    // for tanh and sigmoid units, from 0 for ReLU units, symmetric otherwise.
    const m = maps[l][j];
    let lo, hi;
    if (l === L) [lo, hi] = [-VIEW_Y, VIEW_Y];
    else if (l > 0 && state.activation === 'tanh') [lo, hi] = [-1, 1];
    else if (l > 0 && state.activation === 'sigmoid') [lo, hi] = [0, 1];
    else {
      const { scale } = mapScale(l, m);
      [lo, hi] = l > 0 && state.activation === 'relu' ? [0, scale || 1] : [-(scale || 1), scale || 1];
    }
    const Y = v => y + h - 2 - (h - 4) * (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo);
    ctx.strokeStyle = rgba(C.faint, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, Y(0));
    ctx.lineTo(x + w, Y(0));
    ctx.stroke();
    const stride = w > 60 ? 1 : 4;
    ctx.beginPath();
    for (let g = 0; g < m.length; g += stride) {
      const px = x + w * g / (m.length - 1);
      if (g === 0) ctx.moveTo(px, Y(m[g]));
      else ctx.lineTo(px, Y(m[g]));
    }
    ctx.lineWidth = w > 60 ? 2 : 1.3;
    ctx.strokeStyle = rgba(l === 0 ? C.muted : C.ink);
    ctx.stroke();
  }

  function drawDiagram() {
    const ctx = diagram.ctx, W = diagram.width, H = diagram.height;
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    layout();
    if (classification()) paintAtlas();
    const { nodes, size } = diagram;

    // Edges, from the weights of each layer: width |w|, colour the sign.
    for (let l = 0; l < net.layers.length; l++) {
      const { nIn, nOut, W: weights } = net.layers[l];
      let largest = 1e-9;
      for (let k = 0; k < weights.length; k++) largest = Math.max(largest, Math.abs(weights[k]));
      const thin = Math.min(1, Math.sqrt(64 / (nIn * nOut)));
      for (let j = 0; j < nOut; j++) {
        for (let i = 0; i < nIn; i++) {
          const w = weights[j * nIn + i], from = nodes[l][i], to = nodes[l + 1][j];
          ctx.beginPath();
          ctx.moveTo(from.x + size, from.y + size / 2);
          ctx.lineTo(to.x, to.y + size / 2);
          ctx.lineWidth = Math.min(5, 0.4 + 1.6 * Math.abs(w)) * thin + 0.3;
          ctx.strokeStyle = rgba(w >= 0 ? C.pos : C.neg, 0.12 + 0.6 * Math.abs(w) / largest);
          ctx.stroke();
        }
      }
    }

    // Units.
    const L = net.sizes.length - 1;
    for (const column of nodes) {
      for (const node of column) {
        const dead = alive && node.c > 0 && node.c < L && !alive[node.c][node.j];
        ctx.save();
        ctx.beginPath();
        ctx.rect(node.x, node.y, size, size);
        ctx.clip();
        ctx.globalAlpha = dead ? 0.3 : 1;
        drawMap(ctx, node.c, node.j, node.x, node.y, size, size);
        ctx.restore();
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(dead ? C.muted : C.faint);
        ctx.setLineDash(dead ? [3, 2] : []);
        ctx.strokeRect(node.x + 0.5, node.y + 0.5, size - 1, size - 1);
        ctx.setLineDash([]);
        if (dead && size >= 12) {
          ctx.beginPath();
          ctx.moveTo(node.x + 3, node.y + 3);
          ctx.lineTo(node.x + size - 3, node.y + size - 3);
          ctx.strokeStyle = rgba(C.muted, 0.8);
          ctx.stroke();
        }
      }
    }

    // Gradient norms of the weights of each layer, on a log scale from 10⁻⁷ to 10¹.
    const top = DIAGRAM_HEIGHT + 6, font = getComputedStyle(root).fontFamily;
    ctx.font = `10px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (gradNorms) {
      const span = diagram.width / net.sizes.length * 0.7;
      for (let l = 0; l < gradNorms.length; l++) {
        const x = (diagram.xs[l] + diagram.xs[l + 1]) / 2, g = gradNorms[l];
        const t = g > 0 ? Math.max(0, Math.min(1, (Math.log10(g) + 7) / 8)) : 0;
        ctx.fillStyle = rgba(C.border);
        ctx.fillRect(x - span / 2, top, span, 6);
        ctx.fillStyle = rgba(C.soft);
        ctx.fillRect(x - span / 2, top, span * t, 6);
        ctx.fillStyle = rgba(C.muted);
        ctx.fillText(`‖∇W${subscript(l + 1)}‖`, x, top + 10);
        ctx.fillText(fmt(g, 3), x, top + 23);
      }
    }
  }

  // The column headings above the diagram, with the width controls of the hidden layers.
  function renderLayerControls() {
    const box = $('.nn-layer-controls');
    layout();
    const L = net.sizes.length - 1, isClassification = classification();
    box.innerHTML = '';
    net.sizes.forEach((d, c) => {
      const head = document.createElement('div');
      head.className = 'nn-layer-head';
      head.style.left = `${diagram.xs[c]}px`;
      let title, detail;
      if (c === 0) {
        title = T.input;
        detail = isClassification ? 'x ∈ ℝ²' : 'x ∈ ℝ';
      } else if (c === L) {
        title = T.output;
        detail = isClassification ? `sm(z) ∈ Δ${subscript(d - 1)}` : 'f(x) ∈ ℝ';
      } else {
        title = format(T.layer, { c });
        detail = `<button type="button" data-width="${c - 1}" data-delta="-1" aria-label="${format(T.removeUnit, { c })}">−</button><span>${d}</span><button type="button" data-width="${c - 1}" data-delta="1" aria-label="${format(T.addUnit, { c })}">+</button>`;
      }
      head.innerHTML = `<span class="nn-layer-title">${title}</span><span class="nn-layer-detail">${detail}</span>`;
      box.appendChild(head);
    });
    $('[data-out="layers"]').textContent = state.hidden.length;
    $('[data-out="params"]').textContent = NN.parameterCount(net.sizes);
    $('[data-out="depth"]').textContent = L;
  }

  // ---- Hover ----

  const tip = $('.nn-diagram .lab-tooltip');
  const tipCanvas = tip.querySelector('canvas');
  const tipText = tip.querySelector('.lab-tooltip-text');

  function nodeAt(event) {
    const rect = diagram.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    for (const column of diagram.nodes) {
      for (const node of column) {
        if (x >= node.x - 2 && x <= node.x + node.size + 2 && y >= node.y - 2 && y <= node.y + node.size + 2) return node;
      }
    }
    return null;
  }

  function showNode(node, event) {
    if (!node) {
      tip.hidden = true;
      return;
    }
    const L = net.sizes.length - 1, isClassification = classification(), act = NN.ACTIVATIONS[state.activation].label;
    let html;
    if (node.c === 0) {
      html = `<strong>${T.tipInput} ${isClassification ? `x${subscript(node.j + 1)}` : 'x'}</strong>`;
    } else if (node.c === L) {
      html = isClassification
        ? `<strong>${format(T.tipOutput, { j: node.j + 1 })}</strong><br>${format(T.tipOutputClass, { j: subscript(node.j + 1), k: node.j + 1 })}`
        : T.tipOutputRegression;
    } else {
      const layer = net.layers[node.c - 1], nIn = layer.nIn;
      let norm = 0;
      for (let i = 0; i < nIn; i++) norm += layer.W[node.j * nIn + i] ** 2;
      html = `<strong>${format(T.tipUnit, { c: node.c, j: node.j + 1 })}</strong><br>a = ${act}(w·h + b), ‖w‖ = ${fmt(Math.sqrt(norm), 2)}, b = ${fmt(layer.b[node.j], 2)}`;
      if (!isClassification && node.c === 1 && state.activation === 'relu') {
        const w = layer.W[node.j];
        html += `<br>${format(T.kink, { x: w !== 0 ? fmt(-layer.b[node.j] / w, 2) : '∞' })}`;
      }
      if (alive && !alive[node.c][node.j]) html += `<br><em>${T.dead}</em>`;
    }
    const scaleNote = node.c === L ? '' : mapScale(node.c, maps[node.c][node.j]).rescaled ? T.rescaled : format(T.range, { a: act });
    html += `<br><span class="lab-tooltip-scale">${isClassification ? T.shaded : T.asFunction}${scaleNote}</span>`;
    tipText.innerHTML = html;
    const w = isClassification ? 132 : 180, h = isClassification ? 132 : 110;
    const ctx = fit(tipCanvas, w, h);
    tipCanvas.style.width = `${w}px`;
    drawMap(ctx, node.c, node.j, 0, 0, w, h);
    tip.hidden = false;
    const box = diagram.canvas.parentElement.getBoundingClientRect();
    const left = node.x + node.size + 12 + tip.offsetWidth > diagram.width ? node.x - tip.offsetWidth - 12 : node.x + node.size + 12;
    tip.style.left = `${Math.max(0, left)}px`;
    tip.style.top = `${Math.min(Math.max(0, node.y + diagram.canvas.offsetTop - 20), box.height - tip.offsetHeight)}px`;
  }

  diagram.canvas.addEventListener('mousemove', event => showNode(nodeAt(event), event));
  diagram.canvas.addEventListener('mouseleave', () => { tip.hidden = true; });

  const plotTip = $('.lab-plot .lab-tooltip');
  plot.canvas.addEventListener('mousemove', event => {
    const rect = plot.canvas.getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width, v = (event.clientY - rect.top) / rect.height;
    let html;
    if (classification()) {
      const x = [-VIEW + 2 * VIEW * u, VIEW - 2 * VIEW * v];
      const z = Array.from(NN.forward(net, x, 0)), p = NN.softmax(z, new Float64Array(z.length));
      html = `x = (${x.map(a => a.toFixed(2)).join(', ')})<br>logits z = (${z.map(a => a.toFixed(2)).join(', ')})<br>sm(z) = (${Array.from(p, a => a.toFixed(3)).join(', ')})`;
    } else {
      const x = -VIEW_X + 2 * VIEW_X * u, f = NN.forward(net, [x], 0)[0];
      html = `x = ${x.toFixed(2)}<br>f(x) = ${f.toFixed(3)}` + (Math.abs(x) <= 1 ? `<br>E[y | x] = ${NN.DATASETS[state.dataset].g(x).toFixed(3)}` : `<br>${T.noDataHere}`);
    }
    plotTip.innerHTML = html;
    plotTip.hidden = false;
    const px = event.clientX - rect.left, py = event.clientY - rect.top;
    plotTip.style.left = `${px + 14 + plotTip.offsetWidth > rect.width ? px - plotTip.offsetWidth - 14 : px + 14}px`;
    plotTip.style.top = `${Math.max(0, py - plotTip.offsetHeight - 10)}px`;
  });
  plot.canvas.addEventListener('mouseleave', () => { plotTip.hidden = true; });

  // ---- Readouts ----

  function renderReadouts() {
    const set = (key, text) => {
      const el = $(`[data-out="${key}"]`);
      if (el) el.textContent = text;
    };
    const P = NN.parameterCount(net.sizes), m = metrics;
    set('counter', format(T.counter, { t: trainer.iteration, e: trainer.epoch }));
    set('train-risk', fmt(m.trainRisk, 4));
    set('test-risk', fmt(m.testRisk, 4));
    const gap = m.testRisk - m.trainRisk;
    set('gap', fmt(Math.abs(gap) < 1e-9 ? 0 : gap, 4));
    set('train-error', fmt(m.trainError, 3));
    set('test-error', fmt(m.testError, 3));
    set('penalty', fmt(m.penalty, 4));
    set('P', P);
    set('n-readout', state.n);
    set('sqrt-P-n', fmt(Math.sqrt(P / state.n), 2));
    set('pieces', kinks.length + 1);
    $$('[data-when="classification"]').forEach(el => { el.hidden = !classification(); });
    $$('[data-when="regression-relu"]').forEach(el => { el.hidden = classification() || state.activation !== 'relu'; });
    $$('[data-when="penalty"]').forEach(el => { el.hidden = state.lambda === 0; });
    const play = $('[data-action="play"]');
    play.textContent = running ? T.pause : T.train;
    play.setAttribute('aria-pressed', String(running));
  }

  // ---- Drawing ----

  function draw() {
    if (!C) readColours();
    computeMaps();
    drawPlot();
    drawDiagram();
    drawChart();
    renderReadouts();
  }

  function requestDraw() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(frame);
  }

  function frame() {
    frameRequested = false;
    if (running) {
      const steps = state.speed;
      for (let s = 0; s < steps; s++) {
        if (state.stopAt && trainer.iteration >= state.stopAt) {
          pause(format(T.stopped, { t: trainer.iteration }));
          state.stopAt = null;
          break;
        }
        trainer.step(state.lr, batchSize(), state.lambda);
        if (trainer.diverged) {
          pause(T.diverged);
          break;
        }
      }
      frameCount++;
      measure(!running || frameCount % SLOW_EVERY === 0);
    }
    if (visible) draw();
    if (running) requestDraw();
  }

  function play() {
    if (trainer.diverged) return;
    running = true;
    notice = null;
    requestDraw();
  }

  function pause(message) {
    running = false;
    notice = message || null;
    measure(true);
    requestDraw();
  }

  // ---- Controls ----

  const pills = (group, items, isPressed, onClick) => Lab.pills($(`[data-group="${group}"]`), items, isPressed, onClick);

  const nearest = (list, value) => {
    let best = 0;
    list.forEach((v, i) => { if (Math.abs(Math.log(v || 1e-7) - Math.log(value || 1e-7)) < Math.abs(Math.log(list[best] || 1e-7) - Math.log(value || 1e-7))) best = i; });
    return best;
  };

  function syncControls() {
    const task = taskOf(state.dataset);
    pills('task', [{ label: T.classification, value: 'classification' }, { label: T.regression, value: 'regression' }],
      v => v === task, v => {
        if (v === taskOf(state.dataset)) return;
        state.dataset = v === 'classification' ? 'moons' : 'sine';
        state.randomLabels = false;
        markManual();
        rebuild('data');
      });
    pills('dataset', Object.entries(NN.DATASETS).filter(([, d]) => d.task === task).map(([key, d]) => ({ label: T.datasets[key] || d.label, value: key })),
      v => v === state.dataset, v => {
        state.dataset = v;
        markManual();
        rebuild('data');
      });
    pills('activation', ACTIVATIONS.map(a => ({ label: NN.ACTIVATIONS[a].label, value: a })),
      v => v === state.activation, v => {
        state.activation = v;
        markManual();
        rebuild();
      });
    pills('speed', SPEEDS.map(s => ({ label: `×${s}`, value: s, title: format(T.perFrame, { s }) })),
      v => v === state.speed, v => {
        state.speed = v;
        syncControls();
      });

    const value = (key, v) => { $(`[data-input="${key}"]`).value = v; };
    const out = (key, text) => { $(`[data-out="${key}"]`).textContent = text; };
    value('noise', state.noise);
    out('noise', state.noise.toFixed(2));
    value('n', state.n);
    out('n', state.n);
    value('lr', nearest(LEARNING_RATES, state.lr));
    out('lr', fmtRate(state.lr));
    const b = state.batch >= state.n ? BATCH_SIZES.length - 1 : nearest(BATCH_SIZES.slice(0, -1), state.batch);
    value('batch', b);
    out('batch', state.batch >= state.n ? format(T.fullBatch, { n: state.n }) : String(state.batch));
    value('lambda', LAMBDAS.indexOf(state.lambda) >= 0 ? LAMBDAS.indexOf(state.lambda) : nearest(LAMBDAS, state.lambda));
    out('lambda', state.lambda === 0 ? '0' : fmtRate(state.lambda));
    const random = $('[data-input="randomLabels"]');
    random.checked = state.randomLabels && task === 'classification';
    random.disabled = task !== 'classification';
    random.closest('label').classList.toggle('is-disabled', random.disabled);
    $('[data-input="showTest"]').checked = state.showTest;
    renderLayerControls();
    renderReadouts();
  }

  // A setting changed by hand: the experiment's variant is no longer what is shown.
  function markManual() {
    if (panel) panel.manual();
  }

  root.addEventListener('click', event => {
    const width = event.target.closest('[data-width]');
    if (width) {
      const l = Number(width.dataset.width), d = Number(width.dataset.delta);
      state.hidden[l] = Math.max(1, Math.min(MAX_WIDTH, state.hidden[l] + d));
      state.hidden = state.hidden.slice();
      markManual();
      rebuild();
      return;
    }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'play') running ? pause() : play();
    if (action === 'step') {
      running = false;
      notice = null;
      if (!trainer.diverged) trainer.step(state.lr, batchSize(), state.lambda);
      measure(true);
      requestDraw();
    }
    if (action === 'reset') {
      state.seed += 1;
      markManual();
      rebuild();
    }
    if (action === 'permute') permute();
    if (action === 'resample') {
      state.dataSeed += 1;
      markManual();
      rebuild('data');
    }
    if (action === 'add-layer' && state.hidden.length < MAX_HIDDEN_LAYERS) {
      state.hidden = [...state.hidden, state.hidden.length ? state.hidden[state.hidden.length - 1] : 4];
      markManual();
      rebuild();
    }
    if (action === 'remove-layer' && state.hidden.length > 0) {
      state.hidden = state.hidden.slice(0, -1);
      markManual();
      rebuild();
    }
  });

  function permute() {
    NN.permuteHiddenUnits(net, state.seed * 7919 + trainer.iteration + Math.floor(Math.random() * 1e6));
    measure(true);
    requestDraw();
  }

  const onInput = (key, handler) => $(`[data-input="${key}"]`).addEventListener('input', event => handler(event.target));
  onInput('noise', el => { state.noise = Number(el.value); markManual(); rebuild('data'); });
  onInput('n', el => { state.n = Number(el.value); markManual(); rebuild('data'); });
  onInput('lr', el => { state.lr = LEARNING_RATES[Number(el.value)]; syncControls(); });
  onInput('batch', el => { state.batch = BATCH_SIZES[Number(el.value)]; syncControls(); });
  onInput('lambda', el => { state.lambda = LAMBDAS[Number(el.value)]; measure(false); syncControls(); requestDraw(); });
  $('[data-input="randomLabels"]').addEventListener('change', event => {
    state.randomLabels = event.target.checked;
    markManual();
    rebuild('data');
  });
  $('[data-input="showTest"]').addEventListener('change', event => {
    state.showTest = event.target.checked;
    requestDraw();
  });

  // ---- Experiments ----

  function loadSetup(setup) {
    state = { ...window.NN_DEFAULTS, ...setup, hidden: (setup.hidden || window.NN_DEFAULTS.hidden).slice(), showTest: state.showTest };
    running = false;
    rebuild('data');
    play();
  }

  // ---- Start ----

  readColours();
  buildData();
  buildNetwork();
  syncControls();
  panel = Lab.experiments({
    root, list: $('.lab-exp-list'), detail: $('.lab-exp-detail'), items: EXPERIMENTS, parts: PARTS,
    load: loadSetup,
    action: name => { if (name === 'permute') permute(); },
  });

  window.addEventListener('sitethemechange', () => {
    readColours();
    requestDraw();
  });
  new ResizeObserver(() => resize()).observe(root);
  new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) requestDraw();
  }).observe(root);
  resize();
})();
