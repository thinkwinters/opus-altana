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

// Galerias do Altana: navegação no painel, sem miniaturas, expansão apenas da foto atual.
const galleryCatalog = {
  "galeria-wellness": [
    {
      "src": "assets/wellness.webp",
      "caption": "Spa da Galeria Wellness · Perspectiva ilustrativa",
      "alt": "Spa com piscina de borda de vidro e espreguiçadeiras junto ao jardim"
    },
    {
      "src": "assets/wellness-01.webp",
      "caption": "Arquitetura da Galeria Wellness · Perspectiva ilustrativa",
      "alt": "Arquitetura da Galeria Wellness no Opus Altana"
    },
    {
      "src": "assets/wellness-02.webp",
      "caption": "Academia climatizada · Perspectiva ilustrativa",
      "alt": "Academia climatizada no Opus Altana"
    },
    {
      "src": "assets/wellness-03.webp",
      "caption": "Estúdio de Pilates · Perspectiva ilustrativa",
      "alt": "Estúdio de Pilates no Opus Altana"
    },
    {
      "src": "assets/wellness-04.webp",
      "caption": "Spa e hidroterapia · Perspectiva ilustrativa",
      "alt": "Spa e hidroterapia no Opus Altana"
    },
    {
      "src": "assets/wellness-05.webp",
      "caption": "Sky decks no parque linear · Perspectiva ilustrativa",
      "alt": "Sky decks no parque linear no Opus Altana"
    }
  ],
  "galeria-grand-slam": [
    {
      "src": "assets/grand-slam.webp",
      "caption": "Quadra coberta da Galeria Grand Slam · Perspectiva ilustrativa",
      "alt": "Fachada da quadra coberta de tênis com volumes verticais e jardim na entrada"
    },
    {
      "src": "assets/grand-slam-01.webp",
      "caption": "Quadra coberta de tênis · Perspectiva ilustrativa",
      "alt": "Quadra coberta de tênis no Opus Altana"
    },
    {
      "src": "assets/grand-slam-02.webp",
      "caption": "Quadra de tênis · Perspectiva ilustrativa",
      "alt": "Quadra de tênis no Opus Altana"
    },
    {
      "src": "assets/grand-slam-03.webp",
      "caption": "Quadra poliesportiva · Perspectiva ilustrativa",
      "alt": "Quadra poliesportiva no Opus Altana"
    },
    {
      "src": "assets/grand-slam-04.webp",
      "caption": "Quadras de areia · Perspectiva ilustrativa",
      "alt": "Quadras de areia no Opus Altana"
    }
  ],
  "galeria-kids": [
    {
      "src": "assets/kids.webp",
      "caption": "Playground da Galeria Kids · Perspectiva ilustrativa",
      "alt": "Playground com estruturas coloridas de escalada ao ar livre"
    },
    {
      "src": "assets/kids-01.webp",
      "caption": "Academia infantil · Perspectiva ilustrativa",
      "alt": "Academia infantil no Opus Altana"
    },
    {
      "src": "assets/kids-02.webp",
      "caption": "Brinquedoteca · Perspectiva ilustrativa",
      "alt": "Brinquedoteca no Opus Altana"
    },
    {
      "src": "assets/kids-03.webp",
      "caption": "Playground · Perspectiva ilustrativa",
      "alt": "Playground no Opus Altana"
    },
    {
      "src": "assets/kids-04.webp",
      "caption": "Playground natural · Perspectiva ilustrativa",
      "alt": "Playground natural no Opus Altana"
    }
  ],
  "galeria-social": [
    {
      "src": "assets/social.webp",
      "caption": "Wine bar da Galeria Social · Perspectiva ilustrativa",
      "alt": "Wine bar com adega iluminada, mesas de degustação e vista para o jardim"
    },
    {
      "src": "assets/social-01.webp",
      "caption": "Wine bar · Perspectiva ilustrativa",
      "alt": "Wine bar no Opus Altana"
    },
    {
      "src": "assets/social-02.webp",
      "caption": "Wine bar e varanda · Perspectiva ilustrativa",
      "alt": "Wine bar e varanda no Opus Altana"
    },
    {
      "src": "assets/social-03.webp",
      "caption": "Charutaria · Perspectiva ilustrativa",
      "alt": "Charutaria no Opus Altana"
    },
    {
      "src": "assets/social-04.webp",
      "caption": "Mirante e charutaria · Perspectiva ilustrativa",
      "alt": "Mirante e charutaria no Opus Altana"
    },
    {
      "src": "assets/social-05.webp",
      "caption": "Praça de eventos e feirinhas · Perspectiva ilustrativa",
      "alt": "Praça de eventos e feirinhas no Opus Altana"
    },
    {
      "src": "assets/social-06.webp",
      "caption": "Espelho d’água com bangalôs · Perspectiva ilustrativa",
      "alt": "Espelho d’água com bangalôs no Opus Altana"
    }
  ],
  "galeria-pet": [
    {
      "src": "assets/pet.webp",
      "caption": "Clube Pet · Perspectiva ilustrativa",
      "alt": "Vista aérea do Clube Pet com piscina, circuito e pergolados entre jardins"
    },
    {
      "src": "assets/pet-01.webp",
      "caption": "Clube Pet · Perspectiva ilustrativa",
      "alt": "Clube Pet no Opus Altana"
    },
    {
      "src": "assets/pet-02.webp",
      "caption": "Pet Place · Perspectiva ilustrativa",
      "alt": "Pet Place no Opus Altana"
    }
  ]
};
const galleryLightbox = document.querySelector('#galeria-ampliada');
const galleryLightboxImage = document.querySelector('#galeria-ampliada-imagem');
const galleryLightboxCaption = document.querySelector('#galeria-ampliada-legenda');
let expandedGalleryTrigger = null;

