// Figures of the blog post on toasts around a round table
// (blog/round-table-toasts/, or drafts/ before it is published).
//
// People 0, …, n−1 sit clockwise around the table, person 0 at the top. A toast
// is a pair {i, j}; two toasts conflict when they share a person or when their
// arms cross, i.e. when exactly one of the people of one toast sits strictly
// between the people of the other. Each figure is a <figure class="rt-demo">
// whose data-figure attribute says what it shows:
//   alice   the n toasts of Alice (person 0) and the toast of her two
//           neighbours, which pairwise conflict (static)
//   mirror  the mirror rounds C_s = {{i, j} : i + j = s mod n}, instant by
//           instant, with a slider for n, as an animation that pauses off screen
//   game    the visitor schedules the toasts: click two people to make them
//           clink, "Next instant" when no more toasts fit
//   greedy  an unlucky greedy schedule, instant by instant, with a slider for n
//   arms    short arms: the mirror rounds of a small table of 2d + 1 people,
//           in the middle, wrapped around a large table made of copies of it,
//           with sliders for the reach d and the number of copies
//   hosts   two hosts clink with everybody in n − 1 instants, going around the
//           table at the same pace; click somebody to make them the second host
//   bar     Theorem 4: n − 1 people along a curved bar follow the mirror rounds,
//           and the last one, behind the bar, clinks with whoever sits out,
//           instant by instant, with a slider for n (even)
//   shapes  static drawings of the definitions in the proof of Theorem 5: long
//           and almost long toasts of a 9-gon and their short sides, one panel
//           per <svg data-panel="…">
//   polygon static drawings for the appendix on a polygon with its centre (the
//           facts used, the parts A(u) and B(u), the set W, each kind of
//           instant), one panel per <svg data-panel="…">
//   wheel   the schedule of the appendix for a polygon with its centre, instant
//           by instant, with a slider for the number m of corners
//   crowd   the proof of Theorem 5, step by step: m people at the corners of a
//           regular polygon and a crowd of t people at its centre, each toast
//           as thick as its weight, with sliders for m and t
// Colours come from the classes .rt-* in css/styles.css, so the figures follow
// the themes by themselves.

