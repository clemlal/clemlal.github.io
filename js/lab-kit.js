// Shared toolkit of the interactive course pages: the playgrounds and figures
// of js/nn-*.js and js/opt-*.js, and any page built the same way. Exposed as
// window.Lab. Nothing here is specific to a course: a new interactive page
// loads css/styles.css, js/themes.js and js/post.js in its <head>, then this
// file first at the end of its <body>, then its own scripts.
//
//   Lab.random(seed)              seeded uniform generator, with .normal() and .uniform(a, b)
//   Lab.lang, Lab.strings(dicts)  the page's language (<html lang>), and the
//                                 dictionary of that language ({ en, fr }), English filling gaps
//   Lab.format(text, values)      'iteration {t}' with { t: 3 } → 'iteration 3'
//   Lab.colours()                 the theme's colours as RGB triples (js/themes.js),
//                                 read again after a theme switch
//   Lab.rgba, Lab.mix             CSS colour of a triple, mixture of two triples
//   Lab.fmt, Lab.power, Lab.subscript, Lab.niceStep   numbers for labels and readouts
//   Lab.fit(canvas, height[, width])                  sharp canvas of that size
//   Lab.axes(ctx, box, options)   grid, ticks and labels of a plot; returns the maps to pixels
//   Lab.curve, Lab.polyline, Lab.dot, Lab.arrow       marks
//   Lab.contourPath(...)          a level set of a sampled field (marching squares)
//   Lab.bindPills, Lab.pills      groups of pill buttons, written in the page or generated
//   Lab.figure(selector, setup)   an interactive figure, redrawn on theme switches and resizes
//   Lab.animate(root, frame)      an animation that only runs while its figure is on screen
//   Lab.experiments(options)      the panel of guided experiments under a playground
//   Lab.typeset(node)             MathJax on content added after the page has loaded
// and, without any call, the self-checking answers of the exercises: an
// element <span class="exo-check" data-answer="-0.008" data-tol="1e-4"></span>
// becomes a box where the student types a number (or an expression such as
// (-0.2)^3, 1/4, 2e-3, sqrt(2), with a decimal point or comma) and a Check
// button. A number is judged at the precision it is written with: it is right
// when it is the answer rounded or truncated to its last digit (so 0.38, 0.377
// and 0.3775 are all right for 0.37754, but 104 is wrong for 105), as long as
// it has at least two significant digits. An expression, and any answer, is also
// right within data-tol, an absolute tolerance, or data-rel, a relative one
// (default: 0.5 % of the answer, or 1e-9 when the answer is 0).

