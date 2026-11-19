'use strict';

const leadEndpoint = document.body.dataset.leadEndpoint;
const salesWhatsApp = document.body.dataset.salesWhatsapp;
const recipients = document.body.dataset.leadDraftRecipients;
const favoriteCountries = ['br', 'pt', 'us', 'es'];
const interfaceTranslations = {
  selectedCountryAriaLabel: "Alterar o país do número de telefone. Selecionado: ${countryName} (${dialCode})",
  noCountrySelected: "Selecionar o país do número de telefone",
  countryListAriaLabel: "Lista de países",
  searchPlaceholder: "Pesquisar",
  clearSearchAriaLabel: "Limpar pesquisa",
  closeCountrySelectorAriaLabel: "Fechar",
  searchEmptyState: "Nenhum resultado encontrado",
  searchSummaryAria(count) {
    if (count === 0) {
      return "Nenhum resultado encontrado";
    }
    if (count === 1) {
      return "1 resultado encontrado";
    }
    return `${count} resultados encontrados`;
  }
};
const launcher = document.querySelector('.whatsapp-float');
const contactDialog = document.querySelector('#whatsapp-dialog');
let contactTrigger;
let countryPromise;

document.querySelector('[data-current-year]').textContent = new Date().getFullYear();

function resolveCountry() {
  countryPromise ??= fetch('https://ipapi.co/json/', {
    signal: AbortSignal.timeout(3500),
    referrerPolicy: 'no-referrer'
  })
    .then((response) => response.ok ? response.json() : {})
    .then((data) => /^[a-z]{2}$/i.test(data.country_code ?? '') ? data.country_code.toLowerCase() : null)
    .catch(() => null);
  return countryPromise;
}

function phoneField(input) {
  const intlTelInput = window.intlTelInput;
  if (!intlTelInput) return null;

  const widget = intlTelInput(input, {
    initialCountry: 'br',
    countryOrder: favoriteCountries,
    countryNameLocale: 'pt-BR',
    uiTranslations: interfaceTranslations,
    countrySelectorMode: intlTelInput.COUNTRY_SELECTOR_MODE.DROPDOWN,
    separateDialCode: false,
    strictMode: true,
    formatAsYouType: true,
    numberDisplayFormat: intlTelInput.NUMBER_FORMAT.NATIONAL,
    placeholderNumberPolicy: intlTelInput.PLACEHOLDER_POLICY.AGGRESSIVE
  });

  let countryChanged = false;
  input.addEventListener('countrychange', () => {
    countryChanged = true;
    input.setCustomValidity('');
  });
  resolveCountry().then((country) => {
    if (country && !countryChanged && !input.value.trim()) widget.setSelectedCountry(country);
  });
  return widget;
}

function formatPhone(input, widget) {
  if (widget) return widget.isValidNumber() ? widget.getNumber() : null;

  const value = input.value.trim();
  const digits = value.replace(/\D/g, '');
  if (value.startsWith('+')) return /^[1-9]\d{6,14}$/.test(digits) ? '+' + digits : null;
  return /^\d{10,11}$/.test(digits) ? '+55' + digits : null;
}

function contactDetails(lead) {
  return ['Nome: ' + lead.name, 'E-mail: ' + lead.email, 'WhatsApp: ' + lead.phone];
}

function emailDraft(lead) {
  if (!recipients) return null;
  const body = ['Olá, gostaria de consultar os lotes disponíveis e as condições no Opus Altana.', '', ...contactDetails(lead)].join('\r\n');
  return 'mailto:' + recipients + '?subject=' + encodeURIComponent('Consulta sobre o Opus Altana') + '&body=' + encodeURIComponent(body);
}

function whatsappLink(lead, withDetails) {
  if (!salesWhatsApp) return null;
  const message = ['Olá, vim pelo site do Opus Altana e gostaria de receber informações.'];
  if (withDetails) message.push('', ...contactDetails(lead));
  return 'https://wa.me/' + salesWhatsApp + '?text=' + encodeURIComponent(message.join('\n'));
}

