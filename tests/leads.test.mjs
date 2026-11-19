import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import handler from '../api/leads.mjs';

const origin = 'https://opusaltanacondominio.com';
const lead = {
  name: 'João da Silva',
  email: 'LEAD@example.com',
  phone: '+5562999999999',
  source: 'contact',
  placement: 'contato',
  pageUrl: origin + '/?utm_source=meta&utm_campaign=test-altana',
  requestId: '550e8400-e29b-41d4-a716-446655440000',
  website: '',
  consent: true
};

function request(fields = {}, { cookie = 'altana_medicao=granted', originHeader = origin } = {}) {
  return new Request(origin + '/api/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: originHeader,
      Referer: origin + '/',
      'User-Agent': 'AltanaIntegrationTest/1.0',
      Cookie: cookie,
      'x-forwarded-for': '203.0.113.10'
    },
    body: JSON.stringify({ ...lead, ...fields })
  });
}

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function withMocks({ resendStatus = 200, consentCookie = 'altana_medicao=granted' } = {}, run) {
  const previous = {
    fetch: globalThis.fetch,
    resend: process.env.RESEND_API_KEY,
    from: process.env.LEAD_FROM,
    meta: process.env.META_CAPI_ACCESS_TOKEN,
    pixel: process.env.META_PIXEL_ID
  };
  const calls = [];
  process.env.RESEND_API_KEY = 're_dummy_test_key_not_real';
  process.env.LEAD_FROM = 'Opus Altana <leads@example.org>';
  process.env.META_CAPI_ACCESS_TOKEN = 'test_meta_token_not_real';
  process.env.META_PIXEL_ID = '1292606731496968';
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('api.resend.com')) {
      return Response.json({ id: 'test-email-accepted' }, { status: resendStatus });
    }
    if (String(url).includes('graph.facebook.com')) {
      return Response.json({ events_received: 1 }, { status: 200 });
    }
    throw new Error('Unexpected request ' + url);
  };

  return Promise.resolve().then(() => run(calls, consentCookie)).finally(() => {
    globalThis.fetch = previous.fetch;
    for (const [key, value] of [
      ['RESEND_API_KEY', previous.resend],
      ['LEAD_FROM', previous.from],
      ['META_CAPI_ACCESS_TOKEN', previous.meta],
      ['META_PIXEL_ID', previous.pixel]
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test('contato envia e-mail aos dois destinatários e Lead CAPI com advanced matching', async () => {
  await withMocks({}, async (calls) => {
    const response = await handler.fetch(request());
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.ok, true);
    assert.equal(result.eventId, lead.requestId);

    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /api\.resend\.com\/emails/);
    const email = JSON.parse(calls[0].options.body);
    assert.deepEqual(email.to, ['Thiagoimoveisnatal@gmail.com', 'therrysantos4@gmail.com']);
    assert.match(email.text, /Nome: João da Silva/);
    assert.match(email.text, /URL da página: https:\/\/opusaltanacondominio\.com\/\?utm_source=meta&utm_campaign=test-altana/);
    assert.match(email.text, /Data: \d{2}\/\d{2}\/\d{4}/);
    assert.match(email.text, /Hora: \d{2}:\d{2}:\d{2}/);
    assert.match(email.text, /User agent: AltanaIntegrationTest\/1\.0/);
    assert.match(email.text, /Formulário: form_contato|Formulário: Formulário de contato/);
    assert.match(email.text, /utm_source: meta/);
    assert.match(email.text, /utm_campaign: test-altana/);

    assert.match(calls[1].url, /graph\.facebook\.com\/v\d+\.\d+\/1292606731496968\/events/);
    const meta = JSON.parse(calls[1].options.body).data[0];
    assert.equal(meta.event_name, 'Lead');
    assert.equal(meta.event_id, lead.requestId);
    assert.equal(meta.event_source_url, lead.pageUrl);
    assert.equal(meta.custom_data.form_id, 'form_contato');
    assert.deepEqual(meta.user_data.em, [sha('lead@example.com')]);
    assert.deepEqual(meta.user_data.ph, [sha('5562999999999')]);
    assert.deepEqual(meta.user_data.fn, [sha('joao')]);
    assert.deepEqual(meta.user_data.ln, [sha('silva')]);
    assert.deepEqual(meta.user_data.external_id, [sha('lead@example.com')]);
    assert.equal(meta.user_data.client_user_agent, 'AltanaIntegrationTest/1.0');
    assert.equal(meta.user_data.client_ip_address, '203.0.113.10');
    assert.ok(!JSON.stringify(meta).includes('João da Silva'));
  });
});

test('Lead CAPI respeita a opção de cookies', async () => {
  await withMocks({}, async (calls) => {
    const response = await handler.fetch(request({}, { cookie: 'altana_medicao=denied' }));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
  });
});

test('formulário WhatsApp usa form_whatsapp e respeita contexto de financiamento', async () => {
  await withMocks({}, async (calls) => {
    const response = await handler.fetch(request({ source: 'whatsapp', placement: 'financiamento' }));
    assert.equal(response.status, 200);
    const email = JSON.parse(calls[0].options.body);
    assert.match(email.text, /Origem do formulário: Condições de financiamento/);
    const meta = JSON.parse(calls[1].options.body).data[0];
    assert.equal(meta.custom_data.form_id, 'form_whatsapp');
  });
});

test('não registra conversão quando Resend falha', async () => {
  await withMocks({ resendStatus: 403 }, async (calls) => {
    const response = await handler.fetch(request());
    assert.equal(response.status, 502);
    assert.equal(calls.length, 1);
  });
});

test('não aceita origem falsa', async () => {
  await withMocks({}, async (calls) => {
    const response = await handler.fetch(request({}, { originHeader: 'https://example.net' }));
    assert.equal(response.status, 403);
    assert.equal(calls.length, 0);
  });
});

test('sem RESEND_API_KEY retorna 503, antes de tentar qualquer envio', async () => {
  await withMocks({}, async (calls) => {
    delete process.env.RESEND_API_KEY;
    const response = await handler.fetch(request());
    assert.equal(response.status, 503);
    assert.equal(calls.length, 0);
  });
});
