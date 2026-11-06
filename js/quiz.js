// Self-assessment quizzes: questions with one or several correct answers,
// written as plain text in the page, checked in the browser, with a commented
// solution on request.
//
// A page loads css/styles.css, js/themes.js and js/post.js (for the
// mathematics) in its <head>, and this script at the end of its <body>, after
//   <div class="quiz" data-quiz="<storage id>" data-source="<script id>"></div>
//   <script type="text/x-quiz" id="<script id>"> ...the questions... </script>
// The visitor's answers are kept in their browser (localStorage, under
// "quiz:<storage id>"), so that a quiz can be done over several sessions, in
// several tabs. A question is identified by its title, statement and options:
// changing them starts it afresh for every visitor, whereas comments, hints
// and solutions can be corrected without losing anything.
//
// The questions, one line at a time:
//   # Title                    starts a section
//   ## Title @calc @further    starts a question, with optional tags (TAGS below)
//   any text                   the statement; a blank line starts a new paragraph
//   - [x] text                 a correct option, and - [ ] text a wrong one; the
//     indented lines below     comment the option, with the solution
//   ? text                     a hint, shown on request (indented lines continue it)
//   > text                     the solution; a line with ">" alone starts a new paragraph
//   // text                    a comment, ignored
// The block may be indented as a whole. Every question needs at least one
// correct option, and at most 12 options (the console warns otherwise). The
// text is HTML, with *emphasis* and **bold** (not around mathematics), and
// LaTeX: $…$ inline, $$…$$ displayed. Inside the mathematics, <, > and & are
// written as such.
//
// The options are shown in an order drawn from the text of the question, the
// same at every visit, so that the position of the correct ones tells nothing:
// they can be written in any order, but a comment cannot refer to "the first
// option". Checking an answer tells how many boxes are wrong, not which ones:
// the visitor can try again, or show the solution, which marks every option
// and gives its comment. The summary counts the questions answered and those
// that were right at the first check.

