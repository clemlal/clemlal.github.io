# clemlal.github.io

Personal academic website of Clément Lalanne, published at **https://clemlal.github.io** by GitHub Pages.

The site is plain static HTML, CSS and vanilla JavaScript: no framework, no build step, no dependencies. What is pushed to `master` is what gets served.

## Repository layout

```
index.html                 Home page: presentation, news, publications, teaching, curriculum
news_archive.html          Older news items, moved out of index.html
teaching_archive.html      Every course taught, grouped by course with one line per academic year
css/styles.css             The only stylesheet, shared by every page (course pages included)
js/themes.js               Seasonal themes: colours and demo symbols of each season and event
js/lightbox.js             Enlarged view of the news photos, on click
js/reveal.js               Fade-up of the home page blocks as they come into view
js/venue-badges.js         Venue list and rules for the coloured badges next to publications
js/publications.js         Publication list of the home page, fetched from HAL (needs js/venue-badges.js)
js/decision-boundary.js    Interactive neural-network demo in the presentation block
js/change-detection.js     Interactive LLM change-detection demo in the July 2026 news item
js/transport-map.js        Interactive private transport-map demo in the September 2026 NeurIPS news item
js/dlm-hellaswag.js        Interactive HellaSwag-scoring demo in the September 2026 BeNTo workshop news item
js/sw-gradients.js         Interactive private sliced-Wasserstein demo in the June 2026 TMLR item of news_archive.html
js/semidual-selection.js   Interactive private transport-potential selection demo in the July 2025 ICML item of news_archive.html
photos/                    Profile picture and event photos used in the news
randomDocuments/           Talk slides (.pdf and .key) and other documents linked from the page
teaching/<year>_<course>/  One folder per course and academic year: index.html + all its materials
blog/<name>/               One folder per published blog post: index.html + its images
drafts/<name>/             Blog drafts, local only: ignored by git (.gitignore), never published
js/post.js                 Loaded by every blog post: LaTeX rendering (MathJax) and the "Draft" label
js/blog.js                 Local preview of the blog drafts on the home page (index.html?drafts)
js/round-table.js          Figures of the post on toasts around a round table
vendor/mathjax/            Copy of MathJax 3.2.2 (tex-svg.js, Apache 2.0), so that no file comes from another site
```

## Home page (`index.html`)

Sections are `<div class="section" id="…">` blocks. The top navigation links to them by id (`#news`, `#publications`, `#teaching`, `#curriculum`).

### Navigation bar

One row, in the spirit of apple.com and tesla.com: Home and the sections, the profiles (Google Scholar, LinkedIn, GitHub) and the theme switch (added by `js/themes.js`) on the right. On screens wider than 768px it stays pinned at the top with a frosted-glass background (`position: sticky` and `backdrop-filter` on `.top-nav`), and the sections stop below it (`scroll-margin-top` on `.section`); on phones it scrolls away and its items wrap. The same `<nav class="top-nav">` block is copied at the top of `index.html`, `news_archive.html`, `teaching_archive.html`, every course page and every blog post (with `../../` paths): change them all together.

### Look

- Font: the system's (San Francisco on Apple devices), `--font` in `css/styles.css`, at 15px for body text (`font-size: 93.75%` on `html`, so that visitors' own text size settings still apply; every `rem` and `em` follows); large headlines with tight letter-spacing and no lines under them; the name on the home page (`<h1 class="name">`) is a hero headline, standing out by its size, weight and the space around it, in the text colour over a short bar in the signature colour (`--data-a`).
- Sections (`.section`, and the `<h2>` of course pages) are separated by a hairline and space, and their headings carry a short bar in the signature colour, a smaller echo of the one under the name.
- The presentation and the demos sit on the page itself, without a panel or border (only the plots inside the demos have frames); announcements keep their box, with 18px rounded corners; buttons are pills (light grey, ink when selected); bullets are soft grey.
- `js/reveal.js` fades up the presentation and the sections of the home page as they come into view (only those below the screen at load, and never for visitors who ask for reduced motion).

### Decision-boundary demo (`js/decision-boundary.js`)

