const views = {
  home: document.querySelector('[data-view="home"]'),
  game: document.querySelector('[data-view="game"]'),
};

const gameMount = document.getElementById('gameMount');
const homeButton = document.getElementById('homeButton');
const cards = document.querySelectorAll('[data-route]');

const routes = {
  home: { name: 'home' },
  'pop-bubbles': {
    name: 'pop-bubbles',
    title: 'Pop the Bubbles',
    module: './games/pop-dots.js',
    css: './games/pop-dots.css',
  },
  'calm-touch': {
    name: 'calm-touch',
    title: 'Calm Touch',
    module: './games/calm-touch.js',
    css: './games/calm-touch.css',
  },
  'tide-wash': {
    name: 'tide-wash',
    title: 'Tide Wash',
    module: './games/tide-wash.js',
    css: './games/tide-wash.css',
  },
  'pour-spread': {
    name: 'pour-spread',
    title: 'Pour & Spread',
    module: './games/pour-spread.js',
    css: './games/pour-spread.css',
  },
  'tap-grow': {
    name: 'tap-grow',
    title: 'Tap to Grow',
    module: './games/tap-grow.js',
    css: './games/tap-grow.css',
  },
  'catch-fall': {
    name: 'catch-fall',
    title: 'Catch the Fall',
    module: './games/catch-fall.js',
    css: './games/catch-fall.css',
  },
  'balloon-balance': {
    name: 'balloon-balance',
    title: 'Balloon Balance',
    module: './games/balloon-balance.js',
    css: './games/balloon-balance.css',
  },
  'breath-sync': {
    name: 'breath-sync',
    title: 'Breath Sync',
    module: './games/breath-sync.js',
    css: './games/breath-sync.css',
  },
  'warm-glow': {
    name: 'warm-glow',
    title: 'Warm Glow',
    module: './games/warm-glow.js',
    css: './games/warm-glow.css',
  },
  'sand-garden': {
    name: 'sand-garden',
    title: 'Sand Garden',
    module: './games/sand-garden.js',
    css: './games/sand-garden.css',
  },
};

let currentCleanup = null;
let currentRoute = 'home';
let currentCssLink = null;

function setActiveView(viewName) {
  Object.values(views).forEach((view) => view.classList.remove('is-active'));
  const next = views[viewName];
  if (next) {
    next.classList.add('is-active');
  }
}

function setHash(routeName) {
  if (routeName === 'home') {
    history.pushState({}, '', '#home');
  } else {
    history.pushState({}, '', `#${routeName}`);
  }
}

function getRouteFromHash() {
  const hash = window.location.hash.replace('#', '').trim();
  if (!hash || hash === 'home') {
    return 'home';
  }
  return routes[hash] ? hash : 'home';
}

function unloadGame() {
  if (typeof currentCleanup === 'function') {
    currentCleanup();
  }
  currentCleanup = null;
  gameMount.innerHTML = '';
  if (currentCssLink) {
    currentCssLink.remove();
    currentCssLink = null;
  }
}

function ensureGameCss(path) {
  if (currentCssLink?.dataset?.gameCss === path) {
    return;
  }
  if (currentCssLink) {
    currentCssLink.remove();
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = path;
  link.dataset.gameCss = path;
  document.head.appendChild(link);
  currentCssLink = link;
}

async function loadGame(routeName) {
  const route = routes[routeName];
  if (!route || routeName === 'home') {
    return;
  }

  if (currentRoute === routeName) {
    return;
  }

  unloadGame();
  ensureGameCss(route.css);

  const module = await import(route.module);
  if (typeof module.mount !== 'function') {
    throw new Error('Game module missing mount()');
  }
  currentCleanup = module.mount(gameMount);
  currentRoute = routeName;
}

async function handleRouteChange() {
  const routeName = getRouteFromHash();
  if (routeName === 'home') {
    unloadGame();
    setActiveView('home');
    currentRoute = 'home';
    return;
  }

  setActiveView('game');
  await loadGame(routeName);
}

cards.forEach((card) => {
  card.addEventListener('click', () => {
    const routeName = card.dataset.route;
    if (!routeName) return;
    setHash(routeName);
    handleRouteChange();
  });
});

homeButton.addEventListener('click', () => {
  setHash('home');
  handleRouteChange();
});

window.addEventListener('hashchange', handleRouteChange);

if (!window.location.hash) {
  history.replaceState({}, '', '#home');
}

handleRouteChange();

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

themeToggle?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});
