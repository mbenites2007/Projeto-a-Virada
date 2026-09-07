/* =====================================================================
   Captura de leads (index.html)
   Validação, anti-spam, envio ao webhook configurado, evento "Lead",
   redirecionamento para obrigado.html.
   ===================================================================== */
(function () {
  "use strict";
  var AV = window.AV, CFG = AV.cfg, $ = AV.$;
  var form = $("#lead-form");
  if (!form) return;

  var nameEl = $("#nome"), emailEl = $("#email"), consentEl = $("#consentimento");
  var hpEl = $("#website"), tsEl = $("#form-ts"), status = $("#form-status"), btn = $("#submit-btn");
  var loadedAt = Date.now();
  tsEl.value = String(loadedAt);

  /* ViewContent: quando a seção de cadastro entra na tela (uma vez) */
  var section = $("#cadastro"), viewed = false;
  function viewContent() { if (viewed) return; viewed = true; AV.track("ViewContent", { content_name: "A Virada – 30 Dias", content_category: "ebook" }); }
  if ("IntersectionObserver" in window && section) {
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { viewContent(); obs.disconnect(); } });
    }, { threshold: 0.35 }).observe(section);
  }
  AV.$$("[data-cta]").forEach(function (a) { a.addEventListener("click", viewContent); });

  /* ---------- validação ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  function clean(v) { return String(v || "").replace(/[<>"'`]/g, "").replace(/\s+/g, " ").trim(); }
  function setError(el, on) {
    var field = el.closest(".field");
    field.classList.toggle("has-error", on);
    el.setAttribute("aria-invalid", on ? "true" : "false");
  }
  /* ---------- telefone / WhatsApp ---------- */
  var phoneMode = (CFG.PHONE_FIELD || "optional").toLowerCase();   // optional | required | hidden
  var phoneEl = $("#telefone"), phoneField = $("#field-phone"), phoneOpt = $("#phone-opt");
  if (phoneMode === "hidden") { phoneField.hidden = true; }
  else if (phoneMode === "required") { phoneOpt.textContent = ""; phoneEl.required = true; }

  /* aceita "(27) 99999-9999", "27999999999", "+55 27 99999-9999"; devolve E.164 ou null */
  function normalizePhone(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.indexOf("55") === 0 && d.length >= 12) d = d.slice(2);
    if (d.length === 10 && /^[1-9][1-9][2-9]/.test(d)) return "+55" + d;          // fixo com DDD (aceito)
    if (d.length === 11 && /^[1-9][1-9]9/.test(d)) return "+55" + d;               // celular com DDD
    return null;
  }
  function formatPhone(v) {
    var d = String(v || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }
  if (phoneEl) phoneEl.addEventListener("input", function () {
    var pos = phoneEl.selectionStart, before = phoneEl.value.length;
    phoneEl.value = formatPhone(phoneEl.value);
    if (pos === before) phoneEl.setSelectionRange(phoneEl.value.length, phoneEl.value.length);
  });

  function validate() {
    var ok = true;
    var name = clean(nameEl.value), email = clean(emailEl.value).toLowerCase();
    if (name.length < 2 || name.length > 80) { setError(nameEl, true); ok = false; } else setError(nameEl, false);
    if (!EMAIL_RE.test(email) || email.length > 120) { setError(emailEl, true); ok = false; } else setError(emailEl, false);
    var phone = null;
    if (phoneMode !== "hidden") {
      var raw = phoneEl.value.trim();
      if (raw) { phone = normalizePhone(raw); if (!phone) { setError(phoneEl, true); ok = false; } else setError(phoneEl, false); }
      else if (phoneMode === "required") { setError(phoneEl, true); ok = false; }
      else setError(phoneEl, false);
    }
    if (!consentEl.checked) { setError(consentEl, true); ok = false; } else setError(consentEl, false);
    return ok ? { name: name, email: email, phone: phone } : null;
  }
  [nameEl, emailEl, phoneEl].forEach(function (el) { if (el) el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") validate(); }); });
  consentEl.addEventListener("change", function () { setError(consentEl, !consentEl.checked && consentEl.getAttribute("aria-invalid") === "true"); });

  /* ---------- envio ---------- */
  function isSpam() {
    if (hpEl.value) return true;                       // honeypot preenchido
    if (Date.now() - loadedAt < 2500) return true;     // envio rápido demais para um humano
    return false;
  }

  function sendToWebhook(lead) { return AV.postWebhook(lead); }

  function keepLocally(lead) {
    /* Fallback de emergência: guarda no navegador do visitante para que
       nada se perca se o webhook falhar. Não substitui integração real. */
    try {
      var list = JSON.parse(localStorage.getItem("av_leads_pending") || "[]");
      list.push(lead); localStorage.setItem("av_leads_pending", JSON.stringify(list.slice(-20)));
    } catch (e) {}
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    status.className = "form-status"; status.textContent = "";
    var data = validate();
    if (!data) {
      var first = form.querySelector('[aria-invalid="true"]'); if (first) first.focus();
      status.className = "form-status error"; status.textContent = "Confira os campos destacados.";
      return;
    }
    if (isSpam()) { // não avisa o bot; humano que preencheu em 2s raramente existe
      status.className = "form-status error"; status.textContent = "Aguarde um instante e tente novamente.";
      return;
    }

    var lead = {
      event: "lead",
      name: data.name, email: data.email,
      phone: data.phone,                                   // "+5527999999999" ou null
      whatsapp_optin: !!data.phone,                        // só true quando a pessoa informou o número
      consent: true,
      consent_text: "Política de Privacidade + envio do ebook e conteúdos relacionados por e-mail e, se informado o número, por WhatsApp",
      source: "landing-a-virada-30-dias", page: location.href,
      ts: new Date().toISOString(), measurement_consent: AV.consent() === "measure"
    };

    btn.disabled = true; btn.textContent = "LIBERANDO...";
    AV.store("av_lead_ok", "1");
    AV.store("av_lead_name", data.name);
    AV.store("av_lead_email", data.email);   // usado na página de obrigado para associar o download ao cadastro

    function finish() {
      AV.track("Lead", { content_name: "A Virada – 30 Dias" });
      // pequeno atraso para o pixel enviar antes da navegação
      setTimeout(function () { location.href = "obrigado.html"; }, 250);
    }

    sendToWebhook(lead).then(function (res) {
      if (res.skipped) keepLocally(lead);
      finish();
    }).catch(function (err) {
      console.warn("[A Virada] Webhook falhou, lead guardado localmente:", err && err.message);
      keepLocally(lead);
      finish(); // o ebook é gratuito: nunca bloquear por falha de integração
    });
  });
})();