The box to the right of the presentation text (below it on narrow screens) is a small interactive demo. Visitors add points of two classes by clicking (circles and crosses in the light and dark themes; ghosts and pumpkins at Halloween, and so on, see [Themes](#themes-jsthemesjs)), and a 2 → 16 → 16 → 1 tanh network is trained on them by full-batch gradient descent on the logistic loss. The shading shows the predicted probability and the dark curve is the decision boundary. "Reset" restarts from new random weights and keeps the points; "Clear" removes the points.

- Markup: the `<figure class="gd-demo">` in the presentation block. Styles: the `.gd-*` rules in `css/styles.css`.
- Tuning: the constants at the top of the script. `STEP_SIZE` and `STEPS_PER_FRAME` set how fast the boundary forms (about 2 s with the defaults). `ITERATIONS_PER_RUN` is how long training runs before stopping, until a point is added. The starting points come from `twoMoons`.
- Training pauses while the box is off screen. Visitors with "reduce motion" enabled see only the trained result.

### Change-detection demo (`js/change-detection.js`)

The July 2026 news item (ICML) contains a demo of *Token-Efficient Change Detection in LLM APIs*. A toy LLM answers a prompt ("The sky is" in the light and dark themes; each seasonal theme has its own prompt and words) with one of three words. Visitors drag a point in a triangle to set the next-word probabilities at temperature 1 and move a temperature slider. The script samples 20 tokens from the model and from a slightly changed copy (logits shifted by `DELTA`), then runs a two-sample permutation test at level 5%. It shows both histograms, the verdict and the number of detections over 20 tests. The dashed lines in the triangle are the border inputs (tied top words), where the change becomes detectable at low temperature.

- Markup: the `<div class="cd-demo">` at the end of that news item. Styles: the `.cd-*` rules in `css/styles.css`.
- Tuning: the constants at the top of the script (`WORDS`, `DELTA`, `TOKENS`, `TESTS`, animation delays). With the defaults, a tie is detected in about 96% of tests at T = 0.05 and a non-tie almost never.
- When this item moves to `news_archive.html`, move the demo's `<script>` tag along with it: the script does nothing on a page without the demo.

### Transport-map demo (`js/transport-map.js`)

The September 2026 NeurIPS news item contains a demo of *Minimax Private Estimation of Smooth Optimal-Transport Maps* in dimension 1. It plots the true map T = F_Y⁻¹ ∘ F_X between two fixed densities on [0, 1] (shown with their samples) and the paper's private estimator: m − 1 quantiles of each sample are estimated with the recursive ε-DP mechanism of Kaplan, Schnapp and Stemmer, and the estimate is the staircase that maps them onto each other. The animation reveals the recursion level by level (2, 4, 8, … steps), sends a few particles from the source through the estimate into the target, then reruns on fresh samples 6 times, leaving earlier estimates as faint staircases. Sliders set ε, n and the number K of modes of the densities (K bumps on a floor, placed differently in the source and the target, with a fixed max/min ratio); the error is shown next to the non-private estimator's on the same data.

- Markup: the `<div class="ot-demo">` in that news item. Styles: the `.ot-*` rules in `css/styles.css`.
- Tuning: the constants at the top of the script (`FLOOR`, `density`, timings, `RUNS`). The number of steps follows the paper, m ≈ min(√n, nε/10) rounded to a power of 2 (`levelsFor`).
- As for the change-detection demo, move the `<script>` tag along with the item if it goes to `news_archive.html`.

### HellaSwag demo (`js/dlm-hellaswag.js`)

The September 2026 BeNTo workshop news item contains a two-tab demo of *Measuring Progress in Diffusion Language Model Pretraining*.

1. **Scoring one question.** A HellaSwag-style question (invented, not from the dataset) has four endings. In each of K = 4 draws, every word of every ending is masked with probability t (the context stays visible), masked words are coloured by the probability the model gives to the right word, and each ending's score (cross-entropy of its masked words, averaged over the draws, divided by its length when "norm" is ticked) updates. The lowest score is the model's answer. The model is a toy (a mix of a uniform guess over GPT-2's vocabulary and hand-set logits in `ENDINGS`); the D3PM noise-level weight of the loss is left out.
2. **Racing recipes to a target.** Real results of the speedrun: mean HellaSwag accuracy of ten trainings per recipe along training time, for the seven recipes (`RECIPES`, copied from `figures/trajectory-best.csv` of [speedrun-dlm](https://github.com/agonon/speedrun-dlm)). Visitors move the finish line (slider, mouse drag or tap on the chart); a recipe finishes at the first measurement at or above the target that the next measurement confirms, which reproduces the leaderboard at 27.5%. The ranking shows each recipe's time and its change of rank compared with 27.5%, and the stability line counts the comparable pairs that swap order (the paper's first check, with its comparability rule).

- Markup: the `<div class="dlm-demo">` in that news item. Styles: the `.dlm-*` rules in `css/styles.css`.
- Colours of the recipes: the seven first slots of a colour-blind-checked categorical palette (`COLORS`), in record order; the ranking list doubles as the legend.
- To update the race after new runs, regenerate `RECIPES` from the repository's `trajectory-best.csv` (minutes, accuracy in %).
- Move the `<script>` tag along with the item if it goes to `news_archive.html`.

### Sliced Wasserstein demo (`js/sw-gradients.js`, news archive)

The June 2026 TMLR item at the top of `news_archive.html` contains a demo of *Learning with Differentially Private Sliced Wasserstein Gradients*. An encoder g(x) = Ax + b is trained on a private 2D dataset so that the encoded points match a public N(0, I) prior in sliced Wasserstein distance (the encoder of the paper's private SW autoencoders). Each of the 150 steps draws a few random directions, matches the sorted projections with the prior's quantiles, clips data and activations ("inner clipping"), and adds Gaussian noise of scale Δ/μ to the gradient, with Δ = 12·M·L₁/n from Theorem 4.1 and μ from Gaussian-DP composition so that the whole training is (ε, 10⁻⁵)-DP; the optimizer is Adam (as in the paper's experiments) with a linearly decaying learning rate. Sliders set ε and n; a chart compares with the same run without noise.

- Markup: the `<div class="sw-demo">` in that item; the archive loads the script at the end of the page. Styles: the `.sw-*` rules in `css/styles.css`.
- Tuning: the constants at the top of the script (`STEPS`, `LEARNING_RATE`, `BETAS`, clipping radii `M` and `R`, `DELTA_DP`).

### Semi-dual selection demo (`js/semidual-selection.js`, news archive)

The July 2025 ICML item of `news_archive.html` contains a 1D version of the experiment of *On the Private Estimation of Smooth Transport Maps* (Section 6). The true potential and N candidates are random Gaussian attraction/repulsion potentials x²/2 + α e^(−(x−μ₁)²/2σ²) − α e^(−(x−μ₂)²/2σ²) on [−1/2, 1/2] (α = 0.005, σ = 0.1, μ ~ N(0, σ²), as in the paper). From n samples X uniform and Y = T₀(U), each candidate is scored by the clipped grid semi-dual (1/n)Σ clip f(Xᵢ) + (1/n)Σ clip f*(Yᵢ) (C = 0.25, 201-point grid), and the report-noisy-argmin with Laplace noise of scale 4C/(nε) picks one. The candidates are first examined one by one (about 3 s whatever N): each one's map, score and noisy score appear as it is examined, and the smallest score and noisy score so far are followed (in the theme's accent and highlight colours), so the highlighted candidate at the end of the scan is the first private draw. Seven more draws of the noise then run on the same data; the left chart shows the maps' displacements T(x) − x, the right one the sorted scores and their noisy versions. Sliders set ε, n and N.

- Markup: the `<div class="sd-demo">` in that item; the archive loads the script at the end of the page. Styles: the `.sd-*` rules in `css/styles.css`.
- Tuning: the constants at the top of the script (`GRID`, `ALPHA`, `SIGMA`, `C`, `POOL`, `ROUNDS`).

### News

- One `<li>` per item, newest first: `<li><strong>Month YYYY</strong> text…</li>`.
- Photos go in a `<div class="center">` inside the item, as `<img src="photos/…" alt="…" style="height: 100px;">` (see the ICML 2026 item). `js/lightbox.js` makes every such photo open enlarged on click, with ‹ › to go through the photos of the same item; the `alt` text is the caption, so name the event in it (`alt="ICML 2026"`).
- Keep the home page short (about 5–6 items). Move older items to the top of the list in `news_archive.html`, keeping newest-first order. The last `<li>` on the home page links to the archive and stays last.

### Publications

The list is built at page load by `js/publications.js`. There is no publication HTML to edit.

1. **HAL.** Publications are fetched from the HAL API for author id `clement-lalanne` (all document types except `LECTURE`, newest first). To add or fix a paper, fix it on HAL and the site follows. `docTypes` maps HAL document codes (`ART`, `COMM`, `THESE`, …) to the text of the "Type:" line.
2. **Manual entries.** Items missing from HAL are objects at the top of `js/publications.js` (currently `diffusionLmProgress`, `speedrunDlm` and `phdThesis`). To add one:
   ```js
   const myEntry = {
     title: '…',
     authors: 'A, B, Clément Lalanne',
     type: 'Journal Article',                        // free text for the "Type:" line
     date: '2027-03',                                // the first 4 characters give the year group
     venue: '…',                                     // optional "Venue:" line
     link: 'https://…',
     linkText: 'View Publication',
     badge: venueBadge(['<venue title>'], 'ART'),    // HAL document type code, see below
   };
   ```
   Then insert it in `renderPublicationList([diffusionLmProgress, speedrunDlm, ...halPublications, phdThesis])`. Its position in the array sets its position inside its year: before `...halPublications` means the top of its year, after means the bottom. Also add it to the fallback call in the `catch` block so it still shows when HAL is down. If a manual entry later appears on HAL, delete the manual object, otherwise it shows twice.
3. **Fallback.** If HAL cannot be reached, an error message is shown and only the manual entries are listed.

**Gotcha:** HAL returns at most 30 results unless the request sets `rows`. Once there are more than 30 publications on HAL, add `&rows=100` to the API URL in `fetchPublications`.

### Venue badges (`js/venue-badges.js`)

Each publication has a coloured box on its left naming the venue (NeurIPS, ICML, TMLR, Inf. Inference, PhD Thesis, Software, …). Hovering a badge shows the full venue name.

**Label.** `venueBadge(venueNames, docType)` tries, in order:

1. The `VENUES` list: the first `[label, pattern]` whose pattern matches the conference title, then the journal title. Titles are lower-cased before matching.
2. An acronym in HAL's usual formats, `GRETSI 2023 - Colloque …` or `… Conference (FOO 2024)`, if it has at least two capital letters.
3. The venue name itself, if it is 14 characters or fewer (`Bernoulli`).
4. For journals only, the initials of the significant words, 3 to 6 letters (`Journal of Statistical Physics` → `JSP`, `IEEE Transactions on Emerging Topics in Computing` → `IEEE TETC`).
5. The document type, from `DOC_TYPE_BADGES` (`Journal`, `Conference`, `PhD Thesis`, `HDR`, `Preprint`, `Software`, …).

A conference paper whose venue mentions a workshop gets a `Workshop` suffix (`NeurIPS Workshop`).

**Categories.** `VENUES` is split into sections (`workshop`, `conference`, `journal`, `software`, `preprint`), searched in that order. A venue's section is its category. Categories matter in three places only: preprints get a grey badge, the workshop suffix applies to conferences only, and the initials fallback applies to journals only.

**Colour.** `colorVenueBadges` numbers the distinct labels by first appearance, oldest paper first. Label number n gets hue 250° + n × 137.5° (the golden angle), which keeps the venues shown on the page far apart on the colour wheel.
- Adding newer papers never changes existing colours. Adding an *older* paper at a new venue shifts the colours of the venues that first appear after it.
- Colours are `oklch(52% 0.088 <hue>)`. With these values every hue is inside the sRGB gamut and white text has at least 5.2:1 contrast. If you change the lightness or chroma, re-check both.
- Browsers without `oklch()` support fall back to the theme's accent colour, set on `.venue-badge` in `css/styles.css`.

**Adding a venue.** Add one line to the right section:

```js
['COLT', /\bcolt\b|conference on learning theory/],
```

- Write patterns in lower case (the title is lower-cased first).
- Wrap short acronyms in `\b…\b` so they don't match inside other words.
- Put specific patterns before generic ones, because the first match wins (`ICMLA` is above `ICML`, `ACL Findings` above `ACL`, `JMLR MLOSS` above `JMLR`).
- For one-word journal names that also occur inside other titles, match the whole title: `/^machine learning$/`.
- For journals without a well-known acronym, use the ISO 4 abbreviation (`Stat. Sci.`, `Inf. Inference`). Long labels wrap onto two lines in the badge.

To check how a venue title resolves without opening the browser:

```sh
node -e "
const vm = require('vm'), fs = require('fs'), ctx = {};
vm.runInNewContext(fs.readFileSync('js/venue-badges.js', 'utf8'), ctx);
console.log(ctx.venueBadge(['COLT 2025 - 38th Annual Conference on Learning Theory'], 'COMM'));
"
```

### Teaching and curriculum

The Teaching section lists the current academic year's courses and links to `teaching/<folder>/index.html`. Its last item links to `teaching_archive.html`. The Curriculum section is static HTML; details go in a `<ul>` nested inside their parent `<li>`.

`teaching_archive.html` lists every course, current year included, as a `<div class="course">` block: an `<h3>` with the course name, a `course-meta` line (programme, institution, where the materials are), then one `<li>` per academic year, newest first:

```html
<li><span class="year">2026-2027</span> <a href="teaching/…/index.html" target="_blank" rel="noopener noreferrer">Course</a> · <a href="teaching/…_Projects/index.html" target="_blank" rel="noopener noreferrer">Projects</a><span class="current">current</span></li>
```

## Themes (`js/themes.js`)

The site has two themes of its own, Light and Dark, and seasonal themes whose colours and demo symbols change with the time of the year. Everything about them is in `js/themes.js`, which every page loads in its `<head>`, right after the stylesheet.

**Light and Dark.** A monochrome interface (ink on white, or off-white on a warm near-black `#0b0907`) with neutral greys in Light and sand-tinted greys in Dark, and a small set of colours chosen to work together, at moderate chroma (about 0.7 of full saturation in OKLCH, so they read clearly without shouting): a soft violet-indigo as the signature colour (links, first class of the demos, sliders, text selection), and amber as the warm counter-accent (second class of the demos). Indigo and amber are nearly opposite hues, so the two classes of every demo stay apart, also for colour-blind visitors. They set the whole page's colours: background, text, greys, borders, panels. Their colours are defined once, in `css/styles.css`: Light in `:root` (also the look without JavaScript), Dark in `:root[data-theme="dark"]` (`js/themes.js` sets `data-theme` on `<html>`). `js/themes.js` only gives them their demo symbols, and reads the colours in use back from the stylesheet for the scripts that draw (`window.siteTheme.rgb`).

**Font.** The same in every theme: `--font` (the system's: San Francisco on Apple devices) and `--heading-weight` (600), in the first `:root` block of `css/styles.css`. Themes only change colours; to change the font, edit these two lines.

**Seasonal themes.** `THEMES` is a list, and the first entry whose dates contain today (in the visitor's time zone) is the theme of the day. Events come first: April Fools' Day, Pi Day, St Patrick's Day, Fête de la Musique, Bastille Day, Data Privacy Day, Chandeleur, International Women's Day, Earth Day, Labour Day, my birthday (November 27), Back to School (first week of September), Valentine's Day, Easter, Lunar New Year, Carnival, New Year, Halloween, Christmas. The four seasons come last and cover the whole year, so there is always a theme of the day. When two events overlap, the one higher in the list wins: Lunar New Year takes over Carnival in 2026 and 2027. A seasonal theme only sets three colours; the rest of the page is `PAPER` (white, with greys).

**What a theme changes.**
- The colour variables of `css/styles.css` (`--accent`, `--link`, `--highlight`, `--data-a`, `--bg`, `--text`…), set on `<html>` before the page is drawn, and the colour scheme of form controls and scrollbars.
- The browser-tab icon (the theme's emoji; none for Light and Dark).
- The demos, through `window.siteTheme`: the two classes of the decision-boundary demo (symbol, button label, plural), the prompt and the three words of the change-detection demo, and the colours drawn by scripts. Light and Dark use circles and crosses and "The sky is".

**Switch.** `js/themes.js` adds a segmented control at the right end of the navigation bar (below the links on phones): the theme of the day (e.g. "🎃 Halloween"), "Light" and "Dark". A click applies the theme at once, without reloading, with a short fade (the `theme-changing` class on `<html>`; none for visitors who ask for reduced motion). Choosing Light or Dark is remembered in the browser's `localStorage`, on every page and visit, until the theme of the day changes (it is stored as `light@<id>` or `dark@<id>`); then the new theme of the day shows again. An old `classic@<id>` choice counts as Light. Styles: `.theme-switch` in `css/styles.css`.

**Preview.** Add `?theme=<id>` to the URL of any page (`index.html?theme=halloween`, `?theme=dark`), or `?date=YYYY-MM-DD` to see the theme of a given day. `?theme=classic` gives Light.

**Adding or changing a seasonal theme.** Edit or add one entry of `THEMES`; the comment at the top of the file lists the fields. Dates are `['MM-DD', 'MM-DD']` (a range may go over New Year), or `{ easter: [a, b] }` / `{ lunarNewYear: [a, b] }` for days relative to Easter Sunday (computed) or to the Lunar New Year (from the `LUNAR_NEW_YEAR` table, which ends in 2035: extend it before then). Constraints:
- Contrast on the white page: at least 7:1 for `accent` (it colours list text), 4.5:1 for `link`, 3:1 for `highlight`. Give `link` a hue far from `accent`, so that links stand out from the text, and `highlight` too; avoid red and green as the two classes, which colour-blind visitors cannot tell apart.
- Class labels: the two together 14 characters at most (they fit in the demo's buttons).
- Words: the second and third (bottom corners of the triangle) 6 characters at most.

**Rules for the rest of the site.**
- In `css/styles.css`, use the variables, never literal colours: `var(--bg)` (page, and text on accent buttons), `var(--text)`, `var(--text-soft)`, `var(--muted)` (captions), `var(--faint)` (thin lines), `var(--border)`, `var(--surface)` (panels), `var(--accent)`, `var(--accent-soft)` (hovers), `var(--link)`, `var(--data-a)` and `var(--highlight)` (first and second class of the demos: data marks, never the interface), `var(--rule)` (lines under headings), and `color-mix(in srgb, var(--accent) 50%, transparent)` for transparency. A new colour variable goes in both colour blocks of `css/styles.css` (`:root` and `:root[data-theme="dark"]`), in `PAPER` in `js/themes.js` (the value for seasonal themes) and in its `COLOURS` list. Fonts are always `var(--font)`, headings `font-weight: var(--heading-weight)`. Only the announcement box (`.notice`, a light warning box on every theme), the photo viewer and the publication badges keep their own colours.
- Scripts take colours from `window.siteTheme` (`siteTheme.rgb.accent` and `siteTheme.rgb.bg` are `[r, g, b]`, `siteTheme.css('accent')` is `rgb(…)`). The switch replaces `window.siteTheme` and fires a `sitethemechange` event on `window`: a script that draws with the theme's colours or symbols reads `window.siteTheme` again and redraws on that event (see `applyTheme` in `js/decision-boundary.js` and `js/change-detection.js`). Colours set through the CSS variables follow by themselves.
- Captions should not name colours or shades ("the orange staircase", "dark dots"): they change with the theme, and the page can be black.
- A new page needs `<script src="js/themes.js"></script>` (or `../../js/themes.js`) after its stylesheet.

## Blog (`blog/`, `drafts/`)

The blog section of the home page (`#blog`) comes after the publications. Each post is a folder with an `index.html` page, written by hand like the rest of the site, with mathematics in LaTeX.

**Drafts stay private.** The site is a public GitHub repository: anything committed can be read on GitHub, even if no page links to it. Drafts therefore live in `drafts/<name>/`, which `.gitignore` excludes, so git never commits them and they only exist on this computer. A post opened from `drafts/` shows a "Draft, not published" label above its title (added by `js/post.js`, it disappears by itself in `blog/`).

**Preview.** Open the draft itself (`drafts/<name>/index.html`), or `index.html?drafts` to see the home page with its blog section and the drafts listed with a "Draft" label. That list comes from `drafts/drafts.js` (local too):

```js
window.siteDrafts = [
  { title: '…', href: 'drafts/<name>/index.html', date: 'October 2026', dek: 'One or two sentences.' },
];
```


**Writing a post.** Copy an existing post (or draft) and keep its `<head>`: the stylesheet, `js/themes.js` and `js/post.js`, with `../../` paths. The content goes in `<div class="post-body">`, after a `<header class="post-header">` with a `post-kicker` (Blog · date), an `<h1 class="post-title">` and a `post-dek` (subtitle). Then:
- Mathematics: `$…$` or `\(…\)` inline; `$$…$$`, `\[…\]`, or `\begin{equation}\label{eq:name} … \end{equation}` for numbered equations, referenced with `\eqref{eq:name}` (numbers and links are automatic). `\$` writes a dollar sign. Macros shared by all posts (`\Z`, `\N`, `\R`) are in `js/post.js`. In HTML, write `\lt` (or `&lt;`) rather than `<` directly followed by a letter, which the browser would read as a tag.
- Theorems: `<div class="statement"><p><span class="statement-title">Theorem 1</span> (name). …</p></div>`, numbered by hand; `<div class="statement conjecture">` for conjectures and open statements (amber).
- Proofs: `<div class="proof"><p>…</p></div>`, opened by "Proof." and closed by ∎ automatically. Proofs are folded, so that readers open them on demand: `<details class="fold"><summary>Show the proof</summary><div class="proof">…</div></details>`. Long ones go in an appendix at the end of the post.
- Interactive figures: the `.demo` classes of the news demos (see Styling), with a script of the post in `js/` loaded at the end of the page.
- References: `<ol class="post-references">` at the end, each `<li id="ref-…">`, cited as `<a href="#ref-…">[1]</a>`.
- How to cite: a `<div class="codebox">` with a bar (`<span>BibTeX</span>` and a `<button class="demo-button codebox-copy">Copy</button>`, which `js/post.js` makes copy the entry) and the entry in `<pre><code>…</code></pre>`, its lines not indented. The entry gives the URL of the published post (`https://clemlal.github.io/blog/<name>/`) and its month: check both when publishing. The same box presents code, with the file name as its label.

**Publishing a draft.**
1. Move its folder: `mkdir -p blog && mv drafts/<name> blog/` (the `../../` paths stay valid).
2. In `index.html`, add it at the top of the blog list:
   ```html
   <li class="post-item">
     <a class="post-item-title" href="blog/<name>/index.html">Title</a>
     <div class="post-item-meta">October 2026</div>
     <p class="post-item-dek">One or two sentences.</p>
   </li>
   ```
3. Remove it from `drafts/drafts.js`, check it (links, `?theme=dark`), then commit and push.

**Mathematics engine.** `vendor/mathjax/tex-svg.js` is MathJax 3.2.2 (TeX input, SVG output, fonts included, one file of 2 MB loaded only by blog posts). Formulas are drawn in the colour of the text, so they follow the themes. See `vendor/mathjax/README.md` to update it.

## Course pages (`teaching/`)

- Folder name: `<start year>_<end year>_<programme>_<Course_Name>`, e.g. `2026_2027_MAPI3_Machine_Learning`. The folder holds `index.html` and every file the page links to (PDFs, notebooks), linked by bare file name.
- Pages reach shared files with `../../` (`../../css/styles.css`, `../../js/themes.js`, `../../index.html`).
- Content goes in `<main class="main course-page">`. The `.course-page` rules in `css/styles.css` share the home page sections' look (headings, bullets and links in the theme's colours); keep the class when you create a page.
- Usual sections: Overview, Evaluation, Lectures, TDs / TPs, References and External Resources.
- **Announcements** (cancelled class, postponed test): a `<div class="notice">` right after the title block, starting with a `<span class="notice-title">` heading; add `lang="fr"` when it is in French. Delete it once it is outdated.
- **Releasing material during the semester.** Upcoming lectures and TDs are already listed, with their link inside an HTML comment:
  ```html
  <li><strong>Lecture 8</strong> <!-- <a href="….pdf" target="_blank" rel="noopener noreferrer">…</a> --></li>
  ```
  To release one, put the file in the course folder and remove the `<!--` and `-->`.

### New academic year

1. Copy last year's course folder to the new name (e.g. `2026_2027_…` → `2027_2028_…`).
2. In the copy, update `<title>`, `<h1>`, lecturers and evaluation dates. Comment out the links of lectures and TDs not yet given, and replace files that change.
3. In `index.html` (Teaching section), point the links at the new folders.
4. In `teaching_archive.html`, add a line for the new year at the top of the course's list and move the `<span class="current">current</span>` tag onto it.
5. Keep the old folders: students and other sites link to them.

## Styling (`css/styles.css`)

- One stylesheet for the whole site, course pages included, so a change affects every page. The `body` rule (no margin, the theme's background, text colour and font) is in the stylesheet. No page has inline styles or inline scripts: styles are in `css/styles.css`, behaviour in `js/`.
- Palette and font: variables at the top of the stylesheet (font; Light and Dark colours); `js/themes.js` sets those of a seasonal theme over them. The parts shared by the interactive demos (panel, title, caption, pill buttons, sliders, legends, readouts) are the `.demo`, `.demo-title`, `.demo-caption`, `.demo-button`, `.demo-control`, `.demo-legend` and `.demo-readout` classes; each demo's own rules (`.cd-`, `.ot-`, `.dlm-`, `.sw-`, `.sd-`, `.gd-`) only add what differs, and its script finds its elements by these prefixed classes. A new demo starts from the shared classes.
- Responsive rules: below 768px the presentation block stacks vertically (photo, text, demo), the navigation bar is no longer pinned and its items wrap, and a row of news photos scrolls sideways; below 480px the venue badge moves above its publication.
- **Gotcha:** the responsive rules only apply on phones to pages with `<meta name="viewport" content="width=device-width, initial-scale=1">` in their `<head>`. Without it, phones lay the page out 980px wide and zoom out. Every page has it; keep it when you create a page.
- **Gotcha:** a CSS comment ends at the first `*/`, so never write a path like `teaching/*/…` inside one: the rest of the comment becomes invalid CSS and the browser drops the rule after it.
- **Gotcha:** `.section li` and `.section ul` are more specific than single-class rules such as `.publication-item` or `.year-publication-list`, so they win. For example, the publication list's left padding is the 20px from `.section ul`. Use a more specific selector to override them.

## Files and media

- **External links** open in a new tab with `target="_blank" rel="noopener noreferrer"`, everywhere on the site.
- **Photos** are displayed 100–300px high, but some originals are 3600px wide and up to 18 MB, which slows the home page down. Resize before adding them. On macOS:
  ```sh
  sips -Z 1200 -s format jpeg -s formatOptions 80 ~/Desktop/original.png --out photos/ICML2027_1.jpg
  ```
  Naming: `<Event><Year>_<n>`, e.g. `ICML2026_3.png`.
- **Slides** go in `randomDocuments/`, usually as both `.pdf` and `.key`.
- **Size limits.** GitHub rejects files over 100 MB (and warns above 50 MB), and a GitHub Pages site must stay under 1 GB. The site is about 580 MB, mostly `teaching/` (scanned corrections of 30–60 MB, copied again each year) and `photos/`. Compress big scans before committing, or link to the previous year's copy (`../2025_2026_…/file.pdf`) instead of duplicating it.
- Don't rename or move files that are already published: students, slides and other sites link to them.

## Preview and deploy

- **Preview:** from the repository root, run `python3 -m http.server 8000` and open http://localhost:8000. Opening `index.html` directly in a browser also works (HAL allows cross-origin requests).
- **Deploy:** commit and push to `master`. GitHub Pages republishes within a minute or two.
- There is no `.nojekyll` file, so GitHub Pages applies its default Jekyll processing: files and folders whose names start with `_` or `.` are not published.

### Checking local links

Run this from the repository root before pushing. It lists every local `href`/`src` that points to a missing file, on all pages, including links still inside HTML comments:

```sh
python3 - <<'EOF'
import glob, html, os, re, urllib.parse
for page in ['index.html', 'news_archive.html', 'teaching_archive.html', *glob.glob('teaching/*/index.html'), *glob.glob('blog/*/index.html'), *glob.glob('drafts/*/index.html')]:
    for ref in re.findall(r'(?:href|src)="([^"#]+)', open(page, encoding='utf-8').read()):
        path = os.path.join(os.path.dirname(page), urllib.parse.unquote(html.unescape(ref)))
        if not re.match(r'[a-z]+:', ref) and '${' not in ref and not os.path.exists(path):
            print(f'{page}: missing {ref}')
EOF
```

No output means every link resolves.

## Notes for AI assistants

- Keep the stack as it is: hand-written HTML, one CSS file, vanilla JS. Don't add frameworks, build tools, package managers or CDN dependencies.
- Match the existing markup: indentation, `<strong>` dates in lists, `target="_blank" rel="noopener noreferrer"` on external links.
- Publications come from HAL at runtime. Never paste publication HTML into `index.html`; use a manual entry (see above) only for items that are not on HAL.
- New venues go in `js/venue-badges.js`, respecting the first-match-wins order. Check the result with the Node snippet above.
- Releasing a lecture means uncommenting its line, after checking that the file exists in the course folder.
- `css/styles.css` also styles every course page, so check them after changing shared selectors.
- Colours and fonts go through the theme variables (see [Themes](#themes-jsthemesjs)); never hard-code a colour, and check new styles in the dark theme (`?theme=dark`). After editing `js/themes.js`, preview a few themes with `?theme=`.
- Preview locally and run the link check before committing. Commit messages here are short and lower-case (e.g. `added lectures`).
