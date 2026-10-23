// What every blog post needs, loaded in its <head> after js/themes.js.
//
// Mathematics: written in LaTeX directly in the page, $…$ or \(…\) inline,
// $$…$$, \[…\] or \begin{equation}…\end{equation} on their own line, numbered
// and referenced as in LaTeX (\label{eq:x}, \eqref{eq:x}; equation*, align* are
// not numbered). \$ writes a dollar sign. MathJax renders it as SVG in the
// colour of the text, so it follows the themes. The library is a copy in
// vendor/mathjax, so that nothing is loaded from another site.
//
// Drafts: a post opened from drafts/ (never published, see .gitignore) gets a
// "Draft" label above its title (the is-draft class on <html>, styled in
// css/styles.css), which disappears by itself once the post is moved to blog/.
//
// Code boxes: the Copy button of a <div class="codebox"> (a BibTeX entry, a
// script) copies its text, or, if the browser refuses, selects it to be copied
// by hand.
//
// Folded proofs (<details class="fold">): a link to something inside one, such
// as a lemma stated within a proof, opens it.

window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    tags: 'ams',
    macros: {
      Z: '\\mathbb{Z}',
      N: '\\mathbb{N}',
      R: '\\mathbb{R}',
    },
  },
  svg: { fontCache: 'global' },
};

(function () {
  const script = document.createElement('script');
  script.src = new URL('../vendor/mathjax/tex-svg.js', document.currentScript.src).href;
  script.async = true;
  document.head.appendChild(script);

  if (/\/drafts\//.test(window.location.pathname)) document.documentElement.classList.add('is-draft');

  document.addEventListener('click', event => {
    const button = event.target.closest('.codebox-copy');
    if (!button) return;
    const pre = button.closest('.codebox').querySelector('pre');
    Promise.resolve().then(() => navigator.clipboard.writeText(pre.textContent)).then(() => {
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    }, () => {
      const range = document.createRange();
      range.selectNodeContents(pre);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    });
  });

  function revealTarget() {
    const target = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (!target) return;
    let opened = false;
    for (let fold = target.closest('details'); fold; fold = fold.parentElement.closest('details')) {
      if (!fold.open) { fold.open = true; opened = true; }
    }
    if (opened) target.scrollIntoView();
  }
  document.addEventListener('DOMContentLoaded', revealTarget);
  window.addEventListener('hashchange', revealTarget);
})();
