'use strict';

const leadEndpoint = document.body.dataset.leadEndpoint;
const salesWhatsApp = document.body.dataset.salesWhatsapp;
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
  const widget = phoneField(phone);
  let lastAttempt;

  function placement() {
    return source === 'contact' ? 'contato' : contactTrigger?.dataset.leadPlacement ?? 'whatsapp';
  }

  function setBusy(busy) {
    form.setAttribute('aria-busy', String(busy));
    form.querySelectorAll('input, button').forEach((control) => { control.disabled = busy; });
  }

  form.hidden = false;
  // Os eventos de conversão são emitidos após a resposta da API, não pelo clique.
  submit.addEventListener('click', (event) => event.stopPropagation());
  form.addEventListener('input', (event) => {
    if (contactFields.includes(event.target)) {
      window.altanaTracking?.recordFormStart?.(form.id, placement());
    }
    phone.setCustomValidity('');
    name.setCustomValidity('');
    status.textContent = '';
    lastAttempt = undefined;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    // Impede que a coleta automática trate uma tentativa como envio confirmado.
    event.stopPropagation();
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
      pageUrl: window.location.href,
      website: String(data.get('website') ?? ''),
      consent: source === 'whatsapp' || data.get('consent') === 'on',
      source,
      placement: placement()
    };

    if (lead.website || !lead.consent) return;

    let delivered = false;
    if (leadEndpoint) {
      setBusy(true);
      status.textContent = 'Enviando sua consulta…';

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
        if (response.ok) {
          const result = await response.json();
          delivered = result.ok === true;
          if (delivered) window.altanaTracking?.recordLead?.(result.eventId, form.id, lead.placement);
        }
      } catch {
        // Não registra conversão nem confirmação sem o aceite do provedor de e-mail.
      } finally {
        setBusy(false);
      }
    }

    if (!delivered) {
      status.textContent = 'Não foi possível confirmar o envio por e-mail. Tente novamente ou ';
      const fallback = whatsappLink(lead, true);
      if (fallback) {
        const link = document.createElement('a');
        link.href = fallback;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'continue pelo WhatsApp.';
        // O envio por e-mail falhou; a alternativa de atendimento não confirma um lead.
        link.addEventListener('click', (event) => event.stopPropagation());
        status.append(link);
      } else {
        status.textContent = 'Não foi possível confirmar o envio por e-mail. Tente novamente.';
      }
      return;
    }

    const next = whatsappLink(lead, false);
    if (next) {
      status.textContent = 'Consulta enviada por e-mail. Abrindo o WhatsApp…';
      window.location.assign(next);
      return;
    }
    status.textContent = 'Consulta enviada por e-mail. A equipe vai responder pelo contato informado.';
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

