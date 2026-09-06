/* =====================================================================
   PIX – montagem e validação de BR Code (padrão EMV/BCB).
   Nada aqui inventa chave: sem configuração válida, retorna null.
   ===================================================================== */
(function (root) {
  "use strict";

  /* CRC16-CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF) — exigido pelo BCB */
  function crc16(str) {
    var crc = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function tlv(id, value) {
    var len = String(value.length).padStart(2, "0");
    return id + len + value;
  }

  /* Remove acentos e caracteres fora do conjunto aceito pelo padrão */
  function sanitize(text, max) {
    return String(text || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 .\-]/g, "")
      .replace(/\s+/g, " ").trim().substring(0, max);
  }

  /* Monta um BR Code estático a partir de chave/nome/cidade e valor opcional */
  function build(opts) {
    var key = String(opts.key || "").trim();
    var name = sanitize(opts.name, 25);
    var city = sanitize(opts.city, 15);
    if (!key || !name || !city) return null;
    if (key.length > 77) return null;

    var mai = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", key);
    if (opts.description) mai += tlv("02", sanitize(opts.description, 40));
    if (mai.length > 99) return null; // limite do campo 26

    var payload = tlv("00", "01") + tlv("26", mai) + tlv("52", "0000") + tlv("53", "986");
    if (opts.amount != null && opts.amount !== "") {
      var amount = Number(opts.amount);
      if (!isFinite(amount) || amount <= 0 || amount > 9999999999) return null;
      payload += tlv("54", amount.toFixed(2));
    }
    payload += tlv("58", "BR") + tlv("59", name) + tlv("60", city);
    payload += tlv("62", tlv("05", "***"));
    payload += "6304";
    return payload + crc16(payload);
  }

  /* Valida um "copia e cola" colado manualmente (estrutura + CRC) */
  function validate(payload) {
    var p = String(payload || "").trim();
    if (p.length < 30) return { ok: false, reason: "muito curto" };
    if (p.indexOf("000201") !== 0) return { ok: false, reason: "não começa com 000201" };
    if (p.toUpperCase().indexOf("BR.GOV.BCB.PIX") === -1) return { ok: false, reason: "sem identificador BR.GOV.BCB.PIX" };
    var idx = p.lastIndexOf("6304");
    if (idx === -1 || idx !== p.length - 8) return { ok: false, reason: "campo CRC (6304) ausente ou mal posicionado" };
    var expected = crc16(p.substring(0, idx + 4));
    var given = p.substring(idx + 4).toUpperCase();
    if (expected !== given) return { ok: false, reason: "CRC inválido (esperado " + expected + ", recebido " + given + ")" };
    return { ok: true, payload: p };
  }

  root.AVPIX = { crc16: crc16, build: build, validate: validate, sanitize: sanitize };
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) module.exports = globalThis.AVPIX;
