// Interactive figures on neural networks, each built in every element of the
// page that has its class, so that any page can use any of them:
//   .nn-fig-activation   an activation function σ and its derivative σ'
//   .nn-fig-softmax      logits, their softmax, and the gradient sm(z) - e_c of the cross-entropy
//   .nn-fig-xent         cross-entropy = entropy + Kullback-Leibler divergence, two classes
//   .nn-fig-backprop     forward and backward pass, step by step, on a 2 → 2 → 1 network
//   .nn-fig-ua           the proof of universal approximation: one ReLU unit per knot
//   .nn-fig-neuron       one neuron σ(w·x + b) on the plane: its hyperplane and its values
//   .nn-fig-xor          a 2 → 2 → 1 ReLU network whose weights are typed in, on the XOR points
//   .nn-fig-vanishing    gradient norms layer by layer at initialization (js/nn-engine.js)
//   .nn-fig-double-descent   test error of random-feature networks against their width,
//                        with the minimum-norm fit (double descent) or a ridge penalty
// Used by teaching/2026_2027_MAPI3_Machine_Learning/neural-networks-playground.html
// (English) and teaching/2026_2027_SID_Advanced_Statistical_Learning/reseaux-de-neurones.html
// (French): the texts of a figure are in its markup, the few words drawn on
// the canvases are in STRINGS below. Colours come from the site's theme and
// redraws on theme switches and resizes are handled by js/lab-kit.js.

