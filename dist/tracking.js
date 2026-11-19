(() => {
  'use strict';

  const containerId = 'GTM-T83GNS9';
  const pixelId = '1292606731496968';
  const cookieName = 'altana_medicao';
  const banner = document.querySelector('#preferencias-de-cookies');
  const preferences = document.querySelector('button[aria-controls="preferencias-de-cookies"]');
  const confirmedLeads = new Set();
  const dataLayer = window.dataLayer ??= [];
  let choice = document.cookie.split(/;\s*/).find((entry) => entry.startsWith(cookieName + '='))?.split('=')[1];
  let tagsLoaded = false;
  let openedFromFooter = false;

  function gtag() {
    dataLayer.push(arguments);
  }

  function setGoogleConsent(command, value) {
    gtag('consent', command, {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value
    });
  }

  function loadScript(url) {
    const script = document.createElement('script');
    script.async = true;
    script.src = url;
    document.head.append(script);
  }

  function loadTags() {
    setGoogleConsent('update', 'granted');
    if (tagsLoaded) return;
    tagsLoaded = true;

    dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    loadScript('https://www.googletagmanager.com/gtm.js?id=' + containerId);

    const needsPixelScript = !window.fbq;
    if (needsPixelScript) {
      const pixel = function () {
        if (pixel.callMethod) pixel.callMethod.apply(pixel, arguments);
        else pixel.queue.push(arguments);
      };
      pixel.push = pixel;
      pixel.queue = [];
      pixel.loaded = true;
      pixel.version = '2.0';
      window.fbq = window._fbq = pixel;
    }
    window.fbq('consent', 'grant');
    window.fbq('init', pixelId);
    window.fbq('trackSingle', pixelId, 'PageView');
    if (needsPixelScript) loadScript('https://connect.facebook.net/en_US/fbevents.js');
  }

  function setBanner(open) {
    banner.hidden = !open;
    preferences.setAttribute('aria-expanded', String(open));
  }

  function setChoice(value) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = cookieName + '=' + value + '; Max-Age=31536000; Path=/; SameSite=Lax' + secure;
    choice = value;
    setBanner(false);
    if (openedFromFooter) preferences.focus({ preventScroll: true });
    openedFromFooter = false;

    if (choice === 'granted') {
      loadTags();
    } else if (tagsLoaded) {
      setGoogleConsent('update', 'denied');
      window.fbq('consent', 'revoke');
      location.reload();
    }
  }

  setGoogleConsent('default', 'denied');
  preferences.hidden = false;
  preferences.addEventListener('click', () => {
    setBanner(banner.hidden);
    openedFromFooter = !banner.hidden;
    if (!banner.hidden) banner.querySelector('button').focus({ preventScroll: true });
  });
  banner.querySelectorAll('[data-cookie-choice]').forEach((button) => {
    button.addEventListener('click', () => setChoice(button.dataset.cookieChoice));
  });

  if (choice === 'granted') loadTags();
  else if (choice !== 'denied') setBanner(true);

  window.altanaTracking = {
    recordLead(eventId, formId, placement) {
      if (choice !== 'granted' || !eventId || confirmedLeads.has(eventId)) return;
      confirmedLeads.add(eventId);
      const params = { form_id: formId, lead_placement: placement };
      dataLayer.push({ event: 'generate_lead', event_id: eventId, ...params });
      window.fbq('trackSingle', pixelId, 'Lead', params, { eventID: eventId });
    }
  };
})();
