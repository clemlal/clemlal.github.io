// Publications of the home page (index.html), built at page load.
//
// They are fetched from HAL (author id clement-lalanne, every document type but
// lectures), with a few manual entries for items missing from HAL, grouped by
// year, newest first, each with a coloured venue badge (js/venue-badges.js,
// loaded before this file). If HAL cannot be reached, only the manual entries
// are shown. See the README for how to add a manual entry.

function renderPublication(pub) {
  return `
    <li class="publication-item">
      ${venueBadgeHTML(pub.badge)}
      <div class="publication-details">
        <strong>${pub.title}</strong><br>
        ${pub.authors}<br>
        Type: ${pub.type}, Date: ${pub.date}<br>
        ${pub.venue ? `Venue: ${pub.venue}<br>` : ''}
        <a href="${pub.link}" target="_blank" rel="noopener noreferrer">${pub.linkText}</a>
      </div>
    </li>
  `;
}

function renderPublicationList(publications) {
  colorVenueBadges(publications);

  const grouped = {};
  publications.forEach(pub => {
    const year = pub.date.slice(0, 4) || 'Unknown';
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(renderPublication(pub));
  });

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  let publicationsHTML = '';

  years.forEach(year => {
    publicationsHTML += `
      <div class="publication-year-block">
        <h3 class="publication-year">${year}</h3>
        <ul class="year-publication-list">
          ${grouped[year].join('')}
        </ul>
      </div>
    `;
  });

  return publicationsHTML;
}

// Publications missing from HAL.
const diffusionLmProgress = {
  title: 'Measuring Progress in Diffusion Language Model Pretraining',
  authors: 'Antoine Gonon, Adrian Müller, Léon Zheng, Clément Lalanne, Zebang Shen, Ya-Ping Hsieh, Anthony Bardou, Nicolas Boumal',
  type: 'Conference Paper',
  date: '2026',
  venue: '40th Conference on Neural Information Processing Systems (NeurIPS 2026). Workshop: BeNTo: Beyond Next-Token Prediction — Diffusion & Flow Models for Next-Generation Decoding',
  link: 'https://openreview.net/pdf?id=WLNBGbEQnV',
  linkText: 'View Publication',
  badge: venueBadge(['40th Conference on Neural Information Processing Systems (NeurIPS 2026). Workshop: BeNTo: Beyond Next-Token Prediction — Diffusion & Flow Models for Next-Generation Decoding'], 'COMM'),
};

const speedrunDlm = {
  title: 'speedrun-dlm: A speedrun benchmark for diffusion language models',
  authors: 'Antoine Gonon, Adrian Müller, Léon Zheng, Zebang Shen, Clément Lalanne, Ya-Ping Hsieh, Anthony Bardou, Nicolas Boumal',
  type: 'Software / Benchmark',
  date: '2026',
  venue: 'GitHub (MIT license)',
  link: 'https://github.com/agonon/speedrun-dlm',
  linkText: 'View Repository',
  badge: venueBadge([], 'SOFTWARE'),
};

const phdThesis = {
  title: 'On the tradeoffs of statistical learning with privacy',
  authors: 'Clément Lalanne',
  type: 'PhD Thesis',
  date: '2023-10-04',
  link: 'https://hal.science/tel-04431813',
  linkText: 'View Thesis',
  badge: venueBadge([], 'THESE'),
};

// Inserting the publications pushes down everything below them. A visitor who
// is already further down, typically after following a link to #teaching while
// the list was loading, would end up in the middle of the publications. So when
// the whole list is above what the visitor sees (the top of the window, or the
// bottom of the navigation bar pinned there), scroll by the same amount,
// keeping the Teaching section (and what is below it) in place. Browsers that
// do this themselves (scroll anchoring) leave no shift to correct.
function keepViewInPlace(update) {
  const below = document.getElementById('teaching');
  const bar = document.querySelector('.top-nav');
  const visibleTop = bar && getComputedStyle(bar).position === 'sticky' ? bar.getBoundingClientRect().bottom : 0;
  const listAboveScreen = document.querySelector('.publications-container').getBoundingClientRect().bottom <= visibleTop + 1;
  const before = below.getBoundingClientRect().top;
  update();
  const shift = below.getBoundingClientRect().top - before;
  if (listAboveScreen && shift) window.scrollBy(0, shift);
}

async function fetchPublications() {
  const publicationList = document.getElementById('publication-list');
  const loadingMessage = document.querySelector('.loading');
  const errorMessage = document.createElement('p');
  errorMessage.className = 'error';

  try {
    const response = await fetch(
      'https://api.archives-ouvertes.fr/search/?q=authIdHal_s:clement-lalanne&fl=title_s,authFullName_s,docType_s,publicationDate_s,doi_s,uri_s,journalTitle_s,conferenceTitle_s&fq=-docType_s:LECTURE&sort=publicationDate_s%20desc'
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const docs = data.response?.docs || [];

    const docTypes = {
      ART: 'Journal Article',
      COMM: 'Conference Paper',
      THESE: 'PhD Thesis',
      HDR: 'HDR',
      COUV: 'Book Chapter',
      OUV: 'Book',
      OTHER: 'Other',
      LECTURE: 'Lecture',
      UNDEFINED: 'Preprint'
    };

    const halPublications = docs.map(doc => ({
      title: doc.title_s || 'Untitled',
      authors: Array.isArray(doc.authFullName_s)
        ? doc.authFullName_s.join(', ')
        : (doc.authFullName_s || 'Unknown Authors'),
      type: docTypes[doc.docType_s] || doc.docType_s || 'Unknown Type',
      date: doc.publicationDate_s || 'Unknown Date',
      venue: doc.journalTitle_s || doc.conferenceTitle_s || 'Unknown Venue',
      link: doc.doi_s ? `https://doi.org/${doc.doi_s}` : (doc.uri_s || '#'),
      linkText: 'View Publication',
      badge: venueBadge([doc.conferenceTitle_s, doc.journalTitle_s], doc.docType_s),
    }));

    // HAL results are sorted newest first: the diffusion paper and its benchmark lead 2026, the thesis closes 2023.
    keepViewInPlace(() => {
      publicationList.innerHTML = renderPublicationList([diffusionLmProgress, speedrunDlm, ...halPublications, phdThesis]);
      if (loadingMessage) loadingMessage.style.display = 'none';
    });

  } catch (error) {
    console.error('Error fetching publications:', error);

    keepViewInPlace(() => {
      if (loadingMessage) loadingMessage.style.display = 'none';
      errorMessage.textContent = 'Unable to load publications automatically at the moment.';
      publicationList.before(errorMessage);
      publicationList.innerHTML = renderPublicationList([diffusionLmProgress, speedrunDlm, phdThesis]);
    });
  }
}

// Started right away: waiting for the page's load event would also wait for every photo.
fetchPublications();