(function () {
  // ---- Random numbers ----

  // Mulberry32: a small seeded generator of uniform numbers in [0, 1), with a
  // Gaussian sampler (Box and Muller) on top. Everything random in the demos
  // comes from it, so that a guided experiment always gives the run its text
  // describes.
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

  // ---- Language ----

  const lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
  const strings = dicts => ({ ...dicts.en, ...(dicts[lang] || {}) });
  const format = (text, values) => text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));

  const T = strings({
    en: {
      experiment: 'Experiment', predict: 'Predict first.', watch: 'Watch:', why: 'What happens, and why', run: '▶ Run',
      check: 'Check', right: 'Right.', wrong: 'Not yet: try again, or open the solution.', unreadable: 'Type a number, such as 0.25, 1/4 or 2e-3.',
      coarse: 'Give at least two significant digits.',
      answer: 'Your answer',
    },
    fr: {
      experiment: 'Expérience', predict: 'Prédisez d’abord.', watch: 'À observer :', why: 'Ce qui se passe, et pourquoi', run: '▶ Lancer',
      check: 'Vérifier', right: 'Juste.', wrong: 'Pas encore : réessayez, ou ouvrez la solution.', unreadable: 'Tapez un nombre, comme 0,25, 1/4 ou 2e-3.',
      coarse: 'Donnez au moins deux chiffres significatifs.',
      answer: 'Votre réponse',
    },
  });

  // ---- Colours ----

  // pos and neg are the two classes of the demos (dataA and highlight of the
  // theme), classes adds a third one; series are the colours of several
  // curves on one plot (pos, neg, the third class, then the ink).
  const THIRD = { light: [24, 128, 104], dark: [94, 190, 160] };
  let C = null;

  function colours() {
    if (C) return C;
    const rgb = window.siteTheme.rgb;
    const dark = 0.2126 * rgb.bg[0] + 0.7152 * rgb.bg[1] + 0.0722 * rgb.bg[2] < 110;
    const third = dark ? THIRD.dark : THIRD.light;
    C = {
      dark, paper: rgb.bg, ink: rgb.text, soft: rgb.textSoft, muted: rgb.muted, faint: rgb.faint, border: rgb.border,
      pos: rgb.dataA, neg: rgb.highlight, third,
      classes: [rgb.dataA, rgb.highlight, third],
      series: [rgb.dataA, rgb.highlight, third, rgb.text],
    };
    return C;
  }
  // The third colour as a CSS variable (--lab-third), for the legends of the
  // page; the other colours are already variables of css/styles.css.
  const publishThird = () => document.documentElement.style.setProperty('--lab-third', `rgb(${colours().third.join(', ')})`);
  // Registered before any figure's listener, so that figures redraw with the new colours.
  window.addEventListener('sitethemechange', () => {
    C = null;
    publishThird();
  });
  if (window.siteTheme) publishThird();

  const rgba = (c, a = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;
  const mix = (a, b, t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
  const font = () => getComputedStyle(document.body).fontFamily;

  // ---- Numbers ----

  const SUPERSCRIPTS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const power = e => `10${String(e).replace(/[-0-9]/g, c => SUPERSCRIPTS[c])}`;
  const subscript = k => String(k).replace(/[0-9]/g, c => '₀₁₂₃₄₅₆₇₈₉'[c]);

  // A number for a readout: fixed digits, or m × 10ᵉ when very small or very large.
  function fmt(v, digits = 3) {
    if (v === null || v === undefined || Number.isNaN(v)) return '–';
    if (!Number.isFinite(v)) return '∞';
    const a = Math.abs(v);
    if (a !== 0 && (a < 0.001 || a >= 10000)) {
      const [m, e] = v.toExponential(1).split('e');
      return `${m} × ${power(Number(e))}`;
    }
    return v.toFixed(digits);
  }

  // A round step for about x between ticks: 1, 2 or 5 times a power of 10.
  function niceStep(x) {
    const p = 10 ** Math.floor(Math.log10(x)), m = x / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  // ---- Canvases ----

  // Sizes a canvas to width × height CSS pixels (width: its width in the page,
  // 100% of its parent in css/styles.css, unless given), sharp on high-density
  // screens, and clears it.
  function fit(canvas, height, width = canvas.clientWidth) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  // A plot of [x0, x1] × [y0, y1] in box = { left, top, width, height }:
  // grid lines and tick labels, and the maps X, Y from data to pixels (and
  // back: invX, invY). Options:
  //   x, y         [min, max]; with logY (or logX) they are exponents of 10
  //   xTicks, yTicks   values of the ticks (default: round steps), [] for none
  //   xLabel, yLabel   axis titles; xFormat, yFormat: tick labels
  //   zeroX, zeroY     draw the axis through 0 darker
  function axes(ctx, box, o) {
    const C = colours();
    const [x0, x1] = o.x, [y0, y1] = o.y;
    const X = x => box.left + box.width * (x - x0) / (x1 - x0);
    const Y = y => box.top + box.height * (y1 - y) / (y1 - y0);
    const invX = px => x0 + (px - box.left) / box.width * (x1 - x0);
    const invY = py => y1 - (py - box.top) / box.height * (y1 - y0);
    const ticks = (lo, hi, given, log) => {
      if (given) return given;
      if (log) return Array.from({ length: Math.floor(hi) - Math.ceil(lo) + 1 }, (_, i) => Math.ceil(lo) + i);
      const step = niceStep((hi - lo) / 5), out = [];
      for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9 * step; v += step) out.push(Math.abs(v) < 1e-12 * step ? 0 : v);
      return out;
    };
    const label = (v, log, f) => (f ? f(v) : log ? power(v) : String(Number(v.toPrecision(6))));
    ctx.save();
    ctx.font = `11px ${font()}`;
    ctx.lineWidth = 1;
    ctx.fillStyle = rgba(C.muted);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const v of ticks(x0, x1, o.xTicks, o.logX)) {
      ctx.strokeStyle = rgba(o.zeroX && v === 0 ? C.faint : C.border);
      ctx.beginPath();
      ctx.moveTo(X(v), box.top);
      ctx.lineTo(X(v), box.top + box.height);
      ctx.stroke();
      ctx.fillText(label(v, o.logX, o.xFormat), X(v), box.top + box.height + 5);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of ticks(y0, y1, o.yTicks, o.logY)) {
      ctx.strokeStyle = rgba(o.zeroY && v === 0 ? C.faint : C.border);
      ctx.beginPath();
      ctx.moveTo(box.left, Y(v));
      ctx.lineTo(box.left + box.width, Y(v));
      ctx.stroke();
      ctx.fillText(label(v, o.logY, o.yFormat), box.left - 5, Y(v));
    }
    if (o.xLabel) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(o.xLabel, box.left + box.width / 2, box.top + box.height + 20);
    }
    if (o.yLabel) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(o.yLabel, box.left + 4, box.top - 3);
    }
    ctx.restore();
    return { X, Y, invX, invY, box };
  }

  // Restricts drawing to the box of a plot; call ctx.restore() after.
  function clip(ctx, box) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.left, box.top, box.width, box.height);
    ctx.clip();
  }

  // Strokes a path through points [[px, py], ...] (pixels); style = { color, width, dash, alpha }.
  function polyline(ctx, points, style = {}) {
    ctx.beginPath();
    let started = false;
    for (const p of points) {
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) { started = false; continue; }
      if (!started) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
      started = true;
    }
    ctx.setLineDash(style.dash || []);
    ctx.lineWidth = style.width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = typeof style.color === 'string' ? style.color : rgba(style.color || colours().ink, style.alpha ?? 1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The graph of f on [a, b] in the maps { X, Y } of axes(); values outside
  // [-limit, limit] are cut so that a diverging curve still draws.
  function curve(ctx, map, f, a, b, style = {}, samples = 400) {
    const limit = style.limit || 1e6, points = [];
    for (let i = 0; i <= samples; i++) {
      const x = a + (b - a) * i / samples, y = f(x);
      points.push(Number.isFinite(y) ? [map.X(x), map.Y(Math.max(-limit, Math.min(limit, y)))] : null);
    }
    polyline(ctx, points, style);
  }

  function dot(ctx, x, y, r, color, ring) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = typeof color === 'string' ? color : rgba(color);
    ctx.fill();
    if (ring) {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgba(ring);
      ctx.stroke();
    }
  }

  function arrow(ctx, x0, y0, x1, y1, style = {}) {
    const head = style.head || 7, angle = Math.atan2(y1 - y0, x1 - x0);
    polyline(ctx, [[x0, y0], [x1, y1]], style);
    if (Math.hypot(x1 - x0, y1 - y0) < 2) return;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(angle - 0.4), y1 - head * Math.sin(angle - 0.4));
    ctx.lineTo(x1 - head * Math.cos(angle + 0.4), y1 - head * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = typeof style.color === 'string' ? style.color : rgba(style.color || colours().ink, style.alpha ?? 1);
    ctx.fill();
  }

  // Marching squares: adds to the current path of ctx the level set
  // {field = level} of a field sampled on a lattice of cols × rows points
  // (row major, first row at the top), drawn in a box of width × height
  // pixels starting at (left, top). The caller strokes the path.
  function contourPath(ctx, field, cols, rows, level, width, height, left = 0, top = 0) {
    const cw = width / (cols - 1), ch = height / (rows - 1);
    const v = [0, 0, 0, 0], cuts = [];
    const cx = [0, 1, 1, 0], cy = [0, 0, 1, 1];  // corners clockwise from the top-left
    const segment = (p, q) => {
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
    };
    for (let gy = 0; gy + 1 < rows; gy++) {
      for (let gx = 0; gx + 1 < cols; gx++) {
        for (let c = 0; c < 4; c++) v[c] = field[(gy + cy[c]) * cols + gx + cx[c]] - level;
        cuts.length = 0;
        for (let e = 0; e < 4; e++) {
          const f = (e + 1) % 4;
          if ((v[e] > 0) !== (v[f] > 0)) {
            const t = v[e] / (v[e] - v[f]);
            cuts.push([left + (gx + cx[e] + t * (cx[f] - cx[e])) * cw, top + (gy + cy[e] + t * (cy[f] - cy[e])) * ch]);
          }
        }
        if (cuts.length === 2) segment(cuts[0], cuts[1]);
        else if (cuts.length === 4) {
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
  }

  // ---- Pill buttons ----

  // Buttons written in the page: [data-pills="name"] holding buttons with data-value.
  function bindPills(root, name, onChange) {
    const buttons = root.querySelectorAll(`[data-pills="${name}"] button`);
    buttons.forEach(button => button.addEventListener('click', () => {
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      onChange(button.dataset.value);
    }));
  }

  // Buttons generated in box from items [{ label, value, title }].
  function pills(box, items, isPressed, onClick) {
    box.innerHTML = '';
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'demo-button';
      button.textContent = item.label;
      if (item.title) button.title = item.title;
      button.setAttribute('aria-pressed', String(isPressed(item.value)));
      button.addEventListener('click', () => onClick(item.value));
      box.appendChild(button);
    }
  }

  // ---- Figures ----

  // setup(root) builds a figure in each element matching selector and returns
  // its draw function, called once now, then after every theme switch and
  // every change of the window's width.
  const drawers = [];
  function figure(selector, setup) {
    document.querySelectorAll(selector).forEach(root => {
      const draw = setup(root);
      if (typeof draw === 'function') {
        drawers.push(draw);
        draw();
      }
    });
  }
  window.addEventListener('sitethemechange', () => drawers.forEach(draw => draw()));
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    drawers.forEach(draw => draw());
  });

  // An animation: frame() is called at every animation frame while it plays
  // and while root is on screen, and stops it by returning false.
  // Returns { play, pause, toggle, playing }; onChange(playing) is told of every change.
  function animate(root, frame, onChange = () => {}) {
    let playing = false, visible = true, requested = false;
    const tick = () => {
      requested = false;
      if (!playing || !visible) return;
      if (frame() === false) {
        control.pause();
        return;
      }
      request();
    };
    const request = () => {
      if (!requested) {
        requested = true;
        requestAnimationFrame(tick);
      }
    };
    const control = {
      get playing() { return playing; },
      play() { playing = true; onChange(true); request(); },
      pause() { playing = false; onChange(false); },
      toggle() { if (playing) control.pause(); else control.play(); },
    };
    if (window.IntersectionObserver) {
      new IntersectionObserver(entries => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible && playing) request();
      }).observe(root);
    }
    return control;
  }

  // ---- MathJax ----

  // Mathematics added after the page has loaded; before that, MathJax's first
  // pass over the page takes care of it.
  function typeset(node) {
    const mj = window.MathJax;
    if (!mj || !mj.typesetPromise) return;
    if (mj.startup && mj.startup.promise) mj.startup.promise = mj.startup.promise.then(() => mj.typesetPromise([node])).catch(() => {});
    else mj.typesetPromise([node]).catch(() => {});
  }

  // ---- Guided experiments ----

  // The panel under a playground: the list of experiments by part, and the
  // selected one with its question, its variants, what to watch and the
  // explanation on demand. An experiment is
  //   { id, part, title, setup, variants: [{ label, set } or { label, action }],
  //     question, watch, explanation }   (texts in HTML, mathematics in $…$).
  // options: { root (the playground), list, detail (the two elements of the
  // panel), items (the experiments), parts ({ id: title }), load(setup),
  // action(name) }. Links <a data-experiment="II.3"> anywhere in the page, and
  // #II.3 at the end of the address, select an experiment and bring the
  // playground into view. Returns { select(id), manual() }: manual() tells the
  // panel that a setting was changed by hand, so that no variant is shown as
  // the current one.
  function experiments(o) {
    let current = null, variantIndex = -1;

    function renderList() {
      o.list.innerHTML = '';
      for (const part of Object.keys(o.parts)) {
        const heading = document.createElement('div');
        heading.className = 'lab-exp-part';
        heading.textContent = o.parts[part];
        o.list.appendChild(heading);
        for (const e of o.items.filter(x => x.part === part)) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'lab-exp-item';
          button.dataset.experiment = e.id;
          button.innerHTML = `<span class="lab-exp-id">${e.id}</span> ${e.title}`;
          button.setAttribute('aria-pressed', String(current === e));
          o.list.appendChild(button);
        }
      }
    }

    function select(id) {
      current = o.items.find(e => e.id === id) || null;
      variantIndex = -1;
      renderList();
      if (!current) return;
      o.detail.innerHTML = `
        <div class="lab-exp-head"><span class="lab-exp-id">${T.experiment} ${current.id}</span></div>
        <h3>${current.title}</h3>
        <div class="lab-exp-question"><span class="lab-exp-label">${T.predict}</span> ${current.question}</div>
        <div class="lab-exp-variants"></div>
        <p class="lab-exp-watch"><span class="lab-exp-label">${T.watch}</span> ${current.watch}</p>
        <details class="lab-exp-explanation"><summary>${T.why}</summary>${current.explanation}</details>`;
      renderVariants();
      typeset(o.detail);
    }

    function renderVariants() {
      if (!current) return;
      const box = o.detail.querySelector('.lab-exp-variants');
      box.innerHTML = '';
      const loads = current.variants.filter(v => v.set);
      const buttons = loads.length ? current.variants : [{ label: T.run, set: {} }, ...current.variants];
      buttons.forEach((variant, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'demo-button';
        button.textContent = variant.set && loads.length ? `▶ ${variant.label}` : variant.label;
        if (variant.set) button.setAttribute('aria-pressed', String(index === variantIndex));
        button.addEventListener('click', () => {
          if (variant.action) {
            o.action(variant.action);
            return;
          }
          o.load({ ...current.setup, ...variant.set });
          variantIndex = index;
          renderVariants();
        });
        box.appendChild(button);
      });
    }

    o.list.addEventListener('click', event => {
      const item = event.target.closest('[data-experiment]');
      if (item) select(item.dataset.experiment);
    });
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-experiment]');
      if (!link || !o.items.some(e => e.id === link.dataset.experiment)) return;
      event.preventDefault();
      select(link.dataset.experiment);
      try { window.history.replaceState(null, '', `#${link.dataset.experiment}`); } catch (e) { /* file:// in some browsers */ }
      o.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, true);

    const fromAddress = decodeURIComponent(window.location.hash.slice(1));
    const known = o.items.some(e => e.id === fromAddress);
    select(known ? fromAddress : o.items[0] && o.items[0].id);
    if (known) o.root.scrollIntoView({ block: 'start' });

    return {
      select,
      manual() {
        variantIndex = -1;
        renderVariants();
      },
    };
  }

  // ---- Self-checking answers ----

  // A small parser for what students type: numbers (decimal point or comma,
  // exponents 2e-3), + - * / ^, parentheses, sqrt, ln, log (base 10), exp, pi, e.
  function evaluate(text) {
    const s = text.replace(/,/g, '.').replace(/\s+/g, '').replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/');
    let i = 0;
    const peek = () => s[i];
    function expression() {
      let v = term();
      while (peek() === '+' || peek() === '-') v = s[i++] === '+' ? v + term() : v - term();
      return v;
    }
    function term() {
      let v = factor();
      while (peek() === '*' || peek() === '/') v = s[i++] === '*' ? v * factor() : v / factor();
      return v;
    }
    function factor() {
      if (peek() === '-') { i++; return -factor(); }
      if (peek() === '+') { i++; return factor(); }
      const base = atom();
      if (peek() === '^') { i++; return base ** factor(); }
      return base;
    }
    function atom() {
      if (peek() === '(') {
        i++;
        const v = expression();
        if (s[i++] !== ')') throw new Error('parenthesis');
        return v;
      }
      const name = /^(sqrt|ln|log|exp|pi|e(?![0-9.]))/.exec(s.slice(i));
      if (name) {
        i += name[0].length;
        if (name[0] === 'pi') return Math.PI;
        if (name[0] === 'e') return Math.E;
        const f = { sqrt: Math.sqrt, ln: Math.log, log: Math.log10, exp: Math.exp }[name[0]];
        return f(atom());
      }
      const number = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i));
      if (!number) throw new Error('number');
      i += number[0].length;
      return Number(number[0]);
    }
    const v = expression();
    if (i !== s.length || !Number.isFinite(v)) throw new Error('trailing');
    return v;
  }

  // One unit of the last digit of a number as typed (0.38 → 0.01, 1.5e-3 →
  // 0.0001, 1375 → 1), or null when the text is an expression.
  function typedUnit(text) {
    const m = /^\s*[-+−]?(\d*)(?:[.,](\d*))?(?:e([-+−]?\d+))?\s*$/i.exec(text);
    if (!m || !(m[1] || m[2])) return null;
    const exponent = m[3] ? Number(m[3].replace('−', '-')) : 0;
    return 10 ** (exponent - (m[2] ? m[2].length : 0));
  }

  function buildCheck(box) {
    const answer = Number(box.dataset.answer);
    const tol = box.dataset.tol !== undefined ? Number(box.dataset.tol)
      : Math.max(Math.abs(answer) * Number(box.dataset.rel || 0.005), 1e-9);
    box.innerHTML = `<input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="${T.answer}" placeholder="${T.answer}"><button type="button" class="demo-button">${T.check}</button><span class="exo-check-result" role="status"></span>`;
    const input = box.querySelector('input'), result = box.querySelector('.exo-check-result');
    const check = () => {
      if (!input.value.trim()) return;
      let v;
      try { v = evaluate(input.value); } catch (e) {
        result.dataset.result = '';
        result.textContent = T.unreadable;
        return;
      }
      // Judged at the precision typed: the answer rounded or truncated to the
      // last digit typed (one unit of it), with at least two significant
      // digits, that is a unit of at most 10^(e − 1) when the answer is m × 10^e.
      const unit = typedUnit(input.value), slack = 1 + 1e-9;
      const close = Math.abs(v - answer) <= tol * slack;
      const asTyped = unit !== null && [Math.round, Math.trunc].some(cut => Math.abs(v - cut(answer / unit) * unit) <= 1e-6 * unit);
      const within = close || asTyped;
      const coarse = !close && answer !== 0 && unit > 10 ** (Math.floor(Math.log10(Math.abs(answer))) - 1) * slack;
      if (within && coarse) {
        result.dataset.result = '';
        result.textContent = T.coarse;
        return;
      }
      result.dataset.result = within ? 'right' : 'wrong';
      result.textContent = within ? `✓ ${T.right}` : `✗ ${T.wrong}`;
    };
    box.querySelector('button').addEventListener('click', check);
    input.addEventListener('keydown', event => { if (event.key === 'Enter') check(); });
    input.addEventListener('input', () => { result.textContent = ''; result.dataset.result = ''; });
  }
  document.querySelectorAll('.exo-check').forEach(buildCheck);

  window.Lab = {
    random, lang, strings, format, colours, rgba, mix, font,
    power, subscript, fmt, niceStep,
    fit, axes, clip, polyline, curve, dot, arrow, contourPath,
    bindPills, pills, figure, animate, typeset, experiments, evaluate,
  };
})();