function bindContact(form) {
  const source = form.dataset.leadSource;
  const name = form.elements.namedItem('name');
  const email = form.elements.namedItem('email');
  const phone = form.elements.namedItem('phone');
  const contactFields = [name, email, phone];
  const submit = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.lead-status');
  const alternative = form.querySelector('.lead-alternative');
  const widget = phoneField(phone);
  let lastAttempt;

  function placement() {
    return source === 'contact' ? 'contato' : contactTrigger?.dataset.leadPlacement ?? 'whatsapp';
  }

  function offerLink(href, text) {
    alternative.href = href;
    alternative.textContent = text;
    alternative.hidden = false;
  }

  function setBusy(busy) {
    form.setAttribute('aria-busy', String(busy));
    form.querySelectorAll('input, button').forEach((control) => { control.disabled = busy; });
  }

  form.hidden = false;
  form.addEventListener('input', (event) => {
    if (contactFields.includes(event.target)) {
      window.altanaTracking?.recordFormStart?.(form.id, placement());
    }
    phone.setCustomValidity('');
    name.setCustomValidity('');
    status.textContent = '';
    alternative.hidden = true;
    lastAttempt = undefined;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    const readyWidget = widget?.promise ? await widget.promise.then(() => widget, () => null) : widget;
    if (submit.disabled) return;

    const data = new FormData(form);
    const fullName = name.value.trim();
    const fullPhone = formatPhone(phone, readyWidget);

    if (fullName.length < 2) {
      name.setCustomValidity('Informe seu nome para continuar.');
      name.reportValidity();
      return;
    }
    if (!fullPhone) {
      phone.setCustomValidity('Confira o número e o país selecionado.');
      phone.reportValidity();
      return;
    }

    const lead = {
      name: fullName,
      email: String(data.get('email')).trim(),
      phone: fullPhone,
      website: String(data.get('website') ?? ''),
      consent: source === 'whatsapp' || data.get('consent') === 'on',
      source,
      placement: placement()
    };

    if (lead.website || !lead.consent) return;
    window.altanaTracking?.recordFormSubmit?.(form.id, lead.placement);

    const draft = source === 'contact' ? emailDraft(lead) : null;
    const fallback = draft ?? whatsappLink(lead, true);
    const fallbackLabel = draft ? 'Enviar consulta por e-mail' : 'Continuar no WhatsApp';

    if (!leadEndpoint) {
      if (fallback) {
        offerLink(fallback, fallbackLabel);
        status.textContent = draft ? 'A consulta está pronta para enviar por e-mail.' : 'Continue a consulta pelo WhatsApp.';
        window.location.assign(fallback);
      }
      return;
    }

    setBusy(true);
    status.textContent = 'Enviando sua consulta…';
    alternative.hidden = true;

    try {
      const fingerprint = JSON.stringify(lead);
      if (lastAttempt?.fingerprint !== fingerprint) {
        lastAttempt = { fingerprint, id: crypto.randomUUID() };
      }
      const response = await fetch(leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, requestId: lastAttempt.id }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error('Envio não confirmado.');
      const result = await response.json();
      if (!result.ok) throw new Error('Envio não confirmado.');
      window.altanaTracking?.recordLead(result.eventId, form.id, lead.placement);

      const next = whatsappLink(lead, false);
      status.textContent = next ? 'Consulta enviada. Continue pelo WhatsApp.' : 'Consulta enviada. A equipe vai responder pelo contato informado.';
      if (next) {
        offerLink(next, 'Abrir WhatsApp');
        window.location.assign(next);
      }
    } catch {
      status.textContent = fallback ? 'O envio por e-mail está indisponível. Continue pelo link abaixo.' : 'O envio está indisponível. Tente novamente.';
      if (fallback) offerLink(fallback, fallbackLabel);
    } finally {
      setBusy(false);
    }
  });
}

if (typeof contactDialog.showModal === 'function') {
  launcher.hidden = false;
  document.querySelectorAll('[aria-controls="whatsapp-dialog"]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      if (contactDialog.open) return;
      contactTrigger = trigger;
      contactDialog.showModal();
      trigger.setAttribute('aria-expanded', 'true');
    });
  });
}
contactDialog.querySelectorAll('.whatsapp-close, .whatsapp-dismiss').forEach((button) => {
  button.addEventListener('click', () => contactDialog.close());
});
contactDialog.addEventListener('close', () => {
  contactTrigger?.setAttribute('aria-expanded', 'false');
  contactTrigger?.focus({ preventScroll: true });
});

document.querySelectorAll('[data-lead-source]').forEach(bindContact);
