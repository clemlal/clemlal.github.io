// Venue badges shown to the left of each publication.
//
// Label: the first entry of VENUES whose pattern matches the conference title,
// then the journal title (patterns are tested against the lower-cased title).
// Unknown venues fall back to the acronym in HAL's "ACRONYM 2024 - Full name"
// or "Full name (ACRONYM 2024)" formats, then to a journal's initials, then to
// the document type. Conference papers whose venue mentions a workshop get a
// "Workshop" suffix.
//
// Colour: the n-th distinct label, in order of first appearance (oldest paper
// first), gets hue 250° + n × 137.5° (golden angle). Venues shown on the page
// thus stay far apart on the colour wheel, and adding newer papers never
// changes existing colours. Preprints are grey.
//
// To add a venue, add a [label, pattern] line to the right section. Order
// matters: more specific patterns must come before more generic ones.

const VENUES = {
  workshop: [
    ['TPDP', /\btpdp\b|theory and practice of differential privacy/],
    ['PPAI', /\bppai\b|privacy-preserving artificial intelligence/],
    ['ITW', /\bitw\b|information theory workshop/],
    ['SSP', /statistical signal processing workshop/],
    ['MLSP', /\bmlsp\b|machine learning for signal processing/],
    ['SPARS', /\bspars\b|adaptive sparse structured representations/],
    ['iTWIST', /itwist/],
  ],

  conference: [
    // Machine learning & AI
    ['NeurIPS', /neurips|\bnips\b|neural information processing systems/],
    ['ICMLA', /\bicmla\b|machine learning and applications/],
    ['ACML', /\bacml\b|asian conference on machine learning/],
    ['ICML', /\bicml\b|international conference on machine learning/],
    ['ICLR', /\biclr\b|learning representations/],
    ['COLT', /\bcolt\b|conference on learning theory/],
    ['ALT', /\balt\b|algorithmic learning theory/],
    ['AISTATS', /aistats|artificial intelligence and statistics/],
    ['UAI', /\buai\b|uncertainty in artificial intelligence/],
    ['AAAI', /\baaai\b/],
    ['IJCAI', /ijcai|international joint conference on artificial intelligence/],
    ['ECAI', /\becai\b|european conference on artificial intelligence/],
    ['ECML PKDD', /ecml|pkdd/],
    ['KDD', /\bkdd\b|knowledge discovery (and|&) data mining/],
    ['SDM', /\bsdm\b|siam international conference on data mining/],
    ['ICDM', /\bicdm\b|international conference on data mining/],
    ['WSDM', /\bwsdm\b|web search and data mining/],
    ['WWW', /the web conference|world wide web conference/],
    ['CPAL', /\bcpal\b|parsimony and learning/],
    ['L4DC', /l4dc|learning for dynamics (and|&) control/],
    ['MSML', /\bmsml\b|mathematical and scientific machine learning/],
    ['ESANN', /esann|european symposium on artificial neural networks/],
    ['IJCNN', /ijcnn|international joint conference on neural networks/],
    ['ICANN', /\bicann\b|international conference on artificial neural networks/],
    ['CoLLAs', /collas|lifelong learning agents/],
    ['LoG', /learning on graphs/],
    ['AutoML', /automl/],
    ['CAp', /apprentissage automatique/],
    ['JdS', /journées de statistique/],
    ['PFIA', /\bpfia\b|plate-forme (d.)?intelligence artificielle/],

    // Vision, speech & language
    ['CVPR', /\bcvpr\b|computer vision and pattern recognition/],
    ['ICCV', /\biccv\b|international conference on computer vision/],
    ['ECCV', /\beccv\b|european conference on computer vision/],
    ['WACV', /\bwacv\b|applications of computer vision/],
    ['BMVC', /\bbmvc\b|british machine vision/],
    ['MICCAI', /miccai|medical image computing/],
    ['EMNLP Findings', /findings of (the )?(emnlp|empirical methods)/],
    ['ACL Findings', /findings of (the )?(acl|association for computational linguistics)/],
    ['EMNLP', /emnlp|empirical methods in natural language processing/],
    ['NAACL', /naacl|north american chapter of the association for computational linguistics/],
    ['EACL', /\beacl\b|european chapter of the association for computational linguistics/],
    ['ACL', /\bacl\b|association for computational linguistics/],
    ['COLING', /coling|international conference on computational linguistics/],
    ['Interspeech', /interspeech/],

    // Signal processing, information theory & control
    ['ICASSP', /icassp|acoustics,? speech,? and signal processing/],
    ['EUSIPCO', /eusipco|european signal processing conference/],
    ['GRETSI', /gretsi|traitement du signal et des images/],
    ['ICIP', /\bicip\b|international conference on image processing/],
    ['ISBI', /\bisbi\b|international symposium on biomedical imaging/],
    ['EMBC', /\bembc\b|engineering in medicine (and|&) biology/],
    ['SampTA', /sampta|sampling theory and applications/],
    ['ISIT', /\bisit\b|international symposium on information theory/],
    ['Allerton', /allerton/],
    ['CDC', /\bcdc\b|conference on decision and control/],
    ['ACC', /american control conference/],
    ['ECC', /european control conference/],
    ['IFAC', /\bifac\b/],
    ['ISMP', /\bismp\b|international symposium on mathematical programming/],

    // Privacy, security & fairness
    ['IEEE S&P', /symposium on security and privacy/],
    ['CCS', /\bccs\b|computer and communications security/],
    ['USENIX Sec.', /usenix security/],
    ['PoPETs', /popets|\bpets\b|privacy enhancing technologies/],
    ['CSF', /\bcsf\b|computer security foundations/],
    ['SaTML', /satml|secure and trustworthy machine learning/],
    ['FAccT', /facct|fairness,? accountability,? and transparency/],
    ['AIES', /\baies\b|ai, ethics,? and society/],
    ['FORC', /\bforc\b|foundations of responsible computing/],

    // Theoretical computer science & cryptography
    ['STOC', /\bstoc\b|symposium on theory of computing/],
    ['FOCS', /\bfocs\b|foundations of computer science/],
    ['SODA', /\bsoda\b|symposium on discrete algorithms/],
    ['ICALP', /icalp|automata,? languages,? and programming/],
    ['ITCS', /\bitcs\b|innovations in theoretical computer science/],
    ['STACS', /\bstacs\b|theoretical aspects of computer science/],
    ['ESA', /european symposium on algorithms/],
    ['PODS', /\bpods\b|principles of database systems/],
    ['EUROCRYPT', /eurocrypt/],
    ['CRYPTO', /\bcrypto\b/],
    ['TCC', /\btcc\b|theory of cryptography/],

    // Robotics
    ['ICRA', /\bicra\b|international conference on robotics and automation/],
    ['IROS', /\biros\b|intelligent robots and systems/],
    ['CoRL', /\bcorl\b|conference on robot learning/],
    ['RSS', /robotics: science and systems/],

    // Proceedings series (only reached when the conference itself is unknown)
    ['PMLR', /pmlr|proceedings of machine learning research/],
    ['LNCS', /lecture notes in computer science/],
  ],

  journal: [
    // Machine learning & AI
    ['JMLR MLOSS', /\bmloss\b|machine learning open source software/],
    ['JMLR', /jmlr|journal of machine learning research/],
    ['TMLR', /tmlr|transactions on machine learning research/],
    ['DMLR', /dmlr|data-centric machine learning research/],
    ['JAIR', /\bjair\b|journal of artificial intelligence research/],
    ['AIJ', /^artificial intelligence$/],
    ['Mach. Learn.', /^machine learning$/],
    ['Neural Comput.', /^neural computation$/],
    ['Neural Netw.', /^neural networks$/],
    ['Neurocomputing', /^neurocomputing$/],
    ['Pattern Recogn.', /^pattern recognition$/],
    ['DMKD', /data mining and knowledge discovery/],
    ['FnT ML', /foundations and trends.*machine learning/],
    ['IEEE TPAMI', /pattern analysis and machine intelligence/],
    ['IEEE TNNLS', /neural networks and learning systems/],
    ['IJCV', /international journal of computer vision/],
    ['MedIA', /^medical image analysis$/],

    // Statistics & probability
    ['AoS', /annals of statistics/],
    ['AoAS', /annals of applied statistics/],
    ['AoP', /annals of probability/],
    ['AAP', /annals of applied probability/],
    ['AIHP', /annales de l.institut henri poincar|annales de l.i\.?h\.?p/],
    ['AISM', /annals of the institute of statistical mathematics/],
    ['JRSS-B', /royal statistical society.*series b/],
    ['JRSS-A', /royal statistical society.*series a/],
    ['JRSS-C', /royal statistical society.*series c/],
    ['JRSS', /royal statistical society/],
    ['JASA', /\bjasa\b|journal of the american statistical association/],
    ['Biometrika', /biometrika/],
    ['Biometrics', /^biometrics$/],
    ['Bernoulli', /bernoulli/],
    ['EJS', /electronic journal of statistics/],
    ['Stat. Sci.', /^statistical science$/],
    ['Stat. Comput.', /statistics and computing/],
    ['JCGS', /journal of computational and graphical statistics/],
    ['Scand. J. Stat.', /scandinavian journal of statistics/],
    ['Stat. Sin.', /statistica sinica/],
    ['JMVA', /journal of multivariate analysis/],
    ['JSPI', /journal of statistical planning and inference/],
    ['J. Nonparametr. Stat.', /journal of nonparametric statistics/],
    ['Stat. Probab. Lett.', /statistics (&|and) probability letters/],
    ['TEST', /^test$/],
    ['JSFdS', /société française de statistique/],
    ['MSL', /mathematical statistics and learning/],
    ['PTRF', /probability theory and related fields/],
    ['EJP', /electronic journal of probability/],
    ['ECP', /electronic communications in probability/],
    ['SPA', /stochastic processes and their applications/],
    ['ESAIM P&S', /esaim.*probability and statistics/],
    ['J. Appl. Probab.', /journal of applied probability/],
    ['Adv. Appl. Probab.', /advances in applied probability/],
    ['RSA', /random structures (&|and) algorithms/],
    ['J. Econom.', /journal of econometrics/],
    ['Econometrica', /econometrica/],

    // Mathematics of data, optimisation & numerical analysis
    ['Inf. Inference', /information and inference/],
    ['SIMODS', /simods|siam journal on mathematics of data science/],
    ['SIOPT', /siam journal on optimization/],
    ['SICON', /siam journal on control and optimization/],
    ['SIIMS', /siam journal on imaging sciences/],
    ['SINUM', /siam journal on numerical analysis/],
    ['SISC', /siam journal on scientific computing/],
    ['SIMAX', /siam journal on matrix analysis/],
    ['SIAP', /siam journal on applied mathematics/],
    ['SICOMP', /siam journal on computing/],
    ['SIREV', /^siam review$/],
    ['JUQ', /journal on uncertainty quantification/],
    ['Math. Program. Comput.', /mathematical programming computation/],
    ['Math. Program.', /mathematical programming/],
    ['MOR', /mathematics of operations research/],
    ['Oper. Res.', /^operations research$/],
    ['EJOR', /european journal of operational research/],
    ['JOTA', /journal of optimization theory and applications/],
    ['COAP', /computational optimization and applications/],
    ['OMS', /optimization methods (and|&) software/],
    ['OJMO', /open journal of mathematical optimization/],
    ['SVVA', /set-valued and variational analysis/],
    ['J. Convex Anal.', /journal of convex analysis/],
    ['ESAIM COCV', /esaim.*control,? optimi[sz]ation and calculus of variations/],
    ['ESAIM M2AN', /esaim.*mathematical modelling and numerical analysis/],
    ['FoCM', /foundations of computational mathematics/],
    ['ACHA', /applied and computational harmonic analysis/],
    ['Constr. Approx.', /constructive approximation/],
    ['JAT', /journal of approximation theory/],
    ['Numer. Math.', /numerische mathematik/],
    ['Math. Comp.', /mathematics of computation/],
    ['JCP', /journal of computational physics/],
    ['Inverse Probl.', /^inverse problems$/],
    ['JMIV', /journal of mathematical imaging and vision/],
    ['CRAS', /comptes rendus/],

    // Information theory, signal processing & control
    ['IEEE T-IT', /transactions on information theory/],
    ['IEEE JSAIT', /selected areas in information theory/],
    ['IEEE TSP', /transactions on signal processing/],
    ['IEEE SPL', /signal processing letters/],
    ['IEEE JSTSP', /selected topics in signal processing/],
    ['IEEE SPM', /signal processing magazine/],
    ['IEEE TIP', /transactions on image processing/],
    ['IEEE TAC', /transactions on automatic control/],
    ['IEEE TBME', /transactions on biomedical engineering/],
    ['IEEE JBHI', /biomedical and health informatics/],
    ['Signal Process.', /^signal processing$/],
    ['Automatica', /automatica/],

    // Privacy, security & computer science
    ['JPC', /journal of privacy and confidentiality/],
    ['IEEE TIFS', /information forensics and security/],
    ['IEEE TDSC', /dependable and secure computing/],
    ['ACM TOPS', /transactions on privacy and security/],
    ['JACM', /journal of the acm/],
    ['CACM', /communications of the acm/],
    ['ToC', /^theory of computing$/],
    ['TheoretiCS', /theoretics/],

    // General science
    ['Nat. Mach. Intell.', /nature machine intelligence/],
    ['Nat. Commun.', /nature communications/],
    ['Nature', /^nature$/],
    ['Sci. Adv.', /science advances/],
    ['Science', /^science$/],
    ['PNAS', /\bpnas\b|proceedings of the national academy of sciences/],
    ['Sci. Rep.', /scientific reports/],
    ['PLOS ONE', /plos one/],
    ['PRL', /physical review letters/],
    ['Phys. Rev. E', /physical review e\b/],
    ['Entropy', /^entropy$/],
    ['IEEE Access', /ieee access/],
  ],

  software: [
    ['JOSS', /\bjoss\b|journal of open source software/],
    ['Software', /\bpypi\b|\bcran\b|software heritage/],
  ],

  preprint: [
    ['arXiv', /arxiv/],
    ['bioRxiv', /biorxiv/],
    ['medRxiv', /medrxiv/],
    ['SSRN', /\bssrn\b/],
  ],
};