(function () {
  if (!window.Lab) return;
  const { rgba, font, format } = Lab;
  let C = Lab.colours();

  const T = Lab.strings({
    en: {
      sigmoidMax: 'σ′(0) = 1/4, the maximum', logits: 'logits z', gradient: 'gradient sm(z) − e_c',
      prediction: 'prediction q (probability of class 1)', start: 'start', forward: 'forward {k}/4', backward: 'backward {k}/5',
      units: 'number of units N', unitsOf: '{k} of {n}', notLipschitz: 'none: g is not Lipschitz',
      layer: 'layer', gradNorm: '‖∇W_l F‖ (log scale)', width: 'width p (log scale)', testError: 'test error (solid), training error (dashed)',
      norm: 'norm of the last layer ‖a‖', solved: '✓ XOR solved', notSolved: 'not yet',
    },
    fr: {
      sigmoidMax: 'σ′(0) = 1/4, le maximum', logits: 'logits z', gradient: 'gradient sm(z) − e_c',
      prediction: 'prédiction q (probabilité de la classe 1)', start: 'départ', forward: 'aller {k}/4', backward: 'retour {k}/5',
      units: 'nombre d’unités N', unitsOf: '{k} sur {n}', notLipschitz: 'aucune : g n’est pas lipschitzienne',
      layer: 'couche', gradNorm: '‖∇W_l F‖ (échelle log)', width: 'largeur p (échelle log)', testError: 'erreur de test (trait), d’entraînement (tirets)',
      norm: 'norme de la dernière couche ‖a‖', solved: '✓ XOR résolu', notSolved: 'pas encore',
    },
  });

  const fit = Lab.fit;

  // Axes of a plot of [x0, x1] × [y0, y1] in a box: returns the maps to pixels.
  function frame(ctx, box, x0, x1, y0, y1) {
    const X = x => box.left + (box.width) * (x - x0) / (x1 - x0);
    const Y = y => box.top + (box.height) * (y1 - y) / (y1 - y0);
    return { X, Y };
  }

  const bindPills = Lab.bindPills;

  // A figure of this file: its draw function reads the theme's colours first.
  function register(selector, setup) {
    Lab.figure(selector, root => {
      const draw = setup(root);
      return () => {
        C = Lab.colours();
        draw();
      };
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
        ctx.fillText(T.sigmoidMax, X(0.25), Y(0.08));
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
        { title: T.logits, values: z, lo: -RANGE, hi: RANGE, text: short },
        { title: 'sm(z) ∈ Δ₂', values: p, lo: 0, hi: 1, text: v => v.toFixed(2) },
        { title: T.gradient, values: grad, lo: -1, hi: 1, text: v => v.toFixed(2) },
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
      ctx.fillText(T.prediction, box.left + box.width / 2, box.top + box.height + 18);

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
      root.querySelector('[data-out="step"]').textContent = step === 0 ? T.start : step <= 4 ? format(T.forward, { k: step }) : format(T.backward, { k: step - 4 });
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
      root.querySelector('[data-out="units"]').textContent = format(T.unitsOf, { k: count, n: N });
      root.querySelector('[data-out="error"]').textContent = error.toFixed(4);
      root.querySelector('[data-out="spacing"]').textContent = eta.toFixed(4);
      root.querySelector('[data-out="bound"]').textContent = Number.isFinite(G) ? `${(G * eta).toFixed(4)}  (G ≈ ${G.toFixed(2)})` : T.notLipschitz;
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
      ctx.fillText(T.units, box.left + box.width / 2, box.top + box.height + 20);
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


  const out = (root, key, text) => root.querySelectorAll(`[data-out="${key}"]`).forEach(el => { el.textContent = text; });
  const n3 = v => (Math.abs(v) < 5e-5 ? 0 : v).toFixed(4).replace('-', '−');

  // ---- One neuron ----

  register('.nn-fig-neuron', root => {
    const canvas = root.querySelector('canvas'), inputs = ['w1', 'w2', 'b'].map(k => root.querySelector(`[data-input="${k}"]`));
    let act = 'relu', probe = [1, 1];
    bindPills(root, 'activation', v => { act = v; draw(); });
    inputs.forEach(i => i.addEventListener('input', () => draw()));
    const VIEW = 2.5;
    canvas.addEventListener('click', event => {
      const rect = canvas.getBoundingClientRect(), S = rect.width;
      probe = [-VIEW + 2 * VIEW * (event.clientX - rect.left) / S, VIEW - 2 * VIEW * (event.clientY - rect.top) / S];
      draw();
    });

    function draw() {
      const [w1, w2, b] = inputs.map(i => Number(i.value)), { f } = ACT[act];
      const z = w1 * probe[0] + w2 * probe[1] + b;
      out(root, 'w1', w1.toFixed(1)); out(root, 'w2', w2.toFixed(1)); out(root, 'b', b.toFixed(1));
      out(root, 'x', `(${probe.map(v => v.toFixed(2)).join(' ; ')})`);
      out(root, 'z', n3(z)); out(root, 'a', n3(f(z)));
      const width = canvas.clientWidth, S = Math.min(width, 360);
      const { ctx } = fit(canvas, S, S);
      // Values on a lattice: from the page colour to the first colour (positive) or the second (negative).
      const N = 80, image = ctx.createImageData(N, N), lo = act === 'sigmoid' ? 0.5 : 0, scale = act === 'sigmoid' ? 0.5 : act === 'tanh' ? 1 : Math.max(1e-9, (Math.abs(w1) + Math.abs(w2)) * VIEW + Math.abs(b));
      for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
        const x1 = -VIEW + 2 * VIEW * (gx + 0.5) / N, x2 = VIEW - 2 * VIEW * (gy + 0.5) / N;
        const t = Math.max(-1, Math.min(1, (f(w1 * x1 + w2 * x2 + b) - lo) / scale));
        const c = Lab.mix(C.paper, t >= 0 ? C.pos : C.neg, 0.75 * Math.abs(t)), k = 4 * (gy * N + gx);
        image.data[k] = c[0]; image.data[k + 1] = c[1]; image.data[k + 2] = c[2]; image.data[k + 3] = 255;
      }
      const small = document.createElement('canvas');
      small.width = small.height = N;
      small.getContext('2d').putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(small, 0, 0, S, S);
      const P = (x1, x2) => [(x1 + VIEW) / (2 * VIEW) * S, (VIEW - x2) / (2 * VIEW) * S];
      Lab.polyline(ctx, [P(-VIEW, 0), P(VIEW, 0)], { color: C.faint, width: 1 });
      Lab.polyline(ctx, [P(0, -VIEW), P(0, VIEW)], { color: C.faint, width: 1 });
      // The hyperplane w·x + b = 0 and the normal w from its point closest to 0.
      const norm2 = w1 * w1 + w2 * w2;
      if (norm2 > 1e-12) {
        const x0 = [-b * w1 / norm2, -b * w2 / norm2], dir = [-w2, w1], far = 10;
        Lab.polyline(ctx, [P(x0[0] - far * dir[0], x0[1] - far * dir[1]), P(x0[0] + far * dir[0], x0[1] + far * dir[1])], { color: C.ink, width: 1.6, dash: [6, 4] });
        const len = Math.sqrt(norm2), tip = [x0[0] + w1 / len * 0.8, x0[1] + w2 / len * 0.8];
        Lab.arrow(ctx, ...P(...x0), ...P(...tip), { color: C.ink, width: 2, head: 8 });
        const [lx, ly] = P(...tip);
        ctx.fillStyle = rgba(C.ink);
        ctx.font = `12px ${font()}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('w', lx + 6, ly - 4);
      }
      Lab.dot(ctx, ...P(...probe), 5, C.ink, C.paper);
    }
    return draw;
  });

  // ---- XOR with two ReLU units, by hand ----

  register('.nn-fig-xor', root => {
    const canvas = root.querySelector('canvas');
    const keys = ['w11', 'w12', 'w21', 'w22', 'b1', 'b2', 'v1', 'v2', 'c'];
    const field = k => root.querySelector(`[data-weight="${k}"]`);
    const PRESETS = {
      course: { w11: 1, w12: 1, w21: 1, w22: 1, b1: 0, b2: -1, v1: 1, v2: -2, c: 0 },
      zero: Object.fromEntries(keys.map(k => [k, 0])),
    };
    const POINTS = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]];
    const set = values => { keys.forEach(k => { field(k).value = values[k]; }); draw(); };
    root.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.preset === 'random') {
        const rand = Lab.random(Math.floor(Math.random() * 1e9));
        set(Object.fromEntries(keys.map(k => [k, Number(rand.uniform(-2, 2).toFixed(1))])));
      } else set(PRESETS[b.dataset.preset]);
    }));
    keys.forEach(k => field(k).addEventListener('input', () => draw()));
    const read = () => Object.fromEntries(keys.map(k => [k, Number(String(field(k).value).replace(',', '.')) || 0]));
    const net = (p, x1, x2) => {
      const h1 = Math.max(0, p.w11 * x1 + p.w12 * x2 + p.b1), h2 = Math.max(0, p.w21 * x1 + p.w22 * x2 + p.b2);
      return { h1, h2, f: p.v1 * h1 + p.v2 * h2 + p.c };
    };

    function draw() {
      const p = read();
      const rows = POINTS.map(([x1, x2, y]) => ({ x1, x2, y, ...net(p, x1, x2) }));
      const ok = rows.every(r => Math.abs(r.f - r.y) < 0.1);
      const table = root.querySelector('[data-out="table"]');
      table.innerHTML = `<tr><th>x</th><th>h₁</th><th>h₂</th><th>f(x)</th><th>XOR</th></tr>` + rows.map(r => `<tr><td>(${r.x1}, ${r.x2})</td><td>${n3(r.h1)}</td><td>${n3(r.h2)}</td><td><strong>${n3(r.f)}</strong></td><td>${r.y}</td></tr>`).join('');
      out(root, 'verdict', ok ? T.solved : T.notSolved);
      const width = canvas.clientWidth, S = Math.min(width, 320), lo = -0.5, hi = 1.5;
      const { ctx } = fit(canvas, S, S);
      const N = 80, image = ctx.createImageData(N, N);
      for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
        const x1 = lo + (hi - lo) * (gx + 0.5) / N, x2 = hi - (hi - lo) * (gy + 0.5) / N;
        const v = net(p, x1, x2).f, t = Math.max(-1, Math.min(1, v));
        const c = Lab.mix(C.paper, t >= 0 ? C.pos : C.neg, 0.7 * Math.abs(t)), k = 4 * (gy * N + gx);
        image.data[k] = c[0]; image.data[k + 1] = c[1]; image.data[k + 2] = c[2]; image.data[k + 3] = 255;
      }
      const small = document.createElement('canvas');
      small.width = small.height = N;
      small.getContext('2d').putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(small, 0, 0, S, S);
      const P = (x1, x2) => [(x1 - lo) / (hi - lo) * S, (hi - x2) / (hi - lo) * S];
      // The level line f = 1/2, which separates the two answers.
      const M = 61, values = new Float64Array(M * M);
      for (let gy = 0; gy < M; gy++) for (let gx = 0; gx < M; gx++) values[gy * M + gx] = net(p, lo + (hi - lo) * gx / (M - 1), hi - (hi - lo) * gy / (M - 1)).f;
      ctx.beginPath();
      Lab.contourPath(ctx, values, M, M, 0.5, S, S);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = rgba(C.ink, 0.85);
      ctx.stroke();
      for (const r of rows) {
        const [px, py] = P(r.x1, r.x2);
        Lab.dot(ctx, px, py, 7, r.y ? C.pos : C.paper, C.ink);
      }
    }
    return draw;
  });

  // ---- Vanishing gradients at initialization ----

  register('.nn-fig-vanishing', root => {
    if (!window.NN) return () => {};
    const canvas = root.querySelector('canvas'), depthInput = root.querySelector('[data-input="depth"]');
    let act = 'sigmoid', seed = 1;
    const data = NN.makeData('circles', 200, 0.1, 1);
    bindPills(root, 'activation', v => { act = v; draw(); });
    depthInput.addEventListener('input', () => draw());
    root.querySelector('[data-action="reseed"]').addEventListener('click', () => { seed += 1; draw(); });

    function draw() {
      const depth = Number(depthInput.value);
      const net = NN.createNetwork({ sizes: [2, ...Array(depth).fill(8), 2], activation: act, task: 'classification', seed });
      const norms = NN.gradientNorms(net, data, 0);
      out(root, 'depth', depth);
      out(root, 'first', Lab.fmt(norms[0], 2));
      out(root, 'last', Lab.fmt(norms[norms.length - 1], 2));
      out(root, 'ratio', Lab.fmt(norms[0] / norms[norms.length - 1], 2));
      out(root, 'bound', Lab.fmt(0.25 ** depth, 2));
      const { ctx, width, height } = fit(canvas, 230);
      const box = { left: 44, top: 14, width: width - 54, height: height - 44 };
      const L = norms.length;
      const map = Lab.axes(ctx, box, { x: [0.4, L + 0.6], y: [-8, 1], logY: true, xTicks: Array.from({ length: L }, (_, i) => i + 1), yTicks: [1, 0, -2, -4, -6, -8], xLabel: `${T.layer} l`, yLabel: T.gradNorm });
      const bar = Math.min(40, box.width / L * 0.6);
      norms.forEach((g, i) => {
        const v = Math.log10(Math.max(g, 1e-8)), x = map.X(i + 1);
        ctx.fillStyle = rgba(C.pos, 0.85);
        ctx.fillRect(x - bar / 2, map.Y(v), bar, map.Y(-8) - map.Y(v));
      });
    }
    return draw;
  });

  // ---- Double descent with random features ----

  register('.nn-fig-double-descent', root => {
    const N = 40, D = 10, TEST = 400, DRAWS = 9;
    const WIDTHS = [1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 35, 38, 40, 42, 45, 50, 60, 80, 100, 150, 200, 300, 500];
    const RIDGES = [0, 1e-3, 1e-2, 1e-1];
    const canvases = root.querySelectorAll('canvas');
    let seed = 1, ridge = 0, results = [], job = 0;
    const noiseInput = root.querySelector('[data-input="noise"]');
    bindPills(root, 'ridge', v => { ridge = RIDGES[Number(v)]; start(); });
    noiseInput.addEventListener('input', () => start());
    root.querySelector('[data-action="reseed"]').addEventListener('click', () => { seed += 1; start(); });

    // Points on the sphere of radius √D, a teacher f*(x) = ReLU(v·x) + 0.3 v·x.
    function problem() {
      const rand = Lab.random(1000 + seed), noise = Number(noiseInput.value);
      const sphere = () => {
        const z = Array.from({ length: D }, () => rand.normal()), r = Math.hypot(...z) / Math.sqrt(D);
        return z.map(v => v / r);
      };
      const v = Array.from({ length: D }, () => rand.normal()), nv = Math.hypot(...v);
      const teacher = x => { const s = x.reduce((a, xi, i) => a + xi * v[i] / nv, 0); return Math.max(0, s) + 0.3 * s; };
      const X = Array.from({ length: N }, sphere), Xt = Array.from({ length: TEST }, sphere);
      return { X, y: X.map(x => teacher(x) + noise * rand.normal()), Xt, yt: Xt.map(teacher), rand };
    }

    // Solves A u = r (m × m, row major) by Gaussian elimination with partial pivoting.
    function solve(A, r, m) {
      A = A.slice(); r = r.slice();
      for (let k = 0; k < m; k++) {
        let piv = k;
        for (let i = k + 1; i < m; i++) if (Math.abs(A[i * m + k]) > Math.abs(A[piv * m + k])) piv = i;
        if (piv !== k) {
          for (let j = 0; j < m; j++) [A[k * m + j], A[piv * m + j]] = [A[piv * m + j], A[k * m + j]];
          [r[k], r[piv]] = [r[piv], r[k]];
        }
        const d = A[k * m + k] || 1e-300;
        for (let i = k + 1; i < m; i++) {
          const f = A[i * m + k] / d;
          if (f === 0) continue;
          for (let j = k; j < m; j++) A[i * m + j] -= f * A[k * m + j];
          r[i] -= f * r[k];
        }
      }
      const u = new Float64Array(m);
      for (let k = m - 1; k >= 0; k--) {
        let s = r[k];
        for (let j = k + 1; j < m; j++) s -= A[k * m + j] * u[j];
        u[k] = s / (A[k * m + k] || 1e-300);
      }
      return u;
    }

    // Least squares on p random ReLU features ReLU(W x)/√p: the minimum-norm
    // solution (λ = 0) or the ridge one, through the smaller Gram matrix.
    function fit1(pb, p) {
      const W = Array.from({ length: p }, () => Array.from({ length: D }, () => pb.rand.normal() / Math.sqrt(D)));
      const feats = X => X.map(x => W.map(w => Math.max(0, w.reduce((a, wi, i) => a + wi * x[i], 0)) / Math.sqrt(p)));
      const F = feats(pb.X);
      let a;
      if (p < N) {
        const G = new Float64Array(p * p), r = new Float64Array(p);
        for (let i = 0; i < p; i++) {
          for (let j = 0; j < p; j++) { let s = 0; for (let k = 0; k < N; k++) s += F[k][i] * F[k][j]; G[i * p + j] = s + (i === j ? ridge : 0); }
          let s = 0; for (let k = 0; k < N; k++) s += F[k][i] * pb.y[k]; r[i] = s;
        }
        a = solve(G, r, p);
      } else {
        const G = new Float64Array(N * N);
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { let s = 0; for (let k = 0; k < p; k++) s += F[i][k] * F[j][k]; G[i * N + j] = s + (i === j ? ridge : 0); }
        const u = solve(G, pb.y, N);
        a = new Float64Array(p);
        for (let k = 0; k < p; k++) { let s = 0; for (let i = 0; i < N; i++) s += F[i][k] * u[i]; a[k] = s; }
      }
      const predict = rows => rows.map(f => f.reduce((s, fk, k) => s + fk * a[k], 0));
      const mse = (pred, y) => pred.reduce((s, v, i) => s + (v - y[i]) ** 2, 0) / y.length;
      return { train: mse(predict(F), pb.y), test: mse(predict(feats(pb.Xt)), pb.yt), norm: Math.hypot(...a) };
    }
    const median = v => { const s = v.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

    // One width per animation frame, so that the curve appears from left to right.
    function start() {
      const id = ++job, pb = problem();
      results = [];
      let k = 0;
      const step = () => {
        if (id !== job) return;
        const p = WIDTHS[k], fits = Array.from({ length: DRAWS }, () => fit1(pb, p));
        results.push({ p, train: median(fits.map(f => f.train)), test: median(fits.map(f => f.test)), norm: median(fits.map(f => f.norm)) });
        k += 1;
        draw();
        if (k < WIDTHS.length) requestAnimationFrame(step);
      };
      draw();
      requestAnimationFrame(step);
    }

    function draw() {
      out(root, 'noise', Number(noiseInput.value).toFixed(2));
      const before = results.filter(r => r.p < N), at = results.find(r => r.p === N), last = results[results.length - 1];
      const best = before.length ? before.reduce((a, r) => (r.test < a.test ? r : a)) : null;
      out(root, 'best', best ? `${Lab.fmt(best.test, 3)} (p = ${best.p})` : '…');
      out(root, 'peak', at ? Lab.fmt(at.test, 3) : '…');
      out(root, 'wide', last && last.p === WIDTHS[WIDTHS.length - 1] ? Lab.fmt(last.test, 3) : '…');
      const panels = [
        { canvas: canvases[0], y: [-3, 3], key: 'test', label: T.testError },
        { canvas: canvases[1], y: [-1, 4], key: 'norm', label: T.norm },
      ];
      for (const panel of panels) {
        const { ctx, width, height } = fit(panel.canvas, 240);
        const box = { left: 40, top: 18, width: width - 50, height: height - 50 };
        const map = Lab.axes(ctx, box, { x: [0, Math.log10(500)], y: panel.y, logX: true, logY: true, xTicks: [0, 1, 2], xLabel: T.width });
        ctx.fillStyle = rgba(C.muted);
        ctx.font = `11px ${font()}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(panel.label, 4, 11);
        Lab.clip(ctx, box);
        Lab.polyline(ctx, [[map.X(Math.log10(N)), box.top], [map.X(Math.log10(N)), box.top + box.height]], { color: C.neg, width: 1.2, dash: [4, 3] });
        const P = (p, v) => [map.X(Math.log10(p)), map.Y(Math.log10(Math.max(v, 1e-12)))];
        if (panel.key === 'test') Lab.polyline(ctx, results.map(r => P(r.p, r.train)), { color: C.muted, width: 1.6, dash: [5, 4] });
        Lab.polyline(ctx, results.map(r => P(r.p, r[panel.key])), { color: C.pos, width: 2.2 });
        for (const r of results) Lab.dot(ctx, ...P(r.p, r[panel.key]), 2.5, C.pos);
        ctx.restore();
        ctx.fillStyle = rgba(C.neg);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('p = n', map.X(Math.log10(N)) + 4, box.top + 4);
      }
    }
    start();
    return draw;
  });
})();
