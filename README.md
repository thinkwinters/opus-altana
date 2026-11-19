# Opus Altana

Landing page em HTML, CSS e JavaScript com imagens oficiais e implantação interativa. As condições comerciais usam a tabela de novembro de 2026, quadra 1, lote 10.

## GitHub e Vercel

Versione os arquivos do ZIP na raiz do repositório e importe o repositório na Vercel. A raiz do projeto fica no mesmo nível de `vercel.json`. O site usa `dist` e dispensa etapa de compilação.

- `dist/index.html` contém os conteúdos e o número do atendimento pelo WhatsApp no atributo `data-sales-whatsapp`.
- `dist/politica-de-privacidade.html` contém a política acessível pelo rodapé e pelos formulários.
- `dist/site.js` controla o menu, as galerias, a implantação e as imagens ampliáveis.
- `dist/contact.js` controla os formulários, o seletor de país e o modal.
- `dist/tracking.js` carrega o Google Tag Manager e o Pixel da Meta conforme a preferência de medição.
- `api/leads.mjs` valida nome, e-mail, telefone e consentimento e encaminha as consultas aos endereços de atendimento.

## Envio de consultas

Configure `RESEND_API_KEY`, `LEADS_FROM_EMAIL` e `LEADS_TO_EMAILS` nas variáveis de ambiente da Vercel. O remetente deve usar um domínio verificado no Resend. Separe os destinatários por vírgula. Os nomes das variáveis constam em `.env.example`.

Com o envio automático ativo, a consulta chega à equipe por e-mail e a página encaminha o visitante ao WhatsApp comercial. A página oferece uma forma de continuar o atendimento quando o envio automático falha.

- [Importação de repositórios do GitHub na Vercel](https://vercel.com/docs/git/vercel-for-github)
- [Envio de e-mails no Resend](https://resend.com/docs/api-reference/emails/send-email)

## Medição de conversões

Os formulários usam os IDs `form_contato` e `form_whatsapp`. O evento `generate_lead` na camada de dados indica o formulário e a origem da consulta, inclusive quando o modal abre pela seção de financiamento.

Configure `META_CAPI_ACCESS_TOKEN` como variável sensível de produção na Vercel. Com a medição autorizada, a API registra o evento `Lead` após a confirmação do envio por e-mail e associa o mesmo ID ao evento do Pixel. O e-mail e o telefone são normalizados e convertidos em SHA-256 no servidor.
