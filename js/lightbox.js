// Enlarged photos, on index.html and news_archive.html.
//
// Every photo of a news item (the <img> elements inside a <div class="center">)
// opens on click in a full-screen dialog, over a dark backdrop. A click on the
// photo or the backdrop, the ✕ button or the Escape key closes it. The ‹ and ›
// buttons and the arrow keys go through the other photos of the same item.
// The photos are already loaded at full size (only displayed small), so the
// enlarged one shows at once. Styles: the .lightbox rules in css/styles.css.

(function () {
  const photos = document.querySelectorAll('.center img');
  if (!photos.length || typeof HTMLDialogElement === 'undefined') return;

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Enlarged photo');
  dialog.innerHTML = `
    <figure>
      <img alt="">
      <figcaption></figcaption>
    </figure>
    <button type="button" class="lightbox-close" aria-label="Close">✕</button>
    <button type="button" class="lightbox-prev" aria-label="Previous photo">‹</button>
    <button type="button" class="lightbox-next" aria-label="Next photo">›</button>`;
  document.body.appendChild(dialog);

  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('figcaption');
  const prev = dialog.querySelector('.lightbox-prev');
  const next = dialog.querySelector('.lightbox-next');
  let group = [];  // photos of the news item being shown
  let index = 0;

  function show(k) {
    index = (k + group.length) % group.length;
    const photo = group[index];
    image.src = photo.currentSrc || photo.src;
    image.alt = photo.alt;
    caption.textContent = group.length > 1 ? `${photo.alt} · ${index + 1} / ${group.length}` : photo.alt;
  }

  function open(photo) {
    group = Array.from(photo.closest('.center').querySelectorAll('img'));
    prev.hidden = next.hidden = group.length < 2;
    show(group.indexOf(photo));
    dialog.showModal();
  }

  photos.forEach(photo => {
    photo.tabIndex = 0;
    photo.setAttribute('aria-label', `Enlarge photo: ${photo.alt}`);
    photo.addEventListener('click', () => open(photo));
    photo.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(photo);
      }
    });
  });

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  // Anywhere else (the photo, its caption, the backdrop) closes the dialog.
  dialog.addEventListener('click', event => {
    if (!event.target.closest('.lightbox-prev, .lightbox-next')) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (group.length < 2) return;
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });
})();
