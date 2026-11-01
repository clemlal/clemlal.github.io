// Interactive figures of the page on neural networks
// (teaching/2026_2027_MAPI3_Machine_Learning/neural-networks-playground.html):
//   .nn-fig-activation   an activation function σ and its derivative σ'
//   .nn-fig-softmax      logits, their softmax, and the gradient sm(z) - e_c of the cross-entropy
//   .nn-fig-xent         cross-entropy = entropy + Kullback-Leibler divergence, two classes
//   .nn-fig-backprop     forward and backward pass, step by step, on a 2 → 2 → 1 network
//   .nn-fig-ua           the proof of universal approximation: one ReLU unit per knot
// Each figure is independent; colours come from the site's theme (js/themes.js)
// and follow its switch.

(function () {
  const font = () => getComputedStyle(document.body).fontFamily;
  let C = null;

  function readColours() {
    const rgb = window.siteTheme.rgb;
    const dark = 0.2126 * rgb.bg[0] + 0.7152 * rgb.bg[1] + 0.0722 * rgb.bg[2] < 110;
    C = {
      paper: rgb.bg, ink: rgb.text, soft: rgb.textSoft, muted: rgb.muted, faint: rgb.faint, border: rgb.border,
      pos: rgb.dataA, neg: rgb.highlight,
      classes: [rgb.dataA, rgb.highlight, dark ? [94, 190, 160] : [24, 128, 104]],
    };
  }
  const rgba = (c, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  // Sizes a canvas to its width in the page (100% of its parent, see
  // css/styles.css) and the given height, sharp on high-density screens;
  // returns the context and the width.
  function fit(canvas, height) {
    const width = canvas.clientWidth;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  // Axes of a plot of [x0, x1] × [y0, y1] in a box: returns the maps to pixels.
  function frame(ctx, box, x0, x1, y0, y1) {
    const X = x => box.left + (box.width) * (x - x0) / (x1 - x0);
    const Y = y => box.top + (box.height) * (y1 - y) / (y1 - y0);
    return { X, Y };
  }

  // Groups of pill buttons, [data-pills="name"] holding buttons with data-value.
  function bindPills(root, name, onChange) {
    const buttons = root.querySelectorAll(`[data-pills="${name}"] button`);
    buttons.forEach(button => button.addEventListener('click', () => {
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      onChange(button.dataset.value);
    }));
  }

  const figures = [];
  function register(selector, setup) {
    document.querySelectorAll(selector).forEach(root => {
      const draw = setup(root);
      figures.push(draw);
    });
  }

  // ---- σ and σ' ----

  const ACT = {
    relu: { f: u => Math.max(0, u), df: u => (u > 0 ? 1 : 0) },
    sigmoid: { f: u => 1 / (1 + Math.exp(-u)), df: u => { const s = 1 / (1 + Math.exp(-u)); return s * (1 - s); } },
    tanh: { f: Math.tanh, df: u => 1 - Math.tanh(u) ** 2 },
    identity: { f: u => u, df: () => 1 },
  };

  register('.nn-fig-activation', root => {
    const canvas = root.querySelector('canvas');
    let name = 'relu';
    bindPills(root, 'activation', value => {
      name = value;
      root.querySelectorAll('[data-activation]').forEach(el => { el.hidden = el.dataset.activation !== name; });
      draw();
    });

    function draw() {
      const { ctx, width, height } = fit(canvas, 230);
      const box = { left: 30, top: 10, width: width - 40, height: height - 34 };
      const { X, Y } = frame(ctx, box, -4, 4, -1.25, 2.25);
      ctx.font = `11px ${font()}`;
      ctx.fillStyle = rgba(C.muted);
      ctx.strokeStyle = rgba(C.border);
      ctx.lineWidth = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let u = -4; u <= 4; u++) {
        ctx.beginPath();
        ctx.moveTo(X(u), box.top);
        ctx.lineTo(X(u), box.top + box.height);
        ctx.stroke();
        ctx.fillText(String(u), X(u), box.top + box.height + 6);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const v of [-1, 0, 1, 2]) {
        ctx.beginPath();
        ctx.moveTo(box.left, Y(v));
        ctx.lineTo(box.left + box.width, Y(v));
        ctx.strokeStyle = rgba(v === 0 ? C.faint : C.border);
        ctx.stroke();
        ctx.fillText(String(v), box.left - 6, Y(v));
      }
      const { f, df } = ACT[name];
      const curve = (g, color, dash) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(box.left, box.top, box.width, box.height);
        ctx.clip();
        ctx.beginPath();
        for (let i = 0; i <= 400; i++) {
          const u = -4 + 8 * i / 400;
          if (i === 0) ctx.moveTo(X(u), Y(g(u)));
          else if (name === 'relu' && g === df && i > 0 && (-4 + 8 * (i - 1) / 400) < 0 && u >= 0) {
            ctx.lineTo(X(0), Y(0));
            ctx.moveTo(X(0), Y(1));  // the jump of 1{u > 0} at 0
          } else ctx.lineTo(X(u), Y(g(u)));
        }
        ctx.setLineDash(dash);
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = rgba(color);
        ctx.stroke();
        ctx.restore();
      };
      curve(df, C.neg, [6, 4]);
      curve(f, C.pos, []);
      if (name === 'sigmoid') {
        ctx.beginPath();
        ctx.arc(X(0), Y(0.25), 4, 0, 2 * Math.PI);
        ctx.fillStyle = rgba(C.neg);
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = rgba(C.ink);
        ctx.fillText("σ′(0) = 1/4, the maximum", X(0.25), Y(0.08));
      }
    }
    return draw;
  });

  // ---- Softmax and cross-entropy on three classes ----

  register('.nn-fig-softmax', root => {
    const canvas = root.querySelector('canvas');
    const sliders = [...root.querySelectorAll('input[type="range"]')];
    const outputs = [...root.querySelectorAll('[data-logit]')];
    // The logits are kept exactly here, not read back from the sliders, which
    // round to their step: z + 1, 2z and z/2 must change nothing but what
    // they claim to. A button that would take a logit out of [-RANGE, RANGE]
    // is disabled rather than clipping it, which would change the differences.
    const RANGE = 10;
    const buttons = Object.fromEntries(['shift', 'double', 'halve', 'reset'].map(a => [a, root.querySelector(`[data-action="${a}"]`)]));
    let z = sliders.map(s => Number(s.value)), c = 0;
    bindPills(root, 'class', value => { c = Number(value); draw(); });
    sliders.forEach((s, k) => s.addEventListener('input', () => { z[k] = Number(s.value); draw(); }));
    const set = values => {
      z = values;
      sliders.forEach((s, k) => { s.value = z[k]; });
      draw();
    };
    buttons.shift.addEventListener('click', () => set(z.map(v => v + 1)));
    buttons.double.addEventListener('click', () => set(z.map(v => 2 * v)));
    buttons.halve.addEventListener('click', () => set(z.map(v => v / 2)));
    buttons.reset.addEventListener('click', () => set([1.5, 0.5, -1]));
    const short = v => String(Number(v.toFixed(2)));

    function draw() {
      const max = Math.max(...z), e = z.map(v => Math.exp(v - max)), s = e.reduce((a, b) => a + b, 0);
      const p = e.map(v => v / s), grad = p.map((v, k) => v - (k === c ? 1 : 0));
      buttons.shift.disabled = max + 1 > RANGE;
      buttons.double.disabled = Math.max(...z.map(Math.abs)) * 2 > RANGE;
      outputs.forEach((out, k) => { out.textContent = short(z[k]); });
      root.querySelector('[data-out="loss"]').textContent = (-Math.log(p[c])).toFixed(3);
      root.querySelector('[data-out="sum"]').textContent = p.reduce((a, b) => a + b, 0).toFixed(3);

      const { ctx, width, height } = fit(canvas, 220);
      const panels = [
        { title: 'logits z', values: z, lo: -RANGE, hi: RANGE, text: short },
        { title: 'sm(z) ∈ Δ₂', values: p, lo: 0, hi: 1, text: v => v.toFixed(2) },
        { title: 'gradient sm(z) − e_c', values: grad, lo: -1, hi: 1, text: v => v.toFixed(2) },
      ];
      const gap = 18, panelWidth = (width - 2 * gap) / 3, top = 24, bottom = height - 20;
      ctx.font = `12px ${font()}`;
      panels.forEach((panel, i) => {
        const left = i * (panelWidth + gap);
        const Y = v => top + (bottom - top) * (panel.hi - v) / (panel.hi - panel.lo);
        ctx.fillStyle = rgba(C.ink);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(panel.title, left + panelWidth / 2, 0);
        ctx.strokeStyle = rgba(C.faint);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, Y(Math.max(panel.lo, 0)));
        ctx.lineTo(left + panelWidth, Y(Math.max(panel.lo, 0)));
        ctx.stroke();
        const barWidth = panelWidth / 3 * 0.62;
        panel.values.forEach((v, k) => {
          const x = left + panelWidth * (k + 0.5) / 3 - barWidth / 2;
          const y0 = Y(Math.max(panel.lo, 0)), y1 = Y(Math.max(panel.lo, Math.min(panel.hi, v)));
          ctx.fillStyle = rgba(C.classes[k], k === c ? 0.95 : 0.6);
          ctx.fillRect(x, Math.min(y0, y1), barWidth, Math.abs(y1 - y0));
          if (k === c) {
            ctx.strokeStyle = rgba(C.ink);
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, Math.min(y0, y1), barWidth, Math.max(1, Math.abs(y1 - y0)));
          }
          ctx.fillStyle = rgba(C.soft);
          ctx.textBaseline = v >= 0 ? 'bottom' : 'top';
          ctx.fillText(panel.text(v), x + barWidth / 2, v >= 0 ? y1 - 2 : y1 + 2);
          ctx.textBaseline = 'top';
          ctx.fillStyle = rgba(C.muted);
          ctx.fillText(String(k + 1), x + barWidth / 2, bottom + 4);
        });
      });
    }
    return draw;
  });

  // ---- Cross-entropy = entropy + KL, two classes ----

  register('.nn-fig-xent', root => {
    const canvas = root.querySelector('canvas');
    const pInput = root.querySelector('[data-input="p"]'), qInput = root.querySelector('[data-input="q"]');
    pInput.addEventListener('input', draw);
    qInput.addEventListener('input', draw);
    root.querySelector('[data-action="onehot"]').addEventListener('click', () => { pInput.value = 1; draw(); });
    root.querySelector('[data-action="half"]').addEventListener('click', () => { pInput.value = 0.5; qInput.value = 0.5; draw(); });
    const xlogy = (x, y) => (x === 0 ? 0 : x * Math.log(y));
    const loss = (p, q) => -xlogy(p, q) - xlogy(1 - p, 1 - q);
    let box = null;

    // Drag on the plot to move q.
    let dragging = false;
    const dragTo = event => {
      const rect = canvas.getBoundingClientRect();
      const q = (event.clientX - rect.left - box.left) / box.width;
      qInput.value = Math.max(0.01, Math.min(0.99, q)).toFixed(2);
      draw();
    };
    canvas.addEventListener('pointerdown', event => { dragging = true; canvas.setPointerCapture(event.pointerId); dragTo(event); });
    canvas.addEventListener('pointermove', event => { if (dragging) dragTo(event); });
    canvas.addEventListener('pointerup', () => { dragging = false; });

    function draw() {
      const p = Number(pInput.value), q = Number(qInput.value);
      const H = loss(p, p), L = loss(p, q), KL = L - H;
      root.querySelector('[data-out="p"]').textContent = p.toFixed(2);
      root.querySelector('[data-out="q"]').textContent = q.toFixed(2);
      root.querySelector('[data-out="loss"]').textContent = L.toFixed(3);
      root.querySelector('[data-out="entropy"]').textContent = H.toFixed(3);
      root.querySelector('[data-out="kl"]').textContent = KL.toFixed(3);

      const { ctx, width, height } = fit(canvas, 250);
      box = { left: 34, top: 10, width: width - 44, height: height - 46 };
      const { X, Y } = frame(ctx, box, 0, 1, 0, 3);
      ctx.font = `11px ${font()}`;
      ctx.fillStyle = rgba(C.muted);
      ctx.strokeStyle = rgba(C.border);
      ctx.lineWidth = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i <= 4; i++) {
        const v = i / 4;
        ctx.beginPath();
        ctx.moveTo(X(v), box.top);
        ctx.lineTo(X(v), box.top + box.height);
        ctx.stroke();
        ctx.fillText(String(v), X(v), box.top + box.height + 6);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let v = 0; v <= 3; v++) {
        ctx.beginPath();
        ctx.moveTo(box.left, Y(v));
        ctx.lineTo(box.left + box.width, Y(v));
        ctx.stroke();
        ctx.fillText(String(v), box.left - 6, Y(v));
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('prediction q (probability of class 1)', box.left + box.width / 2, box.top + box.height + 18);

      ctx.save();
      ctx.beginPath();
      ctx.rect(box.left, box.top, box.width, box.height);
      ctx.clip();
      // The entropy H(p), the floor of q ↦ ℓ(p, q).
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = rgba(C.muted);
      ctx.beginPath();
      ctx.moveTo(box.left, Y(H));
      ctx.lineTo(box.left + box.width, Y(H));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 1; i < 400; i++) {
        const v = i / 400;
        if (i === 1) ctx.moveTo(X(v), Y(loss(p, v)));
        else ctx.lineTo(X(v), Y(loss(p, v)));
      }
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = rgba(C.ink);
      ctx.stroke();
      // At q: entropy, then divergence, stacked.
      const bar = 7;
      ctx.fillStyle = rgba(C.pos, 0.85);
      ctx.fillRect(X(q) - bar / 2, Y(H), bar, Y(0) - Y(H));
      ctx.fillStyle = rgba(C.neg, 0.9);
      ctx.fillRect(X(q) - bar / 2, Y(L), bar, Y(H) - Y(L));
      ctx.restore();
      // The minimum, at q = p.
      ctx.beginPath();
      ctx.arc(X(Math.min(0.995, Math.max(0.005, p))), Y(H), 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = rgba(C.ink);
      ctx.fill();
    }
    return draw;
  });

  // ---- Backpropagation, step by step ----

  register('.nn-fig-backprop', root => {
    const STEPS = 10;  // 0: start, 1-4: forward, 5-9: backward
    const GAMMA = 0.03;
    const x = [1, 0.5], y = 1;
    const initial = { W1: [[0.8, -0.4], [-0.3, 0.6]], b1: [0.1, 0.2], W2: [0.9, -0.8], b2: 0.05 };
    let theta = clone(initial), act = 'relu', step = 0, losses = [];

    function clone(t) {
      return { W1: t.W1.map(r => r.slice()), b1: t.b1.slice(), W2: t.W2.slice(), b2: t.b2 };
    }

    // Forward and backward pass; returns every intermediate quantity.
    function pass(t) {
      const { f, df } = ACT[act];
      const a1 = [0, 1].map(i => t.W1[i][0] * x[0] + t.W1[i][1] * x[1] + t.b1[i]);
      const h1 = a1.map(f);
      const a2 = t.W2[0] * h1[0] + t.W2[1] * h1[1] + t.b2;
      const loss = (a2 - y) ** 2;
      const da2 = 2 * (a2 - y);
      const dW2 = h1.map(h => da2 * h), db2 = da2;
      const dh1 = t.W2.map(w => w * da2);
      const s1 = a1.map(df);
      const da1 = dh1.map((d, i) => d * s1[i]);
      const dW1 = da1.map(d => x.map(xi => d * xi)), db1 = da1.slice();
      return { a1, h1, a2, loss, da2, dW2, db2, dh1, s1, da1, dW1, db1 };
    }

    const lossOf = t => pass(t).loss;
    const n3 = v => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3).replace('-', '−');
    const vec = v => `(${v.map(n3).join(', ')})`;
    const mat = m => m.map(r => `[${r.map(n3).join(', ')}]`).join('\n');

    function render() {
      const r = pass(theta);
      const show = (key, text, from) => root.querySelectorAll(`[data-v="${key}"]`).forEach(el => {
        el.textContent = step >= from ? text : '·';
      });
      // Forward values.
      show('x', vec(x), 0);
      show('a1', vec(r.a1), 1);
      show('h1', vec(r.h1), 2);
      show('a2', n3(r.a2), 3);
      show('loss', n3(r.loss), 4);
      show('y', n3(y), 0);
      // Backward values.
      show('da2', n3(r.da2), 5);
      show('dW2', `(${r.dW2.map(n3).join(', ')})`, 6);
      show('db2', n3(r.db2), 6);
      show('dh1', vec(r.dh1), 7);
      show('s1', vec(r.s1), 8);
      show('da1', vec(r.da1), 8);
      show('dW1', mat(r.dW1), 9);
      show('db1', vec(r.db1), 9);
      show('dloss', '1', 5);
      // Parameters.
      show('W1', mat(theta.W1), 0);
      show('b1', vec(theta.b1), 0);
      show('W2', `(${theta.W2.map(n3).join(', ')})`, 0);
      show('b2', n3(theta.b2), 0);

      root.querySelectorAll('[data-step]').forEach(el => { el.hidden = Number(el.dataset.step) !== step; });
      root.querySelectorAll('[data-node]').forEach(el => {
        const at = el.dataset.node.split(' ').map(Number);
        el.classList.toggle('is-current', at.includes(step));
      });
      root.querySelectorAll('[data-from]').forEach(el => { el.classList.toggle('is-known', step >= Number(el.dataset.from)); });
      root.querySelector('[data-out="step"]').textContent = step === 0 ? 'start' : step <= 4 ? `forward ${step}/4` : `backward ${step - 4}/5`;
      root.querySelector('[data-action="back"]').disabled = step === 0;
      root.querySelector('[data-action="next"]').disabled = step === STEPS - 1;
      root.querySelector('[data-action="descend"]').disabled = step !== STEPS - 1;
      root.querySelector('[data-action="check"]').disabled = step !== STEPS - 1;
      root.querySelector('[data-out="losses"]').textContent = [...losses, r.loss].map(v => v.toFixed(4)).join(' → ');
    }

    // Partial derivatives by backpropagation and by centred finite differences.
    function check() {
      const r = pass(theta), eps = 1e-5, rows = [];
      const entries = [
        ['W₁[1,1]', t => t.W1[0], 0, r.dW1[0][0]], ['W₁[1,2]', t => t.W1[0], 1, r.dW1[0][1]],
        ['W₁[2,1]', t => t.W1[1], 0, r.dW1[1][0]], ['W₁[2,2]', t => t.W1[1], 1, r.dW1[1][1]],
        ['b₁[1]', t => t.b1, 0, r.db1[0]], ['b₁[2]', t => t.b1, 1, r.db1[1]],
        ['W₂[1]', t => t.W2, 0, r.dW2[0]], ['W₂[2]', t => t.W2, 1, r.dW2[1]],
      ];
      for (const [name, get, k, back] of entries) {
        const plus = clone(theta), minus = clone(theta);
        get(plus)[k] += eps;
        get(minus)[k] -= eps;
        rows.push([name, back, (lossOf(plus) - lossOf(minus)) / (2 * eps)]);
      }
      const plus = clone(theta), minus = clone(theta);
      plus.b2 += eps;
      minus.b2 -= eps;
      rows.push(['b₂', r.db2, (lossOf(plus) - lossOf(minus)) / (2 * eps)]);
      const table = root.querySelector('.nn-bp-check tbody');
      table.innerHTML = rows.map(([name, back, numeric]) => `<tr><td>${name}</td><td>${back.toFixed(6)}</td><td>${numeric.toFixed(6)}</td><td>${Math.abs(back - numeric).toExponential(1)}</td></tr>`).join('');
      root.querySelector('.nn-bp-check').hidden = false;
    }

    root.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'next') step = Math.min(STEPS - 1, step + 1);
      if (action === 'back') step = Math.max(0, step - 1);
      if (action === 'all') step = STEPS - 1;
      if (action === 'restart') {
        theta = clone(initial);
        losses = [];
        step = 0;
        root.querySelector('.nn-bp-check').hidden = true;
      }
      if (action === 'descend') {
        const r = pass(theta);
        losses.push(r.loss);
        theta.W1 = theta.W1.map((row, i) => row.map((w, j) => w - GAMMA * r.dW1[i][j]));
        theta.b1 = theta.b1.map((b, i) => b - GAMMA * r.db1[i]);
        theta.W2 = theta.W2.map((w, i) => w - GAMMA * r.dW2[i]);
        theta.b2 -= GAMMA * r.db2;
        step = 0;
        root.querySelector('.nn-bp-check').hidden = true;
      }
      if (action === 'check') check();
      render();
    });
    bindPills(root, 'activation', value => {
      act = value;
      root.querySelectorAll('[data-sigma]').forEach(el => { el.hidden = el.dataset.sigma !== act; });
      root.querySelector('.nn-bp-check').hidden = true;
      render();
    });
    render();
    return () => {};
  });

  // ---- Universal approximation: the construction of the proof ----

  register('.nn-fig-ua', root => {
    const main = root.querySelector('.nn-ua-main canvas'), errors = root.querySelector('.nn-ua-errors canvas');
    const knotsInput = root.querySelector('[data-input="knots"]'), unitsInput = root.querySelector('[data-input="units"]');
    const a = -1, b = 1, DRAWN = 201;
    const drawn = Float64Array.from({ length: DRAWN }, (_, i) => 0.6 * Math.sin(4 * (a + (b - a) * i / (DRAWN - 1))));
    const TARGETS = {
      sine: { g: x => 0.8 * Math.sin(5 * x), G: 4 },
      bump: { g: x => 1.6 * Math.exp(-6 * x * x) - 0.8, G: 1.6 * 12 * Math.exp(-0.5) / Math.sqrt(12) },
      sqrt: { g: x => 1.4 * Math.sqrt(Math.abs(x)) - 0.7, G: Infinity },
      draw: { g: x => interpolate(drawn, x), G: null },
    };
    let target = 'sine', errorCurve = null;
    const g = x => TARGETS[target].g(x);

    function interpolate(values, x) {
      const t = (x - a) / (b - a) * (values.length - 1), i = Math.max(0, Math.min(values.length - 2, Math.floor(t)));
      return values[i] + (t - i) * (values[i + 1] - values[i]);
    }

    // The knots a = x_1 < ... < x_N = b, the slopes S_k on [x_k, x_{k+1}], and
    // the units of the proof: unit 0 has its kink at x_0 = a - 1 and slope
    // S_0 = g(a) there, unit i ≥ 1 its kink at x_i, and coefficient
    // η_i = S_i - S_{i-1} (S_{-1} = 0, S_N = S_{N-1}).
    function construction(N) {
      const xs = Array.from({ length: N }, (_, k) => a + (b - a) * k / (N - 1));
      const ys = xs.map(g);
      const S = [];
      for (let k = 0; k + 1 < N; k++) S.push((ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]));
      const units = [{ kink: a - 1, eta: ys[0] }];
      units.push({ kink: xs[0], eta: S[0] - ys[0] });
      for (let k = 1; k + 1 < N; k++) units.push({ kink: xs[k], eta: S[k] - S[k - 1] });
      return { xs, ys, units };
    }
    const network = (units, count, x) => {
      let s = 0;
      for (let i = 0; i < count; i++) s += units[i].eta * Math.max(0, x - units[i].kink);
      return s;
    };
    function supError(N) {
      const { units } = construction(N);
      let e = 0;
      for (let i = 0; i <= 1000; i++) {
        const x = a + (b - a) * i / 1000;
        e = Math.max(e, Math.abs(g(x) - network(units, units.length, x)));
      }
      return e;
    }
    function lipschitz() {
      if (TARGETS[target].G !== null) return TARGETS[target].G;
      let G = 0;
      for (let i = 0; i + 1 < DRAWN; i++) G = Math.max(G, Math.abs(drawn[i + 1] - drawn[i]) * (DRAWN - 1) / (b - a));
      return G;
    }

    bindPills(root, 'target', value => {
      target = value;
      root.classList.toggle('is-drawing', target === 'draw');
      errorCurve = null;
      draw();
    });
    knotsInput.addEventListener('input', () => {
      unitsInput.max = knotsInput.value;
      unitsInput.value = knotsInput.value;
      draw();
    });
    unitsInput.addEventListener('input', draw);

    // Drawing the target by hand.
    let last = null;
    const paint = event => {
      const rect = main.getBoundingClientRect(), box = mainBox(rect.width);
      const x = a + (event.clientX - rect.left - box.left) / box.width * (b - a);
      const y = 1.6 - (event.clientY - rect.top - box.top) / box.height * 3.2;
      const i = Math.round((x - a) / (b - a) * (DRAWN - 1));
      if (i < 0 || i >= DRAWN) return;
      const from = last || [i, y];
      const lo = Math.min(from[0], i), hi = Math.max(from[0], i);
      for (let k = lo; k <= hi; k++) {
        const t = hi === lo ? 1 : (k - from[0]) / (i - from[0]);
        drawn[k] = Math.max(-1.5, Math.min(1.5, from[1] + t * (y - from[1])));
      }
      last = [i, y];
      errorCurve = null;
      draw();
    };
    main.addEventListener('pointerdown', event => {
      if (target !== 'draw') return;
      main.setPointerCapture(event.pointerId);
      last = null;
      paint(event);
    });
    main.addEventListener('pointermove', event => { if (target === 'draw' && last) paint(event); });
    main.addEventListener('pointerup', () => { last = null; });

    const mainBox = width => ({ left: 30, top: 10, width: width - 40, height: 300 - 34 });

    function draw() {
      const N = Number(knotsInput.value), count = Math.min(Number(unitsInput.value), N);
      const { xs, ys, units } = construction(N);
      const { ctx, width, height } = fit(main, 300);
      const box = mainBox(width);
      const { X, Y } = frame(ctx, box, a - 0.1, b + 0.1, -1.6, 1.6);
      ctx.font = `11px ${font()}`;
      ctx.strokeStyle = rgba(C.border);
      ctx.fillStyle = rgba(C.muted);
      ctx.lineWidth = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const v of [-1, -0.5, 0, 0.5, 1]) {
        ctx.beginPath();
        ctx.moveTo(X(v), box.top);
        ctx.lineTo(X(v), box.top + box.height);
        ctx.stroke();
        ctx.fillText(String(v), X(v), box.top + box.height + 6);
      }
      ctx.beginPath();
      ctx.moveTo(box.left, Y(0));
      ctx.lineTo(box.left + box.width, Y(0));
      ctx.strokeStyle = rgba(C.faint);
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.rect(box.left, box.top, box.width, box.height);
      ctx.clip();
      const curve = (h, color, lineWidth, dash = [], from = a, to = b) => {
        ctx.beginPath();
        for (let i = 0; i <= 600; i++) {
          const x = from + (to - from) * i / 600;
          if (i === 0) ctx.moveTo(X(x), Y(h(x)));
          else ctx.lineTo(X(x), Y(h(x)));
        }
        ctx.setLineDash(dash);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.setLineDash([]);
      };
      // The target g, thick and pale.
      curve(g, rgba(C.faint, 0.9), 7);
      // The terms of the units already added, thin.
      if (root.querySelector('[data-input="terms"]').checked) {
        // Each term from its kink on (it is zero before).
        for (let i = 0; i < count; i++) curve(x => units[i].eta * (x - units[i].kink), rgba(i % 2 ? C.neg : C.pos, 0.55), 1.2, [], Math.max(a - 0.1, units[i].kink), b + 0.1);
      }
      // The network with all its units (the interpolant), then the partial sum.
      if (count < units.length) curve(x => network(units, units.length, x), rgba(C.ink, 0.35), 1.5, [4, 4]);
      curve(x => network(units, count, x), rgba(C.ink), 2.4, [], a - 0.1, b + 0.1);
      ctx.restore();
      // The knots, the active ones filled.
      xs.forEach((xk, k) => {
        ctx.beginPath();
        ctx.arc(X(xk), Y(ys[k]), N > 40 ? 2 : 3.2, 0, 2 * Math.PI);
        ctx.fillStyle = k < count ? rgba(C.pos) : rgba(C.paper);
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = rgba(C.pos);
        ctx.stroke();
      });

      const G = lipschitz(), eta = (b - a) / (N - 1), error = supError(N);
      root.querySelector('[data-out="knots"]').textContent = N;
      root.querySelector('[data-out="units"]').textContent = `${count} of ${N}`;
      root.querySelector('[data-out="error"]').textContent = error.toFixed(4);
      root.querySelector('[data-out="spacing"]').textContent = eta.toFixed(4);
      root.querySelector('[data-out="bound"]').textContent = Number.isFinite(G) ? `${(G * eta).toFixed(4)}  (G ≈ ${G.toFixed(2)})` : 'none: g is not Lipschitz';
      drawErrors(N, G);
    }

    // Uniform error of the interpolant against N, log-log, with the
    // guarantee G (b - a)/(N - 1) of a G-Lipschitz target.
    function drawErrors(N, G) {
      if (!errorCurve) errorCurve = Array.from({ length: 63 }, (_, i) => [i + 2, supError(i + 2)]);
      const { ctx, width, height } = fit(errors, 300);
      const box = { left: 40, top: 10, width: width - 50, height: height - 40 };
      const { X, Y } = frame(ctx, box, Math.log10(2), Math.log10(64), -4, 1);
      ctx.font = `11px ${font()}`;
      ctx.fillStyle = rgba(C.muted);
      ctx.strokeStyle = rgba(C.border);
      ctx.lineWidth = 1;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let e = -4; e <= 1; e++) {
        ctx.beginPath();
        ctx.moveTo(box.left, Y(e));
        ctx.lineTo(box.left + box.width, Y(e));
        ctx.stroke();
        ctx.fillText(`10${String(e).replace('-', '⁻').replace(/[0-9]/, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c])}`, box.left - 6, Y(e));
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const v of [2, 4, 8, 16, 32, 64]) {
        ctx.beginPath();
        ctx.moveTo(X(Math.log10(v)), box.top);
        ctx.lineTo(X(Math.log10(v)), box.top + box.height);
        ctx.stroke();
        ctx.fillText(String(v), X(Math.log10(v)), box.top + box.height + 6);
      }
      ctx.fillText('number of units N', box.left + box.width / 2, box.top + box.height + 20);
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.left, box.top, box.width, box.height);
      ctx.clip();
      if (Number.isFinite(G)) {
        ctx.beginPath();
        errorCurve.forEach(([n], i) => {
          const v = Math.log10(Math.max(1e-9, G * (b - a) / (n - 1)));
          if (i === 0) ctx.moveTo(X(Math.log10(n)), Y(v));
          else ctx.lineTo(X(Math.log10(n)), Y(v));
        });
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = rgba(C.neg);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      errorCurve.forEach(([n, e], i) => {
        const v = Math.log10(Math.max(1e-9, e));
        if (i === 0) ctx.moveTo(X(Math.log10(n)), Y(v));
        else ctx.lineTo(X(Math.log10(n)), Y(v));
      });
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = rgba(C.ink);
      ctx.stroke();
      ctx.restore();
      const current = errorCurve[N - 2];
      ctx.beginPath();
      ctx.arc(X(Math.log10(N)), Y(Math.log10(Math.max(1e-9, current[1]))), 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = rgba(C.pos);
      ctx.fill();
    }
    root.querySelector('[data-input="terms"]').addEventListener('change', draw);
    return draw;
  });

  // ---- Start, theme and size ----

  readColours();
  const drawAll = () => figures.forEach(draw => draw());
  drawAll();
  window.addEventListener('sitethemechange', () => {
    readColours();
    drawAll();
  });
  let width = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    drawAll();
  });
})();
