// Fade-up of the blocks of the home page (the presentation and the sections) as
// they come into view, as on apple.com. Only the blocks below the screen at
// load are animated, so nothing visible blinks, and nothing moves for visitors
// who ask for reduced motion. Styles: .reveal in css/styles.css.

(function () {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.main > .presentation, .main > .section').forEach(block => {
    if (block.getBoundingClientRect().top < window.innerHeight) return;
    block.classList.add('reveal');
    observer.observe(block);
  });
})();