// Fallback [label, category] for each HAL document type.
const DOC_TYPE_BADGES = {
  ART: ['Journal', 'journal'],
  COMM: ['Conference', 'conference'],
  POSTER: ['Poster'],
  PROCEEDINGS: ['Proceedings'],
  THESE: ['PhD Thesis'],
  HDR: ['HDR'],
  MEM: ['Master Thesis'],
  OUV: ['Book'],
  DOUV: ['Edited Book'],
  COUV: ['Book Chapter'],
  REPORT: ['Report'],
  UNDEFINED: ['Preprint', 'preprint'],
  PREPRINT: ['Preprint', 'preprint'],
  SOFTWARE: ['Software'],
  PATENT: ['Patent'],
  PRESCONF: ['Talk'],
  LECTURE: ['Lecture'],
  VIDEO: ['Video'],
  BLOG: ['Blog'],
  OTHER: ['Other'],
};

const INITIALISM_STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'on', 'in', 'for', 'to',
  'de', 'des', 'du', 'la', 'le', 'les', 'et', 'en', 'd', 'l',
]);

function matchVenue(name) {
  const text = name.toLowerCase();
  for (const [category, entries] of Object.entries(VENUES)) {
    const entry = entries.find(([, pattern]) => pattern.test(text));
    if (entry) return [entry[0], category];
  }
}

