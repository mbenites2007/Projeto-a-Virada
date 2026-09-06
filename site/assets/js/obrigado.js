/* =====================================================================
   Página de obrigado: entrega do ebook, contribuição via Pix (opcional),
   compartilhamento. Depende de config.js, app.js, qrcode.js, pix.js.
   ===================================================================== */
(function () {
  "use strict";
  var AV = window.AV, CFG = AV.cfg, $ = AV.$, $$ = AV.$$;

  /* ---------- 1) DOWNLOAD (nunca depende de contribuição) ---------- */
  var dl = $("#download-btn"), pending = $("#download-pending");
  var url = CFG.EBOOK_DOWNLOAD_URL || "";
  var configured = url && url !== "COLOCAR_URL_DO_PDF_AQUI";
  if (configured) {
    dl.href = url;
    if (/^https?:\/\//i.test(url) && new URL(url).origin !== location.origin) dl.removeAttribute("download");
    else dl.setAttribute("download", CFG.EBOOK_FILE_NAME || "A-Virada-30-Dias.pdf");
    // verifica se o arquivo existe (só para arquivos hospedados junto com o site)
    if (!/^https?:\/\//i.test(url) && location.protocol !== "file:") {
      fetch(url, { method: "HEAD" }).then(function (r) { if (!r.ok) showPending(); }).catch(function () {});
    }
  } else showPending();
  function showPending() { pending.hidden = false; dl.setAttribute("aria-describedby", "download-pending"); }
  dl.addEventListener("click", function () { AV.track("DownloadEbook", { content_name: "A Virada – 30 Dias" }); });

  /* ---------- 2) PIX ---------- */
  var area = $("#pix-area"), amounts = $$(".amount"), other = $("#amount-other"), otherInput = $("#valor-livre"), otherOk = $("#valor-livre-ok");
  var card = $("#pix-card"), qrBox = $("#pix-qr"), codeBox = $("#pix-code"), hint = $("#pix-hint"), copyBtn = $("#pix-copy"), copied = $("#pix-copied");
  var unavailable = $("#pix-unavailable");
  var currentPayload = "";

  var mode = "none";
  var staticCheck = CFG.PIX_PAYLOAD ? window.AVPIX.validate(CFG.PIX_PAYLOAD) : { ok: false };
  if (staticCheck.ok) mode = "static";
  else if (CFG.PIX_DYNAMIC_AMOUNT && CFG.PIX_KEY && CFG.PIX_RECEIVER_NAME && CFG.PIX_CITY) mode = "dynamic";
  if (CFG.PIX_PAYLOAD && !staticCheck.ok) console.warn("[A Virada] PIX_PAYLOAD inválido e ignorado: " + staticCheck.reason);

  if (mode === "none") {
    // CONFIGURAR PIX ANTES DE PUBLICAR
    unavailable.hidden = false;
    $(".amounts").hidden = true;
  }

  function formatBRL(n) { return "R$ " + Number(n).toFixed(2).replace(".", ","); }
  function parseAmount(v) {
    var s = String(v || "").replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
    var n = Number(s); return isFinite(n) && n > 0 && n < 100000 ? Math.round(n * 100) / 100 : null;
  }

  function render(payload, hintText) {
    currentPayload = payload;
    qrBox.innerHTML = window.AVQR.toSVG(payload, { ecc: "M", label: "QR Code Pix para contribuição" });
    codeBox.textContent = payload;
    hint.textContent = hintText;
    card.hidden = false; copied.textContent = "";
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function select(btn) {
    amounts.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    var val = btn.getAttribute("data-amount");
    if (val === "other") {
      other.classList.add("show"); otherInput.focus();
      if (mode === "static") render(staticCheck.payload, "Escaneie o QR ou copie o código e informe no seu banco o valor que quiser.");
      else card.hidden = true;
      return;
    }
    other.classList.remove("show");
    if (mode === "static") render(staticCheck.payload, "Escaneie o QR ou copie o código e informe " + formatBRL(val) + " no seu banco (o valor é livre).");
    else {
      var p = window.AVPIX.build({ key: CFG.PIX_KEY, name: CFG.PIX_RECEIVER_NAME, city: CFG.PIX_CITY, amount: Number(val), description: "A Virada 30 Dias" });
      if (p) render(p, "QR Code com " + formatBRL(val) + " já preenchido. Confira o nome do recebedor antes de confirmar.");
      else { console.warn("[A Virada] Não foi possível montar o BR Code. Revise PIX_KEY, PIX_RECEIVER_NAME e PIX_CITY."); unavailable.hidden = false; card.hidden = true; }
    }
  }
  amounts.forEach(function (b) { b.addEventListener("click", function () { select(b); }); });
  otherOk.addEventListener("click", function () {
    var n = parseAmount(otherInput.value);
    if (!n) { otherInput.focus(); otherInput.setAttribute("aria-invalid", "true"); return; }
    otherInput.setAttribute("aria-invalid", "false");
    if (mode === "static") render(staticCheck.payload, "Informe " + formatBRL(n) + " no seu banco ao pagar.");
    else {
      var p = window.AVPIX.build({ key: CFG.PIX_KEY, name: CFG.PIX_RECEIVER_NAME, city: CFG.PIX_CITY, amount: n, description: "A Virada 30 Dias" });
      if (p) render(p, "QR Code com " + formatBRL(n) + " já preenchido. Confira o nome do recebedor antes de confirmar.");
    }
  });
  otherInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); otherOk.click(); } });

  copyBtn.addEventListener("click", function () {
    if (!currentPayload) return;
    AV.copyText(currentPayload).then(function () {
      copied.textContent = "Código copiado. Cole na opção “Pix Copia e Cola” do seu banco.";
      AV.track("PixCopyClicked");
    }).catch(function () { copied.textContent = "Não foi possível copiar automaticamente. Selecione o código acima e copie."; });
  });

  /* evento: seção de contribuição visível (uma vez) */
  var contrib = $("#contribuicao");
  if ("IntersectionObserver" in window && contrib) {
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { AV.track("PixSectionViewed", { pix_mode: mode }); obs.disconnect(); } });
    }, { threshold: 0.4 }).observe(contrib);
  }

  /* ---------- 3) COMPARTILHAMENTO ---------- */
  var links = AV.shareLinks();
  $("#share-whatsapp").href = links.whatsapp;
  $("#share-facebook").href = links.facebook;
  $("#share-msg").textContent = "“" + (CFG.SHARE_MESSAGE || "") + "”";
  $$("[data-share]").forEach(function (el) {
    el.addEventListener("click", function () { AV.track("ShareClicked", { method: el.getAttribute("data-share") }); });
  });
  $("#share-copy").addEventListener("click", function () {
    var text = (CFG.SHARE_MESSAGE || "") + " " + links.url;
    var label = $("#share-copy-label");
    AV.copyText(text).then(function () { label.textContent = "Link copiado"; setTimeout(function () { label.textContent = "Copiar link"; }, 2500); })
      .catch(function () { label.textContent = "Copie: " + links.url; });
  });
})();
