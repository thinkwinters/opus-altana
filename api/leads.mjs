import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const leadRecipients = [
  'Thiagoimoveisnatal@gmail.com',
  'therrysantos4@gmail.com'
];
const campaignFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const brazilTimeZone = 'America/Sao_Paulo';
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

function cleanMetadata(value, maxLength = 512) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, maxLength)
    : '';
}

function getOriginPage(request, lead) {
  const requestOrigin = new URL(request.url).origin;
  const original = typeof lead?.pageUrl === 'string' ? lead.pageUrl.trim() : '';
  const referrer = request.headers.get('referer') || '';
  if (original.length > 2500 || (!original && !referrer)) return null;

  try {
    const page = new URL(original || referrer);
    if ((page.protocol !== 'https:' && page.protocol !== 'http:')
        || page.origin !== requestOrigin
        || page.username || page.password
        || page.pathname.startsWith('/api/')) return null;
    return page;
  } catch {
    return null;
  }
}

function getBrazilDateTime(date) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: brazilTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return {
    date: values.day + '/' + values.month + '/' + values.year,
    time: values.hour + ':' + values.minute + ':' + values.second
  };
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
    const requestOrigin = new URL(request.url).origin;
    if (origin && origin !== requestOrigin) return reply(403);
    const referrer = request.headers.get('referer');
    if (referrer) {
      try {
        if (new URL(referrer).origin !== requestOrigin) return reply(403);
      } catch {
        return reply(403);
      }
    }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return reply(415);
    }

    let lead;
    try {
      const content = await request.text();
      if (content.length > 4096) return reply(413);
      lead = JSON.parse(content);
    } catch {
      return reply(400);
    }

    const name = typeof lead?.name === 'string' ? lead.name.trim() : '';
    const email = typeof lead?.email === 'string' ? lead.email.trim() : '';
    const phone = typeof lead?.phone === 'string' ? lead.phone.trim() : '';
    const source = lead?.source;
    const requestId = typeof lead?.requestId === 'string' ? lead.requestId : '';
    const page = getOriginPage(request, lead);

    if (lead?.website || lead?.consent !== true || !page
        || (source !== 'contact' && source !== 'whatsapp')
        || name.length < 2 || name.length > 100 || /[\r\n]/.test(name)
        || email.length > 160 || !emailPattern.test(email)
        || !/^\+[1-9]\d{6,14}$/.test(phone)
        || !/^[a-f0-9-]{36}$/i.test(requestId)) {
      return reply(422);
    }

    const apiKey = process.env.RESEND_API_KEY;
    // Mesmo nome de remetente da FGR Vendas, com compatibilidade para versões anteriores do Altana.
    const from = process.env.LEAD_FROM || process.env.LEADS_FROM_EMAIL;
    if (!apiKey || !from) {
      console.error('lead_email_configuration_incomplete');
      return reply(503);
    }

    const formId = source === 'contact' ? 'form_contato' : 'form_whatsapp';
    const placement = source === 'contact' ? 'contato' : lead.placement === 'financiamento' ? 'financiamento' : 'whatsapp';
    const formName = source === 'contact' ? 'Formulário de contato' : 'Atendimento via WhatsApp';
    const receivedAt = new Date();
    const dateTime = getBrazilDateTime(receivedAt);
    const userAgent = cleanMetadata(request.headers.get('user-agent'), 512) || 'Não informado';
    const campaigns = campaignFields
      .map((key) => [key, cleanMetadata(page.searchParams.get(key), 160)])
      .filter(([, value]) => value)
      .map(([key, value]) => key + ': ' + value);
    const emailText = [
      'Novo lead | Opus Altana',
      '',
      'DADOS DO FORMULÁRIO',
      'Nome: ' + name,
      'E-mail: ' + email,
      'Telefone / WhatsApp: ' + phone,
      'Formulário: ' + formName,
      'Origem do formulário: ' + placementNames[placement],
      '',
      'DADOS DO ACESSO',
      'URL da página: ' + page.href,
      'Data: ' + dateTime.date,
      'Hora: ' + dateTime.time + ' (horário de Brasília)',
      'Data/hora UTC: ' + receivedAt.toISOString(),
      'User agent: ' + userAgent,
      ...(campaigns.length ? ['', 'CAMPANHA', ...campaigns] : []),
      '',
      'ID da consulta: ' + requestId
    ].join('\n');

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
          to: leadRecipients,
          subject: 'Novo lead | Opus Altana | ' + placementNames[placement],
          reply_to: email,
          text: emailText
        }),
        signal: AbortSignal.timeout(9000)
      });
      if (!delivery.ok) {
        console.error('lead_email_rejected', delivery.status);
        return reply(502);
      }
      const accepted = await delivery.json();
      if (!accepted?.id) {
        console.error('lead_email_unconfirmed');
        return reply(502);
      }
    } catch {
      console.error('lead_email_provider_unavailable');
      return reply(502);
    }

    await sendMetaLead(request, { email, phone, requestId, formId, placement });
    return reply(200, { ok: true, eventId: requestId });
  }
};
