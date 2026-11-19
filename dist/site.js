'use strict';

document.documentElement.classList.add('enhanced');

const header = document.querySelector('.site-header');
const menu = document.querySelector('#menu');
const menuToggle = document.querySelector('.menu-toggle');
const compactMenu = window.matchMedia('(max-width: 1000px)');
const mobileLayout = window.matchMedia('(max-width: 900px)');

function syncBrandSize() {
  header.classList.toggle('is-scrolled', window.scrollY > 36);
}

window.addEventListener('scroll', syncBrandSize, { passive: true });
window.addEventListener('pageshow', syncBrandSize);
syncBrandSize();

function setMenu(open) {
  menu.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
}

menuToggle.hidden = false;
menuToggle.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') === 'false');
});
compactMenu.addEventListener('change', () => setMenu(false));
menu.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.getAttribute('class').includes('is-open')) {
    setMenu(false);
    menuToggle.focus();
  }
});

const tabList = document.querySelector('.gallery-tabs');
const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

function syncLayout() {
  tabList.setAttribute('aria-orientation', mobileLayout.matches ? 'horizontal' : 'vertical');
}
mobileLayout.addEventListener('change', syncLayout);
syncLayout();

function showGallery(index) {
  if (tabs[index].getAttribute('aria-selected') === 'true') return;
  tabs.forEach((tab, position) => {
    const selected = position === index;
    tab.tabIndex = selected ? 0 : -1;
    tab.setAttribute('aria-selected', String(selected));
    panels[position].hidden = !selected;
    panels[position].classList.toggle('is-changing', selected);
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showGallery(index));
  tab.addEventListener('keydown', (event) => {
    const rowLength = mobileLayout.matches ? 3 : 1;
    const destination = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index - rowLength,
      ArrowDown: index + rowLength,
      Home: 0,
      End: tabs.length - 1
    }[event.key];
    if (destination === undefined) return;
    event.preventDefault();
    const next = (destination + tabs.length) % tabs.length;
    tabs[next].focus();
    showGallery(next);
  });
});

const viewer = document.querySelector('#imagem-ampliada');
const viewerPhoto = new Image();
const viewerCaption = document.querySelector('#imagem-legenda');
const viewerArea = document.querySelector('#imagem-area');
const zoomToggle = document.querySelector('#alternar-zoom');
let imageTrigger;

function setZoom(expanded) {
  viewerArea.classList.toggle('is-enlarged', expanded);
  zoomToggle.setAttribute('aria-pressed', String(expanded));
  zoomToggle.textContent = expanded ? 'Ajustar' : 'Ampliar';
  viewerArea.scrollTo(0, 0);
}

document.querySelectorAll('[data-image]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (typeof viewer.showModal !== 'function') {
      window.open(trigger.dataset.image, '_blank', 'noopener');
      return;
    }
    imageTrigger = trigger;
    viewerCaption.textContent = trigger.dataset.caption;
    viewerPhoto.alt = trigger.closest('figure')?.querySelector('img')?.alt ?? trigger.dataset.caption;
    viewerPhoto.src = trigger.dataset.image;
    viewerArea.replaceChildren(viewerPhoto);
    zoomToggle.hidden = trigger.dataset.zoom !== 'true';
    setZoom(false);
    viewer.showModal();
  });
});

zoomToggle.addEventListener('click', () => setZoom(zoomToggle.getAttribute('aria-pressed') === 'false'));
viewer.addEventListener('click', (event) => {
  if (event.target === viewer) viewer.close();
});
viewer.addEventListener('close', () => {
  viewerArea.replaceChildren();
  viewerPhoto.removeAttribute('src');
  imageTrigger?.focus({ preventScroll: true });
});

const planMap = document.querySelector('#implantacao-mapa');
const planPin = planMap.querySelector('.plan-pin');
const planStatus = document.querySelector('.plan-selection');
const planPoints = [...document.querySelectorAll('[data-plan-x]')];

planPoints.forEach((point) => {
  point.addEventListener('click', () => {
    planPoints.forEach((item) => item.setAttribute('aria-pressed', String(item === point)));
    planPin.style.left = point.dataset.planX + '%';
    planPin.style.top = point.dataset.planY + '%';
    planPin.hidden = false;
    const [number, label] = point.children;
    planStatus.textContent = number.textContent + ' · ' + label.textContent;

    const bounds = planMap.getBoundingClientRect();
    const y = bounds.top + bounds.height * Number(point.dataset.planY) / 100;
    if (y < 120 || y > window.innerHeight - 64) {
      window.scrollTo({ top: window.scrollY + y - window.innerHeight / 2, behavior: 'instant' });
    }
  });
});
