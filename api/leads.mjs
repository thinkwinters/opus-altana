import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const placementNames = {
  contato: 'Formulário da página',
  whatsapp: 'Botão WhatsApp',
  financiamento: 'Condições de financiamento'
};

function reply(status, payload = { ok: false }, headers = {}) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function cookieValue(request, name) {
  const prefix = name + '=';
  return request.headers.get('cookie')?.split(/;\s*/).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function sendMetaLead(request, lead) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken || cookieValue(request, 'altana_medicao') !== 'granted') return;

  const userData = {
    em: [hash(lead.email.toLowerCase())],
    ph: [hash(lead.phone.slice(1))]
  };
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim();
  const agent = request.headers.get('user-agent');
  if (ip && isIP(ip)) userData.client_ip_address = ip;
  if (agent) userData.client_user_agent = agent.slice(0, 512);

  for (const key of ['fbp', 'fbc']) {
    const value = cookieValue(request, '_' + key);
    if (value && /^fb\.\d\.\d{10,16}\.[A-Za-z0-9._-]{1,300}$/.test(value)) userData[key] = value;
  }

  try {
    const response = await fetch('https://graph.facebook.com/v25.0/1292606731496968/events', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [{
          event_name: 'Lead',
          event_id: lead.requestId,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: new URL('/', request.url).href,
          user_data: userData,
          custom_data: { form_id: lead.formId, lead_placement: lead.placement }
        }]
      }),
      signal: AbortSignal.timeout(3500)
    });
    if (!response.ok) console.warn('Meta CAPI respondeu com status', response.status);
  } catch {
    console.warn('Meta CAPI não confirmou o evento Lead.');
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return reply(405, { ok: false }, { Allow: 'POST' });

    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return reply(403);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return reply(415);
    }

    let lead;
    try {
      const content = await request.text();
      if (content.length > 2048) return reply(413);
      lead = JSON.parse(content);
    } catch {
      return reply(400);
    }

    const name = typeof lead?.name === 'string' ? lead.name.trim() : '';
    const email = typeof lead?.email === 'string' ? lead.email.trim() : '';
    const phone = typeof lead?.phone === 'string' ? lead.phone.trim() : '';
    const source = lead?.source;
    const requestId = typeof lead?.requestId === 'string' ? lead.requestId : '';

    if (lead?.website || lead?.consent !== true
        || (source !== 'contact' && source !== 'whatsapp')
        || name.length < 2 || name.length > 100 || /[\r\n]/.test(name)
        || email.length > 160 || !emailPattern.test(email)
        || !/^\+[1-9]\d{6,14}$/.test(phone)
        || !/^[a-f0-9-]{36}$/i.test(requestId)) {
      return reply(422);
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.LEADS_FROM_EMAIL;
    const recipients = (process.env.LEADS_TO_EMAILS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    if (!apiKey || !from || !recipients.length || recipients.some((value) => !emailPattern.test(value))) {
      return reply(503);
    }

    const formId = source === 'contact' ? 'form_contato' : 'form_whatsapp';
    const placement = source === 'contact' ? 'contato' : lead.placement === 'financiamento' ? 'financiamento' : 'whatsapp';

    try {
      const delivery = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'opus-altana-lead/' + requestId
        },
        body: JSON.stringify({
          from,
          to: recipients,
          subject: 'Nova consulta sobre o Opus Altana',
          reply_to: email,
          text: ['Nova consulta de lotes e condições pelo site Opus Altana.', '', 'Nome: ' + name, 'E-mail: ' + email, 'WhatsApp: ' + phone, 'Origem: ' + placementNames[placement], 'Formulário: ' + formId].join('\n')
        }),
        signal: AbortSignal.timeout(9000)
      });
      if (!delivery.ok) return reply(502);
    } catch {
      return reply(502);
    }

    await sendMetaLead(request, { email, phone, requestId, formId, placement });
    return reply(200, { ok: true, eventId: requestId });
  }
};
