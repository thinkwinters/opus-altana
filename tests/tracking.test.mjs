import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../dist/tracking.js', import.meta.url), 'utf8');

function trackingPage(cookie = '') {
  const scripts = [];
  const document = {
    cookie,
    title: 'Opus Altana',
    createElement: () => ({}),
    head: { append: (script) => scripts.push(script.src) }
  };
  const location = { origin: 'https://opusaltanacondominio.com', pathname: '/', protocol: 'https:' };
  const window = {};
  const context = vm.createContext({ document, location, window, Date, Set });
  vm.runInContext(source, context);
  return {
    window, document, scripts,
    runAgain: () => vm.runInContext(source, context),
    events: () => Array.from(window.dataLayer).filter((item) => item.event),
    pixelCalls: () => (window.fbq?.queue ?? []).map((args) => Array.from(args))
  };
}

test('PageView imediato sem cookie ou com cookie legado, sem gravar aceite', () => {
  for (const cookie of ['', 'altana_medicao=denied', 'altana_medicao=granted']) {
    const page = trackingPage(cookie);
    assert.equal(page.document.cookie, cookie);
    assert.equal(page.scripts.length, 2);
    assert.equal(page.events().filter((event) => event.event === 'page_view').length, 1);
    assert.equal(page.pixelCalls().filter((call) => call[2] === 'PageView').length, 1);
    assert.equal(page.pixelCalls().some((call) => call[0] === 'consent'), false);
    assert.equal(page.window.dataLayer.some((item) => item[0] === 'consent'), false);
  }
});

test('iniciar formulário não produz conversão; confirmação emite os três eventos uma vez', () => {
  const page = trackingPage();
  const tracking = page.window.altanaTracking;
  tracking.recordFormStart('form_contato', 'contato');
  assert.equal(page.events().some((event) => ['form_submit', 'generate_lead'].includes(event.event)), false);
  assert.equal(page.pixelCalls().some((call) => call[2] === 'Lead'), false);

  tracking.recordLead('accepted-lead', 'form_contato', 'contato');
  tracking.recordLead('accepted-lead', 'form_contato', 'contato');
  const conversionEvents = page.events().filter((event) => ['form_submit', 'generate_lead'].includes(event.event));
  assert.deepEqual(conversionEvents.map((event) => event.event), ['form_submit', 'generate_lead']);
  assert.equal(conversionEvents.every((event) => event.event_id === 'accepted-lead'), true);
  const leads = page.pixelCalls().filter((call) => call[2] === 'Lead');
  assert.equal(leads.length, 1);
  assert.equal(leads[0][4].eventID, 'accepted-lead');
});

test('reinicializar o script não duplica PageView nem conversões já confirmadas', () => {
  const page = trackingPage();
  page.window.altanaTracking.recordLead('accepted-lead', 'form_whatsapp', 'whatsapp');
  page.runAgain();
  page.window.altanaTracking.recordLead('accepted-lead', 'form_whatsapp', 'whatsapp');
  assert.equal(page.scripts.length, 2);
  assert.equal(page.events().filter((event) => event.event === 'page_view').length, 1);
  assert.equal(page.events().filter((event) => event.event === 'generate_lead').length, 1);
  assert.equal(page.pixelCalls().filter((call) => call[2] === 'PageView').length, 1);
  assert.equal(page.pixelCalls().filter((call) => call[2] === 'Lead').length, 1);
});

