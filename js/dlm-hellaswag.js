// Interactive demo in the September 2026 BeNTo news item of index.html,
// illustrating "Measuring Progress in Diffusion Language Model Pretraining"
// (NeurIPS 2026 workshop). Two tabs:
//
// 1. Scoring one question, with a masked D3PM as the example. A HellaSwag
//    question is a context and four endings, one of them right. A DLM has no
//    cheap likelihood, so each ending a is scored by corrupting it, the context
//    c staying visible, and measuring how well the model recovers it (Section
//    3.1, Equation (1)):
//      ŝ(a) = 1 / (K d(a)) Σ_k L(a; c, ω_k(a), t_k),
//    where ω_k(a) masks each word of a with probability t_k (the noise level),
//    d(a) is the number of characters of a ("norm") or 1 ("no-norm"), and, for
//    a masked D3PM, the loss L is the cross-entropy of the masked words (up to
//    a weight that depends on t_k, left out here). The model answers the
//    ending with the lowest score. The model is a toy: the probability it gives
//    to the right word under a mask mixes a uniform guess over GPT-2's
//    vocabulary with a trained guess (from the logits in ENDINGS, lower when
//    more of the ending is masked). A round runs K draws (mask, predict,
//    score) and shows the answer; ROUNDS rounds follow each restart.
//
// 2. Racing recipes to a target, with the real results of the speedrun
//    (github.com/agonon/speedrun-dlm, figures/trajectory-best.csv): the mean
//    HellaSwag accuracy of ten trainings per recipe along training time. A
//    recipe finishes at the first measurement at or above the target that the
//    next measurement confirms (this gives the leaderboard times at 27.5%).
//    Moving the target shows how the ranking changes, the paper's first check
//    (Section 4.1): two recipes are comparable when both finish, or when one
//    finishes while the other was observed at least as long without finishing.
//
// Nothing runs while the first tab is hidden or off screen; visitors who ask
// for reduced motion get its final scores without animation.

