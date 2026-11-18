# JS Digital — landing page (ekoversobr/ekodigital)

Endereço: https://ekoversobr.github.io/ekodigital/

## Arquivos
- `index.html` — página principal
- `obrigado/` — página após o formulário (noindex, dispara `pagina_obrigado`)
- `privacidade/` — política de privacidade (LGPD)
- `404.html`, `sitemap.xml`, `robots.txt`, `.nojekyll`
- `assets/style.css`, `assets/site.js` — visual e rastreio
- `_fonte/apps-script-planilha.gs` — recebe os leads na planilha e monta a exportação de conversões offline

## Publicar
1. GitHub, conta ekoversobr > New repository > nome `ekodigital` > Public.
2. Subir todos os arquivos desta pasta (mantendo as pastas).
3. Settings > Pages > Branch `main` / root > Save.

## Preencher antes de publicar (3 trocas)
1. `GTM-XXXXXXX` → ID do contêiner GTM (aparece 2x em cada página: `index.html`, `obrigado/index.html`, `privacidade/index.html`, `404.html`).
2. `ENDPOINT_PLANILHA` em `assets/site.js` → URL /exec do Apps Script.
3. No GTM: GA4 ID, ID de conversão e rótulos do Google Ads.

## Planilha
Seguir o passo a passo no topo de `_fonte/apps-script-planilha.gs`.
Funil: Status + data de cada etapa (reunião agendada → proposta enviada → contrato fechado).
Menu "JS Digital > Gerar exportação" monta a aba "Conversões offline" para importar no Google Ads (Metas > Conversões > Uploads).

## GTM — o que configurar
Base: contêiner modelo `gtm-ga4-template.json` do eko-digital-template (Tag do Google, Vinculador, Conversão Contato).

Consentimento: o site já envia o Consent Mode v2 (padrão negado, atualizado pelo banner). Nas tags, deixar "Verificação de consentimento integrada".

Variáveis da camada de dados a criar:
`percent`, `section`, `cta_section`, `cta_label`, `whatsapp_location`, `ja_investe`, `user_data.phone_number`

Acionadores (Evento personalizado):
| Evento | Para quê |
|---|---|
| `scroll_depth` | GA4 evento `scroll_depth` (percent) |
| `section_view` | GA4 evento `section_view` (section) |
| `cta_click` | GA4 evento `cta_click` (cta_section, cta_label) |
| `whatsapp_click` | GA4 `whatsapp_click` (whatsapp_location, cta_section) + Ads conversão "Contato" |
| `form_start` | GA4 `form_start` |
| `form_submit` | GA4 `generate_lead` + Ads conversão "Lead formulário" com conversões otimizadas |
| `pagina_obrigado` | opcional: conferência do envio |

Conversões otimizadas: na tag de conversão do formulário, "Incluir dados fornecidos pelo usuário" > Nova variável > Código > telefone = `{{DLV - user_data.phone_number}}`. Ativar também em Google Ads > Conversões > Configurações.

Google Ads, conversões a criar:
- Contato WhatsApp (site, GTM)
- Lead formulário (site, GTM, conversões otimizadas)
- JS Digital - Reuniao agendada / Proposta enviada / Contrato fechado (Importar > cliques) — nomes idênticos aos do script.

## Divulgação
Bitly só para Instagram/WhatsApp/cartão, com UTMs no destino. No Google Ads, URL final = endereço do GitHub.