function guessVenueLabel(name, category) {
  if (!name) return null;

  // "GRETSI 2023 - Colloque ..." or "... Conference (FOO 2024)"
  const acronym = name.match(/^([A-Za-z][\w&+'-]{1,13}?)[\s']*\d{0,4}\s+[-–—:]\s/)
    || name.match(/\(([A-Za-z][\w&+'-]{1,13}?)[\s']*\d{0,4}\)/);
  if (acronym && /[A-Z].*[A-Z]/.test(acronym[1])) return acronym[1];

  if (name.length <= 14) return name;
  if (category !== 'journal') return null;

  // "Journal of Foo Bar" -> "JFB", "IEEE Transactions on Foo Bar" -> "IEEE TFB"
  const words = name.split(/[^\p{L}\p{N}]+/u)
    .filter(word => word && !INITIALISM_STOPWORDS.has(word.toLowerCase()));
  const prefix = /^[A-Z]{2,}$/.test(words[0]) ? `${words.shift()} ` : '';
  const initials = words.map(word => word[0].toUpperCase()).join('');
  return initials.length >= (prefix ? 2 : 3) && initials.length <= 6 ? prefix + initials : null;
}

// venueNames: candidate venue titles, most relevant first (missing ones are ignored).
function venueBadge(venueNames, docType) {
  const names = venueNames.filter(Boolean);
  const [defaultLabel, defaultCategory] = DOC_TYPE_BADGES[docType] || DOC_TYPE_BADGES.OTHER;

  let [label, category] = names.map(matchVenue).find(Boolean) || [];
  if (!label) {
    category = defaultCategory;
    label = guessVenueLabel(names[0], category) || defaultLabel;
  }

  if (category === 'conference' && names.some(name => /\bworkshop/i.test(name))) {
    category = 'workshop';
    label = label === defaultLabel ? 'Workshop' : `${label} Workshop`;
  }

  return { label, category, title: names[0] || label };
}

// Sets badge.color on each publication ({ date, badge }), see the colour rule above.
function colorVenueBadges(publications) {
  const hues = new Map();
  [...publications]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(({ badge }) => {
      if (badge.category !== 'preprint' && !hues.has(badge.label)) {
        hues.set(badge.label, (250 + hues.size * 137.508) % 360);
      }
    });

  publications.forEach(({ badge }) => {
    const hue = hues.get(badge.label);
    badge.color = hue === undefined ? 'oklch(52% 0 0)' : `oklch(52% 0.088 ${hue.toFixed(1)})`;
  });
}

function escapeHTML(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function venueBadgeHTML({ label, title, color }) {
  return `<span class="venue-badge" style="background-color: ${color}" title="${escapeHTML(title)}">${escapeHTML(label)}</span>`;
}
