// Interactive demo in the September 2026 BeNTo news item of index.html,
// illustrating how "Measuring Progress in Diffusion Language Model
// Pretraining" (NeurIPS 2026 workshop) scores a diffusion language model on
// HellaSwag, with a masked D3PM as the example.
//
// A HellaSwag question is a context and four endings, one of them right. A
// DLM has no cheap likelihood, so each ending a is scored by corrupting it,
// the context c staying visible, and measuring how well the model recovers it
// (Section 3.1, Equation (1)):
//   ŝ(a) = 1 / (K d(a)) Σ_k L(a; c, ω_k(a), t_k),
// where ω_k(a) masks each word of a with probability t_k (the noise level),
// d(a) is the number of characters of a ("norm") or 1 ("no-norm"), and, for a
// masked D3PM, the loss L is the cross-entropy of the masked words (up to a
// weight that depends on t_k, left out here). The model answers the ending
// with the lowest score.
//
// The model is a toy. The probability it gives to the right word under a mask
// mixes a uniform guess over GPT-2's vocabulary with a trained guess (from the
// logits in ENDINGS, lower when more of the ending is masked); the training
// slider sets the weight of the trained guess. The benchmark accuracy curve of
// the side panel is illustrative, only its 25% chance level and 27.5% speedrun
// target come from the paper.
//
// A round runs K draws (mask, predict, score) on the four endings and shows
// the answer; ROUNDS rounds follow each change of the settings. Nothing runs
// while the demo is off screen; visitors who ask for reduced motion get the
// final scores without animation.

