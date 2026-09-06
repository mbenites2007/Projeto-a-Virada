/* =====================================================================
   QR Code – gerador local, sem dependência externa e sem rede.
   Modo byte (UTF-8), versões 1 a 40, níveis de correção L/M/Q/H.
   Baseado na especificação ISO/IEC 18004. Uso: AVQR.toSVG(texto, opts)
   ===================================================================== */
(function (root) {
  "use strict";

  var ECC = { L: 0, M: 1, Q: 2, H: 3 };

  // Codewords de correção por bloco, por nível e versão (índice 0 não usado)
  var ECC_PER_BLOCK = {
    0: [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    1: [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
    2: [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    3: [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]
  };
  var NUM_BLOCKS = {
    0: [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
    1: [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
    2: [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
    3: [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]
  };

  function rawDataModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }
  function dataCodewords(ver, ecl) {
    return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * NUM_BLOCKS[ecl][ver];
  }
  function alignPositions(ver) {
    if (ver === 1) return [];
    var numAlign = Math.floor(ver / 7) + 2;
    var step = (ver === 32) ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    var size = ver * 4 + 17, result = [6], pos = size - 7;
    while (result.length < numAlign) { result.splice(1, 0, pos); pos -= step; }
    return result;
  }

  /* ---------- Galois Field GF(256), polinômio 0x11D ---------- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11D;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function rsGenerator(degree) {
    var poly = [1];
    for (var i = 0; i < degree; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= gmul(poly[j], 1);
        next[j + 1] ^= gmul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }
  function rsRemainder(data, degree) {
    var gen = rsGenerator(degree);
    var result = new Array(degree).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ result[0];
      result.shift(); result.push(0);
      for (var j = 0; j < degree; j++) result[j] ^= gmul(gen[j + 1], factor);
    }
    return result;
  }

  /* ---------- Codificação ---------- */
  function utf8Bytes(str) {
    var out = [], enc = encodeURIComponent(str);
    for (var i = 0; i < enc.length; i++) {
      if (enc[i] === "%") { out.push(parseInt(enc.substr(i + 1, 2), 16)); i += 2; }
      else out.push(enc.charCodeAt(i));
    }
    return out;
  }

  function encode(text, eclName) {
    var ecl = ECC[eclName || "M"];
    var bytes = utf8Bytes(text);
    var ver = 0, capacity = 0;
    for (var v = 1; v <= 40; v++) {
      var lenBits = (v <= 9) ? 8 : 16;
      capacity = dataCodewords(v, ecl) * 8;
      if (4 + lenBits + bytes.length * 8 <= capacity) { ver = v; break; }
    }
    if (ver === 0) throw new Error("Conteúdo grande demais para um QR Code.");

    var bits = [];
    function push(value, len) { for (var i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1); }
    push(4, 4);                                   // modo byte
    push(bytes.length, ver <= 9 ? 8 : 16);        // contador
    bytes.forEach(function (b) { push(b, 8); });

    var total = dataCodewords(ver, ecl) * 8;
    push(0, Math.min(4, total - bits.length));    // terminador
    while (bits.length % 8 !== 0) bits.push(0);
    var padBytes = [0xEC, 0x11], p = 0;
    var cw = [];
    for (var i = 0; i < bits.length; i += 8) {
      var b = 0; for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
      cw.push(b);
    }
    while (cw.length < dataCodewords(ver, ecl)) cw.push(padBytes[p++ % 2]);

    /* blocos + correção de erro, intercalados */
    var numBlocks = NUM_BLOCKS[ecl][ver], eccLen = ECC_PER_BLOCK[ecl][ver];
    var rawCw = Math.floor(rawDataModules(ver) / 8);
    var shortLen = Math.floor(rawCw / numBlocks) - eccLen;
    var numShort = numBlocks - rawCw % numBlocks;
    var blocksData = [], blocksEcc = [], off = 0;
    for (var bI = 0; bI < numBlocks; bI++) {
      var len = shortLen + (bI < numShort ? 0 : 1);
      var dat = cw.slice(off, off + len); off += len;
      blocksData.push(dat);
      blocksEcc.push(rsRemainder(dat, eccLen));
    }
    var final = [];
    for (var i2 = 0; i2 < shortLen + 1; i2++)
      for (var bJ = 0; bJ < numBlocks; bJ++)
        if (i2 < blocksData[bJ].length) final.push(blocksData[bJ][i2]);
    for (var i3 = 0; i3 < eccLen; i3++)
      for (var bK = 0; bK < numBlocks; bK++) final.push(blocksEcc[bK][i3]);

    return buildMatrix(ver, ecl, final);
  }

  /* ---------- Matriz ---------- */
  function buildMatrix(ver, ecl, codewords) {
    var size = ver * 4 + 17;
    var m = [], reserved = [];
    for (var i = 0; i < size; i++) {
      m.push(new Array(size).fill(0));
      reserved.push(new Array(size).fill(false));
    }
    function set(x, y, dark) { m[y][x] = dark ? 1 : 0; reserved[y][x] = true; }

    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        var d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    for (var t = 8; t < size - 8; t++) { set(6, t, t % 2 === 0); set(t, 6, t % 2 === 0); }

    var ap = alignPositions(ver);
    for (var a = 0; a < ap.length; a++) for (var b = 0; b < ap.length; b++) {
      if ((a === 0 && b === 0) || (a === 0 && b === ap.length - 1) || (a === ap.length - 1 && b === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++)
        set(ap[b] + dx2, ap[a] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
    }

    // reserva das áreas de formato
    for (var f = 0; f <= 8; f++) {
      if (f !== 6) { reserved[8][f] = true; reserved[f][8] = true; }
    }
    reserved[8][6] = true; reserved[6][8] = true;
    for (var g = 0; g < 8; g++) { reserved[size - 1 - g][8] = true; reserved[8][size - 1 - g] = true; }
    set(8, size - 8, true); // módulo sempre escuro

    if (ver >= 7) {
      var rem = ver;
      for (var vI = 0; vI < 12; vI++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vBits = ver << 12 | rem;
      for (var vB = 0; vB < 18; vB++) {
        var bit = ((vBits >>> vB) & 1) === 1;
        var x1 = Math.floor(vB / 3), y1 = size - 11 + vB % 3;
        set(x1, y1, bit); set(y1, x1, bit);
      }
    }

    /* dados */
    var dataBits = [];
    codewords.forEach(function (c) { for (var i = 7; i >= 0; i--) dataBits.push((c >>> i) & 1); });
    var idx = 0, upward = true;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var y = upward ? size - 1 - vert : vert;
          if (!reserved[y][x]) {
            m[y][x] = idx < dataBits.length ? dataBits[idx] : 0;
            idx++;
          }
        }
      }
      upward = !upward;
    }

    /* máscara: escolhe a de menor penalidade */
    var best = null, bestPenalty = Infinity, bestMask = 0;
    for (var mask = 0; mask < 8; mask++) {
      var cand = applyMask(m, reserved, size, mask);
      drawFormat(cand, size, ecl, mask);
      var pen = penalty(cand, size);
      if (pen < bestPenalty) { bestPenalty = pen; best = cand; bestMask = mask; }
    }
    return { size: size, modules: best, version: ver };
  }

  function applyMask(m, reserved, size, mask) {
    var out = m.map(function (row) { return row.slice(); });
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (reserved[y][x]) continue;
      var inv;
      switch (mask) {
        case 0: inv = (x + y) % 2 === 0; break;
        case 1: inv = y % 2 === 0; break;
        case 2: inv = x % 3 === 0; break;
        case 3: inv = (x + y) % 3 === 0; break;
        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: inv = x * y % 2 + x * y % 3 === 0; break;
        case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
        case 7: inv = ((x + y) % 2 + x * y % 3) % 2 === 0; break;
      }
      if (inv) out[y][x] ^= 1;
    }
    return out;
  }

  function drawFormat(m, size, ecl, mask) {
    var eclBits = [1, 0, 3, 2][ecl]; // L=01 M=00 Q=11 H=10
    var data = eclBits << 3 | mask;
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;
    function put(x, y, bit) { m[y][x] = bit; }
    for (var k = 0; k <= 5; k++) put(8, k, (bits >>> k) & 1);
    put(8, 7, (bits >>> 6) & 1);
    put(8, 8, (bits >>> 7) & 1);
    put(7, 8, (bits >>> 8) & 1);
    for (var k2 = 9; k2 < 15; k2++) put(14 - k2, 8, (bits >>> k2) & 1);
    for (var k3 = 0; k3 < 8; k3++) put(size - 1 - k3, 8, (bits >>> k3) & 1);
    for (var k4 = 8; k4 < 15; k4++) put(8, size - 15 + k4, (bits >>> k4) & 1);
    m[size - 8][8] = 1;
  }

  function penalty(m, size) {
    var p = 0, i, j;
    // regra 1: sequências de 5 ou mais módulos iguais
    for (i = 0; i < size; i++) {
      for (var dir = 0; dir < 2; dir++) {
        var run = 1, prev = dir === 0 ? m[i][0] : m[0][i];
        for (j = 1; j < size; j++) {
          var cur = dir === 0 ? m[i][j] : m[j][i];
          if (cur === prev) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; }
          else { run = 1; prev = cur; }
        }
      }
    }
    // regra 2: blocos 2x2 da mesma cor
    for (i = 0; i < size - 1; i++) for (j = 0; j < size - 1; j++) {
      var c = m[i][j];
      if (c === m[i][j + 1] && c === m[i + 1][j] && c === m[i + 1][j + 1]) p += 3;
    }
    // regra 3: padrão 1:1:3:1:1 com área clara adjacente
    var A = [0,0,0,0,1,0,1,1,1,0,1], B = [1,0,1,1,1,0,1,0,0,0,0];
    function scan(line) {
      for (var s = 0; s + 11 <= line.length; s++) {
        var okA = true, okB = true;
        for (var k = 0; k < 11; k++) {
          if (line[s + k] !== A[k]) okA = false;
          if (line[s + k] !== B[k]) okB = false;
        }
        if (okA || okB) p += 40;
      }
    }
    for (i = 0; i < size; i++) {
      var row = m[i].slice(), col = [];
      for (j = 0; j < size; j++) col.push(m[j][i]);
      scan(row); scan(col);
    }
    // regra 4: proporção de módulos escuros
    var dark = 0;
    for (i = 0; i < size; i++) for (j = 0; j < size; j++) dark += m[i][j];
    var ratio = dark * 100 / (size * size);
    p += Math.floor(Math.abs(ratio - 50) / 5) * 10;
    return p;
  }

  /* ---------- Saída ---------- */
  function toSVG(text, opts) {
    opts = opts || {};
    var qr = encode(text, opts.ecc || "M");
    var quiet = opts.quiet == null ? 4 : opts.quiet;
    var total = qr.size + quiet * 2;
    var dark = opts.dark || "#061A2D", light = opts.light || "#FFFFFF";
    var path = "";
    for (var y = 0; y < qr.size; y++) {
      for (var x = 0; x < qr.size; x++) {
        if (qr.modules[y][x]) path += "M" + (x + quiet) + " " + (y + quiet) + "h1v1h-1z";
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total +
      '" shape-rendering="crispEdges" role="img" aria-label="' + (opts.label || "QR Code") + '">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + light + '"/>' +
      '<path d="' + path + '" fill="' + dark + '"/></svg>';
  }

  root.AVQR = { encode: encode, toSVG: toSVG };
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) module.exports = globalThis.AVQR;
