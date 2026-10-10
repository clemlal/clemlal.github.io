// Interactive demo in the July 2026 news item of index.html, illustrating
// "Token-Efficient Change Detection in LLM APIs" (ICML 2026).
//
// A toy LLM completes "The sky is" with one of three words. Its next-word
// probabilities p at temperature 1 are a point of the triangle (the probability
// simplex), which visitors drag. At temperature T the model samples from
// softmax(logits / T), with logits log p, i.e. from p_T ∝ p^(1/T). The changed
// model has its logits shifted by the small vector DELTA. The curves in the
// triangle are the paths T ↦ p_T of both models, from the centre (T → ∞) to
// their limit as T → 0, and the dots mark the current temperature.
//
// Each test samples TOKENS words from each model and runs a two-sample
// permutation test on the total-variation distance between the two histograms,
// at level ALPHA. TESTS tests run after each change of the settings. As in the
// paper's phase transition (Theorem 3.3), at low temperature the change is
// detected almost surely when the two most likely words are tied (a border
// input, on a dashed line of the triangle), and never otherwise.
//
// Nothing runs while the demo is off screen. Visitors who ask for reduced
// motion get the results of all the tests at once, without animation.

(function () {
  const WORDS = ['blue', 'clear', 'grey'];
  const DELTA = [0.1, -0.1, 0];  // logit shift of the changed model
  const TOKENS = 20;             // tokens sampled from each model in a test
  const TESTS = 20;
  const ALPHA = 0.05;
  const PERMUTATIONS = 499;
  const TOKEN_MS = 45;           // delay between two tokens of the animation
  const VERDICT_MS = 1300;       // pause on each verdict
  const SNAP = 0.025;            // probabilities closer than this snap to a tie
  const MIN_PROB = 0.005;
  const COLORS = ['rgb(27, 46, 129)', 'rgb(214, 96, 52)'];  // original, changed (as in css/styles.css)

  // Triangle in SVG coordinates (viewBox 0 0 300 264): blue at the top, clear
  // at the bottom left, grey at the bottom right.
  const VERTICES = [[150, 28], [30, 236], [270, 236]];
  const CENTRE = [150, 500 / 3];
  const PAIRS = [[0, 1], [0, 2], [1, 2]];
  // Temperatures of the points of the drawn paths, from 100 down to 0.01.
  const PATH_TEMPERATURES = Array.from({ length: 121 }, (_, k) => Math.pow(10, 2 - k / 30));

  const root = document.querySelector('.cd-demo');
  if (!root) return;

  const svg = root.querySelector('svg');
  const slider = root.querySelector('.cd-temp input');
  const temperatureText = root.querySelector('.cd-temp output');
  const borderText = root.querySelector('.cd-border');
  const badge = root.querySelector('.cd-badge');
  const stats = root.querySelector('.cd-stats');
  const historyText = root.querySelector('.cd-history-text');
  const dotsBox = root.querySelector('.cd-dots');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let p = [0.45, 0.45, 0.1];
  let T = 1;
  let logits = [];         // of the original and changed models
  let history = [];        // verdicts of the tests run since the last change
  let current = null;      // test being shown: { samples, start, result, end }
  let running = false;
  let visible = false;
  let dragging = false;

  // ---- Drawing elements ----

  function svgElement(tag, attributes) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
    svg.appendChild(el);
    return el;
  }

  svgElement('polygon', { points: VERTICES.join(' '), class: 'cd-triangle' });
  const borderLines = PAIRS.map(([i, j]) => svgElement('line', {
    x1: CENTRE[0],
    y1: CENTRE[1],
    x2: (VERTICES[i][0] + VERTICES[j][0]) / 2,
    y2: (VERTICES[i][1] + VERTICES[j][1]) / 2,
    class: 'cd-border-line',
  }));
  WORDS.forEach((word, i) => {
    const [x, y] = VERTICES[i];
    svgElement('text', { x, y: i === 0 ? y - 10 : y + 22, class: 'cd-word' }).textContent = `“${word}”`;
  });
  const paths = COLORS.map(color => svgElement('polyline', { stroke: color, class: 'cd-path' }));
  const handle = svgElement('circle', { r: 9, stroke: COLORS[0], class: 'cd-handle' });
  const dots = [];
  dots[1] = svgElement('circle', { r: 5.5, fill: COLORS[1], class: 'cd-dot' });
  dots[0] = svgElement('circle', { r: 5.5, fill: COLORS[0], class: 'cd-dot' });  // on top when they meet

  // One column per word in each histogram: the bar, the count above it and a
  // dashed tick at the expected count.
  const histograms = Array.from(root.querySelectorAll('.cd-hist'), panel => {
    const bars = document.createElement('div');
    const labels = document.createElement('div');
    bars.className = 'cd-bars';
    labels.className = 'cd-labels';
    const columns = WORDS.map(word => {
      const column = document.createElement('div');
      const parts = {};
      column.className = 'cd-col';
      for (const part of ['bar', 'tick', 'count']) {
        parts[part] = document.createElement('div');
        parts[part].className = `cd-${part}`;
        column.appendChild(parts[part]);
      }
      bars.appendChild(column);
      labels.appendChild(document.createElement('span')).textContent = word;
      return parts;
    });
    panel.append(bars, labels);
    return columns;
  });

  const historyDots = Array.from({ length: TESTS }, () => dotsBox.appendChild(document.createElement('span')));

  // ---- Model ----

  function softmax(z, temperature) {
    const m = Math.max(...z);
    const w = z.map(v => Math.exp((v - m) / temperature));
    const s = w[0] + w[1] + w[2];
    return w.map(v => v / s);
  }

  function toXY(q) {
    return [0, 1].map(c => q[0] * VERTICES[0][c] + q[1] * VERTICES[1][c] + q[2] * VERTICES[2][c]);
  }

  function sample(q) {
    const u = Math.random();
    return u < q[0] ? 0 : u < q[0] + q[1] ? 1 : 2;
  }

  function histogram(words, from, to) {
    const counts = [0, 0, 0];
    for (let k = from; k < to; k++) counts[words[k]]++;
    return counts;
  }

  // Two-sample permutation test on the total-variation distance between the
  // histograms of xs and ys, which have the same length.
  function twoSampleTest(xs, ys) {
    const n = xs.length, pool = xs.concat(ys);
    const tv = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / (2 * n);
    const observed = tv(histogram(xs, 0, n), histogram(ys, 0, n));
    let atLeast = 0;
    for (let b = 0; b < PERMUTATIONS; b++) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      if (tv(histogram(pool, 0, n), histogram(pool, n, 2 * n)) >= observed - 1e-9) atLeast++;
    }
    const pValue = (1 + atLeast) / (1 + PERMUTATIONS);
    return { tv: observed, pValue, detected: pValue <= ALPHA };
  }

  function newTest(now) {
    const q = logits.map(z => softmax(z, T));
    return {
      samples: q.map(qq => Array.from({ length: TOKENS }, () => sample(qq))),
      start: now,
      result: null,
      end: 0,
    };
  }

  // ---- Rendering ----

  // The paths and the handle depend on p only, the dots and ticks on p and T.
  function renderModel(pChanged) {
    if (pChanged) {
      logits = [p.map(Math.log), p.map((v, i) => Math.log(v) + DELTA[i])];
      logits.forEach((z, model) => {
        const points = PATH_TEMPERATURES.map(t => toXY(softmax(z, t)).map(v => v.toFixed(1)));
        paths[model].setAttribute('points', points.join(' '));
      });
      const [x, y] = toXY(p);
      handle.setAttribute('cx', x);
      handle.setAttribute('cy', y);

      const top = Math.max(...p);
      const tied = PAIRS.filter(([i, j]) => p[i] === top && p[j] === top);
      borderLines.forEach((line, k) => line.classList.toggle('cd-tied', tied.includes(PAIRS[k])));
      const quote = i => `“${WORDS[i]}”`;
      if (tied.length === 3) borderText.textContent = 'Border input: the three words are tied.';
      else if (tied.length === 1) borderText.textContent = `Border input: ${quote(tied[0][0])} and ${quote(tied[0][1])} are tied.`;
      else borderText.textContent = `Most likely word: ${quote(p.indexOf(top))}. Drag onto a dashed line to tie two words.`;
    }

    temperatureText.textContent = `T = ${T < 0.1 ? T.toFixed(3) : T.toFixed(2)}`;
    logits.forEach((z, model) => {
      const q = softmax(z, T);
      const [x, y] = toXY(q);
      dots[model].setAttribute('cx', x);
      dots[model].setAttribute('cy', y);
      histograms[model].forEach((column, w) => {
        column.tick.style.bottom = `${100 * q[w]}%`;
      });
    });
  }

  function renderTest(shown) {
    current.samples.forEach((words, model) => {
      const counts = histogram(words, 0, shown);
      histograms[model].forEach((column, w) => {
        const height = 100 * counts[w] / TOKENS;
        column.bar.style.height = `${height}%`;
        column.count.style.bottom = `calc(${height}% + 2px)`;
        column.count.textContent = counts[w] || '';
      });
    });

    const result = current.result;
    badge.dataset.state = result ? (result.detected ? 'detected' : 'none') : 'sampling';
    badge.textContent = result ? (result.detected ? 'Change detected' : 'No change detected') : 'Sampling tokens…';
    stats.textContent = result
      ? `TV distance ${result.tv.toFixed(2)} · p-value ${result.pValue.toFixed(3)}`
      : `${shown} of ${TOKENS} tokens from each model`;
  }

  function renderHistory() {
    historyDots.forEach((dot, k) => {
      dot.dataset.state = k < history.length ? (history[k] ? 'detected' : 'none') : '';
    });
    const detected = history.filter(Boolean).length;
    historyText.textContent = history.length ? `Change detected in ${detected} of ${history.length} tests` : '';
  }

  // ---- Animation ----

  function frame(now) {
    if (!visible) {
      running = false;
      current = null;  // restart the interrupted test when back on screen
      return;
    }
    if (!current || (current.result && now >= current.end)) {
      if (history.length >= TESTS) {
        running = false;
        return;
      }
      current = newTest(now);
    }
    const shown = Math.min(TOKENS, 1 + Math.floor((now - current.start) / TOKEN_MS));
    if (shown === TOKENS && !current.result) {
      current.result = twoSampleTest(current.samples[0], current.samples[1]);
      current.end = now + VERDICT_MS;
      history.push(current.result.detected);
      renderHistory();
    }
    renderTest(shown);
    requestAnimationFrame(frame);
  }

  function resume() {
    if (running || !visible) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function restart() {
    history = [];
    if (reduceMotion) {
      for (let k = 0; k < TESTS; k++) {
        current = newTest(0);
        current.result = twoSampleTest(current.samples[0], current.samples[1]);
        history.push(current.result.detected);
      }
      renderTest(TOKENS);
    } else {
      current = null;
      resume();
    }
    renderHistory();
  }

  // ---- Interaction ----

  function barycentric(x, y) {
    const [[x0, y0], [x1, y1], [x2, y2]] = VERTICES;
    const det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    const l0 = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / det;
    const l1 = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / det;
    return [l0, l1, 1 - l0 - l1];
  }

  // Brings a point back into the triangle (every probability at least
  // MIN_PROB) and turns near-ties of the most likely words into exact ties.
  function toProbabilities(l) {
    const clamped = l.map(v => Math.max(v, 0));
    const s = clamped[0] + clamped[1] + clamped[2];
    const q = clamped.map(v => MIN_PROB + (1 - 3 * MIN_PROB) * v / s);
    const [a, b, c] = [0, 1, 2].sort((i, j) => q[j] - q[i]);
    if (q[a] - q[c] < SNAP) return [1 / 3, 1 / 3, 1 / 3];
    if (q[a] - q[b] < SNAP) q[a] = q[b] = (q[a] + q[b]) / 2;
    return q;
  }

  function moveTo(event) {
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 300 / rect.width;
    const y = (event.clientY - rect.top) * 264 / rect.height;
    p = toProbabilities(barycentric(x, y));
    renderModel(true);
    restart();
  }

  svg.addEventListener('pointerdown', event => {
    dragging = true;
    svg.setPointerCapture(event.pointerId);
    moveTo(event);
  });
  svg.addEventListener('pointermove', event => {
    if (dragging) moveTo(event);
  });
  svg.addEventListener('pointerup', () => { dragging = false; });
  svg.addEventListener('pointercancel', () => { dragging = false; });

  slider.addEventListener('input', () => {
    T = Math.pow(10, Number(slider.value));
    renderModel(false);
    restart();
  });

  new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    resume();
  }).observe(root);

  T = Math.pow(10, Number(slider.value));
  renderModel(true);
  current = newTest(0);
  renderTest(0);
  restart();
})();
