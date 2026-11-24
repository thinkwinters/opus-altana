import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../dist/tracking.js', import.meta.url), 'utf8');

function trackingPage(choice) {
  const scripts = [];
  const controls = new Map();
  const makeControl = (value) => {
    const control = { dataset: { cookieChoice: value }, handlers: {}, focus() {},
      addEventListener(type, handler) { this.handlers[type] = handler; } };
    controls.set(value, control);
    return control;
  };
  const buttons = [makeControl('denied'), makeControl('granted')];
  const banner = { hidden: true, querySelectorAll: () => buttons, querySelector: () => buttons[0] };
  const preferences = { hidden: true, setAttribute() {}, addEventListener() {}, focus() {} };
  const document = {
    cookie: choice ? 'altana_medicao=' + choice : '',
    title: 'Opus Altana',
    querySelector: (selector) => selector === '#preferencias-de-cookies' ? banner : preferences,
    createElement: () => ({}),
    head: { append: (script) => scripts.push(script.src) }
  };
  const location = { origin: 'https://opusaltanacondominio.com', pathname: '/', protocol: 'https:', reload() {} };
  const window = {};
  vm.runInNewContext(source, { document, location, window, Date, Set });
  return {
    window, document, scripts, banner,
    choose: (value) => controls.get(value).handlers.click(),
    events: () => Array.from(window.dataLayer).filter((item) => item.event),
    pixelCalls: () => (window.fbq?.queue ?? []).map((args) => Array.from(args))
  };
}

test('sem escolha ou com recusa, um lead confirmado não altera cookies nem dispara medição', () => {
  for (const choice of [undefined, 'denied']) {
    const page = trackingPage(choice);
    const before = page.document.cookie;
    page.window.altanaTracking.recordFormStart('form_contato', 'contato');
    page.window.altanaTracking.recordLead('accepted-lead', 'form_contato', 'contato');
    assert.equal(page.document.cookie, before);
    assert.equal(page.scripts.length, 0);
    assert.equal(page.events().length, 0);
    assert.equal(page.pixelCalls().length, 0);
  }
});

test('com consentimento, início do formulário não produz conversão; confirmação emite uma vez', () => {
  const page = trackingPage('granted');
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
  assert.equal(page.pixelCalls().filter((call) => call[2] === 'PageView').length, 1);
  assert.equal(page.scripts.length, 2);
});

test('recusar após aceitar impede conversão de uma resposta tardia', () => {
  const page = trackingPage('granted');
  page.choose('denied');
  page.window.altanaTracking.recordLead('late-response', 'form_whatsapp', 'whatsapp');
  assert.match(page.document.cookie, /^altana_medicao=denied;/);
  assert.equal(page.events().some((event) => ['form_submit', 'generate_lead'].includes(event.event)), false);
  assert.equal(page.pixelCalls().some((call) => call[2] === 'Lead'), false);
});
