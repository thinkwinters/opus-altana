(() => {
  'use strict';
  if (window.altanaTracking) return;

  const containerId = 'GTM-T83GNS9';
  const pixelId = '1292606731496968';
  const startedForms = new Set();
  const confirmedLeads = new Set();
  const dataLayer = window.dataLayer ??= [];

  function loadScript(url) {
    const script = document.createElement('script');
    script.async = true;
    script.src = url;
    document.head.append(script);
  }

  function loadTags() {
    dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    dataLayer.push({
      event: 'page_view',
      page_location: location.origin + location.pathname,
      page_title: document.title
    });
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
    window.fbq('init', pixelId);
    window.fbq('trackSingle', pixelId, 'PageView');
    if (needsPixelScript) loadScript('https://connect.facebook.net/en_US/fbevents.js');
  }

  window.altanaTracking = {
    recordFormStart(formId, placement) {
      const key = formId + '/' + placement;
      if (startedForms.has(key)) return;
      startedForms.add(key);
      dataLayer.push({ event: 'form_start', form_id: formId, lead_placement: placement });
    },
    recordLead(eventId, formId, placement) {
      if (!eventId || confirmedLeads.has(eventId)) return;
      confirmedLeads.add(eventId);
      const params = { form_id: formId, lead_placement: placement };
      dataLayer.push({ event: 'form_submit', event_id: eventId, ...params });
      dataLayer.push({ event: 'generate_lead', event_id: eventId, ...params });
      window.fbq('trackSingle', pixelId, 'Lead', params, { eventID: eventId });
    }
  };

  loadTags();
})();


