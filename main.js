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
