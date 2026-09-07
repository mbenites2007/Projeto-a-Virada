# Publicação do site A Virada – 30 Dias

O site publicado é a pasta `site/`. Ela é estática (HTML + CSS + JS) e não precisa de build.

## Como está montado

- `site/` — conteúdo publicado (index, obrigado, privacidade, assets).
- `.github/workflows/deploy.yml` — publica `site/` no GitHub Pages a cada push na branch `main`.
- `Capa.png`, `Logo.png`, `*.zip`, `preview-*.html` — arquivos de origem, fora do site e fora do git.

## Testar localmente

```bash
python -m http.server 8080 --directory site
```
Abrir http://localhost:8080

## Publicar no GitHub Pages (primeira vez)

1. Autenticar o GitHub CLI: `gh auth login` (navegador, conta mbenites2007).
2. Criar o repositório e enviar: `(já publicado pelo GitHub Desktop como Projeto-a-Virada)`
3. No repositório: Settings → Pages → Source = **GitHub Actions**.
4. Aguardar o workflow "Publicar site no GitHub Pages" terminar. Endereço:
   `https://mbenites2007.github.io/Projeto-a-Virada/`
5. Colar esse endereço em `SITE_URL` no `site/assets/js/config.js`, commitar e enviar.

## Pendências de conteúdo (site/assets/js/config.js)

| Campo               | Situação            | Efeito enquanto vazio                                   |
|---------------------|---------------------|---------------------------------------------------------|
| `SITE_URL`          | configurado         | https://mbenites2007.github.io/Projeto-a-Virada           |
| PDF do ebook        | publicado (40 pág., 8 MB) | botão de download entrega o arquivo                  |
| `CONTACT_EMAIL`     | configurado         | aparece na política de privacidade e no rodapé            |
| `PIX_PAYLOAD`       | configurado (chave aleatória, sem valor) | QR Pix + copia e cola; sugestões 9,90/19,90/29,90 |
| `PAYMENT_LINKS`     | 1 link Mercado Pago (R$ 9,90) | aparece como alternativa "cartão ou boleto" abaixo do Pix |
| `LEAD_WEBHOOK_URL`  | configurado (Apps Script) | cadastros e downloads gravados na planilha "A Virada – Cadastros" |
| `META_PIXEL_ID`     | vazio               | nenhum rastreamento carregado                            |

O PDF vai em `site/assets/ebook/a-virada-30-dias.pdf` (nome exato, minúsculas), de preferência abaixo de 5 MB.

## Planilha de cadastros e downloads

O site envia cada cadastro (`event: "lead"`) e cada clique em "Baixar" (`event: "download"`) para a URL em
`LEAD_WEBHOOK_URL`. O destino recomendado é uma planilha Google Sheets com o script em
`integracao/google-apps-script/Code.gs`; o passo a passo está em `integracao/google-apps-script/PASSO-A-PASSO.md`.
Depois de implantar, cole a URL `/exec` em `LEAD_WEBHOOK_URL` e publique.
