/**
 * A VIRADA – 30 DIAS · Webhook de cadastros e downloads (Google Apps Script)
 * ---------------------------------------------------------------------------
 * Este script recebe os eventos enviados pelo site e grava cada um como uma
 * linha na planilha: aba "Cadastros" (event = "lead") e aba "Downloads"
 * (event = "download"). A aba "Resumo" mostra os totais.
 *
 * COMO INSTALAR: veja PASSO-A-PASSO.md nesta mesma pasta.
 * Nada aqui precisa ser editado.
 */

var TZ = "America/Sao_Paulo";

var SHEETS = {
  lead: {
    name: "Cadastros",
    headers: ["Data/Hora", "Nome", "E-mail", "WhatsApp", "Aceita WhatsApp", "Consentimento",
              "Texto do consentimento", "Origem", "Página", "Aceitou medição", "Enviado pelo site em (UTC)"]
  },
  download: {
    name: "Downloads",
    headers: ["Data/Hora", "Nome", "E-mail", "Arquivo", "Origem", "Página", "Enviado pelo site em (UTC)"]
  }
};

/** Abrir a URL /exec no navegador mostra este JSON: serve para conferir que a implantação está ativa. */
function doGet() {
  return json_({ ok: true, service: "a-virada-webhook", hint: "Este endereço recebe POST em JSON enviados pelo site." });
}

/** Recebe o POST do site e grava uma linha. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var data = parse_(e);
    var ev = String(data.event || "lead").toLowerCase();
    if (!SHEETS[ev]) return json_({ ok: false, error: "evento desconhecido: " + ev });

    var now = new Date();
    var row;
    if (ev === "lead") {
      row = [
        now,
        s_(data.name, 80),
        s_(data.email, 120).toLowerCase(),
        s_(data.phone, 20),
        data.whatsapp_optin ? "Sim" : "Não",
        data.consent ? "Sim" : "Não",
        s_(data.consent_text, 300),
        s_(data.source, 60),
        s_(data.page, 300),
        data.measurement_consent ? "Sim" : "Não",
        s_(data.ts, 40)
      ];
    } else {
      row = [
        now,
        s_(data.name, 80),
        s_(data.email, 120).toLowerCase(),
        s_(data.file, 80),
        s_(data.source, 60),
        s_(data.page, 300),
        s_(data.ts, 40)
      ];
    }
    sheet_(ev).appendRow(row);
    return json_({ ok: true, event: ev });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/**
 * Cria as abas "Cadastros", "Downloads" e "Resumo" com cabeçalhos e fórmulas.
 * Rode UMA vez pelo editor (selecione "setup" e clique em Executar).
 * Se não rodar, as abas de dados são criadas sozinhas no primeiro evento; só o Resumo fica de fora.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);
  Object.keys(SHEETS).forEach(function (k) { sheet_(k); });
  resumo_();
}

/* ---------------------------------------------------------------- internos */

function sheet_(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var def = SHEETS[key];
  var sh = ss.getSheetByName(def.name);
  if (!sh) {
    sh = ss.insertSheet(def.name);
    sh.appendRow(def.headers);
    sh.getRange(1, 1, 1, def.headers.length).setFontWeight("bold").setBackground("#F7F2E7");
    sh.setFrozenRows(1);
    sh.getRange("A:A").setNumberFormat("dd/mm/yyyy hh:mm:ss");
    sh.setColumnWidth(1, 150);
  }
  return sh;
}

function resumo_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Resumo") || ss.insertSheet("Resumo", 0);
  sh.clear();
  var labels = [
    ["A VIRADA – 30 DIAS · Resumo"],
    ["Cadastros (total)"],
    ["Cadastros com WhatsApp"],
    ["Downloads (cliques)"],
    ["Downloads (pessoas distintas)"],
    ["Cadastros hoje"],
    ["Downloads hoje"],
    ["Cadastros nos últimos 7 dias"],
    ["Downloads nos últimos 7 dias"],
    ["Downloads por cadastro"]
  ];
  sh.getRange(1, 1, labels.length, 1).setValues(labels);
  // Fórmulas em sintaxe en-US (o Apps Script converte para o idioma da planilha)
  var formulas = [
    [""],
    ["=MAX(0,COUNTA(Cadastros!C:C)-1)"],
    ["=COUNTIF(Cadastros!E:E,\"Sim\")"],
    ["=MAX(0,COUNTA(Downloads!A:A)-1)"],
    ["=IFERROR(ROWS(UNIQUE(FILTER(Downloads!C2:C,Downloads!C2:C<>\"\"))),0)"],
    ["=COUNTIF(Cadastros!A:A,\">=\"&TODAY())"],
    ["=COUNTIF(Downloads!A:A,\">=\"&TODAY())"],
    ["=COUNTIF(Cadastros!A:A,\">=\"&(TODAY()-6))"],
    ["=COUNTIF(Downloads!A:A,\">=\"&(TODAY()-6))"],
    ["=IF(B2=0,0,B4/B2)"]
  ];
  sh.getRange(1, 2, formulas.length, 1).setFormulas(formulas);
  sh.getRange("A1").setFontWeight("bold").setFontSize(13);
  sh.getRange("A2:A10").setFontWeight("bold");
  sh.getRange("B10").setNumberFormat("0%");
  sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 120);
  ss.setActiveSheet(sh); ss.moveActiveSheet(1);
}

function parse_(e) {
  var raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
  if (raw) { try { return JSON.parse(raw); } catch (err) {} }
  return (e && e.parameter) || {};
}

/** Texto seguro para a célula: limita tamanho, tira quebras de linha e impede que vire fórmula. */
function s_(v, max) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[\r\n\t]+/g, " ").replace(/^[=+\-@]+/, "").slice(0, max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