function openGalleryLightbox(photo, trigger) {
  if (typeof galleryLightbox.showModal !== 'function') {
    window.open(photo.src, '_blank', 'noopener');
    return;
  }
  expandedGalleryTrigger = trigger;
  galleryLightboxImage.src = photo.src;
  galleryLightboxImage.alt = photo.alt;
  galleryLightboxCaption.textContent = photo.caption;
  galleryLightbox.showModal();
}

galleryLightbox.addEventListener('close', () => {
  galleryLightboxImage.removeAttribute('src');
  expandedGalleryTrigger?.focus({ preventScroll: true });
  expandedGalleryTrigger = null;
});

panels.forEach((panel) => {
  const photos = galleryCatalog[panel.id];
  if (!photos?.length) return;
  const image = panel.querySelector('.gallery-stage-image');
  const caption = panel.querySelector('[data-gallery-caption]');
  const counter = panel.querySelector('[data-gallery-counter]');
  const expand = panel.querySelector('[data-gallery-expand]');
  let current = 0;

  function showPhoto(index) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    image.src = photo.src;
    image.alt = photo.alt;
    caption.textContent = photo.caption;
    counter.textContent = (current + 1) + ' / ' + photos.length;
    expand.setAttribute('aria-label', 'Ampliar ' + photo.caption.split(' · ')[0]);
  }

  panel.querySelector('[data-gallery-prev]').addEventListener('click', () => showPhoto(current - 1));
  panel.querySelector('[data-gallery-next]').addEventListener('click', () => showPhoto(current + 1));
  expand.addEventListener('click', () => openGalleryLightbox(photos[current], expand));
});

const viewer = document.querySelector('#imagem-ampliada');
const viewerPhoto = new Image();
const viewerCaption = document.querySelector('#imagem-legenda');
const viewerArea = document.querySelector('#imagem-area');
const zoomToggle = document.querySelector('#alternar-zoom');
const previousImage = document.querySelector('#imagem-anterior');
const nextImage = document.querySelector('#imagem-proxima');
let imageTrigger;
let viewerGallery = [];
let viewerGalleryIndex = -1;

function setZoom(expanded) {
  viewerArea.classList.toggle('is-enlarged', expanded);
  zoomToggle.setAttribute('aria-pressed', String(expanded));
  zoomToggle.textContent = expanded ? 'Ajustar' : 'Ampliar';
  viewerArea.scrollTo(0, 0);
}

function displayViewerImage(trigger) {
  imageTrigger = trigger;
  viewerCaption.textContent = trigger.dataset.caption || '';
  viewerPhoto.alt = trigger.closest('figure')?.querySelector('img')?.alt ?? trigger.dataset.caption ?? '';
  viewerPhoto.src = trigger.dataset.image;
  viewerArea.replaceChildren(viewerPhoto);
  zoomToggle.hidden = trigger.dataset.zoom !== 'true';
  setZoom(false);
}

function navigateViewer(direction) {
  if (!viewer.open || viewerGallery.length < 2) return;
  viewerGalleryIndex = (viewerGalleryIndex + direction + viewerGallery.length) % viewerGallery.length;
  displayViewerImage(viewerGallery[viewerGalleryIndex]);
}

document.querySelectorAll('[data-image]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (typeof viewer.showModal !== 'function') {
      window.open(trigger.dataset.image, '_blank', 'noopener');
      return;
    }
    const galleryPanel = trigger.closest('.gallery-panel');
    viewerGallery = galleryPanel ? Array.from(galleryPanel.querySelectorAll('[data-image]')) : [];
    viewerGalleryIndex = viewerGallery.indexOf(trigger);
    previousImage.hidden = nextImage.hidden = viewerGallery.length < 2;
    displayViewerImage(trigger);
    viewer.showModal();
  });
});

previousImage.addEventListener('click', () => navigateViewer(-1));
nextImage.addEventListener('click', () => navigateViewer(1));
zoomToggle.addEventListener('click', () => setZoom(zoomToggle.getAttribute('aria-pressed') === 'false'));
document.addEventListener('keydown', (event) => {
  if (!viewer.open || viewerGallery.length < 2) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    navigateViewer(event.key === 'ArrowRight' ? 1 : -1);
  }
});
viewer.addEventListener('click', (event) => {
  if (event.target === viewer) viewer.close();
});
viewer.addEventListener('close', () => {
  viewerArea.replaceChildren();
  viewerPhoto.removeAttribute('src');
  imageTrigger?.focus({ preventScroll: true });
  viewerGallery = [];
  viewerGalleryIndex = -1;
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
