# Opus Altana

Landing page em HTML, CSS e JavaScript com imagens oficiais e implantação interativa. As condições comerciais usam a tabela de novembro de 2026, quadra 1, lote 10.

## GitHub e Vercel

Importe o repositório na Vercel com a raiz do projeto no mesmo nível de `vercel.json`. O comando `node scripts/build-seo.mjs` prepara a publicação em `dist-vercel` a partir dos arquivos estáticos em `dist`.

- `dist/index.html` contém os conteúdos e o número do atendimento pelo WhatsApp no atributo `data-sales-whatsapp`.
- `dist/politica-de-privacidade.html` contém a política acessível pelo rodapé e pelos formulários.
- `dist/site.js` controla o menu, as galerias, a implantação e as imagens ampliáveis.
- `dist/contact.js` controla os formulários, o seletor de país e o modal.
- `dist/tracking.js` carrega o Google Tag Manager e o Pixel da Meta conforme a preferência de medição.
- `api/leads.mjs` valida nome, e-mail, telefone e consentimento e encaminha as consultas aos endereços de atendimento.

## Busca e compartilhamento

A produção usa `https://opusaltanacondominio.com/` para gerar a URL canônica, a imagem de compartilhamento e o sitemap. A variável `SITE_URL` permite indicar outro domínio HTTPS. As prévias recebem `noindex`. A FAQ visível contém a marcação de perguntas e respostas e usa o Book Digital Opus Altana como referência.

## Envio de consultas

Conecte o Resend pelo Marketplace da Vercel ao projeto. A integração fornece `RESEND_API_KEY`. Configure `LEADS_FROM_EMAIL` com um remetente de domínio verificado no Resend e `LEADS_TO_EMAILS` com os destinatários separados por vírgula. Os nomes das variáveis constam em `.env.example`.

Os formulários redirecionam automaticamente para o WhatsApp comercial. A API envia a consulta por e-mail antes do redirecionamento. Caso o serviço de e-mail esteja indisponível, o WhatsApp abre com os dados da consulta preenchidos.

- [Importação de repositórios do GitHub na Vercel](https://vercel.com/docs/git/vercel-for-github)
- [Integração do Resend no Marketplace da Vercel](https://vercel.com/marketplace/resend)
- [Envio de e-mails no Resend](https://resend.com/docs/api-reference/emails/send-email)

## Medição de conversões

Os formulários usam os IDs `form_contato` e `form_whatsapp`. O evento `generate_lead` na camada de dados indica o formulário e a origem da consulta, inclusive quando o modal abre pela seção de financiamento.

O Pixel registra `PageView` uma vez por carregamento autorizado. A camada de dados do GTM registra `page_view`, `form_start`, `form_submit` após validação e `generate_lead` após confirmação do servidor. Use `generate_lead` para a conversão. Se a propriedade GA4 tiver coleta automática de visualizações ou interações com formulários, configure uma única origem por evento para evitar duplicidade.

Configure `META_CAPI_ACCESS_TOKEN` como variável sensível de produção na Vercel. Com a medição autorizada, a API registra o evento `Lead` após a confirmação do envio por e-mail e associa o mesmo ID ao evento do Pixel. O e-mail e o telefone são normalizados e convertidos em SHA-256 no servidor.
