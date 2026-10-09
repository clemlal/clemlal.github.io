// Interactive demo in the presentation block of index.html.
//
// Visitors place circles and crosses in the box. A small multilayer perceptron
// (2 → 16 → 16 → 1, tanh hidden units) is trained on them by full-batch
// gradient descent on the mean logistic loss. Every animation frame runs a few
// gradient steps, shades the box with the predicted class probability and
// draws the decision boundary, i.e. the zero level set of the network's output,
// with marching squares on a GRID × GRID lattice.
//
// Training stops after ITERATIONS_PER_RUN steps and resumes when a point is
// added. "Reset" restarts from new random weights (the points stay), "Clear"
// removes the points and resets the weights. Nothing runs while the box is off
// screen, and visitors who ask for reduced motion see the trained result only.
//
// Points live in [-1, 1]², with y pointing up. Label 1 is a circle, 0 a cross.

(function () {
  const LAYERS = [2, 16, 16, 1];
  const STEP_SIZE = 0.5;
  const STEPS_PER_FRAME = 3;
  const ITERATIONS_PER_RUN = 2000;
  const GRID = 50;
  const COLORS = { 1: [27, 46, 129], 0: [214, 96, 52] };  // circles: site navy, crosses: orange

  const root = document.querySelector('.gd-demo');
  if (!root) return;

  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const status = root.querySelector('.gd-status');
  const classButtons = root.querySelectorAll('button[data-label]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The probabilities are computed on the lattice, written to a tiny canvas
  // with one pixel per lattice point, then stretched (with smoothing) to the box.
  const shade = document.createElement('canvas');
  shade.width = shade.height = GRID + 1;
  const shadeCtx = shade.getContext('2d');
  const shadeImage = shadeCtx.createImageData(GRID + 1, GRID + 1);
  const field = new Float64Array((GRID + 1) * (GRID + 1));

  // Activations and backpropagated errors of each layer, for one input.
  const acts = LAYERS.map(n => new Float64Array(n));
  const deltas = LAYERS.map(n => new Float64Array(n));

  let points = twoMoons(12);
  let net = randomNetwork();
  let label = 1;
  let iteration = 0;
  let budget = ITERATIONS_PER_RUN;
  let running = false;
  let visible = false;
  let size = 0;

  // Two interleaved half-moons, slightly jittered. The jitter is seeded, so the
  // page always opens on the same picture.
  function twoMoons(n) {
    let seed = 7;
    const jitter = () => {
      seed = (seed * 16807) % 2147483647;
      return 0.1 * (seed / 2147483647 - 0.5);
    };
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = Math.PI * i / (n - 1);
      pts.push({ x: (Math.cos(t) - 0.5) / 1.7 + jitter(), y: (Math.sin(t) - 0.25) / 1.7 + jitter(), label: 1 });
      pts.push({ x: (0.5 - Math.cos(t)) / 1.7 + jitter(), y: (0.25 - Math.sin(t)) / 1.7 + jitter(), label: 0 });
    }
    return pts;
  }

  // Glorot-uniform weights, zero biases.
  function randomNetwork() {
    return LAYERS.slice(1).map((nOut, l) => {
      const nIn = LAYERS[l];
      const scale = Math.sqrt(6 / (nIn + nOut));
      return {
        nIn,
        nOut,
        W: Float64Array.from({ length: nIn * nOut }, () => (2 * Math.random() - 1) * scale),
        b: new Float64Array(nOut),
        gW: new Float64Array(nIn * nOut),
        gb: new Float64Array(nOut),
      };
    });
  }

  const sigmoid = z => 1 / (1 + Math.exp(-z));

  // log(1 + e^z), without overflow for large z.
  const softplus = z => (z > 0 ? z + Math.log1p(Math.exp(-z)) : Math.log1p(Math.exp(z)));

  // Returns the output logit and fills acts.
  function forward(x, y) {
    acts[0][0] = x;
    acts[0][1] = y;
    for (let l = 0; l < net.length; l++) {
      const { nIn, nOut, W, b } = net[l];
      const a = acts[l], out = acts[l + 1], last = l === net.length - 1;
      for (let j = 0; j < nOut; j++) {
        let z = b[j];
        for (let i = 0; i < nIn; i++) z += W[j * nIn + i] * a[i];
        out[j] = last ? z : Math.tanh(z);
      }
    }
    return acts[net.length][0];
  }

  // Logistic loss of a point with logit z: -log σ(z) if label 1, -log(1 - σ(z)) if label 0.
  function meanLoss() {
    let total = 0;
    for (const p of points) {
      const z = forward(p.x, p.y);
      total += softplus(z) - p.label * z;
    }
    return total / points.length;
  }

  // One step of full-batch gradient descent on the mean logistic loss.
  function gradientStep() {
    for (const layer of net) {
      layer.gW.fill(0);
      layer.gb.fill(0);
    }
    for (const p of points) {
      deltas[net.length][0] = sigmoid(forward(p.x, p.y)) - p.label;
      for (let l = net.length - 1; l >= 0; l--) {
        const { nIn, nOut, W, gW, gb } = net[l];
        const a = acts[l], d = deltas[l + 1], dIn = deltas[l];
        for (let j = 0; j < nOut; j++) {
          gb[j] += d[j];
          for (let i = 0; i < nIn; i++) gW[j * nIn + i] += d[j] * a[i];
        }
        if (l === 0) break;
        for (let i = 0; i < nIn; i++) {
          let s = 0;
          for (let j = 0; j < nOut; j++) s += W[j * nIn + i] * d[j];
          dIn[i] = s * (1 - a[i] * a[i]);  // tanh' = 1 - tanh²
        }
      }
    }
    const step = STEP_SIZE / points.length;
    for (const layer of net) {
      for (let k = 0; k < layer.W.length; k++) layer.W[k] -= step * layer.gW[k];
      for (let k = 0; k < layer.b.length; k++) layer.b[k] -= step * layer.gb[k];
    }
    iteration++;
  }

  function draw() {
    const n = GRID + 1, data = shadeImage.data;
    for (let gy = 0; gy < n; gy++) {
      for (let gx = 0; gx < n; gx++) {
        const z = forward(2 * gx / GRID - 1, 1 - 2 * gy / GRID);
        field[gy * n + gx] = z;
        const color = COLORS[z > 0 ? 1 : 0];
        const alpha = 0.3 * Math.tanh(Math.abs(z) / 2);  // = 0.3 |2σ(z) - 1|
        const k = 4 * (gy * n + gx);
        for (let c = 0; c < 3; c++) data[k + c] = 255 + alpha * (color[c] - 255);
        data[k + 3] = 255;
      }
    }
    shadeCtx.putImageData(shadeImage, 0, 0);
    // Source rectangle from the centre of the first pixel to the centre of the
    // last one, so that lattice points land exactly on the box's edges.
    ctx.drawImage(shade, 0.5, 0.5, GRID, GRID, 0, 0, size, size);

    drawBoundary();
    for (const p of points) drawPoint(p);

    status.textContent = points.length
      ? `iteration ${iteration} · loss ${meanLoss().toFixed(3)}`
      : 'click in the box to add points';
  }

  // Marching squares: in each lattice cell, join the points where the logit
  // changes sign along the cell's edges (found by linear interpolation).
  function drawBoundary() {
    const n = GRID + 1, cell = size / GRID;
    const v = [0, 0, 0, 0], cuts = [];
    // Corners in clockwise order from the top-left; edge e joins corners e and e + 1.
    const cx = [0, 1, 1, 0], cy = [0, 0, 1, 1];
    const segment = (p, q) => {
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
    };

    ctx.beginPath();
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        for (let c = 0; c < 4; c++) v[c] = field[(gy + cy[c]) * n + gx + cx[c]];
        cuts.length = 0;
        for (let e = 0; e < 4; e++) {
          const f = (e + 1) % 4;
          if ((v[e] > 0) !== (v[f] > 0)) {
            const t = v[e] / (v[e] - v[f]);
            cuts.push([(gx + cx[e] + t * (cx[f] - cx[e])) * cell, (gy + cy[e] + t * (cy[f] - cy[e])) * cell]);
          }
        }
        if (cuts.length === 2) {
          segment(cuts[0], cuts[1]);
        } else if (cuts.length === 4) {
          // Saddle: opposite corners share a sign. If the centre has the sign of
          // corner 0, corners 0 and 2 are connected and corners 1 and 3 are cut off.
          const centre = v[0] + v[1] + v[2] + v[3] > 0;
          if (centre === (v[0] > 0)) {
            segment(cuts[0], cuts[1]);
            segment(cuts[2], cuts[3]);
          } else {
            segment(cuts[3], cuts[0]);
            segment(cuts[1], cuts[2]);
          }
        }
      }
    }
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(30, 30, 30, 0.8)';
    ctx.stroke();
  }

  function drawPoint(p) {
    const x = (p.x + 1) / 2 * size, y = (1 - p.y) / 2 * size, r = 4.5;
    const color = `rgb(${COLORS[p.label].join(', ')})`;
    ctx.beginPath();
    if (p.label === 1) {
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    } else {
      ctx.moveTo(x - r, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r);
      ctx.lineTo(x - r, y + r);
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  function frame() {
    let steps = 0;
    if (points.length) steps = reduceMotion ? budget : Math.min(STEPS_PER_FRAME, budget);
    for (let s = 0; s < steps; s++) gradientStep();
    budget -= steps;
    draw();
    running = visible && budget > 0 && points.length > 0;
    if (running) requestAnimationFrame(frame);
  }

  function resume() {
    if (running || !visible) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function train() {
    budget = ITERATIONS_PER_RUN;
    resume();
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    size = canvas.clientWidth;
    canvas.width = canvas.height = Math.round(size * dpr);  // also resets the context
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    const x = 2 * (event.clientX - rect.left - canvas.clientLeft) / size - 1;
    const y = 1 - 2 * (event.clientY - rect.top - canvas.clientTop) / size;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) return;
    points.push({ x, y, label });
    train();
  });

  classButtons.forEach(button => {
    button.addEventListener('click', () => {
      label = Number(button.dataset.label);
      classButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    });
  });

  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    net = randomNetwork();
    iteration = 0;
    train();
  });

  root.querySelector('[data-action="clear"]').addEventListener('click', () => {
    points = [];
    net = randomNetwork();
    iteration = 0;
    if (!running) draw();
  });

  new ResizeObserver(() => {
    resize();
    if (!running) draw();
  }).observe(canvas);

  new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    resume();
  }).observe(canvas);
})();
