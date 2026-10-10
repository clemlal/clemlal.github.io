# clemlal.github.io

Personal academic website of Clément Lalanne, published at **https://clemlal.github.io** by GitHub Pages.

The site is plain static HTML, CSS and vanilla JavaScript: no framework, no build step, no dependencies. What is pushed to `master` is what gets served.

## Repository layout

```
index.html                 Home page: presentation, news, publications, teaching, curriculum
news_archive.html          Older news items, moved out of index.html
teaching_archive.html      Past courses, moved out of index.html
css/styles.css             The only stylesheet, shared by every page (course pages included)
js/venue-badges.js         Venue list and rules for the coloured badges next to publications
js/decision-boundary.js    Interactive neural-network demo in the presentation block
js/change-detection.js     Interactive LLM change-detection demo in the July 2026 news item
photos/                    Profile picture and event photos used in the news
randomDocuments/           Talk slides (.pdf and .key) and other documents linked from the page
teaching/<year>_<course>/  One folder per course and academic year: index.html + all its materials
```

## Home page (`index.html`)

Sections are `<div class="section" id="…">` blocks. The top navigation links to them by id (`#news`, `#publications`, `#teaching`, `#curriculum`).

### Decision-boundary demo (`js/decision-boundary.js`)

The box to the right of the presentation text (below it on narrow screens) is a small interactive demo. Visitors add circles and crosses by clicking, and a 2 → 16 → 16 → 1 tanh network is trained on them by full-batch gradient descent on the logistic loss. The shading shows the predicted probability and the dark curve is the decision boundary. "Reset" restarts from new random weights and keeps the points; "Clear" removes the points.

- Markup: the `<figure class="gd-demo">` in the presentation block. Styles: the `.gd-*` rules in `css/styles.css`.
- Tuning: the constants at the top of the script. `STEP_SIZE` and `STEPS_PER_FRAME` set how fast the boundary forms (about 2 s with the defaults). `ITERATIONS_PER_RUN` is how long training runs before stopping, until a point is added. The starting points come from `twoMoons`.
- Training pauses while the box is off screen. Visitors with "reduce motion" enabled see only the trained result.

### Change-detection demo (`js/change-detection.js`)

The July 2026 news item (ICML) contains a demo of *Token-Efficient Change Detection in LLM APIs*. A toy LLM answers "The sky is" with one of three words. Visitors drag a point in a triangle to set the next-word probabilities at temperature 1 and move a temperature slider. The script samples 20 tokens from the model and from a slightly changed copy (logits shifted by `DELTA`), then runs a two-sample permutation test at level 5%. It shows both histograms, the verdict and the number of detections over 20 tests. The dashed lines in the triangle are the border inputs (tied top words), where the change becomes detectable at low temperature.

- Markup: the `<div class="cd-demo">` at the end of that news item. Styles: the `.cd-*` rules in `css/styles.css`.
- Tuning: the constants at the top of the script (`WORDS`, `DELTA`, `TOKENS`, `TESTS`, animation delays). With the defaults, a tie is detected in about 96% of tests at T = 0.05 and a non-tie almost never.
- When this item moves to `news_archive.html`, move the demo's `<script>` tag along with it: the script does nothing on a page without the demo.

### News

- One `<li>` per item, newest first: `<li><strong>Month YYYY</strong> text…</li>`.
- Photos go in a `<div class="center">` inside the item, as `<img src="photos/…" alt="…" style="height: 100px;">` (see the ICML 2026 item).
- Keep the home page short (about 5–6 items). Move older items to the top of the list in `news_archive.html`, keeping newest-first order. The last `<li>` on the home page links to the archive and stays last.

### Publications

The list is built at page load by the script at the bottom of `index.html`. There is no publication HTML to edit.

1. **HAL.** Publications are fetched from the HAL API for author id `clement-lalanne` (all document types except `LECTURE`, newest first). To add or fix a paper, fix it on HAL and the site follows. `docTypes` maps HAL document codes (`ART`, `COMM`, `THESE`, …) to the text of the "Type:" line.
2. **Manual entries.** Items missing from HAL are objects at the top of the script (currently `diffusionLmProgress`, `speedrunDlm` and `phdThesis`). To add one:
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
- Browsers without `oklch()` support fall back to the navy set on `.venue-badge` in `css/styles.css`.

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

The Teaching section lists the current academic year's courses and links to `teaching/<folder>/index.html`. Its last item links to `teaching_archive.html`. The Curriculum section is static HTML, with nested `<ul>` lists for details.

## Course pages (`teaching/`)

- Folder name: `<start year>_<end year>_<programme>_<Course_Name>`, e.g. `2026_2027_MAPI3_Machine_Learning`. The folder holds `index.html` and every file the page links to (PDFs, notebooks), linked by bare file name.
- Pages reach shared files with `../../` (`../../css/styles.css`, `../../index.html`).
- Usual sections: Overview, Evaluation, Lectures, TDs / TPs, References and External Resources.
- **Releasing material during the semester.** Upcoming lectures and TDs are already listed, with their link inside an HTML comment:
  ```html
  <li><strong>Lecture 8</strong> <!-- <a href="….pdf" target="_blank" rel="noopener noreferrer">…</a> --></li>
  ```
  To release one, put the file in the course folder and remove the `<!--` and `-->`.

### New academic year

1. Copy last year's course folder to the new name (e.g. `2026_2027_…` → `2027_2028_…`).
2. In the copy, update `<title>`, `<h1>`, lecturers and evaluation dates. Comment out the links of lectures and TDs not yet given, and replace files that change.
3. In `index.html` (Teaching section), point the links at the new folders.
4. Move last year's `<li>` lines to the top of `teaching_archive.html`.
5. Keep the old folders: students and other sites link to them.

## Styling (`css/styles.css`)

- One stylesheet for the whole site, course pages included, so a change affects every page. `index.html` and the archive pages also have a small inline `<style>` for `body`.
- Palette: navy `rgb(27, 46, 129)` for headings, rules and bullets, and purple `rgb(83, 69, 218)` for links. Georgia serif throughout; the venue badges use a system sans-serif.
- Responsive rules: below 768px the presentation block stacks vertically (photo, text, demo), the navigation links wrap after their section title, and a row of news photos scrolls sideways; below 480px the venue badge moves above its publication.
- **Gotcha:** the responsive rules only apply on phones to pages with `<meta name="viewport" content="width=device-width, initial-scale=1">` in their `<head>`. Without it, phones lay the page out 980px wide and zoom out. `index.html` has it; the archive and course pages don't yet.
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
for page in ['index.html', 'news_archive.html', 'teaching_archive.html', *glob.glob('teaching/*/index.html')]:
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
- Preview locally and run the link check before committing. Commit messages here are short and lower-case (e.g. `added lectures`).