(function () {
  const root = document.querySelector('.dlm-demo');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tabs = root.querySelectorAll('[role="tab"]');

  function showTab(id) {
    tabs.forEach(tab => {
      const selected = tab.getAttribute('aria-controls') === id;
      tab.setAttribute('aria-selected', String(selected));
      root.querySelector(`#${tab.getAttribute('aria-controls')}`).hidden = !selected;
    });
  }

  tabs.forEach(tab => tab.addEventListener('click', () => showTab(tab.getAttribute('aria-controls'))));
  root.querySelector('.dlm-next').addEventListener('click', () => showTab('dlm-speedrun'));

  questionDemo(root.querySelector('#dlm-question'));
  speedrunDemo(root.querySelector('#dlm-speedrun'));

  // ---- Tab 1: scoring one question ----

  function questionDemo(panel) {
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
    const TRAINED = 0.6;             // weight of the trained guess in the toy model
    const K = 4;                     // draws per round
    const T_RANGE = [0.15, 0.85];    // range of the noise levels t_k
    const ROUNDS = 3;
    const MASK_MS = 800;             // timeline of a draw: masks, then predictions,
    const PREDICT_MS = 1000;         // then updated scores
    const SCORE_MS = 1000;
    const ANSWER_MS = 3500;          // pause on the answer at the end of a round
    const DRAW_MS = MASK_MS + PREDICT_MS + SCORE_MS;
    const LOW = [214, 96, 52], HIGH = [27, 46, 129];  // colours for probability 0 and 1

    const rowsBox = panel.querySelector('.dlm-rows');
    const status = panel.querySelector('.dlm-status');
    const normBox = panel.querySelector('.dlm-check input');

    panel.querySelector('.dlm-context').innerHTML = `<strong>Context</strong> (never masked): ${CONTEXT} …`;
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

    // Log-probability that the model gives to the right word under a mask,
    // when a fraction t of the ending is masked.
    function logProb(logit, t) {
      const trained = 1 / (1 + Math.exp(-(logit - 1.5 * (t - 0.5))));
      return Math.log((1 - TRAINED) / VOCAB + TRAINED * trained);
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

    panel.querySelector('.dlm-replay').addEventListener('click', restart);
    normBox.addEventListener('change', () => {
      lastKey = '';
      update(0);
    });

    // A hidden tab panel is never intersecting, so this also pauses the
    // animation while the other tab is shown.
    new IntersectionObserver(entries => {
      visible = entries[entries.length - 1].isIntersecting;
      resume();
    }).observe(panel);

    restart();
  }

  // ---- Tab 2: racing recipes to a target ----

  function speedrunDemo(panel) {
    // [training minutes, mean HellaSwag accuracy in %] of each recipe, in the
    // order of the speedrun records (which also sets their colours).
    const RECIPES = [
      { name: 'SUBS', full: 'SUBS (masked)', points: [[1.0, 25.75], [2.4, 25.23], [3.0, 25.01], [4.0, 25.23], [4.7, 25.57], [5.0, 25.60], [6.0, 26.04], [7.0, 26.36], [8.0, 26.61], [9.0, 26.93], [9.5, 27.08], [10.0, 27.16], [11.0, 27.30], [12.0, 27.52], [13.0, 27.51], [14.0, 27.75], [16.0, 27.82], [18.0, 27.92], [19.0, 27.99], [20.0, 28.13], [20.1, 28.18], [21.0, 28.16], [21.3, 28.22], [22.0, 28.28], [22.5, 28.27], [25.0, 28.41], [28.0, 28.63]] },
      { name: 'D3PM mask', full: 'D3PM, masking noise', points: [[1.0, 26.14], [4.0, 25.62], [7.0, 26.06], [10.0, 26.62], [13.0, 27.01], [16.0, 27.15], [19.0, 27.30], [20.0, 27.38], [21.0, 27.40], [22.0, 27.43], [23.0, 27.55], [24.0, 27.55], [25.0, 27.64], [28.0, 27.68], [30.0, 27.86], [40.0, 28.09], [50.0, 28.50], [60.1, 28.83]] },
      { name: 'SEDD mask', full: 'SEDD, masking noise', points: [[1.0, 25.40], [4.0, 25.27], [7.0, 26.15], [10.0, 26.40], [13.0, 26.84], [16.0, 27.00], [19.0, 27.12], [22.0, 27.31], [23.0, 27.47], [24.0, 27.49], [25.0, 27.61], [26.0, 27.76], [27.0, 27.69], [28.0, 27.60], [30.0, 27.72], [40.0, 28.11], [50.0, 28.36], [60.0, 28.69], [70.0, 28.91], [80.0, 29.23], [90.0, 29.52], [100.0, 29.65], [110.7, 30.27]] },
      { name: 'DUO', full: 'DUO, original curriculum', points: [[1.0, 25.08], [4.0, 24.87], [7.0, 25.45], [10.0, 25.92], [13.0, 25.99], [16.0, 26.12], [19.0, 26.22], [22.0, 26.23], [25.0, 26.34], [28.0, 26.34], [30.0, 26.86], [40.0, 27.49], [41.0, 27.59], [42.0, 27.49], [43.0, 27.59], [44.0, 27.56], [47.0, 27.57], [50.0, 27.34], [55.0, 27.74], [59.0, 27.84], [60.0, 27.78], [61.0, 27.88], [62.0, 27.77], [63.0, 27.77], [64.0, 27.87], [65.0, 27.98], [66.0, 27.99], [67.0, 27.59], [68.0, 27.70], [69.0, 27.58], [70.0, 27.66], [80.0, 27.83], [90.0, 28.01], [98.0, 28.16], [99.0, 28.27], [100.0, 28.06], [101.0, 27.96], [110.0, 28.19], [120.0, 28.12], [130.0, 28.43], [140.0, 28.52], [154.5, 28.92]] },
      { name: 'DUO top-k', full: 'DUO, top-k approximation', points: [[1.0, 25.60], [4.0, 25.15], [7.0, 25.39], [10.0, 25.82], [13.0, 26.06], [16.0, 26.01], [19.0, 26.33], [22.0, 26.46], [25.0, 26.48], [28.0, 26.63], [30.0, 26.64], [40.0, 26.68], [50.0, 27.16], [60.0, 27.37], [70.0, 27.41], [79.0, 27.49], [80.0, 27.67], [81.0, 27.57], [82.0, 27.64], [83.0, 27.66], [84.0, 27.74], [85.0, 27.81], [86.0, 27.88], [90.0, 27.75], [95.4, 27.53]] },
      { name: 'SEDD uniform', full: 'SEDD, uniform noise', points: [[1.0, 24.71], [4.0, 24.43], [7.0, 25.10], [10.0, 25.42], [13.0, 25.57], [16.0, 25.96], [19.0, 26.11], [22.0, 26.27], [25.0, 26.34], [28.0, 26.33], [30.0, 26.38], [40.0, 26.60], [50.0, 26.88], [60.0, 26.82], [66.8, 26.96], [70.0, 27.18], [80.0, 27.40], [90.0, 27.46], [95.0, 27.44], [96.0, 27.42], [97.0, 27.52], [98.0, 27.49], [99.0, 27.66], [100.0, 27.61], [101.0, 27.68], [102.0, 27.70], [103.0, 27.70], [104.0, 27.78], [104.0, 27.60], [105.0, 27.74], [107.0, 27.69], [108.8, 27.69]] },
      { name: 'D3PM uniform', full: 'D3PM, uniform noise', points: [[1.0, 26.25], [4.0, 25.93], [7.0, 25.50], [10.0, 25.47], [13.0, 25.42], [16.0, 25.56], [19.0, 25.43], [22.0, 25.68], [25.0, 25.81], [28.0, 25.87], [30.0, 25.98], [40.0, 26.10], [50.0, 26.05], [60.0, 26.16], [70.0, 26.33], [80.0, 26.28], [90.0, 26.42], [100.0, 26.48], [110.0, 26.67], [120.0, 26.54], [130.0, 26.64], [140.0, 26.75], [150.0, 26.74], [160.0, 26.82], [170.0, 26.98], [170.6, 27.14], [180.0, 26.83], [190.0, 26.78], [200.0, 26.80], [209.7, 27.09]] },
    ];
    const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
    const EXAMPLE = 1;               // D3PM mask, the recipe of the first tab
    const OFFICIAL = 27.5;           // the speedrun's target
    const PLOT = { left: 46, right: 506, top: 12, bottom: 256 };
    const MINUTES = [1, 220], ACCURACY = [24.5, 30.5];
    const TARGET_RANGE = [26, 28.5];

    const svg = panel.querySelector('svg');
    const slider = panel.querySelector('.dlm-control input');
    const output = panel.querySelector('.dlm-control output');
    const list = panel.querySelector('.dlm-ranking');
    const stability = panel.querySelector('.dlm-stability');
    const tooltip = panel.querySelector('.dlm-tooltip');

    const x = m => PLOT.left + Math.log(m / MINUTES[0]) / Math.log(MINUTES[1] / MINUTES[0]) * (PLOT.right - PLOT.left);
    const minutesAt = px => MINUTES[0] * Math.pow(MINUTES[1] / MINUTES[0], (px - PLOT.left) / (PLOT.right - PLOT.left));
    const y = a => PLOT.bottom - (a - ACCURACY[0]) / (ACCURACY[1] - ACCURACY[0]) * (PLOT.bottom - PLOT.top);
    const accuracyAt = py => ACCURACY[0] + (PLOT.bottom - py) / (PLOT.bottom - PLOT.top) * (ACCURACY[1] - ACCURACY[0]);
    const runEnd = RECIPES.map(r => r.points[r.points.length - 1][0]);
    const formatMinutes = m => `${Number.isInteger(m) ? m : m.toFixed(1)} min`;

    function svgElement(tag, attributes, text) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
      if (text) el.textContent = text;
      svg.appendChild(el);
      return el;
    }

    // Grid, axes and the chance level.
    for (let a = 25; a <= 30; a++) {
      svgElement('line', { x1: PLOT.left, x2: PLOT.right, y1: y(a), y2: y(a), class: 'dlm-grid' });
      svgElement('text', { x: PLOT.left - 6, y: y(a) + 4, class: 'dlm-tick dlm-tick-y' }, `${a}%`);
    }
    for (const m of [1, 2, 5, 10, 20, 50, 100, 200]) {
      svgElement('line', { x1: x(m), x2: x(m), y1: PLOT.bottom, y2: PLOT.bottom + 4, class: 'dlm-axis' });
      svgElement('text', { x: x(m), y: PLOT.bottom + 17, class: 'dlm-tick' }, String(m));
    }
    svgElement('line', { x1: PLOT.left, x2: PLOT.right, y1: PLOT.bottom, y2: PLOT.bottom, class: 'dlm-axis' });
    svgElement('text', { x: (PLOT.left + PLOT.right) / 2, y: PLOT.bottom + 36, class: 'dlm-tick' }, 'training time (minutes, log scale)');
    svgElement('text', { x: PLOT.right, y: y(25) - 5, class: 'dlm-tick dlm-tick-end' }, 'chance');

    const lines = RECIPES.map((r, i) => svgElement('polyline', {
      points: r.points.map(([m, a]) => `${x(m).toFixed(1)},${y(a).toFixed(1)}`).join(' '),
      stroke: COLORS[i],
      class: i === EXAMPLE ? 'dlm-line dlm-line-example' : 'dlm-line',
    }));
    const finishLine = svgElement('line', { x1: PLOT.left, x2: PLOT.right, class: 'dlm-finish' });
    const finishLabel = svgElement('text', { x: PLOT.left + 6, class: 'dlm-finish-label' });
    const markers = RECIPES.map((r, i) => svgElement('circle', { r: 4.5, fill: COLORS[i], class: 'dlm-marker' }));

    // Ranking rows, reordered at each render.
    const items = RECIPES.map((r, i) => {
      const item = document.createElement('li');
      item.innerHTML = '<span class="dlm-rank"></span><i></i><span class="dlm-name"></span><span class="dlm-time"></span><span class="dlm-move"></span>';
      item.querySelector('i').style.backgroundColor = COLORS[i];
      item.querySelector('.dlm-name').textContent = r.name;
      item.title = r.full;
      if (i === EXAMPLE) item.classList.add('dlm-example');
      item.addEventListener('mouseenter', () => highlight(i));
      item.addEventListener('mouseleave', () => highlight(null));
      return item;
    });

    // First measurement at or above the target that the next one confirms.
    function finishTime(points, target) {
      for (let i = 0; i < points.length; i++) {
        if (points[i][1] >= target && (i + 1 === points.length || points[i + 1][1] >= target)) return points[i][0];
      }
      return null;
    }

    // Times and competition ranks (1, 2, 2, 4) at a target; null if unfinished.
    function race(target) {
      const times = RECIPES.map(r => finishTime(r.points, target));
      const ranks = times.map(t => (t === null ? null : 1 + times.filter(u => u !== null && u < t).length));
      return { times, ranks };
    }

    // -1 if recipe i finishes first, 1 if j does, 0 for a tie, null if the
    // order is still unknown.
    function order(times, i, j) {
      const [ti, tj] = [times[i], times[j]];
      if (ti !== null && tj !== null) return Math.sign(ti - tj);
      if (ti !== null) return runEnd[j] >= ti ? -1 : null;
      if (tj !== null) return runEnd[i] >= tj ? 1 : null;
      return null;
    }

    const official = race(OFFICIAL);

    function render(target) {
      const { times, ranks } = race(target);
      output.textContent = `${target.toFixed(2)}%`;
      finishLine.setAttribute('y1', y(target));
      finishLine.setAttribute('y2', y(target));
      finishLabel.setAttribute('y', y(target) - 6);
      finishLabel.textContent = `finish line ${target.toFixed(2)}%`;
      markers.forEach((marker, i) => {
        marker.style.display = times[i] === null ? 'none' : '';
        if (times[i] !== null) {
          marker.setAttribute('cx', x(times[i]));
          marker.setAttribute('cy', y(target));
        }
      });

      const sorted = RECIPES.map((_, i) => i).sort((i, j) => {
        if (times[i] === null || times[j] === null) return (times[i] === null) - (times[j] === null) || i - j;
        return times[i] - times[j] || i - j;
      });
      sorted.forEach(i => {
        const item = items[i];
        item.querySelector('.dlm-rank').textContent = ranks[i] === null ? '–' : ranks[i];
        item.querySelector('.dlm-time').textContent = times[i] === null ? `not reached in ${Math.round(runEnd[i])} min` : formatMinutes(times[i]);
        const move = item.querySelector('.dlm-move');
        const delta = ranks[i] !== null && official.ranks[i] !== null ? official.ranks[i] - ranks[i] : 0;
        move.textContent = delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : '';
        move.title = delta ? `rank at the ${OFFICIAL}% target: ${official.ranks[i]}` : '';
        list.appendChild(item);
      });

      // Stability: pairs comparable at both targets whose order is reversed.
      let comparable = 0, swapped = 0;
      for (let i = 0; i < RECIPES.length; i++) {
        for (let j = i + 1; j < RECIPES.length; j++) {
          const now = order(times, i, j), before = order(official.times, i, j);
          if (now === null || before === null) continue;
          comparable++;
          if (now * before < 0) swapped++;
        }
      }
      if (Math.abs(target - OFFICIAL) < 1e-9) {
        stability.textContent = `This is the speedrun's target (the official leaderboard). Move the finish line to see whether the ranking holds.`;
      } else {
        stability.innerHTML = `Compared with the ${OFFICIAL}% target: <strong>${swapped} of ${comparable}</strong> comparable pairs of recipes swap order.`;
      }
    }

    function highlight(index) {
      lines.forEach((line, i) => line.classList.toggle('dlm-dim', index !== null && i !== index));
      markers.forEach((marker, i) => marker.classList.toggle('dlm-dim', index !== null && i !== index));
      items.forEach((item, i) => item.classList.toggle('dlm-highlight', i === index));
    }

    // Accuracy of a recipe at m minutes, by linear interpolation; null outside its run.
    function accuracyOf(points, m) {
      if (m < points[0][0] || m > points[points.length - 1][0]) return null;
      for (let i = 1; i < points.length; i++) {
        if (points[i][0] >= m) {
          const [m0, a0] = points[i - 1], [m1, a1] = points[i];
          return m1 === m0 ? a1 : a0 + (a1 - a0) * (m - m0) / (m1 - m0);
        }
      }
      return points[points.length - 1][1];
    }

    function svgPoint(event) {
      const rect = svg.getBoundingClientRect();
      return [(event.clientX - rect.left) * 520 / rect.width, (event.clientY - rect.top) * 300 / rect.height];
    }

    function setTarget(event) {
      const [, py] = svgPoint(event);
      const target = Math.min(TARGET_RANGE[1], Math.max(TARGET_RANGE[0], Math.round(accuracyAt(py) * 20) / 20));
      slider.value = target;
      render(target);
    }

    // Mouse: hover shows the nearest recipe, dragging moves the finish line.
    // Touch: a tap moves the finish line (the slider does the rest).
    let dragging = false;
    svg.addEventListener('pointerdown', event => {
      dragging = true;
      if (event.pointerType === 'mouse') svg.setPointerCapture(event.pointerId);
      setTarget(event);
    });
    svg.addEventListener('pointerup', () => { dragging = false; });
    svg.addEventListener('pointercancel', () => { dragging = false; });
    svg.addEventListener('pointerleave', () => {
      tooltip.hidden = true;
      highlight(null);
    });
    svg.addEventListener('pointermove', event => {
      if (dragging) {
        setTarget(event);
        return;
      }
      if (event.pointerType !== 'mouse') return;
      const [px, py] = svgPoint(event);
      const m = minutesAt(px);
      let best = null, bestDistance = 14;
      RECIPES.forEach((r, i) => {
        const a = accuracyOf(r.points, m);
        if (a !== null && Math.abs(y(a) - py) < bestDistance) {
          best = { i, a };
          bestDistance = Math.abs(y(a) - py);
        }
      });
      highlight(best && best.i);
      tooltip.hidden = !best;
      if (best) {
        tooltip.textContent = `${RECIPES[best.i].name}: ${best.a.toFixed(2)}% at ${formatMinutes(Math.round(m * 10) / 10)}`;
        const box = svg.parentElement.getBoundingClientRect();
        tooltip.style.left = `${event.clientX - box.left + 12}px`;
        tooltip.style.top = `${event.clientY - box.top - 30}px`;
      }
    });

    slider.addEventListener('input', () => render(Number(slider.value)));
    render(Number(slider.value));
  }
})();
