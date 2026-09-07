/* =====================================================================
   A VIRADA – 30 DIAS  |  Código compartilhado entre as páginas
   Consentimento, Meta Pixel (condicional), eventos, SEO dinâmico,
   utilidades. Carregar DEPOIS de config.js.
   ===================================================================== */
(function () {
  "use strict";
  var CFG = window.AV_CONFIG || {};
  var CONSENT_KEY = "av_consent";       // "measure" | "essential"
  var queue = [];
  var pixelLoaded = false;

  /* ---------- utilidades ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function siteUrl() {
    if (CFG.SITE_URL) return CFG.SITE_URL.replace(/\/$/, "");
    return location.origin + location.pathname.replace(/\/[^\/]*$/, "");
  }
  function absolute(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return siteUrl() + "/" + path.replace(/^\//, "");
  }

  /* ---------- consentimento ---------- */
  function consent() { return read(CONSENT_KEY); }
  function setConsent(value) {
    store(CONSENT_KEY, value);
    hideBanner();
    if (value === "measure") loadPixel();
  }
  function hideBanner() { var b = $("#consent-banner"); if (b) { b.classList.remove("show"); b.setAttribute("aria-hidden", "true"); } }
  function showBanner() {
    var b = $("#consent-banner"); if (!b) return;
    b.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () { b.classList.add("show"); });
  }

  /* ---------- Meta Pixel (só após consentimento e só com ID) ---------- */
  function loadPixel() {
    if (pixelLoaded || !CFG.META_PIXEL_ID) return;
    pixelLoaded = true;
    /* snippet oficial do Meta, sem alterações relevantes */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq("init", String(CFG.META_PIXEL_ID));
    window.fbq("track", "PageView");
    // eventos disparados antes do consentimento/carregamento
    queue.splice(0).forEach(function (ev) { send(ev.name, ev.params); });
  }
  var STANDARD = { PageView: 1, ViewContent: 1, Lead: 1 };
  function send(name, params) {
    if (!window.fbq) return;
    if (STANDARD[name]) window.fbq("track", name, params || {});
    else window.fbq("trackCustom", name, params || {});
  }
  /* API pública de eventos: PageView, ViewContent, Lead, DownloadEbook,
     PixSectionViewed, PixCopyClicked, ShareClicked */
  function track(name, params) {
    if (consent() !== "measure" || !CFG.META_PIXEL_ID) {
      // guarda só se ainda não houve decisão (pode ser aceito depois)
      if (consent() == null) queue.push({ name: name, params: params });
      return;
    }
    if (!pixelLoaded) { queue.push({ name: name, params: params }); loadPixel(); return; }
    send(name, params);
  }

  /* ---------- SEO / Open Graph a partir da configuração ---------- */
  function applyMeta() {
    var og = $('meta[property="og:image"]');
    if (og) og.setAttribute("content", absolute(CFG.OG_IMAGE_URL || "assets/img/og-image.png"));
    var tw = $('meta[name="twitter:image"]');
    if (tw) tw.setAttribute("content", absolute(CFG.OG_IMAGE_URL || "assets/img/og-image.png"));
    var ogUrl = $('meta[property="og:url"]');
    var pageFile = location.pathname.split("/").pop() || "index.html";
    if (ogUrl) ogUrl.setAttribute("content", siteUrl() + "/" + (pageFile === "index.html" ? "" : pageFile));
    var canon = $('link[rel="canonical"]');
    if (canon) canon.setAttribute("href", siteUrl() + "/" + (pageFile === "index.html" ? "" : pageFile));
    $$("[data-contact-email]").forEach(function (el) {
      var mail = CFG.CONTACT_EMAIL && CFG.CONTACT_EMAIL !== "COLOCAR_EMAIL_AQUI" ? CFG.CONTACT_EMAIL : "";
      if (mail) { el.textContent = mail; if (el.tagName === "A") el.href = "mailto:" + mail; }
      else { el.textContent = "(e-mail de contato ainda não configurado)"; if (el.tagName === "A") el.removeAttribute("href"); }
    });
    $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  /* ---------- compartilhamento ---------- */
  function shareLinks() {
    var url = siteUrl() + "/";
    var msg = CFG.SHARE_MESSAGE || "";
    return {
      url: url,
      whatsapp: "https://wa.me/?text=" + encodeURIComponent(msg + " " + url),
      facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url) + "&quote=" + encodeURIComponent(msg)
    };
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); resolve(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  /* ---------- inicialização ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    applyMeta();
    var acc = $("#consent-accept"), ess = $("#consent-essential");
    if (acc) acc.addEventListener("click", function () { setConsent("measure"); });
    if (ess) ess.addEventListener("click", function () { setConsent("essential"); });

    var c = consent();
    if (c === "measure") loadPixel();
    else if (c == null) showBanner();
    // PageView é disparado dentro de loadPixel(), uma única vez por carregamento.
    pageview();
  });

  /* ---------- registro de visita (anônimo) ----------
     Uma linha por abertura de página na aba "Visitas" da planilha: página, origem
     (referrer/UTM), dispositivo e se é a primeira visita neste navegador.
     Sem cookies e sem identificador de pessoa. Não roda em localhost/arquivo local
     (passe force=true para testar). */
  function pageview(force) {
    var host = location.hostname;
    if (!force && (location.protocol === "file:" || host === "localhost" || host === "127.0.0.1")) return Promise.resolve({ skipped: true });
    var q = {};
    try {
      location.search.replace(/^\?/, "").split("&").forEach(function (kv) {
        if (!kv) return; var p = kv.split("=");
        q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " "));
      });
    } catch (e) {}
    var ref = document.referrer || "", refHost = "";
    try { refHost = ref ? new URL(ref).hostname.replace(/^www\./, "") : ""; } catch (e) {}
    if (refHost === host) { ref = ""; refHost = ""; } // navegação interna não conta como origem
    var first = read("av_seen") !== "1"; store("av_seen", "1");
    return postWebhook({
      event: "pageview",
      page: location.href.split("#")[0],
      path: location.pathname,
      title: document.title,
      referrer: ref, referrer_host: refHost,
      utm_source: q.utm_source || "", utm_medium: q.utm_medium || "", utm_campaign: q.utm_campaign || "",
      first_visit: first,
      device: window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? "celular" : "computador",
      lang: navigator.language || "",
      ts: new Date().toISOString()
    }).catch(function () {});
  }

  /* ---------- webhook (cadastros, downloads e visitas) ----------
     Envia um JSON para CFG.LEAD_WEBHOOK_URL. Todo evento leva o campo "event"
     ("lead", "download" ou "pageview"). Google Apps Script não responde ao preflight CORS,
     então para ele o envio vai como text/plain em modo no-cors (resposta opaca,
     tratada como sucesso). Outros destinos (Make, n8n, Zapier) recebem JSON normal. */
  function isAppsScript(url) { return /script\.google(usercontent)?\.com/i.test(url); }
  function postWebhook(payload, opts) {
    opts = opts || {};
    var url = CFG.LEAD_WEBHOOK_URL || "";
    if (!url) return Promise.resolve({ skipped: true });
    var body = JSON.stringify(payload);
    // fetch com keepalive sobrevive à troca de página; sendBeacon fica só como reserva
    // quando fetch não existe (navegadores muito antigos)
    if (typeof fetch !== "function") {
      if (opts.beacon && navigator.sendBeacon) {
        try {
          if (navigator.sendBeacon(url, new Blob([body], { type: "text/plain;charset=utf-8" }))) return Promise.resolve({ ok: true, beacon: true });
        } catch (e) {}
      }
      return Promise.reject(new Error("fetch indisponível"));
    }
    var simple = isAppsScript(url);
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opts.timeout || 8000) : null;
    return fetch(url, {
      method: "POST",
      mode: simple ? "no-cors" : "cors",
      headers: { "Content-Type": simple ? "text/plain;charset=utf-8" : "application/json" },
      body: body,
      keepalive: true,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (r.type === "opaque") return { ok: true, opaque: true };
      if (!r.ok) throw new Error("HTTP " + r.status);
      return { ok: true };
    });
  }

  window.AV = {
    cfg: CFG, $: $, $$: $$, track: track, consent: consent,
    siteUrl: siteUrl, absolute: absolute, shareLinks: shareLinks, copyText: copyText,
    store: store, read: read, postWebhook: postWebhook, pageview: pageview
  };
})();
