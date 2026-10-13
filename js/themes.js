// Seasonal themes of the whole site. Everything that changes with the time of
// the year is in this file.
//
// Every page loads this script in its <head>. It picks the theme of the day:
// the first entry of THEMES whose dates contain today (in the visitor's time
// zone), so short events come first and the four seasons, which cover the
// whole year, come last. Then it
//   - sets the colour variables of css/styles.css (--accent, --link, ...) on <html>,
//   - sets the browser-tab icon to the theme's emoji,
//   - exposes the theme as window.siteTheme, from which the demos take their
//     colours and symbols: the two classes of js/decision-boundary.js, the
//     prompt and the three words of js/change-detection.js,
//   - adds a switch to the navigation bar, between the theme of the day and the
//     classic theme (the site's original colours). The visitor's choice is kept
//     until the theme of the day changes; the demos redraw on the "sitethemechange"
//     event that a switch fires.
//
// Preview a theme by adding ?theme=<id> (e.g. ?theme=halloween) to the URL of
// any page, or a day with ?date=YYYY-MM-DD (e.g. ?date=2026-12-24).
//
// A theme has:
//   id, name, icon   id for ?theme=, readable name, emoji of the browser tab
//   dates            ['MM-DD', 'MM-DD'], first and last day (the range may go
//                    over New Year), or { easter: [a, b] } / { lunarNewYear: [a, b] }
//                    for the days from a to b days after Easter Sunday / the
//                    Lunar New Year (a and b may be negative)
//   colors           accent: headings, rules, bullets, buttons, first class of the demos
//                    link: links
//                    highlight: second class of the demos (the orange of the classic theme)
//                    The light tints (backgrounds, hovers) are computed from them.
//                    accent and link are text colours on white: keep a contrast of
//                    at least 7:1 and 4.5:1. highlight needs at least 3:1.
//   classes          [symbol, label, plural] of the two classes of the decision-boundary
//                    demo, drawn in accent and highlight. The label is the button's text
//                    (the two labels together 14 characters at most); the plural, used
//                    in sentences, defaults to the label in lower case + 's'.
//   prompt, words    the toy LLM of the change-detection demo completes the prompt
//                    with one of the three words. The first word is written above the
//                    triangle; the other two, at its bottom corners, must stay short
//                    (6 characters at most).
// A theme can leave out any field but id and dates: it then keeps the classic one.

