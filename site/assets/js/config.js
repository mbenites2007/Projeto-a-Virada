/* =====================================================================
   A VIRADA - 30 DIAS
   ARQUIVO ÚNICO DE CONFIGURAÇÃO
   ---------------------------------------------------------------------
   Este é o ÚNICO arquivo que você precisa editar para colocar o site no ar.
   Nada aqui deve conter senha, token privado ou chave de API secreta.
   Tudo neste arquivo é público (roda no navegador do visitante).
   ===================================================================== */

window.AV_CONFIG = {

  /* -------------------------------------------------------------------
     1) ENDEREÇO DO SITE
     Usado nos links de compartilhamento, canonical e Open Graph.
     Sem barra no final. Ex.: "https://avirada30dias.com.br"
     ------------------------------------------------------------------- */
  SITE_URL: "https://mbenites2007.github.io/Projeto-a-Virada",

  /* -------------------------------------------------------------------
     2) ARQUIVO DO EBOOK (PDF)
     Coloque o PDF em: /assets/ebook/a-virada-30-dias.pdf
     e mantenha o caminho abaixo. Se hospedar em outro lugar
     (Google Drive, S3, Dropbox), cole aqui o link DIRETO de download.
     ------------------------------------------------------------------- */
  EBOOK_DOWNLOAD_URL: "assets/ebook/a-virada-30-dias.pdf",
  EBOOK_FILE_NAME: "A-Virada-30-Dias.pdf",

  /* -------------------------------------------------------------------
     3) META PIXEL
     Cole SOMENTE o ID numérico do pixel. Ex.: "123456789012345"
     Deixe "" para não carregar rastreamento nenhum.
     O pixel só é carregado DEPOIS do consentimento de medição.
     ------------------------------------------------------------------- */
  META_PIXEL_ID: "",

  /* -------------------------------------------------------------------
     4) PIX  ->  LEIA O AVISO ABAIXO
     ###################################################################
     #  CONFIGURAR PIX ANTES DE PUBLICAR                               #
     #  Enquanto PIX_PAYLOAD e PIX_KEY estiverem vazios, a seção de    #
     #  contribuição aparece em modo "indisponível" e NENHUM QR Code   #
     #  é exibido. Não existe chave de exemplo neste projeto e nada é  #
     #  inventado em tempo de execução.                                #
     ###################################################################

     Você tem duas opções:

     OPÇÃO A (recomendada, mais simples e mais segura)
       Gere o "Pix Copia e Cola" ESTÁTICO no aplicativo do seu banco
       (Pix > Receber > QR Code sem valor definido) e cole a string
       inteira em PIX_PAYLOAD. O site desenha o QR Code localmente a
       partir dessa string, sem enviar nada para servidor nenhum.
       Nesse caso os valores sugeridos (9,90 / 19,90 / 29,90) viram
       apenas sugestões visuais: quem paga digita o valor no banco.

     OPÇÃO B (QR com valor já preenchido)
       Preencha PIX_KEY, PIX_RECEIVER_NAME e PIX_CITY e ligue
       PIX_DYNAMIC_AMOUNT: true. O site monta o BR Code (padrão
       EMV/BCB) para cada valor escolhido. Confira SEMPRE fazendo um
       teste real de R$ 0,01 antes de divulgar.
     ------------------------------------------------------------------- */
  PIX_KEY: "",              // CPF/CNPJ (só números), e-mail, telefone (+55...) ou chave aleatória
  PIX_RECEIVER_NAME: "",    // Nome do recebedor, máx. 25 caracteres, sem acento
  PIX_CITY: "",             // Cidade do recebedor, máx. 15 caracteres, sem acento
  PIX_PAYLOAD: "",          // Cole aqui o "copia e cola" estático (Opção A)
  PIX_DYNAMIC_AMOUNT: false,// true só se você preencheu KEY + NAME + CITY (Opção B)
  PIX_SUGGESTED_AMOUNTS: [9.90, 19.90, 29.90],

  /* -------------------------------------------------------------------
     5) CAPTURA DE LEADS
     Cole a URL do webhook que vai RECEBER nome e e-mail.
     Funciona com: Make, Zapier, n8n, Pipedream, Formspree, Google Apps
     Script, ActiveCampaign, Mailchimp (via proxy), Brevo, etc.
     O envio é um POST JSON: { name, email, consent, source, ts }

     IMPORTANTE: NUNCA coloque aqui uma URL que exija chave secreta no
     frontend. Use um endpoint público de recebimento (webhook) ou uma
     função serverless sua que guarde a chave do lado do servidor.

     Se ficar vazio, o formulário continua funcionando: valida os dados,
     guarda o lead localmente no navegador (fallback de emergência) e
     libera a página de obrigado normalmente.
     ------------------------------------------------------------------- */
  LEAD_WEBHOOK_URL: "",

  /* -------------------------------------------------------------------
     5b) CAMPO DE TELEFONE / WHATSAPP
     "optional"  -> aparece, mas a pessoa pode deixar em branco (padrão)
     "required"  -> obrigatório (reduz cadastros; use só se o WhatsApp for
                    o seu canal principal de entrega)
     "hidden"    -> não aparece
     O número é validado como celular brasileiro (DDD + 9 dígitos) e
     enviado ao webhook já normalizado: phone = "+5527999999999".
     ------------------------------------------------------------------- */
  PHONE_FIELD: "optional",

  /* -------------------------------------------------------------------
     6) CONTATO / LGPD
     E-mail que aparece na Política de Privacidade para pedidos de
     exclusão de dados e dúvidas.
     ------------------------------------------------------------------- */
  CONTACT_EMAIL: "mbenites2007@gmail.com",

  /* -------------------------------------------------------------------
     7) IMAGEM DE COMPARTILHAMENTO (Open Graph)
     1200x630px. Já existe uma pronta em /assets/img/og-image.png.
     Se preferir outra, troque o arquivo ou cole a URL completa aqui.
     ------------------------------------------------------------------- */
  OG_IMAGE_URL: "assets/img/og-image.png",

  /* -------------------------------------------------------------------
     8) MENSAGEM SUGERIDA DE COMPARTILHAMENTO
     ------------------------------------------------------------------- */
  SHARE_MESSAGE: "Encontrei um guia gratuito chamado A Virada – 30 Dias. São pequenas ações para trabalhar mente, hábitos, dinheiro e ação. Talvez faça sentido para você."
};