(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const C = 150, R = 112;     // centre and radius of the table in the 300 × 300 viewBox
  const STEP_MS = 1600;       // duration of an instant in the mirror animation
  const PROOF_STEP_MS = 5000; // duration of a step of the proof animation
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Geometry of the table ----

  const mod = (a, n) => ((a % n) + n) % n;
  const angle = (i, n) => -Math.PI / 2 + 2 * Math.PI * i / n;
  const seat = (i, n, r = R) => [C + r * Math.cos(angle(i, n)), C + r * Math.sin(angle(i, n))];
  const neighbours = (i, j, n) => mod(j - i, n) === 1 || mod(i - j, n) === 1;
  // Whether x sits strictly between a and b, walking clockwise from a.
  const between = (a, x, b, n) => { const d = mod(x - a, n); return d > 0 && d < mod(b - a, n); };
  const conflict = ([a, b], [c, d], n) =>
    a === c || a === d || b === c || b === d || between(a, c, b, n) !== between(a, d, b, n);
  const key = (i, j) => (i < j ? `${i}-${j}` : `${j}-${i}`);

  function mirrorRound(s, n) {
    const pairs = [];
    for (let i = 0; i < n; i++) {
      const j = mod(s - i, n);
      if (i < j) pairs.push([i, j]);
    }
    return pairs;
  }

  // Whether the segments pq and rs of the plane cross.
  const orient = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const segmentsCross = (p, q, r, s) => orient(p, q, r) * orient(p, q, s) < 0 && orient(r, s, p) * orient(r, s, q) < 0;
  const permutations = list => list.length <= 1 ? [list]
    : list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map(rest => [x, ...rest]));
  const range = (from, count) => Array.from({ length: count }, (_, x) => from + x);

  // ---- Drawing ----

  function el(parent, tag, attributes = {}, text) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (text !== undefined) node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  // Draws the table: toasts (each [i, j, class]), then the people, of whom
  // `out` sit out and `selected` (one person or a list) are highlighted.
  // `axis` is a mirror axis across the table, `ticks` short ones across its
  // edge, at seat positions that may be halves. Returns the people's nodes.
  function drawTable(svg, n, { toasts = [], out = new Set(), selected = null, axis = null, ticks = [], labels = {} } = {}) {
    svg.replaceChildren();
    el(svg, 'circle', { cx: C, cy: C, r: R, class: 'rt-table' });
    if (axis !== null) {
      // The mirror axis of C_s goes through the angle of seat s/2.
      const a = -Math.PI / 2 + Math.PI * axis / n, r = R + 16;
      el(svg, 'line', { x1: C - r * Math.cos(a), y1: C - r * Math.sin(a), x2: C + r * Math.cos(a), y2: C + r * Math.sin(a), class: 'rt-axis' });
    }
    for (const c of ticks) {
      const [x1, y1] = seat(c, n, R - 34), [x2, y2] = seat(c, n, R + 14);
      el(svg, 'line', { x1, y1, x2, y2, class: 'rt-axis' });
    }
    for (const [i, j, cls] of toasts) {
      const [x1, y1] = seat(i, n), [x2, y2] = seat(j, n);
      el(svg, 'line', { x1, y1, x2, y2, class: cls });
    }
    const people = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = seat(i, n), [lx, ly] = seat(i, n, R + 24);
      const g = el(svg, 'g', { class: 'rt-seat' });
      el(g, 'circle', { cx: x, cy: y, r: 9, class: out.has(i) ? 'rt-person rt-out' : 'rt-person' });
      if ([].concat(selected).includes(i)) el(g, 'circle', { cx: x, cy: y, r: 14, class: 'rt-selected' });
      el(g, 'text', { x: lx, y: ly, class: 'rt-label' }, labels[i] ?? String(i));
      people.push(g);
    }
    return people;
  }

  const toastClass = (i, j, n, base = '') => `${base} ${neighbours(i, j, n) ? 'rt-neighbour' : 'rt-pair'}`.trim();

  // ---- Animations ----

  // The ‹ Previous, Play and Next › buttons of a figure showing count() steps in
  // turn, render(step) drawing one of them. The animation pauses off screen, and
  // does not start by itself if the visitor prefers reduced motion.
  function animate(figure, stepMs, count, render) {
    const play = figure.querySelector('.rt-play');
    let step = 0, playing = !reduceMotion, visible = false, timer = null;

    function show(s) {
      step = mod(s, count());
      render(step);
      play.textContent = playing ? '❚❚ Pause' : '▶ Play';
      schedule();
    }

    function schedule() {
      clearTimeout(timer);
      if (playing && visible) timer = setTimeout(() => show(step + 1), stepMs);
    }

    figure.querySelector('.rt-prev').addEventListener('click', () => show(step - 1));
    figure.querySelector('.rt-next').addEventListener('click', () => show(step + 1));
    play.addEventListener('click', () => { playing = !playing; show(step); });
    new IntersectionObserver(entries => {
      visible = entries[entries.length - 1].isIntersecting;
      schedule();
    }).observe(figure);
    show(0);
    return { show, redraw: () => show(step) };
  }

  // ---- Alice's toasts ----

  function alice(figure) {
    const n = Number(figure.dataset.n || 7);
    const toasts = [];
    for (let j = 1; j < n; j++) toasts.push([0, j, 'rt-pair']);
    toasts.push([1, n - 1, 'rt-neighbour']);
    drawTable(figure.querySelector(':scope > svg'), n, { toasts, labels: { 0: 'Alice' } });
  }

  // ---- The mirror rounds ----

  function mirror(figure) {
    const svg = figure.querySelector(':scope > svg');
    const slider = figure.querySelector('.rt-n input');
    const nText = figure.querySelector('.rt-n output');
    const readout = figure.querySelector('.rt-readout');
    let n = Number(slider.value);

    function render(s) {
      const toasts = [], out = new Set();
      for (let past = 0; past < s; past++) for (const [i, j] of mirrorRound(past, n)) toasts.push([i, j, 'rt-ghost']);
      const round = mirrorRound(s, n);
      for (const [i, j] of round) toasts.push([i, j, toastClass(i, j, n)]);
      for (let x = 0; x < n; x++) if (mod(2 * x, n) === s) out.add(x);
      drawTable(svg, n, { toasts, out, axis: s });
      const h = round.filter(([i, j]) => neighbours(i, j, n)).length, u = out.size;
      let clinked = 0;
      for (let past = 0; past <= s; past++) clinked += mirrorRound(past, n).length;
      nText.textContent = `n = ${n}`;
      readout.innerHTML = `Instant <strong>${s + 1}</strong> of ${n}: ${round.length} toast${round.length > 1 ? 's' : ''}, `
        + `${u} sitting out, ${h} between neighbours, so <strong>${u} + ${h} = ${u + h}</strong>.<br>`
        + `Clinked so far: ${clinked} of ${n * (n - 1) / 2} pairs.`;
    }

    const player = animate(figure, STEP_MS, () => n, render);
    slider.addEventListener('input', () => { n = Number(slider.value); player.show(0); });
  }

  // ---- Your turn ----

  function game(figure) {
    const svg = figure.querySelector(':scope > svg');
    const slider = figure.querySelector('.rt-n input');
    const nText = figure.querySelector('.rt-n output');
    const readout = figure.querySelector('.rt-readout');
    let n, instants, current, clinked, selected, message;

    function restart() {
      n = Number(slider.value);
      instants = [];      // the toasts of the finished instants
      current = [];       // the toasts of the current instant
      clinked = new Set();
      selected = null;
      message = 'Click two people to make them clink.';
      render();
    }

    function tryToast(a, b) {
      const pair = [a, b];
      const clash = current.find(other => conflict(pair, other, n));
      if (clinked.has(key(a, b))) message = `${a} and ${b} have already clinked.`;
      else if (clash && (clash.includes(a) || clash.includes(b))) message = `${clash.includes(a) ? a : b} is already clinking at this instant.`;
      else if (clash) message = `Their arms would cross the toast of ${clash[0]} and ${clash[1]}.`;
      else {
        current.push(pair);
        clinked.add(key(a, b));
        message = '';
      }
    }

    function render() {
      const toasts = [];
      for (const round of instants) for (const [i, j] of round) toasts.push([i, j, 'rt-ghost']);
      for (const [i, j] of current) toasts.push([i, j, toastClass(i, j, n)]);
      const busy = new Set(current.flat());
      const out = new Set([...Array(n).keys()].filter(x => current.length && !busy.has(x)));
      const people = drawTable(svg, n, { toasts, out, selected });
      people.forEach((g, i) => {
        g.classList.add('rt-clickable');
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', `Person ${i}`);
        const pick = () => {
          if (selected === null) selected = i;
          else if (selected === i) selected = null;
          else { tryToast(selected, i); selected = null; }
          render();
        };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(); }
        });
      });
      const total = n * (n - 1) / 2, used = instants.length + (current.length ? 1 : 0);
      nText.textContent = `n = ${n}`;
      let status = `Instant <strong>${instants.length + 1}</strong> · ${clinked.size} of ${total} pairs clinked.`;
      // The game opens the post, before the answer: the messages do not give it away.
      if (clinked.size === total) {
        status = `All ${total} pairs clinked in <strong>${used}</strong> instants. `
          + (used === n ? 'You cannot do better: read on to see why!' : 'It can be done in fewer instants: try again!');
      }
      readout.innerHTML = status + (message ? `<br>${message}` : '');
    }

    figure.querySelector('.rt-next-instant').addEventListener('click', () => {
      if (current.length) { instants.push(current); current = []; message = ''; }
      selected = null;
      render();
    });
    figure.querySelector('.rt-undo').addEventListener('click', () => {
      if (!current.length && instants.length) current = instants.pop();
      const last = current.pop();
      if (last) clinked.delete(key(...last));
      selected = null;
      message = '';
      render();
    });
    figure.querySelector('.rt-restart').addEventListener('click', restart);
    slider.addEventListener('input', restart);
    restart();
  }

  // ---- Greedy toasting ----

  // Worst greedy runs, found by an exhaustive search over the ways greedy can
  // break ties: at each instant, as many new toasts as possible, and yet many
  // more instants than the n of the mirror rounds.
  const GREEDY_RUNS = {
    5: [[[0,1],[3,4]],[[0,4],[2,3]],[[0,3],[1,2]],[[2,4]],[[0,2]],[[1,3]],[[1,4]]],
    6: [[[0,1],[2,3],[4,5]],[[0,5],[1,2],[3,4]],[[0,2],[3,5]],[[1,5],[2,4]],[[0,4],[1,3]],[[2,5]],[[1,4]],[[0,3]]],
    7: [[[0,1],[3,6],[4,5]],[[1,2],[3,4],[5,6]],[[0,6],[1,5],[2,3]],[[0,2],[4,6]],[[1,6],[3,5]],[[0,5],[1,3]],[[0,3]],[[2,6]],[[0,4]],[[2,4]],[[1,4]],[[2,5]]],
    8: [[[0,5],[1,2],[3,4],[6,7]],[[0,7],[1,6],[2,3],[4,5]],[[0,2],[4,7],[5,6]],[[0,1],[2,4],[5,7]],[[1,7],[2,6],[3,5]],[[2,7],[4,6]],[[0,6],[1,3]],[[0,3]],[[0,4]],[[3,7]],[[1,4]],[[1,5]],[[2,5]],[[3,6]]],
    9: [[[0,1],[3,4],[5,8],[6,7]],[[0,3],[1,2],[4,5],[7,8]],[[0,8],[1,4],[2,3],[5,6]],[[0,2],[3,5],[6,8]],[[0,7],[1,3],[4,6]],[[1,8],[2,4],[5,7]],[[1,7],[3,6]],[[0,6],[2,5]],[[2,8],[4,7]],[[0,4]],[[0,5]],[[1,5]],[[1,6]],[[2,6]],[[2,7]],[[3,7]],[[3,8]],[[4,8]]],
  };

  function greedy(figure) {
    const svg = figure.querySelector(':scope > svg');
    const slider = figure.querySelector('.rt-n input');
    const readout = figure.querySelector('.rt-readout');
    let n = Number(slider.value);

    function render(s) {
      const run = GREEDY_RUNS[n], toasts = [];
      for (let past = 0; past < s; past++) for (const [i, j] of run[past]) toasts.push([i, j, 'rt-ghost']);
      for (const [i, j] of run[s]) toasts.push([i, j, toastClass(i, j, n)]);
      drawTable(svg, n, { toasts });
      const k = run[s].length, left = run.length - s;
      figure.querySelector('.rt-n output').textContent = `n = ${n}`;
      readout.innerHTML = `Instant <strong>${s + 1}</strong> of ${run.length}: `
        + (run.slice(s).every(round => round.length === 1)
          ? (left > 1 ? `1 new toast, as the ${left} toasts left all conflict with each other.` : '1 new toast, the last one.')
          : `${k} new toast${k > 1 ? 's' : ''}, as many as possible.`)
        + (s === run.length - 1 ? `<br>The greedy schedule took <strong>${run.length}</strong> instants, against ${n} for the mirror rounds.` : '');
    }

    const player = animate(figure, STEP_MS, () => GREEDY_RUNS[n].length, render);
    slider.addEventListener('input', () => { n = Number(slider.value); player.show(0); });
  }

  // ---- Short arms ----

  function arms(figure) {
    const svg = figure.querySelector(':scope > svg');
    const dInput = figure.querySelector('.rt-d input'), copiesInput = figure.querySelector('.rt-copies input');
    const readout = figure.querySelector('.rt-readout');
    const SMALL_R = 40;  // radius of the small table in the middle
    // People reach d seats on each side; the small table has q = 2d + 1 people,
    // and the large table n = q × copies, person i playing the role of i mod q.
    let d, q, n;

    // At instant s, the pairs {i, i + a} within reach with 2i + a = s modulo q.
    const round = s => range(0, n).flatMap(i => range(1, d).filter(a => mod(2 * i + a, q) === s).map(a => [i, mod(i + a, n)]));

    function render(s) {
      const toasts = [];
      for (let past = 0; past < s; past++) for (const [i, j] of round(past)) toasts.push([i, j, 'rt-ghost']);
      for (const [i, j] of round(s)) toasts.push([i, j, toastClass(i, j, n)]);
      const out = new Set(range(0, n).filter(i => mod(2 * i, q) === s));
      // The toasts of an instant are mirror images around the points (s + mq) / 2.
      const ticks = range(0, 2 * n / q).map(m => (s + m * q) / 2);
      const labels = Object.fromEntries(range(0, n).map(i => [i, String(i % q)]));
      drawTable(svg, n, { toasts, out, ticks, labels });

      // The small table, playing the mirror round C_s.
      el(svg, 'circle', { cx: C, cy: C, r: SMALL_R, class: 'rt-table' });
      const a = -Math.PI / 2 + Math.PI * s / q, r = SMALL_R + 8;
      el(svg, 'line', { x1: C - r * Math.cos(a), y1: C - r * Math.sin(a), x2: C + r * Math.cos(a), y2: C + r * Math.sin(a), class: 'rt-axis' });
      for (const [i, j] of mirrorRound(s, q)) {
        const [x1, y1] = seat(i, q, SMALL_R), [x2, y2] = seat(j, q, SMALL_R);
        el(svg, 'line', { x1, y1, x2, y2, class: toastClass(i, j, q) });
      }
      for (let i = 0; i < q; i++) {
        const [cx, cy] = seat(i, q, SMALL_R), [lx, ly] = seat(i, q, SMALL_R + 14);
        el(svg, 'circle', { cx, cy, r: 5, class: mod(2 * i, q) === s ? 'rt-person rt-out' : 'rt-person' });
        el(svg, 'text', { x: lx, y: ly, class: 'rt-label' }, String(i));
      }

      let clinked = 0;
      for (let past = 0; past <= s; past++) clinked += round(past).length;
      figure.querySelector('.rt-d output').textContent = `d = ${d}`;
      figure.querySelector('.rt-copies output').textContent = `n = ${n}`;
      readout.innerHTML = `Instant <strong>${s + 1}</strong> of ${q}. In the middle, a table of ${q} people plays a mirror round. `
        + 'Around the large table, where the numbers repeat, everybody clinks with the nearest person bearing the number of their partner in the middle.'
        + `<br>Clinked so far: ${clinked} of the ${n * d} pairs within reach.`;
    }

    function read() {
      d = Number(dInput.value);
      q = 2 * d + 1;
      n = q * Number(copiesInput.value);
    }

    read();
    const player = animate(figure, 2 * STEP_MS, () => q, render);
    for (const input of [dInput, copiesInput]) input.addEventListener('input', () => { read(); player.show(0); });
  }

  // ---- Two hosts ----

  function hosts(figure) {
    const svg = figure.querySelector(':scope > svg');
    const slider = figure.querySelector('.rt-n input');
    const readout = figure.querySelector('.rt-readout');
    // Host a sits at the top (seat 0), host b anywhere but next to a.
    let n = Number(slider.value), b = Math.max(2, Math.floor(n / 3)), message = '';

    // The k-th person clockwise after seat `from`, not counting seat `skip`.
    function after(from, k, skip) {
      let s = from;
      while (k > 0) {
        s = mod(s + 1, n);
        if (s !== skip) k--;
      }
      return s;
    }

    // At instant 1, the hosts clink with each other. At instant k + 1, each host
    // clinks with the k-th person clockwise after the other host, not counting
    // themself.
    function instant(t) {
      if (t === 1) return [[0, b]];
      return [[0, after(b, t - 1, 0)], [b, after(0, t - 1, b)]];
    }

    function render(s) {
      const t = s + 1, toasts = [];
      for (let past = 1; past < t; past++) for (const [i, j] of instant(past)) toasts.push([i, j, 'rt-ghost']);
      for (const [i, j] of instant(t)) toasts.push([i, j, i === 0 ? 'rt-pair' : 'rt-neighbour']);
      const people = drawTable(svg, n, { toasts, selected: [0, b], labels: { 0: 'a', [b]: 'b' } });
      people.forEach((g, i) => {
        g.classList.add('rt-clickable');
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', `Make person ${i} the second host`);
        const pick = () => {
          if (i === 0 || i === b) return;
          if (neighbours(0, i, n)) message = 'Two neighbouring hosts need as much time as the whole table: choose somebody else.';
          else { b = i; message = ''; }
          player.show(0);
        };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(); }
        });
      });

      const [[, pa], [, pb] = []] = instant(t);
      const skipping = [pa === 1 && '<em>a</em>', pb === mod(b + 1, n) && '<em>b</em>'].filter(Boolean);
      figure.querySelector('.rt-n output').textContent = `n = ${n}`;
      readout.innerHTML = `Instant <strong>${t}</strong> of ${n - 1}: `
        + (t === 1 ? 'the hosts clink with each other.'
          : `each host clinks with the next person clockwise${skipping.length ? `, ${skipping.join(' and ')} skipping their own seat` : ''}.`)
        + (t === n - 1 ? `<br>Both hosts have clinked with everybody in ${n - 1} instants.` : '')
        + (message ? `<br>${message}` : '');
    }

    const player = animate(figure, STEP_MS, () => n - 1, render);
    slider.addEventListener('input', () => {
      n = Number(slider.value);
      if (b >= n - 1) b = Math.max(2, Math.floor(n / 3));
      message = '';
      player.show(0);
    });
  }

  // ---- The bar ----

  function bar(figure) {
    const svg = figure.querySelector(':scope > svg');
    const slider = figure.querySelector('.rt-n input');
    const readout = figure.querySelector('.rt-readout');
    // The people at the bar stand on an arc of the circle of centre (C, BAR_Y)
    // and radius BAR_R, between the angles ±SPREAD from the top. The last
    // person, a, stands at A, above every line through two of them: these lines
    // pass below the height BAR_R / cos(SPREAD) above the centre at x = C.
    const BAR_Y = 330, BAR_R = 144, SPREAD = Math.PI / 3, A = [C, BAR_Y - BAR_R / Math.cos(SPREAD) - 12];
    let n = Number(slider.value);

    function render(s) {
      const N = n - 1;
      const at = (i, r = BAR_R) => {
        const a = -SPREAD + 2 * SPREAD * i / (N - 1);
        return [C + r * Math.sin(a), BAR_Y - r * Math.cos(a)];
      };
      const point = i => (i === N ? A : at(i));
      // An instant: the mirror round of the bar, and a (person N) with the one
      // who sits out, u such that 2u = s modulo N.
      const instant = s => [...mirrorRound(s, N), [s * (N + 1) / 2 % N, N]];

      svg.replaceChildren();
      const [x1, y1] = at(-0.15, BAR_R + 20), [x2, y2] = at(N - 0.85, BAR_R + 20);
      el(svg, 'path', { d: `M ${x1} ${y1} A ${BAR_R + 20} ${BAR_R + 20} 0 0 1 ${x2} ${y2}`, class: 'rt-bar' });
      const line = ([i, j], cls) => {
        const [x1, y1] = point(i), [x2, y2] = point(j);
        el(svg, 'line', { x1, y1, x2, y2, class: cls });
      };
      for (let past = 0; past < s; past++) for (const pair of instant(past)) line(pair, 'rt-ghost');
      for (const pair of instant(s)) line(pair, pair[1] === N ? 'rt-neighbour' : 'rt-pair');
      for (let i = 0; i <= N; i++) {
        const [cx, cy] = point(i);
        el(svg, 'circle', { cx, cy, r: 8, class: 'rt-person' });
      }
      el(svg, 'text', { x: A[0], y: A[1] - 18, class: 'rt-label' }, 'a');

      const total = n * (n - 1) / 2;
      figure.querySelector('.rt-n output').textContent = `n = ${n}`;
      readout.innerHTML = `Instant <strong>${s + 1}</strong> of ${N}: the people at the bar follow a mirror round, and the one left out clinks with <em>a</em>. `
        + `Clinked so far: ${(s + 1) * n / 2} of ${total} pairs.`
        + (s === N - 1 ? `<br>Everybody clinked at every instant: ${N} instants, the least possible.` : '');
    }

    const player = animate(figure, STEP_MS, () => n - 1, render);
    slider.addEventListener('input', () => { n = Number(slider.value); player.show(0); });
  }

  // ---- Long and almost long toasts ----

  function shapes(figure) {
    const m = 9, k = 4;  // corners 0, …, 8 clockwise from the top
    const corner = i => seat(mod(i, m), m);
    // Each panel: the short sides to shade ([first corner, length]), the toasts
    // ([first corner, length, class]) and the corner to circle, if any.
    const PANELS = {
      long: { cut: [[7, k]], toasts: [[7, k, 'rt-long']] },
      almost: { cut: [[8, k - 1]], toasts: [[8, k - 1, 'rt-almost']] },
      pair: { cut: [[7, k], [3, k - 1]], toasts: [[7, k, 'rt-long'], [3, k - 1, 'rt-almost']] },
      two: { cut: [[1, k - 1], [5, k - 1]], toasts: [[1, k - 1, 'rt-almost'], [5, k - 1, 'rt-almost']], free: 0 },
    };
    figure.querySelectorAll('svg[data-panel]').forEach(svg => {
      const { cut, toasts, free } = PANELS[svg.dataset.panel];
      for (const [i, d] of cut) el(svg, 'polygon', { points: range(i, d + 1).map(x => corner(x).join(',')).join(' '), class: 'rt-cut' });
      for (const [i, d, cls] of toasts) {
        const [x1, y1] = corner(i), [x2, y2] = corner(i + d);
        el(svg, 'line', { x1, y1, x2, y2, class: cls, 'stroke-width': cls === 'rt-long' ? 7 : 5 });
      }
      for (let i = 0; i < m; i++) {
        const [cx, cy] = corner(i);
        el(svg, 'circle', { cx, cy, r: 11, class: 'rt-person' });
      }
      if (free !== undefined) {
        const [cx, cy] = corner(free);
        el(svg, 'circle', { cx, cy, r: 20, class: 'rt-selected' });
      }
    });
  }

  // ---- A polygon with one person at its centre ----

  // The two parts of the mirror round C(u) of a polygon of m = 2k + 1 corners,
  // toasts {u - t, u + t}: A(u) near u (t < a for odd k, t <= b for even k) and
  // B(u) the rest, as [i, j, 'A' or 'B'].
  function wheelParts(m) {
    const k = (m - 1) / 2, cut = k % 2 ? (k + 1) / 2 - 1 : k / 2;
    const toast = (u, t, part) => [mod(u - t, m), mod(u + t, m), part];
    return {
      A: u => range(1, cut).map(t => toast(u, t, 'A')),
      B: u => range(cut + 1, k - cut).map(t => toast(u, t, 'B')),
    };
  }

  // The schedule of the appendix: m + ceil(m/3) instants, each with its kind,
  // the corner the centre clinks with (or null), its toasts between corners,
  // and a sentence saying what it is.
  function wheelSchedule(m) {
    const k = (m - 1) / 2, q = Math.ceil(m / 3), { A, B } = wheelParts(m);
    const U = range(0, q).map(j => 3 * j + 1), C = u => [...A(u), ...B(u)];
    const plan = [];
    if (k % 2) {
      const a = (k + 1) / 2, W = U.map(x => mod(a * x, m));
      for (let v = 0; v < m; v++) {
        if (!W.includes(v)) plan.push({ centre: v, toasts: B(v), text: `the centre clinks with ${v}, together with B(${v}), the part of the mirror round of ${v} that does not have ${v} on its short side.` });
      }
      for (const w of W) {
        plan.push({ centre: w, toasts: [...A(w + a), ...A(w - a)], text: `the centre clinks with ${w}, a corner of W, together with A(${mod(w + a, m)}) and A(${mod(w - a, m)}), on both sides of ${w}.` });
      }
      for (const w of W) plan.push({ centre: null, toasts: C(w), text: `the whole mirror round of ${w}, a corner of W, while the centre sits out.` });
      return { W, plan };
    }
    const b = k / 2, s = 3 * b, W = U.map(x => mod(k * x - b, m));
    for (let v = 0; v < m; v++) {
      if (!W.includes(v)) plan.push({ centre: v, toasts: A(v + s), text: `the centre clinks with ${v}, together with A(${mod(v + s, m)}), on the other side of the table.` });
    }
    for (const w of W) {
      plan.push({ centre: w, toasts: [...B(w - b), ...B(w + b)], text: `the centre clinks with ${w}, a corner of W, together with B(${mod(w - b, m)}) and B(${mod(w + b, m)}), on both sides of ${w}.` });
    }
    for (const w of W) plan.push({ centre: null, toasts: C(w + s), text: `the whole mirror round of ${mod(w + s, m)}, while the centre sits out.` });
    return { W, plan };
  }

  // Draws a polygon of m corners and its centre: toasts as [i, j, class], with
  // m standing for the centre, and the corners in `ringed` circled.
  function drawWheel(svg, m, toasts, ringed = [], labels = true) {
    const point = i => (i === m ? [C, C] : seat(i, m));
    for (const [i, j, cls] of toasts) {
      const [x1, y1] = point(i), [x2, y2] = point(j);
      el(svg, 'line', { x1, y1, x2, y2, class: cls });
    }
    for (let i = 0; i <= m; i++) {
      const [cx, cy] = point(i);
      el(svg, 'circle', { cx, cy, r: 8, class: 'rt-person' });
      if (ringed.includes(i)) el(svg, 'circle', { cx, cy, r: 13, class: 'rt-selected' });
      if (labels && i < m) {
        const [lx, ly] = seat(i, m, R + 24);
        el(svg, 'text', { x: lx, y: ly, class: 'rt-label' }, String(i));
      }
    }
  }

  const PART_CLASS = { A: 'rt-part-a', B: 'rt-part-b' };

  // Static drawings of a polygon with one person at its centre, for the appendix:
  // one panel per <svg data-panel="…">, the panels being the entries of PANELS.
  function polygon(figure) {
    let m;                                          // corners of the current panel
    const parts = list => list.map(([i, j, part]) => [i, j, PART_CLASS[part]]);
    const label = (svg, i, text) => {
      const [x, y] = seat(i, m, R + 30);
      el(svg, 'text', { x, y, class: 'rt-label rt-label-big' }, text);
    };
    const numbers = svg => { for (let i = 0; i < m; i++) label(svg, i, String(i)); };
    // The corners from `from` to `to`, clockwise: an arc around them, or the
    // shaded region between them and the toast joining the two ends.
    const stretch = (svg, from, to) => {
      const r = R + 16, [x1, y1] = seat(from - 0.35, m, r), [x2, y2] = seat(to + 0.35, m, r);
      const large = (mod(to - from, m) + 0.7) / m > 0.5 ? 1 : 0;
      el(svg, 'path', { d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, class: 'rt-block' });
    };
    const shade = (svg, from, to) => el(svg, 'polygon', {
      points: range(from, mod(to - from, m) + 1).map(x => seat(mod(x, m), m).join(',')).join(' '), class: 'rt-cut',
    });
    // A mirror round C(u) of the top corner u, cut into A(u) and B(u), and the
    // toast from the centre to u, dashed.
    const split = (svg, { A, B }) => {
      drawWheel(svg, m, [...parts([...A(0), ...B(0)]), [m, 0, 'rt-blocked']], [], false);
      label(svg, 0, 'u');
    };
    // W circled, and a dotted link from it to every other corner at distance d.
    const links = (svg, W, d) => {
      const toasts = [];
      for (const w of W) for (const x of [mod(w + d, m), mod(w - d, m)]) if (!W.includes(x)) toasts.push([w, x, 'rt-link']);
      drawWheel(svg, m, toasts, W, false);
      numbers(svg);
    };
    const corners = (count, draw) => svg => { m = count; draw(svg, wheelParts(m)); };

    const PANELS = {
      // The facts used throughout, on 9 corners.
      mirror: corners(9, (svg, { A, B }) => {
        drawWheel(svg, m, parts([...A(0), ...B(0)]), [], false);
        label(svg, 0, 'u');
      }),
      centre: corners(9, svg => {
        shade(svg, 2, 6);
        const toasts = [[2, 6, 'rt-part-b']];
        for (const v of [7, 8, 0, 1]) toasts.push([m, v, 'rt-ghost']);
        for (const v of [3, 4, 5]) toasts.push([m, v, 'rt-blocked']);
        drawWheel(svg, m, toasts, [], false);
      }),
      stretches: corners(9, svg => {
        stretch(svg, 1, 5);
        stretch(svg, 6, 8);
        shade(svg, 1, 5);
        shade(svg, 6, 8);
        drawWheel(svg, m, [[1, 5, 'rt-part-b'], [2, 4, 'rt-part-b'], [6, 8, 'rt-part-b']], [], false);
      }),
      U: corners(9, svg => {
        for (const u of [1, 4, 7]) stretch(svg, u - 1, u + 1);
        drawWheel(svg, m, [], [1, 4, 7], false);
        numbers(svg);
      }),
      // Odd k: 7 corners, k = 3, a = 2 and W = {0, 1, 2}.
      'split-odd': corners(7, split),
      'W-odd': corners(7, svg => links(svg, [0, 1, 2], 2)),
      'alpha-odd': corners(7, (svg, { B }) => {
        drawWheel(svg, m, [...parts(B(4)), [m, 4, 'rt-centre']], [], false);
        numbers(svg);
      }),
      'gamma-odd': corners(7, (svg, { A }) => {
        stretch(svg, 1, 3);
        stretch(svg, 4, 6);
        drawWheel(svg, m, [...parts([...A(2), ...A(5)]), [m, 0, 'rt-centre']], [0], false);
        numbers(svg);
      }),
      'beta-odd': corners(7, (svg, { A, B }) => {
        drawWheel(svg, m, parts([...A(0), ...B(0)]), [0], false);
        numbers(svg);
      }),
      // Even k: 9 corners, k = 4, b = 2, s = 6 and W = {2, 5, 8}.
      'split-even': corners(9, split),
      'W-even': corners(9, svg => links(svg, [2, 5, 8], 2)),
      'alpha-even': corners(9, (svg, { A }) => {
        stretch(svg, 4, 8);
        drawWheel(svg, m, [...parts(A(6)), [m, 0, 'rt-centre']], [], false);
        numbers(svg);
      }),
      'gamma-even': corners(9, (svg, { B }) => {
        stretch(svg, 3, 6);
        stretch(svg, 7, 10);
        drawWheel(svg, m, [...parts([...B(0), ...B(4)]), [m, 2, 'rt-centre']], [2], false);
        numbers(svg);
      }),
      'beta-even': corners(9, (svg, { A, B }) => {
        drawWheel(svg, m, parts([...A(8), ...B(8)]), [], false);
        numbers(svg);
      }),
    };
    figure.querySelectorAll('svg[data-panel]').forEach(svg => PANELS[svg.dataset.panel](svg));
  }

  function wheel(figure) {
    const svg = figure.querySelector(':scope > svg');
    const slider = figure.querySelector('.rt-n input');
    const readout = figure.querySelector('.rt-readout');
    let m, W, plan;
    const read = () => { m = Number(slider.value); ({ W, plan } = wheelSchedule(m)); };

    function render(s) {
      svg.replaceChildren();
      const toasts = [];
      for (let past = 0; past < s; past++) {
        for (const [i, j] of plan[past].toasts) toasts.push([i, j, 'rt-ghost']);
        if (plan[past].centre !== null) toasts.push([m, plan[past].centre, 'rt-ghost']);
      }
      for (const [i, j, part] of plan[s].toasts) toasts.push([i, j, PART_CLASS[part]]);
      if (plan[s].centre !== null) toasts.push([m, plan[s].centre, 'rt-centre']);
      drawWheel(svg, m, toasts, W);
      figure.querySelector('.rt-n output').textContent = `m = ${m}`;
      readout.innerHTML = `Instant <strong>${s + 1}</strong> of ${plan.length}: ${plan[s].text}`
        + (s === plan.length - 1 ? `<br>All the pairs have clinked, in ${m} + ${plan.length - m} = ${plan.length} instants.` : '');
    }

    read();
    const player = animate(figure, 2 * STEP_MS, () => plan.length, render);
    slider.addEventListener('input', () => { read(); player.show(0); });
  }

  // ---- The crowd in the middle ----

  function crowd(figure) {
    const svg = figure.querySelector(':scope > svg');
    const mInput = figure.querySelector('.rt-m input'), tInput = figure.querySelector('.rt-t input');
    const readout = figure.querySelector('.rt-readout');
    // m = 2k + 1 corners, t people in the crowd; the long toast {top, top + k}
    // has its short side at the top.
    let m, t, k, top, L, max, total;

    const corner = i => seat(mod(i, m), m);

    // The crowd stands closer to the centre than all the long toasts, which pass
    // at distance R sin(π / 2m) from it.
    function inCrowd(j) {
      if (t === 1) return [C, C];
      const r = 0.45 * R * Math.sin(Math.PI / (2 * m)), a = -Math.PI / 2 + 0.35 + 2 * Math.PI * j / t;
      return [C + r * Math.cos(a), C + r * Math.sin(a)];
    }

    // A toast, as thick as its weight.
    function toast([x1, y1], [x2, y2], cls, weight, opacity = 1) {
      el(svg, 'line', { x1, y1, x2, y2, class: cls, 'stroke-width': 0.6 + 1.3 * weight, opacity });
    }
    const long = (i, opacity) => toast(corner(i), corner(i + k), 'rt-long', t + 1, opacity);
    const almostLong = (i, opacity) => toast(corner(i), corner(i + k - 1), 'rt-almost', t, opacity);

    // Shades the corners cut off by the toast {i, i + d}, d ≤ k: its short side.
    function cutOff(i, d) {
      el(svg, 'polygon', { points: range(i, d + 1).map(x => corner(x).join(',')).join(' '), class: 'rt-cut' });
    }

    // Toasts between the crowd and some of the given corners, spread out, at most
    // one per person of the crowd, and assigned so that no two of them cross.
    function withCrowd(corners) {
      const s = Math.min(corners.length, t);
      const targets = range(0, s).map(j => corners[Math.floor((j + 0.5) * corners.length / s)]);
      const options = permutations(range(0, t)).map(order => targets.map((c, j) => [inCrowd(order[j]), corner(c)]));
      const valid = options.find(list => list.every((p, a) => list.every((q, b) => a >= b || !segmentsCross(...p, ...q))));
      for (const [p, q] of valid ?? options[0]) toast(p, q, 'rt-spoke', 1);
    }

    function everything(opacity) {
      for (let i = 0; i < m; i++) {
        long(i, opacity);
        almostLong(i, opacity);
        for (let j = 0; j < t; j++) toast(inCrowd(j), corner(i), 'rt-spoke', 1, opacity * 0.6);
      }
    }

    // The steps of the proof: each one draws its toasts and returns its text.
    const STEPS = [
      () => {
        everything(0.5);
        return `<strong>The weights.</strong> The ${m} long toasts, between corners as far apart as possible, weigh <em>t</em> + 1 = ${L}. `
          + `The ${m} almost long ones, one step shorter, weigh <em>t</em> = ${t}, and the ${m * t} toasts with the crowd weigh 1. `
          + `Total: ${m * L} + ${m * t} + ${m * t} = ${total}.`;
      },
      () => {
        cutOff(top, k);
        long(top);
        for (let x = 1; x < k; x++) {
          const [[x1, y1], [x2, y2]] = [inCrowd(0), corner(top + x)];
          el(svg, 'line', { x1, y1, x2, y2, class: 'rt-blocked' });
        }
        for (let x = k + 1; x < m; x++) toast(inCrowd(0), corner(top + x), 'rt-spoke', 1, 0.35);
        return '<strong>Cut off.</strong> A toast between two corners cuts off the corners of its short side, shaded. '
          + 'The crowd stands closer to the centre than all the long toasts, so it cannot reach them without crossing (dashed).';
      },
      () => {
        cutOff(top, k);
        cutOff(top + k + 1, k - 1);
        long(top);
        almostLong(top + k + 1);
        return `<strong>A long toast and an almost long one.</strong> Every corner is taken or cut off, so nobody in the crowd can clink with a corner: `
          + `this instant weighs ${L} + ${t} = ${max}.`;
      },
      () => {
        cutOff(top, k);
        long(top);
        withCrowd(range(top + k + 1, k));
        return `<strong>A long toast, no almost long one.</strong> Two long toasts always conflict, and each person of the crowd clinks at most once: `
          + `at most ${L} + ${t} = ${max}.`;
      },
      () => {
        cutOff(1, k - 1);
        cutOff(k + 1, k - 1);
        almostLong(1);
        almostLong(k + 1);
        withCrowd([0]);
        return `<strong>Two almost long toasts.</strong> There is room for neither a third one nor a long one, and a single corner is left for the crowd: `
          + `at most ${t} + ${t} + 1 = ${max}.`;
      },
      () => {
        const b = mod(-Math.floor((k - 1) / 2), m);
        cutOff(b, k - 1);
        almostLong(b);
        withCrowd(range(b + k, k + 1));
        return `<strong>Otherwise.</strong> No long toast, at most one almost long one, and at most ${t} with the crowd: at most ${t} + ${t} = ${2 * t}.`;
      },
      () => {
        everything(0.5);
        const n = m + t, needed = Math.ceil(total / max), more = needed - n;
        return `<strong>Hence.</strong> Every instant weighs at most 2<em>t</em> + 1 = ${max}, out of ${total} in total, `
          + `so these ${n} people need at least ⌈${total}/${max}⌉ = ${needed} instants, `
          + (more > 0 ? `${more} more than around a round table.` : 'no more than around a round table: the crowd is too big for this polygon.');
      },
    ];

    function render(step) {
      m = Number(mInput.value);
      t = Number(tInput.value);
      k = (m - 1) / 2;
      top = mod(-Math.floor(k / 2), m);
      L = t + 1;
      max = 2 * t + 1;
      total = (3 * t + 1) * m;
      svg.replaceChildren();
      const text = STEPS[step]();
      for (let i = 0; i < m; i++) {
        const [cx, cy] = corner(i);
        el(svg, 'circle', { cx, cy, r: 7, class: 'rt-person' });
      }
      for (let j = 0; j < t; j++) {
        const [cx, cy] = inCrowd(j);
        el(svg, 'circle', { cx, cy, r: 4, class: 'rt-person rt-crowd' });
      }
      figure.querySelector('.rt-m output').textContent = `m = ${m}`;
      figure.querySelector('.rt-t output').textContent = `t = ${t}`;
      readout.innerHTML = text;
    }

    const player = animate(figure, PROOF_STEP_MS, () => STEPS.length, render);
    for (const input of [mInput, tInput]) input.addEventListener('input', player.redraw);
  }

  const FIGURES = { alice, mirror, game, greedy, arms, hosts, bar, shapes, polygon, wheel, crowd };
  document.querySelectorAll('.rt-demo').forEach(figure => FIGURES[figure.dataset.figure](figure));
})();