(function () {
  const TAGS = { calc: 'Pen and paper', further: 'Going further' };
  const LETTERS = 'ABCDEFGHIJKL';
  const MATH = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$(?:\\.|[^$\\])+\$/g;

  const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const prose = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Source text to HTML: the mathematics escaped for MathJax, the rest as written.
  function html(text) {
    let out = '';
    let last = 0;
    for (const m of text.matchAll(MATH)) {
      out += prose(text.slice(last, m.index)) + escape(m[0]);
      last = m.index + m[0].length;
    }
    return out + prose(text.slice(last));
  }

  // Lines, with '' for a blank line, to paragraphs.
  const paragraphs = lines => lines.join('\n').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${html(p)}</p>`).join('');

  function parse(source) {
    const sections = [];
    let section = null;
    let question = null;
    let block = null;
    // The indentation common to all lines (the block may be indented in the page) does not count.
    const lines = source.split('\n');
    const margin = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
    for (const raw of lines.map(l => l.slice(Math.min(margin, l.match(/^\s*/)[0].length)))) {
      const line = raw.trimEnd();
      const text = line.trim();
      const indented = text !== '' && /^\s/.test(line);
      let m;
      if (!indented && text.startsWith('//')) continue;
      if (!indented && (m = /^#\s+(.*)$/.exec(text))) {
        section = { title: m[1], intro: [], questions: [] };
        sections.push(section);
        question = null;
        block = section.intro;
        continue;
      }
      if (!indented && (m = /^##\s+(.*)$/.exec(text))) {
        if (!section) sections.push(section = { title: '', intro: [], questions: [] });
        const tags = (m[1].match(/(?:\s+@[\w-]+)+$/) || [''])[0];
        question = {
          title: m[1].slice(0, m[1].length - tags.length),
          tags: tags.split('@').map(t => t.trim()).filter(Boolean),
          statement: [], options: [], hint: [], solution: [],
        };
        section.questions.push(question);
        block = question.statement;
      } else if (question && !indented && (m = /^-\s+\[([ xX])\](?:\s+(.*))?$/.exec(text))) {
        const option = { correct: m[1] !== ' ', text: m[2] || '', comment: [] };
        question.options.push(option);
        block = option.comment;
      } else if (question && !indented && (m = /^\?\s*(.*)$/.exec(text))) {
        block = question.hint;
        block.push(m[1]);
      } else if (question && !indented && (m = /^>\s?(.*)$/.exec(text))) {
        block = question.solution;
        block.push(m[1]);
      } else if (block) {
        block.push(text);
      }
    }
    // What identifies a question, for the saved answers and the order of the options.
    sections.forEach(s => s.questions.forEach(q => {
      q.source = [q.title, ...q.statement, ...q.options.map(o => `[${o.correct ? 'x' : ' '}] ${o.text}`)].join('\n');
      if (!q.options.some(o => o.correct)) console.warn(`quiz: no correct option in "${q.title}"`);
      if (q.options.length > LETTERS.length) console.warn(`quiz: more than ${LETTERS.length} options in "${q.title}"`);
    }));
    return sections;
  }

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
    return h;
  }

  // 0, ..., n - 1 shuffled by a generator seeded with seed (mulberry32).
  function shuffled(n, seed) {
    let a = seed;
    const random = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const order = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
  }

  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* kept for this visit only */ }
  }

  // Mathematics added after the page has loaded; before that, MathJax's first
  // pass over the page takes care of it.
  function typeset(node) {
    const mj = window.MathJax;
    if (!mj || !mj.typesetPromise || !mj.startup) return;
    mj.startup.promise = mj.startup.promise.then(() => mj.typesetPromise([node])).catch(() => {});
  }

  function element(tag, className, inner) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (inner) node.innerHTML = inner;
    return node;
  }

  function question(q, number, seed, state, changed) {
    const order = shuffled(q.options.length, seed);
    const node = element('article', 'quiz-q', `
      <header class="quiz-q-head">
        <a class="quiz-q-num" href="#q${number}" aria-label="Question ${number}">${number}</a>
        <h3 class="quiz-q-title">${html(q.title)}</h3>
        ${q.tags.map(t => `<span class="quiz-tag" data-tag="${t}">${TAGS[t] || t}</span>`).join('')}
      </header>
      <div class="quiz-q-text">${paragraphs(q.statement)}</div>
      <ol class="quiz-options">${order.map((k, place) => `
        <li class="quiz-option">
          <label><input type="checkbox" value="${k}"><span class="quiz-letter">${LETTERS[place]}</span><span class="quiz-option-text">${html(q.options[k].text)}</span></label>
          <div class="quiz-comment" hidden></div>
        </li>`).join('')}
      </ol>
      <div class="quiz-actions">
        <button type="button" class="demo-button" data-act="check">Check</button>
        ${q.hint.length ? '<button type="button" class="demo-button" data-act="hint">Hint</button>' : ''}
        <button type="button" class="demo-button" data-act="solution" hidden>Show the solution</button>
        <span class="quiz-feedback" role="status"></span>
      </div>
      <div class="quiz-hint" hidden></div>
      <div class="quiz-solution" hidden></div>`);
    node.id = 'q' + number;

    // In the order shown; the value of a box is the index of its option in the source.
    const boxes = [...node.querySelectorAll('input')];
    const items = [...node.querySelectorAll('.quiz-option')];
    const button = act => node.querySelector(`[data-act="${act}"]`);
    const feedback = node.querySelector('.quiz-feedback');
    const hint = node.querySelector('.quiz-hint');
    const solution = node.querySelector('.quiz-solution');

    function render() {
      const locked = state.result === 0 || state.shown;
      boxes.forEach(box => { box.checked = state.sel.includes(Number(box.value)); box.disabled = locked; });
      node.classList.toggle('is-locked', locked);
      button('check').disabled = locked;
      button('solution').hidden = !state.tries || state.shown;
      if (button('hint')) button('hint').hidden = state.hint || state.shown;

      const wrong = state.result;
      feedback.dataset.result = wrong === 0 ? 'right' : wrong > 0 ? 'wrong' : '';
      feedback.textContent = wrong === 0 ? (state.tries === 1 ? 'Right at the first check.' : 'Right.')
        : wrong > 0 ? `Not quite: ${wrong} box${wrong > 1 ? 'es are' : ' is'} wrong.`
          + (state.shown ? '' : ' Change your answer and check again, or show the solution.')
        : '';

      if ((state.hint || state.shown) && q.hint.length && hint.hidden) {
        hint.innerHTML = `<p class="quiz-label">Hint</p>${paragraphs(q.hint)}`;
        hint.hidden = false;
        typeset(hint);
      }
      if (state.shown && solution.hidden) {
        order.forEach((k, place) => {
          const o = q.options[k];
          const comment = items[place].querySelector('.quiz-comment');
          const missed = o.correct !== state.sel.includes(k);
          items[place].dataset.truth = o.correct;
          comment.innerHTML = `<p><span class="quiz-verdict">${o.correct ? '✓ True.' : '✗ False.'}</span>`
            + (missed ? ` <span class="quiz-missed">${o.correct ? 'You did not tick it.' : 'You ticked it.'}</span>` : '')
            + ` ${html(o.comment.join(' ').trim())}</p>`;
          comment.hidden = false;
          typeset(comment);
        });
        solution.innerHTML = q.solution.length ? `<p class="quiz-label">Solution</p>${paragraphs(q.solution)}` : '';
        solution.hidden = !q.solution.length;
        typeset(solution);
      }
    }

    boxes.forEach(box => box.addEventListener('change', () => {
      state.sel = boxes.filter(b => b.checked).map(b => Number(b.value));
      delete state.result;
      render();
      changed();
    }));
    button('check').addEventListener('click', () => {
      if (!state.sel.length) {
        feedback.dataset.result = '';
        feedback.textContent = 'Tick at least one box.';
        return;
      }
      state.result = q.options.filter((o, k) => o.correct !== state.sel.includes(k)).length;
      state.tries = (state.tries || 0) + 1;
      if (state.tries === 1) state.first = state.result === 0;
      render();
      changed();
    });
    button('solution').addEventListener('click', () => { state.shown = true; render(); changed(); });
    if (button('hint')) button('hint').addEventListener('click', () => { state.hint = true; render(); changed(); });

    render();
    return node;
  }

  function build(root) {
    const sections = parse(document.getElementById(root.dataset.source).textContent);
    const key = 'quiz:' + root.dataset.quiz;
    const saved = load(key);
    const states = {};
    const counted = [];

    const summary = element('div', 'quiz-summary', `
      <p class="quiz-score" role="status"></p>
      <div class="quiz-bar" aria-hidden="true"><span></span></div>
      <button type="button" class="demo-button" data-act="reset">Start again</button>`);
    const toc = element('nav', 'quiz-toc', '<ol></ol>');
    toc.setAttribute('aria-label', 'Sections');
    root.append(summary, toc);

    // Saves one question, merged into what other tabs may have saved meanwhile.
    const update = id => {
      if (id) {
        const current = load(key);
        current[id] = states[id];
        store(key, current);
      }
      let answered = 0, first = 0, total = 0;
      counted.forEach(({ list, count }) => {
        const done = list.filter(s => s.tries || s.shown).length;
        count.textContent = `${done}/${list.length}`;
        answered += done;
        first += list.filter(s => s.first).length;
        total += list.length;
      });
      summary.querySelector('.quiz-score').textContent =
        `${answered} of ${total} questions answered, ${first} right at the first check.`;
      summary.querySelector('.quiz-bar span').style.width = `${(100 * answered) / total}%`;
    };

    let number = 0;
    sections.forEach((section, s) => {
      const node = element('section', 'quiz-section', `<h2>${html(section.title)}</h2>${paragraphs(section.intro)}`);
      node.id = 's' + (s + 1);
      const entry = element('li', '', `<a href="#s${s + 1}"><span>${html(section.title)}</span><span class="quiz-toc-count"></span></a>`);
      toc.querySelector('ol').append(entry);
      const list = [];
      section.questions.forEach(q => {
        const seed = hash(q.source);
        const id = seed.toString(36);
        const state = states[id] = Object.assign({ sel: [] }, saved[id]);
        list.push(state);
        node.append(question(q, ++number, seed, state, () => update(id)));
      });
      counted.push({ list, count: entry.querySelector('.quiz-toc-count') });
      root.append(node);
    });

    summary.querySelector('[data-act="reset"]').addEventListener('click', () => {
      if (!window.confirm('Erase all your answers to this quiz?')) return;
      try { localStorage.removeItem(key); } catch (e) { /* nothing was kept */ }
      window.location.reload();
    });

    // The summary stays below the site's navigation bar, whose height changes when it wraps.
    const nav = document.querySelector('.top-nav');
    if (nav && window.ResizeObserver) {
      new ResizeObserver(() => root.style.setProperty('--quiz-nav', `${nav.offsetHeight}px`)).observe(nav);
    }

    store(key, states);  // also forgets the questions that no longer exist
    update();
  }

  document.querySelectorAll('.quiz[data-source]').forEach(build);
})();