(function () {
  const CONTEXT = 'A man is standing on a ladder next to a house. He';
  // Each ending as [word, trained logit of the word given the context].
  const ENDINGS = [
    [['takes', -1], ['off', 1], ['his', 2], ['shoes', -1.5], ['and', 2.5], ['jumps', -2], ['into', 1.5], ['the', 3], ['swimming', -2.5], ['pool', -1], ['.', 3]],
    [['dips', 0], ['a', 2.5], ['brush', 1], ['into', 2], ['the', 3], ['paint', 1.5], ['and', 2.5], ['paints', 1.5], ['the', 3], ['window', 0.5], ['frames', 1], ['.', 3]],
    [['throws', -1.5], ['the', 3], ['ladder', 0.5], ['onto', 0.5], ['the', 3], ['roof', -0.5], ['and', 2.5], ['walks', -1.5], ['away', 0], ['.', 3]],
    [['is', 1.5], ['then', 1.5], ['shown', -2], ['riding', -2.5], ['a', 2.5], ['bike', -3], ['down', 1], ['a', 2.5], ['busy', -2], ['road', -2.5], ['.', 3]],
  ];
  const RIGHT = 1;                 // index of the right ending
  const VOCAB = 50257;             // GPT-2's vocabulary size
  const K = 4;                     // draws per round
  const T_RANGE = [0.15, 0.85];    // range of the noise levels t_k
  const ROUNDS = 3;
  const MASK_MS = 800;             // timeline of a draw: masks, then predictions,
  const PREDICT_MS = 1000;         // then updated scores
  const SCORE_MS = 1000;
  const ANSWER_MS = 3500;          // pause on the answer at the end of a round
  const DRAW_MS = MASK_MS + PREDICT_MS + SCORE_MS;
  const LOW = [214, 96, 52], HIGH = [27, 46, 129];  // colours for probability 0 and 1
  const accuracyCurve = s => 0.25 + 0.05 * (1 - Math.exp(-3 * s)) / (1 - Math.exp(-3));

  const root = document.querySelector('.dlm-demo');
  if (!root) return;

  const rowsBox = root.querySelector('.dlm-rows');
  const status = root.querySelector('.dlm-status');
  const slider = root.querySelector('.dlm-control input');
  const progressText = root.querySelector('.dlm-control output');
  const normBox = root.querySelector('.dlm-check input');
  const chart = root.querySelector('.dlm-chart');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.querySelector('.dlm-context').innerHTML = `<strong>Context</strong> (never masked): ${CONTEXT} …`;
  const chars = ENDINGS.map(words => words.map(w => w[0]).join(' ').length);

  // One row per ending: its letter, its words and its score.
  const rows = ENDINGS.map((words, i) => {
    const row = document.createElement('div');
    row.className = 'dlm-row';
    row.innerHTML = `<span class="dlm-letter">${'ABCD'[i]}</span><span class="dlm-words"></span>` +
      '<span class="dlm-score"><span class="dlm-bar"><i></i></span><span class="dlm-value"></span></span>';
    const tokens = words.map(([word]) => {
      const token = document.createElement('span');
      token.className = 'dlm-token';
      token.textContent = word;
      row.querySelector('.dlm-words').append(token, ' ');
      return token;
    });
    rowsBox.appendChild(row);
    return { row, tokens, bar: row.querySelector('.dlm-bar i'), value: row.querySelector('.dlm-value') };
  });

  // ---- Model and scores ----

  let progress = 0;

  // Log-probability that the model gives to the right word under a mask, when
  // a fraction t of the ending is masked.
  function logProb(logit, t) {
    const trained = 1 / (1 + Math.exp(-(logit - 1.5 * (t - 0.5))));
    return Math.log((1 - progress) / VOCAB + progress * trained);
  }

  function newDraw() {
    const t = T_RANGE[0] + (T_RANGE[1] - T_RANGE[0]) * Math.random();
    return {
      t,
      endings: ENDINGS.map(words => {
        const masked = words.map(() => Math.random() < t);
        return { masked, logProbs: words.map(([, logit], i) => (masked[i] ? logProb(logit, t) : 0)) };
      }),
    };
  }

  // Scores after the first `count` draws, and the answer they give.
  function scores(draws, count) {
    const s = ENDINGS.map((_, i) => {
      let loss = 0;
      for (let k = 0; k < count; k++) loss -= draws[k].endings[i].logProbs.reduce((a, b) => a + b, 0);
      return loss / count / (normBox.checked ? chars[i] : 1);
    });
    return { s, answer: s.indexOf(Math.min(...s)) };
  }

  // ---- Rendering ----

  function colour(logP) {
    const p = Math.exp(logP);
    return `rgb(${LOW.map((c, i) => Math.round(c + p * (HIGH[i] - c))).join(', ')})`;
  }

  // Phase within a round: draw k (0-based) at stage 'mask', 'predict' or
  // 'score', or the answer once all K draws are scored.
  function render(round, phase) {
    const { k, stage } = phase;
    const draw = round.draws[Math.min(k, K - 1)];
    rows.forEach((r, i) => {
      r.tokens.forEach((token, w) => {
        const masked = draw.endings[i].masked[w];
        token.dataset.state = masked ? (stage === 'mask' ? 'masked' : 'predicted') : '';
        token.style.backgroundColor = masked && stage !== 'mask' ? colour(draw.endings[i].logProbs[w]) : '';
        token.title = masked && stage !== 'mask' ? `p = ${Math.exp(draw.endings[i].logProbs[w]).toPrecision(2)}` : '';
      });
    });

    const scored = stage === 'answer' ? K : stage === 'score' ? k + 1 : k;
    const { s, answer } = scored ? scores(round.draws, scored) : { s: [0, 0, 0, 0], answer: -1 };
    const max = Math.max(...s) || 1;
    rows.forEach((r, i) => {
      r.bar.style.width = `${100 * s[i] / max}%`;
      r.value.textContent = scored ? s[i].toFixed(normBox.checked ? 3 : 1) : '';
      r.row.dataset.state = stage !== 'answer' ? '' : i === answer ? (i === RIGHT ? 'right' : 'wrong') : i === RIGHT ? 'missed' : '';
    });

    const draws = `Draw ${k + 1} of ${K}`;
    if (stage === 'mask') {
      status.textContent = `${draws}: each word of each ending is masked with probability t = ${draw.t.toFixed(2)}.`;
    } else if (stage === 'predict') {
      status.textContent = `${draws}: the model guesses the masked words, seeing the context and the rest of the ending.`;
    } else if (stage === 'score') {
      status.textContent = `${draws}: score = cross-entropy of the masked words, averaged over the draws so far${normBox.checked ? ' and divided by the ending\'s length' : ''}.`;
    } else {
      const verdict = answer === RIGHT ? 'the right one ✓' : `but the right one is ${'ABCD'[RIGHT]} ✗`;
      status.textContent = `The model answers ${'ABCD'[answer]}, the ending with the lowest score: ${verdict}`;
    }
  }

  // ---- Side chart: accuracy on the whole benchmark along training ----

  const CHART = { left: 34, right: 250, top: 12, bottom: 104, low: 0.24, high: 0.31 };
  const cx = s => CHART.left + s * (CHART.right - CHART.left);
  const cy = a => CHART.bottom - (a - CHART.low) / (CHART.high - CHART.low) * (CHART.bottom - CHART.top);

  function chartElement(tag, attributes, text) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
    if (text) el.textContent = text;
    chart.appendChild(el);
    return el;
  }

  chartElement('line', { x1: CHART.left, x2: CHART.right, y1: CHART.bottom, y2: CHART.bottom, class: 'dlm-axis' });
  chartElement('line', { x1: CHART.left, x2: CHART.left, y1: CHART.top, y2: CHART.bottom, class: 'dlm-axis' });
  chartElement('line', { x1: CHART.left, x2: CHART.right, y1: cy(0.25), y2: cy(0.25), class: 'dlm-chance' });
  chartElement('line', { x1: CHART.left, x2: CHART.right, y1: cy(0.275), y2: cy(0.275), class: 'dlm-target' });
  chartElement('text', { x: CHART.left - 4, y: cy(0.25) + 4, class: 'dlm-tick' }, '25%');
  chartElement('text', { x: CHART.left - 4, y: cy(0.275) + 4, class: 'dlm-tick' }, '27.5%');
  chartElement('text', { x: CHART.right, y: cy(0.25) - 4, class: 'dlm-note' }, 'chance');
  chartElement('text', { x: CHART.right, y: cy(0.275) - 4, class: 'dlm-note dlm-note-target' }, 'speedrun target');
  chartElement('text', { x: (CHART.left + CHART.right) / 2, y: CHART.bottom + 18, class: 'dlm-axis-label' }, 'training →');
  const curve = Array.from({ length: 51 }, (_, i) => `${cx(i / 50).toFixed(1)},${cy(accuracyCurve(i / 50)).toFixed(1)}`);
  chartElement('polyline', { points: curve.join(' '), class: 'dlm-curve' });
  const marker = chartElement('circle', { r: 4.5, class: 'dlm-marker' });

  function renderSettings() {
    progress = Number(slider.value) / 100;
    progressText.textContent = `${slider.value}%`;
    marker.setAttribute('cx', cx(progress));
    marker.setAttribute('cy', cy(accuracyCurve(progress)));
  }

  // ---- Animation ----

  let round = null;
  let roundCount = 0;
  let running = false;
  let visible = false;
  let last = 0;
  let lastKey = '';

  function phaseAt(time) {
    const k = Math.floor(time / DRAW_MS);
    if (k >= K) return { k: K - 1, stage: 'answer' };
    const within = time - k * DRAW_MS;
    return { k, stage: within < MASK_MS ? 'mask' : within < MASK_MS + PREDICT_MS ? 'predict' : 'score' };
  }

  function newRound() {
    round = { draws: Array.from({ length: K }, newDraw), time: reduceMotion ? K * DRAW_MS : 0 };
    roundCount++;
    lastKey = '';
    update(0);
  }

  function update(dt) {
    round.time += dt;
    const phase = phaseAt(round.time);
    const key = `${phase.k}${phase.stage}`;
    if (key !== lastKey) {
      lastKey = key;
      render(round, phase);
    }
  }

  function frame(now) {
    if (!visible) {
      running = false;
      return;
    }
    update(Math.max(0, Math.min(now - last, 50)));  // no jump after a pause
    last = now;
    if (round.time >= K * DRAW_MS + ANSWER_MS) {
      if (roundCount >= ROUNDS) {
        running = false;
        return;
      }
      newRound();
    }
    requestAnimationFrame(frame);
  }

  function resume() {
    if (running || !visible || reduceMotion) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function restart() {
    roundCount = 0;
    newRound();
    resume();
  }

  slider.addEventListener('input', renderSettings);
  slider.addEventListener('change', restart);
  normBox.addEventListener('change', () => {
    lastKey = '';
    update(0);
  });

  new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    resume();
  }).observe(root);

  renderSettings();
  restart();
})();