(function () {
  const CLASSIC = {
    id: 'classic',
    name: 'Classic',
    icon: '',
    colors: {
      accent: '#1b2e81',
      link: '#5345da',
      highlight: '#d66034',
      // Set here to keep the original look exactly; computed for the other themes.
      linkStrong: '#3c30a5',
      accentSoft: '#ebeef8',
      surface: '#f8f9fa',
    },
    classes: [['●', 'Circle'], ['✕', 'Cross', 'crosses']],
    prompt: 'The sky is',
    words: ['blue', 'clear', 'grey'],
  };

  const THEMES = [
    // ---- Events, from the shortest to the longest ----
    {
      id: 'april-fools', name: "April Fools' Day", icon: '🐟',
      dates: ['04-01', '04-01'],
      colors: { accent: '#0c3f5e', link: '#0369a1', highlight: '#ea580c' },
      classes: [['🐟', 'Fish', 'fish'], ['🦈', 'Shark']],
      prompt: 'This news is', words: ['fishy', 'true', 'false'],
    },
    {
      id: 'pi-day', name: 'Pi Day', icon: 'π',
      dates: ['03-14', '03-14'],
      colors: { accent: '#1f3b4d', link: '#0f766e', highlight: '#c2410c' },
      classes: [['π', 'Pi', 'π symbols'], ['e', 'Euler', 'e symbols']],
      prompt: 'π is', words: ['irrational', 'tasty', '3.14'],
    },
    {
      id: 'st-patrick', name: "St Patrick's Day", icon: '☘️',
      dates: ['03-17', '03-17'],
      colors: { accent: '#0b4d31', link: '#15803d', highlight: '#c26a05' },
      classes: [['☘️', 'Three', 'shamrocks'], ['🍀', 'Four', 'four-leaf clovers']],
      prompt: 'The clover is', words: ['lucky', 'green', 'rare'],
    },
    {
      id: 'fete-musique', name: 'Fête de la Musique', icon: '🎸',
      dates: ['06-21', '06-21'],
      colors: { accent: '#1e1b4b', link: '#6d28d9', highlight: '#db2777' },
      classes: [['🎸', 'Guitar'], ['🎺', 'Trumpet']],
      prompt: 'The music is', words: ['jazzy', 'loud', 'live'],
    },
    {
      id: 'bastille-day', name: 'Bastille Day', icon: '🇫🇷',
      dates: ['07-13', '07-14'],
      colors: { accent: '#002395', link: '#1d4ed8', highlight: '#ce1126' },
      classes: [['🥖', 'Bread', 'baguettes'], ['🧀', 'Cheese']],
      prompt: 'The fireworks are', words: ['blue', 'white', 'red'],
    },
    {
      id: 'valentine', name: "Valentine's Day", icon: '❤️',
      dates: ['02-07', '02-14'],
      colors: { accent: '#6b1030', link: '#be185d', highlight: '#e0457b' },
      classes: [['❤️', 'Heart'], ['💌', 'Letter', 'love letters']],
      prompt: 'Love is', words: ['patient', 'kind', 'blind'],
    },
    {
      id: 'easter', name: 'Easter', icon: '🐣',
      dates: { easter: [-7, 1] },  // Palm Sunday to Easter Monday
      colors: { accent: '#4c2a85', link: '#7c3aed', highlight: '#d97706' },
      classes: [['🥚', 'Egg'], ['🐣', 'Chick']],
      prompt: 'The egg is', words: ['chocolate', 'hidden', 'golden'],
    },
    {
      id: 'lunar-new-year', name: 'Lunar New Year', icon: '🧧',
      dates: { lunarNewYear: [-1, 6] },
      colors: { accent: '#7f1d1d', link: '#b91c1c', highlight: '#b07d00' },
      classes: [['🐉', 'Dragon'], ['🏮', 'Lantern']],
      prompt: 'The lantern is', words: ['glowing', 'red', 'golden'],
    },
    {
      id: 'carnival', name: 'Carnival', icon: '🎭',
      dates: { easter: [-52, -47] },  // the last days before Mardi Gras, included
      colors: { accent: '#4b1d6b', link: '#2e7d32', highlight: '#b8860b' },
      classes: [['🎭', 'Mask'], ['🎉', 'Party', 'party poppers']],
      prompt: 'The mask is', words: ['golden', 'shiny', 'scary'],
    },
    {
      id: 'new-year', name: 'New Year', icon: '🎆',
      dates: ['12-31', '01-06'],
      colors: { accent: '#1a1f4d', link: '#4f46e5', highlight: '#b8860b' },
      classes: [['🍾', 'Bottle'], ['🥂', 'Glass', 'glasses']],
      prompt: 'The new year will be', words: ['great', 'busy', 'calm'],
    },
    {
      id: 'halloween', name: 'Halloween', icon: '🎃',
      dates: ['10-01', '11-01'],
      colors: { accent: '#3f1d5c', link: '#7e3fb8', highlight: '#e2620b' },
      classes: [['👻', 'Ghost'], ['🎃', 'Pumpkin']],
      prompt: 'The pumpkin is', words: ['spooky', 'orange', 'carved'],
    },
    {
      id: 'christmas', name: 'Christmas', icon: '🎄',
      dates: ['12-01', '12-30'],
      colors: { accent: '#14532d', link: '#b91c1c', highlight: '#b8860b' },
      classes: [['🎄', 'Tree'], ['🎁', 'Present']],
      prompt: 'Santa is', words: ['coming', 'jolly', 'late'],
    },

    // ---- Seasons, covering the whole year ----
    {
      id: 'winter', name: 'Winter', icon: '❄️',
      dates: ['12-21', '03-19'],
      colors: { accent: '#16406b', link: '#2563a8', highlight: '#b8326a' },
      classes: [['❄️', 'Snow', 'snowflakes'], ['⛄', 'Snowman', 'snowmen']],
      prompt: 'The snow is', words: ['melting', 'white', 'fresh'],
    },
    {
      id: 'spring', name: 'Spring', icon: '🌸',
      dates: ['03-20', '06-20'],
      colors: { accent: '#2f5223', link: '#b0306a', highlight: '#d6577f' },
      classes: [['🌱', 'Sprout'], ['🌸', 'Blossom']],
      prompt: 'The garden is', words: ['blooming', 'green', 'sunny'],
    },
    {
      id: 'summer', name: 'Summer', icon: '☀️',
      dates: ['06-21', '09-22'],
      colors: { accent: '#0b4f5c', link: '#0e7490', highlight: '#e3600f' },
      classes: [['🍉', 'Melon', 'watermelons'], ['🍦', 'Gelato', 'ice creams']],
      prompt: 'The sea is', words: ['blue', 'warm', 'calm'],
    },
    {
      id: 'autumn', name: 'Autumn', icon: '🍂',
      dates: ['09-23', '12-20'],
      colors: { accent: '#5b1a2e', link: '#b4460f', highlight: '#b7791f' },
      classes: [['🍄', 'Mushroom'], ['🍂', 'Leaf', 'leaves']],
      prompt: 'The leaves are', words: ['falling', 'red', 'golden'],
    },
  ];

  // Lunar New Year's day (no simple formula). Extend the table when it runs out:
  // the theme is skipped in years that are not listed.
  const LUNAR_NEW_YEAR = {
    2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03',
    2031: '01-23', 2032: '02-11', 2033: '01-31', 2034: '02-19', 2035: '02-08',
  };

  // ---- Dates ----

  const atDay = (year, monthDay) => {
    const [month, day] = monthDay.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const shift = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

  // Easter Sunday of the Gregorian calendar (anonymous algorithm, Meeus).
  function easterSunday(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return new Date(year, Math.floor(n / 31) - 1, (n % 31) + 1);
  }

  // Whether the theme's dates contain day (a local midnight).
  function contains(dates, day) {
    const year = day.getFullYear();
    let ranges;
    if (Array.isArray(dates)) {
      const [first, last] = dates;
      // A range over New Year starts the year before or ends the year after.
      ranges = first <= last
        ? [[atDay(year, first), atDay(year, last)]]
        : [[atDay(year - 1, first), atDay(year, last)], [atDay(year, first), atDay(year + 1, last)]];
    } else if (dates.easter) {
      const sunday = easterSunday(year);
      ranges = [[shift(sunday, dates.easter[0]), shift(sunday, dates.easter[1])]];
    } else {
      const newYear = LUNAR_NEW_YEAR[year];
      ranges = newYear ? [[shift(atDay(year, newYear), dates.lunarNewYear[0]), shift(atDay(year, newYear), dates.lunarNewYear[1])]] : [];
    }
    return ranges.some(([from, to]) => day >= from && day <= to);
  }

  function themeOf(day) {
    return THEMES.find(theme => contains(theme.dates, day)) || CLASSIC;
  }

  // ---- Colours ----

  const toRGB = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + t * (b[i] - v)));
  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];

  function palette(colors) {
    const accent = toRGB(colors.accent), link = toRGB(colors.link), highlight = toRGB(colors.highlight);
    return {
      accent,
      link,
      highlight,
      linkStrong: colors.linkStrong ? toRGB(colors.linkStrong) : mix(link, BLACK, 0.25),
      accentSoft: colors.accentSoft ? toRGB(colors.accentSoft) : mix(accent, WHITE, 0.91),
      surface: colors.surface ? toRGB(colors.surface) : mix(accent, WHITE, 0.965),
    };
  }

  // ---- Theme of the day ----

  // The theme asked with ?theme=, or the theme of ?date= or of today.
  function themeOfTheDay() {
    const params = new URLSearchParams(window.location.search);
    const asked = params.get('theme');
    if (asked) return asked === CLASSIC.id ? CLASSIC : THEMES.find(theme => theme.id === asked) || CLASSIC;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : null;
    const now = new Date();
    return themeOf(date ? atDay(Number(date.slice(0, 4)), date.slice(5)) : new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  // ---- Applying a theme ----

  const variable = name => `--${name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`;
  let iconLink = null;

  function apply(theme) {
    const { accent, link, highlight } = CLASSIC.colors;
    const colors = palette({ accent, link, highlight, ...theme.colors });
    window.siteTheme = {
      id: theme.id,
      name: theme.name,
      icon: theme.icon,
      rgb: colors,  // [r, g, b] arrays
      css: name => `rgb(${colors[name].join(', ')})`,
      classes: (theme.classes || CLASSIC.classes).map(([symbol, label, plural]) => ({ symbol, label, plural: plural || `${label.toLowerCase()}s` })),
      prompt: theme.prompt || CLASSIC.prompt,
      words: theme.words || CLASSIC.words,
      themeOf: day => themeOf(day).id,  // for checks: id of the theme of a date
    };

    const root = document.documentElement;
    root.dataset.theme = theme.id;
    for (const [name, rgb] of Object.entries(colors)) {
      root.style.setProperty(variable(name), `rgb(${rgb.join(', ')})`);
      root.style.setProperty(`${variable(name)}-rgb`, rgb.join(', '));
    }

    // A new <link> each time: browsers do not always notice a changed href.
    if (iconLink) iconLink.remove();
    iconLink = null;
    if (theme.icon) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="50" font-size="80" text-anchor="middle" dominant-baseline="central">${theme.icon}</text></svg>`;
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      iconLink.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      document.head.appendChild(iconLink);
    }
  }

  // ---- The visitor's choice ----

  // A visitor who picks the classic theme with the switch keeps it, on every
  // page and visit, until the theme of the day changes: the choice is stored
  // as "classic@<id of the theme of the day>". It is ignored when the URL has ?theme=.
  const STORAGE_KEY = 'theme-choice';
  const stored = () => {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;  // storage blocked or unavailable: the switch still works on this page
    }
  };
  const store = value => {
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, value);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {}
  };

  let ofTheDay;
  try {
    ofTheDay = themeOfTheDay();
  } catch (error) {
    ofTheDay = CLASSIC;
  }
  const askedInURL = new URLSearchParams(window.location.search).has('theme');
  apply(!askedInURL && stored() === `classic@${ofTheDay.id}` ? CLASSIC : ofTheDay);

  // ---- Switch in the navigation bar ----

  // Two buttons, the theme of the day and the classic theme, added at the end
  // of the navigation bar of every page (styles: .theme-switch in css/styles.css).
  // A click applies the theme at once and fires the "sitethemechange" event on
  // window, on which the demos redraw with the new colours and symbols.
  function addSwitch() {
    const bar = document.querySelector('.top-nav .nav-container');
    if (!bar || ofTheDay === CLASSIC) return;
    const group = document.createElement('div');
    group.className = 'theme-switch';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Theme of the site');
    group.appendChild(document.createElement('span')).textContent = 'Theme';
    const choices = [
      { theme: ofTheDay, text: `${ofTheDay.icon} ${ofTheDay.name}`, title: `${ofTheDay.name} theme, which changes with the time of the year` },
      { theme: CLASSIC, text: 'Classic', title: "The site's original colours" },
    ];
    const press = () => choices.forEach(choice => choice.button.setAttribute('aria-pressed', String(choice.theme.id === window.siteTheme.id)));
    for (const choice of choices) {
      choice.button = group.appendChild(document.createElement('button'));
      choice.button.type = 'button';
      choice.button.textContent = choice.text;
      choice.button.title = choice.title;
      choice.button.addEventListener('click', () => {
        if (choice.theme.id === window.siteTheme.id) return;
        apply(choice.theme);
        store(choice.theme === CLASSIC ? `classic@${ofTheDay.id}` : null);
        press();
        window.dispatchEvent(new Event('sitethemechange'));
      });
    }
    press();
    bar.appendChild(group);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addSwitch);
  else addSwitch();
})();
