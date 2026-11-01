// Engine of the neural network playground
// (teaching/2026_2027_MAPI3_Machine_Learning/neural-networks-playground.html):
// the datasets, the networks, backpropagation and stochastic gradient descent,
// written by hand without any library. Nothing here touches the page; the
// interface is js/nn-playground.js. Exposed as window.NN.
//
// Notation. A network of depth L composes L parametrized maps:
// L - 1 non-linear layers h ↦ σ(W h + b) and a last affine layer h ↦ W h + b
// whose output is the vector of logits (classification, followed by the
// softmax) or the prediction itself (regression). sizes = [d_0, d_1, ..., d_L]
// lists the widths, d_0 being the dimension of the input.
//
// Losses. Classification: cross-entropy of the softmax of the logits against
// the one-hot label, -log sm(z)_c. Regression: the quadratic loss (y - f(x))².
// Training minimizes F(θ) = (1/n) Σ ℓ(y_i, f_θ(x_i)) + λ Σ_l ‖W_l‖²_F (the
// biases are not penalized).
//
// Everything random (data, initialization, batches) comes from seeded
// generators, so that a guided experiment of the page always gives the run
// described in its text.

(function () {
  // ---- Random numbers ----

  // Mulberry32: a small seeded generator of uniform numbers in [0, 1), with a
  // Gaussian sampler (Box and Muller) on top.
  function random(seed) {
    let s = seed >>> 0;
    const next = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.normal = () => {
      let u = 0;
      while (u === 0) u = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    };
    next.uniform = (a, b) => a + (b - a) * next();
    return next;
  }

  // ---- Activation functions ----

  // df receives the pre-activation z and the activation a = f(z), whichever is
  // cheaper to use.
  const ACTIVATIONS = {
    relu: { label: 'ReLU', f: z => (z > 0 ? z : 0), df: z => (z > 0 ? 1 : 0) },
    tanh: { label: 'tanh', f: Math.tanh, df: (z, a) => 1 - a * a },
    sigmoid: { label: 'sigmoid', f: z => 1 / (1 + Math.exp(-z)), df: (z, a) => a * (1 - a) },
    identity: { label: 'identity', f: z => z, df: () => 1 },
  };

  // ---- Datasets ----

  // Classification: points of [-1, 1]² (about), with a label in {0, ..., classes - 1}.
  // sample(k, rand, noise) draws a point of class k; noise ∈ [0, 1].
  // Regression: x uniform on [-1, 1] and y = g(x) + Gaussian noise of standard deviation 0.4 · noise.
  const DATASETS = {
    blobs: {
      task: 'classification', label: 'Blobs', classes: 2,
      sample(k, rand, noise) {
        const c = k === 0 ? -0.4 : 0.4, s = 0.12 + 0.3 * noise;
        return [c + s * rand.normal(), c + s * rand.normal()];
      },
    },
    moons: {
      task: 'classification', label: 'Moons', classes: 2,
      sample(k, rand, noise) {
        const t = Math.PI * rand(), s = 0.03 + 0.22 * noise;
        const x = k === 0 ? Math.cos(t) : 1 - Math.cos(t);
        const y = k === 0 ? Math.sin(t) : 0.5 - Math.sin(t);
        return [(x - 0.5) / 1.6 + s * rand.normal(), (y - 0.25) / 1.6 + s * rand.normal()];
      },
    },
    circles: {
      task: 'classification', label: 'Circles', classes: 2,
      sample(k, rand, noise) {
        const r = k === 0 ? 0.42 * Math.sqrt(rand()) : rand.uniform(0.62, 0.95);
        const t = 2 * Math.PI * rand(), s = 0.18 * noise;
        return [r * Math.cos(t) + s * rand.normal(), r * Math.sin(t) + s * rand.normal()];
      },
    },
    xor: {
      task: 'classification', label: 'XOR', classes: 2,
      sample(k, rand, noise) {
        // Class 0 in the quadrants where x₁x₂ > 0, class 1 in the other two.
        const sx = rand() < 0.5 ? -1 : 1, sy = k === 0 ? sx : -sx, s = 0.15 * noise;
        return [sx * rand.uniform(0.06, 0.95) + s * rand.normal(), sy * rand.uniform(0.06, 0.95) + s * rand.normal()];
      },
    },
    spirals: {
      task: 'classification', label: 'Spirals', classes: 2,
      sample(k, rand, noise) {
        const t = rand(), r = 0.06 + 0.85 * t, angle = 3.2 * Math.PI * t + k * Math.PI, s = 0.1 * noise;
        return [r * Math.cos(angle) + s * rand.normal(), r * Math.sin(angle) + s * rand.normal()];
      },
    },
    three: {
      task: 'classification', label: '3 classes', classes: 3,
      sample(k, rand, noise) {
        const angle = Math.PI / 2 + 2 * Math.PI * k / 3, s = 0.12 + 0.3 * noise;
        return [0.5 * Math.cos(angle) + s * rand.normal(), 0.5 * Math.sin(angle) + s * rand.normal()];
      },
    },
    sine: {
      task: 'regression', label: 'Sine',
      g: x => 0.8 * Math.sin(5 * x),
    },
    abs: {
      task: 'regression', label: '|x|',
      g: x => 1.2 * Math.abs(x) - 0.6,
    },
    kinks: {
      task: 'regression', label: '3 kinks',
      // Piecewise affine through these points: three kinks inside [-1, 1].
      knots: [[-1, -0.5], [-0.4, 0.6], [0.15, -0.4], [0.6, 0.5], [1, 0.1]],
      g(x) {
        const k = this.knots;
        let i = 0;
        while (i < k.length - 2 && x > k[i + 1][0]) i++;
        const [x0, y0] = k[i], [x1, y1] = k[i + 1];
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      },
    },
    chirp: {
      task: 'regression', label: 'Chirp',
      // A sine whose frequency grows from left to right.
      g: x => 0.8 * Math.sin(2.2 * Math.PI * (x + 1) * (x + 1) / 2 + 0.3),
    },
  };

  // n points of a dataset, as { dim, classes, n, X (n × dim, row major), Y }.
  // Classes are balanced: point i has label i mod classes.
  function makeData(name, n, noise, seed) {
    const set = DATASETS[name], rand = random(seed);
    if (set.task === 'classification') {
      const X = new Float64Array(2 * n), Y = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        const k = i % set.classes, [a, b] = set.sample(k, rand, noise);
        X[2 * i] = a;
        X[2 * i + 1] = b;
        Y[i] = k;
      }
      return { name, task: set.task, dim: 2, classes: set.classes, n, X, Y };
    }
    const X = new Float64Array(n), Y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      X[i] = rand.uniform(-1, 1);
      Y[i] = set.g(X[i]) + 0.4 * noise * rand.normal();
    }
    return { name, task: set.task, dim: 1, classes: 1, n, X, Y };
  }

  // The same points with every label replaced by an independent uniform one.
  function randomizeLabels(data, seed) {
    const rand = random(seed);
    const Y = Int32Array.from(data.Y, () => Math.floor(rand() * data.classes));
    return { ...data, Y, randomLabels: true };
  }

  // ---- Networks ----

  // Initialization: weights N(0, 2/d_in) for ReLU (He) and N(0, 2/(d_in + d_out))
  // otherwise (Glorot), except in the last layer, N(0, 1/(4 d_in)), so that the
  // network starts close to the constant 0 rather than far above the data.
  // The bias of a first-layer unit puts its hyperplane {x : w·x + b = 0}
  // through a uniform random point of the data square, so that the units start
  // spread over the data (in one dimension: the kinks of the ReLU units are
  // spread over [-1, 1]). The other biases start at zero.
  function createNetwork({ sizes, activation, task, seed }) {
    const rand = random(seed);
    const L = sizes.length - 1;
    const layers = [];
    for (let l = 0; l < L; l++) {
      const nIn = sizes[l], nOut = sizes[l + 1], last = l === L - 1;
      const scale = last ? 0.5 / Math.sqrt(nIn) : activation === 'relu' ? Math.sqrt(2 / nIn) : Math.sqrt(2 / (nIn + nOut));
      const W = Float64Array.from({ length: nIn * nOut }, () => scale * rand.normal());
      const b = new Float64Array(nOut);
      if (l === 0 && !last) {
        for (let j = 0; j < nOut; j++) {
          let s = 0;
          for (let i = 0; i < nIn; i++) s -= W[j * nIn + i] * rand.uniform(-1, 1);
          b[j] = s;
        }
      }
      layers.push({ nIn, nOut, W, b, gW: new Float64Array(nIn * nOut), gb: new Float64Array(nOut) });
    }
    return {
      sizes: sizes.slice(), activation, task, layers,
      Z: sizes.map(d => new Float64Array(d)),  // pre-activations (Z[0] unused)
      A: sizes.map(d => new Float64Array(d)),  // activations, A[0] = x, A[L] = logits or prediction
      D: sizes.map(d => new Float64Array(d)),  // ∂loss/∂Z, filled by the backward pass
      probs: new Float64Array(sizes[L]),
    };
  }

  function parameterCount(sizes) {
    let P = 0;
    for (let l = 0; l + 1 < sizes.length; l++) P += sizes[l] * sizes[l + 1] + sizes[l + 1];
    return P;
  }

  // Forward pass on the input X[offset ... offset + d_0 - 1]; keeps every
  // activation in net.A and returns the output A[L].
  function forward(net, X, offset) {
    const { layers, Z, A } = net, act = ACTIVATIONS[net.activation], L = layers.length;
    const a0 = A[0];
    for (let i = 0; i < a0.length; i++) a0[i] = X[offset + i];
    for (let l = 0; l < L; l++) {
      const { nIn, nOut, W, b } = layers[l], a = A[l], z = Z[l + 1], out = A[l + 1], last = l === L - 1;
      for (let j = 0; j < nOut; j++) {
        let s = b[j];
        const row = j * nIn;
        for (let i = 0; i < nIn; i++) s += W[row + i] * a[i];
        z[j] = s;
        out[j] = last ? s : act.f(s);
      }
    }
    return A[L];
  }

  // Softmax of the logits z into p, shifted by the maximum to avoid overflow.
  function softmax(z, p) {
    let max = -Infinity, sum = 0;
    for (let k = 0; k < z.length; k++) if (z[k] > max) max = z[k];
    for (let k = 0; k < z.length; k++) sum += (p[k] = Math.exp(z[k] - max));
    for (let k = 0; k < z.length; k++) p[k] /= sum;
    return p;
  }

  // Loss of the last forward pass against the label y, and its gradient with
  // respect to the output in D[L]: sm(z) - e_y (cross-entropy) or 2 (f(x) - y).
  function lossAndOutputGradient(net, y) {
    const L = net.layers.length, out = net.A[L], d = net.D[L];
    if (net.task === 'classification') {
      const p = softmax(out, net.probs);
      for (let k = 0; k < p.length; k++) d[k] = p[k] - (k === y ? 1 : 0);
      return -Math.log(Math.max(p[y], 1e-300));
    }
    const r = out[0] - y;
    d[0] = 2 * r;
    return r * r;
  }

  // Backward pass after forward and lossAndOutputGradient: adds the gradient
  // of the loss of this point to every gW and gb. Identity (∗) of the page (Part II)
  // reads off the gradient in the parameters of a layer, identity (∗∗) passes
  // ∂loss/∂input to the layer before.
  function backward(net) {
    const { layers, Z, A, D } = net, act = ACTIVATIONS[net.activation];
    for (let l = layers.length - 1; l >= 0; l--) {
      const { nIn, nOut, W, gW, gb } = layers[l], a = A[l], d = D[l + 1];
      for (let j = 0; j < nOut; j++) {
        gb[j] += d[j];
        const row = j * nIn;
        for (let i = 0; i < nIn; i++) gW[row + i] += d[j] * a[i];
      }
      if (l === 0) break;
      const dIn = D[l], z = Z[l];
      for (let i = 0; i < nIn; i++) {
        let s = 0;
        for (let j = 0; j < nOut; j++) s += W[j * nIn + i] * d[j];
        dIn[i] = s * act.df(z[i], a[i]);
      }
    }
  }

  function zeroGradients(net) {
    for (const layer of net.layers) {
      layer.gW.fill(0);
      layer.gb.fill(0);
    }
  }

  // Gradient of F restricted to the points of indices idx[0 ... count - 1]
  // (the whole sample, or a batch), left in gW and gb. Returns the mean loss.
  function gradient(net, data, idx, count, lambda) {
    zeroGradients(net);
    let total = 0;
    for (let k = 0; k < count; k++) {
      const i = idx[k];
      forward(net, data.X, i * data.dim);
      total += lossAndOutputGradient(net, data.Y[i]);
      backward(net);
    }
    for (const { W, gW, gb } of net.layers) {
      for (let k = 0; k < gW.length; k++) gW[k] = gW[k] / count + 2 * lambda * W[k];
      for (let k = 0; k < gb.length; k++) gb[k] /= count;
    }
    return total / count;
  }

  // ---- Training ----

  // Stochastic gradient descent: batches of the requested size, drawn without
  // replacement by reshuffling the sample whenever the rest of it is too small
  // for a batch. A batch size of n or more is full-batch gradient descent.
  // epoch counts the passes over the data: the number of gradients of the
  // loss computed so far, divided by n.
  function createTrainer(net, data, seed) {
    const rand = random(seed);
    const order = Int32Array.from({ length: data.n }, (_, i) => i);
    let position = data.n;  // reshuffle before the first batch
    let seen = 0;
    const trainer = { net, data, iteration: 0, epoch: 0, diverged: false };

    trainer.step = (lr, batchSize, lambda) => {
      const size = Math.min(batchSize, data.n);
      if (position + size > data.n) {
        for (let i = data.n - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        position = 0;
      }
      const loss = gradient(net, data, order.subarray(position, position + size), size, lambda);
      position += size;
      seen += size;
      trainer.epoch = Math.floor(seen / data.n);
      for (const { W, b, gW, gb } of net.layers) {
        for (let k = 0; k < W.length; k++) W[k] -= lr * gW[k];
        for (let k = 0; k < b.length; k++) b[k] -= lr * gb[k];
      }
      trainer.iteration++;
      if (!Number.isFinite(loss) || !net.layers.every(layer => Number.isFinite(layer.W[0]))) trainer.diverged = true;
      return loss;
    };
    return trainer;
  }

  // Mean loss (the risk without Ω) and, in classification, the proportion of
  // misclassified points.
  function evaluate(net, data) {
    let total = 0, wrong = 0;
    for (let i = 0; i < data.n; i++) {
      const out = forward(net, data.X, i * data.dim);
      total += lossAndOutputGradient(net, data.Y[i]);
      if (net.task === 'classification') {
        let best = 0;
        for (let k = 1; k < out.length; k++) if (out[k] > out[best]) best = k;
        if (best !== data.Y[i]) wrong++;
      }
    }
    return { risk: total / data.n, error: net.task === 'classification' ? wrong / data.n : null };
  }

  // Frobenius norm of the full-batch gradient of F in the weights of each layer.
  function gradientNorms(net, data, lambda) {
    const all = Int32Array.from({ length: data.n }, (_, i) => i);
    gradient(net, data, all, data.n, lambda);
    return net.layers.map(({ gW }) => Math.sqrt(gW.reduce((s, g) => s + g * g, 0)));
  }

  function penalty(net, lambda) {
    let s = 0;
    for (const { W } of net.layers) for (let k = 0; k < W.length; k++) s += W[k] * W[k];
    return lambda * s;
  }

  // Permutes the units of every hidden layer at random, together with the rows
  // of W_l, b_l and the columns of W_{l+1}. The function computed is unchanged.
  function permuteHiddenUnits(net, seed) {
    const rand = random(seed);
    const { layers } = net;
    for (let l = 0; l + 1 < layers.length; l++) {
      const { nIn, nOut, W, b } = layers[l], next = layers[l + 1];
      const perm = Int32Array.from({ length: nOut }, (_, i) => i);
      for (let i = nOut - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]];
      }
      const W0 = W.slice(), b0 = b.slice(), V0 = next.W.slice();
      for (let j = 0; j < nOut; j++) {
        b[j] = b0[perm[j]];
        for (let i = 0; i < nIn; i++) W[j * nIn + i] = W0[perm[j] * nIn + i];
        for (let k = 0; k < next.nOut; k++) next.W[k * nOut + j] = V0[k * nOut + perm[j]];
      }
    }
  }

  window.NN = {
    random, ACTIVATIONS, DATASETS, makeData, randomizeLabels,
    createNetwork, parameterCount, forward, softmax, lossAndOutputGradient, backward,
    gradient, createTrainer, evaluate, gradientNorms, penalty, permuteHiddenUnits,
  };
})();
