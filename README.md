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

A produção usa o domínio do projeto informado pela Vercel para gerar a URL canônica, a imagem de compartilhamento e o sitemap. Configure `SITE_URL` com a raiz HTTPS para indicar um domínio de produção específico. As prévias recebem `noindex`. A FAQ visível contém a marcação de perguntas e respostas e usa o Book Digital Opus Altana como referência.

## Envio de consultas

Configure `RESEND_API_KEY`, `LEADS_FROM_EMAIL` e `LEADS_TO_EMAILS` nas variáveis de ambiente da Vercel. O remetente deve usar um domínio verificado no Resend. Separe os destinatários por vírgula. Os nomes das variáveis constam em `.env.example`.

Com o envio automático ativo, a consulta chega à equipe por e-mail e a página encaminha o visitante ao WhatsApp comercial. A página oferece uma forma de continuar o atendimento quando o envio automático falha.

- [Importação de repositórios do GitHub na Vercel](https://vercel.com/docs/git/vercel-for-github)
- [Envio de e-mails no Resend](https://resend.com/docs/api-reference/emails/send-email)

## Medição de conversões

Os formulários usam os IDs `form_contato` e `form_whatsapp`. O evento `generate_lead` na camada de dados indica o formulário e a origem da consulta, inclusive quando o modal abre pela seção de financiamento.

O Pixel registra `PageView` uma vez por carregamento autorizado. A camada de dados do GTM registra `page_view`, `form_start`, `form_submit` após validação e `generate_lead` após confirmação do servidor. Use `generate_lead` para a conversão. Se a propriedade GA4 tiver coleta automática de visualizações ou interações com formulários, configure uma única origem por evento para evitar duplicidade.

Configure `META_CAPI_ACCESS_TOKEN` como variável sensível de produção na Vercel. Com a medição autorizada, a API registra o evento `Lead` após a confirmação do envio por e-mail e associa o mesmo ID ao evento do Pixel. O e-mail e o telefone são normalizados e convertidos em SHA-256 no servidor.
