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

O envio usa a API do **Resend**, como no FGR Vendas. Configure as variáveis privadas `RESEND_API_KEY` e `LEAD_FROM` (remetente autorizado em um domínio verificado no Resend) no projeto implantado. O nome legado `LEADS_FROM_EMAIL` também funciona como alternativa. Não grave a chave real no repositório.

Todos os envios são destinados a **Thiagoimoveisnatal@gmail.com** e **therrysantos4@gmail.com**, definidos em `api/leads.mjs`. Não é necessário cadastrar `LEAD_RECIPIENTS` nem `LEADS_TO_EMAILS` neste projeto. É possível utilizar a mesma conta Resend do FGR Vendas, caso ela permita o uso do remetente verificado.

Os formulários `form_contato` e `form_whatsapp` enviam nome, e-mail, telefone, origem, URL **completa** da página, data/hora do servidor convertidas para `America/Sao_Paulo`, user agent da requisição e UTMs existentes na URL. A API valida a origem da página e utiliza um identificador idempotente por tentativa para reduzir e-mails duplicados.

**Confirmação:** só após o Resend aceitar a mensagem e fornecer um ID a aplicação informa sucesso, registra a conversão e abre o WhatsApp comercial. Se o envio não for confirmado, o formulário exibe erro e a opção de continuar manualmente pelo WhatsApp (com dados preenchidos); não registra `generate_lead` nem redireciona automaticamente.

**Publicação:** conecte o repositório ao projeto Vercel, configure as variáveis de produção e gere um novo deploy. Teste os dois formulários no domínio publicado e verifique os registros do Resend e as caixas de entrada. Aceite do Resend não significa garantia de entrega final.

- [Importação de repositórios do GitHub na Vercel](https://vercel.com/docs/git/vercel-for-github)
- [Integração do Resend no Marketplace da Vercel](https://vercel.com/marketplace/resend)
- [Envio de e-mails no Resend](https://resend.com/docs/api-reference/emails/send-email)

## Medição de conversões

Os formulários usam os IDs `form_contato` e `form_whatsapp`. O evento `generate_lead` na camada de dados indica o formulário e a origem da consulta, inclusive quando o modal abre pela seção de financiamento.

O Pixel registra `PageView` uma vez por carregamento autorizado. A camada de dados do GTM registra `page_view`, `form_start`, `form_submit` após validação e `generate_lead` após confirmação do servidor. Use `generate_lead` para a conversão. Se a propriedade GA4 tiver coleta automática de visualizações ou interações com formulários, configure uma única origem por evento para evitar duplicidade.

Os identificadores **GTM `GTM-T83GNS9`** e **Pixel `1292606731496968`** já estão no `dist/tracking.js`, executados após consentimento de medição. A construção de produção também aceita, opcionalmente, `GTM_CONTAINER_ID` e `META_PIXEL_ID` na Vercel; sem essas variáveis, usa os dois IDs definidos no projeto.

Para a **API de Conversões da Meta**, configure `META_CAPI_ACCESS_TOKEN` como **variável sensível de produção na hospedagem do domínio público**, jamais no GitHub. Após envio de e-mail aceito e com permissão de medição, a API registra `Lead` para o mesmo Pixel. Usa o mesmo `event_id` do navegador para deduplicação e `event_source_url` com a URL completa. Faz correspondência avançada via SHA-256 de e-mail, telefone, primeiro e último nome e identificador externo estável, além de encaminhar user agent, IP válido e os cookies `_fbp`/`_fbc` quando disponíveis. Não envia nome, telefone ou e-mail em texto aberto na chamada à Meta.

**Atenção:** o projeto da Vercel vinculado ao domínio precisa estar acessível para cadastrar as variáveis e executar um novo deploy. Credenciais antigas de produção não são recuperáveis pelo código nem pelo GitHub. Em `Events Manager` da Meta, confira também a qualidade dos eventos e as opções de correspondência automática do Pixel; a integração do servidor é independente desse controle.
