var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/hdrezka/index.js
var hdrezka_exports = {};
__export(hdrezka_exports, {
  getStreams: () => getStreams2
});
module.exports = __toCommonJS(hdrezka_exports);

// src/hdrezka/http.js
var BASE_URL = "https://hdrezka.website";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Connection": "keep-alive"
};
var cookieJar = /* @__PURE__ */ new Map();
function jarGet(host) {
  return cookieJar.get(host) || {};
}
function jarSet(host, cookies) {
  if (!cookies || cookies.length === 0) return;
  const existing = jarGet(host);
  for (const pair of cookies) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === "") {
      delete existing[name];
    } else {
      existing[name] = value;
    }
  }
  cookieJar.set(host, existing);
}
function jarCookieHeader(host) {
  const cookies = jarGet(host);
  const pairs = Object.entries(cookies).map(([k, v]) => `${k}=${v}`);
  return pairs.length > 0 ? pairs.join("; ") : void 0;
}
function hostFromUrl(url) {
  try {
    return new URL(url).host;
  } catch (e) {
    return "";
  }
}
function randomHex(length) {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}
function generateFavs() {
  return [
    randomHex(8),
    randomHex(4),
    randomHex(4),
    randomHex(4),
    randomHex(12)
  ].join("-");
}
function readSetCookies(response) {
  var _a, _b;
  const out = [];
  const list = ((_b = (_a = response.headers).getSetCookie) == null ? void 0 : _b.call(_a)) || [];
  for (const c of list) {
    out.push(c.split(";")[0]);
  }
  if (out.length === 0) {
    const header = response.headers.get("set-cookie");
    if (header) {
      for (const c of header.split(/,(?=[^;]+=[^;]+)/)) {
        out.push(c.split(";")[0]);
      }
    }
  }
  return out;
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const host = hostFromUrl(url);
    const cookieHeader = jarCookieHeader(host);
    const headers = __spreadValues(__spreadValues(__spreadValues({}, HEADERS), cookieHeader ? { Cookie: cookieHeader } : {}), options.headers || {});
    const response = yield fetch(url, __spreadValues({
      headers,
      redirect: options.followRedirects === false ? "manual" : "follow"
    }, options));
    if (host) {
      jarSet(host, readSetCookies(response));
    }
    if (options.expectRedirect && response.status >= 300 && response.status < 400) {
      return response;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    return yield response.text();
  });
}
function postForm(_0, _1) {
  return __async(this, arguments, function* (path, fields, options = {}) {
    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      body.append(k, String(v));
    }
    const host = hostFromUrl(url);
    const cookieHeader = jarCookieHeader(host);
    const response = yield fetch(url, __spreadValues({
      method: "POST",
      headers: __spreadValues(__spreadValues(__spreadProps(__spreadValues({}, HEADERS), {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest"
      }), cookieHeader ? { Cookie: cookieHeader } : {}), options.headers || {}),
      body: body.toString(),
      redirect: "follow"
    }, options));
    if (host) {
      jarSet(host, readSetCookies(response));
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for POST ${url}`);
    }
    return yield response.json();
  });
}

// src/hdrezka/search.js
function searchHdrezka(title, year, mediaType) {
  return __async(this, null, function* () {
    const url = `${BASE_URL}/engine/ajax/search.php?q=${encodeURIComponent(title)}`;
    const html = yield fetchText(url);
    const candidates = [];
    const re = /<a href="([^"]+)"><span class="enty">([^<]+)<\/span>[^<]*?\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const itemUrl = m[1];
      const itemTitle = m[2].trim();
      const itemYearRaw = m[3].trim();
      const yearMatch = itemYearRaw.match(/(\d{4})/);
      const itemYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
      const itemType = itemUrl.includes("/series/") ? "tv" : itemUrl.includes("/films/") ? "movie" : null;
      const idMatch = itemUrl.match(/\/(\d+)-[^/]+\.html$/);
      candidates.push({
        id: idMatch ? idMatch[1] : null,
        url: itemUrl,
        title: itemTitle,
        year: itemYear,
        type: itemType
      });
    }
    return rankCandidates(candidates, { title, year, mediaType });
  });
}
function rankCandidates(candidates, { title, year, mediaType }) {
  if (candidates.length === 0) return [];
  const norm = (s) => (s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const targetType = mediaType === "tv" ? "tv" : "movie";
  const scored = candidates.map((c) => {
    let score = 0;
    if (c.type === targetType) score += 10;
    if (year && c.year === year) score += 20;
    if (norm(c.title) === norm(title)) score += 30;
    else if (norm(c.title).includes(norm(title))) score += 5;
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.c);
}

// src/hdrezka/sha256.js
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function rotr(x, n) {
  return x >>> n | x << 32 - n;
}
function ch(x, y, z) {
  return x & y ^ ~x & z;
}
function maj(x, y, z) {
  return x & y ^ x & z ^ y & z;
}
function ep0(x) {
  return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
}
function ep1(x) {
  return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
}
function sig0(x) {
  return rotr(x, 7) ^ rotr(x, 18) ^ x >>> 3;
}
function sig1(x) {
  return rotr(x, 17) ^ rotr(x, 19) ^ x >>> 10;
}
function utf8ToBytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 128) {
      out.push(c);
    } else if (c < 2048) {
      out.push(192 | c >> 6, 128 | c & 63);
    } else if (c < 55296 || c >= 57344) {
      out.push(
        224 | c >> 12,
        128 | c >> 6 & 63,
        128 | c & 63
      );
    } else {
      c = 65536 + ((c & 1023) << 10 | str.charCodeAt(++i) & 1023);
      out.push(
        240 | c >> 18,
        128 | c >> 12 & 63,
        128 | c >> 6 & 63,
        128 | c & 63
      );
    }
  }
  return new Uint8Array(out);
}
function sha256(message) {
  const msg = typeof message === "string" ? utf8ToBytes(message) : message;
  const len = msg.length * 8;
  const totalBits = len + 65;
  const paddedLen = Math.ceil(totalBits / 512) * 512 / 8;
  const padded = new Uint8Array(paddedLen);
  padded.set(msg);
  padded[msg.length] = 128;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(len / 4294967296), false);
  view.setUint32(paddedLen - 4, len, false);
  const H = new Int32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  const W = new Uint32Array(64);
  const chunk = new Uint8Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    chunk.set(padded.subarray(offset, offset + 64));
    for (let i = 0; i < 16; i++) {
      W[i] = chunk[i * 4] << 24 | chunk[i * 4 + 1] << 16 | chunk[i * 4 + 2] << 8 | chunk[i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      W[i] = sig1(W[i - 2]) + W[i - 7] + sig0(W[i - 15]) + W[i - 16] | 0;
    }
    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];
    for (let i = 0; i < 64; i++) {
      const T1 = h + ep1(e) + ch(e, f, g) + K[i] + W[i] | 0;
      const T2 = ep0(a) + maj(a, b, c) | 0;
      h = g;
      g = f;
      f = e;
      e = d + T1 | 0;
      d = c;
      c = b;
      b = a;
      a = T1 + T2 | 0;
    }
    H[0] = H[0] + a | 0;
    H[1] = H[1] + b | 0;
    H[2] = H[2] + c | 0;
    H[3] = H[3] + d | 0;
    H[4] = H[4] + e | 0;
    H[5] = H[5] + f | 0;
    H[6] = H[6] + g | 0;
    H[7] = H[7] + h | 0;
  }
  const hash = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    hash[i * 4] = H[i] >>> 24 & 255;
    hash[i * 4 + 1] = H[i] >>> 16 & 255;
    hash[i * 4 + 2] = H[i] >>> 8 & 255;
    hash[i * 4 + 3] = H[i] & 255;
  }
  return hash;
}
function sha256Hex(message) {
  const bytes = sha256(message);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// src/hdrezka/anubis.js
var ANUBIS_BASE = "/.within.website/x/cmd/anubis";
var PASS_PATH = `${ANUBIS_BASE}/api/pass-challenge`;
function parseAnubisChallenge(html) {
  const match = html.match(
    /<script id="anubis_challenge" type="application\/json">([\s\S]+?)<\/script>/
  );
  const obj = JSON.parse(match[1]);
  return obj.challenge;
}
function solveChallenge(challenge) {
  return __async(this, null, function* () {
    const difficulty = challenge.difficulty;
    const target = "0".repeat(difficulty);
    const base = challenge.randomData;
    let nonce = 0;
    while (true) {
      const hash = yield sha256Hex(base + nonce.toString());
      if (hash.startsWith(target)) {
        return {
          id: challenge.id,
          nonce: nonce.toString(),
          response: hash,
          difficulty
        };
      }
      nonce++;
    }
  });
}
function submitChallenge(_0, _1, _2) {
  return __async(this, arguments, function* ({ id, nonce, response, difficulty }, redirUrl, t0) {
    var _a, _b, _c;
    const elapsedTime = ((Date.now() - t0) / 1e3).toFixed(3);
    const params = new URLSearchParams({
      id,
      nonce,
      response,
      redir: redirUrl,
      elapsedTime
    });
    const url = `${BASE_URL}${PASS_PATH}?${params.toString()}`;
    const host = hostFromUrl(redirUrl);
    const testCookieValue = (_a = cookieJar.get(host)) == null ? void 0 : _a["techaro.lol-anubis-cookie-verification"];
    const testCookie = testCookieValue ? `techaro.lol-anubis-cookie-verification=${testCookieValue}` : null;
    const headers = __spreadValues(__spreadValues({}, HEADERS), testCookie ? { Cookie: testCookie } : {});
    const res = yield fetch(url, {
      method: "GET",
      headers,
      redirect: "manual"
    });
    const setCookies = ((_c = (_b = res.headers).getSetCookie) == null ? void 0 : _c.call(_b)) || [];
    if (setCookies.length === 0) {
      const header = res.headers.get("set-cookie");
      if (header) setCookies.push(header);
    }
    const verify = setCookies.find((c) => c.includes("anubis-auth="));
    const cookie = verify.split(";")[0];
    jarSet(hostFromUrl(redirUrl), [cookie]);
    return cookie;
  });
}

// src/hdrezka/extractor.js
function fetchPage(url) {
  return __async(this, null, function* () {
    const html = yield fetchText(url);
    const challenge = parseAnubisChallenge(html);
    if (!challenge) return html;
    console.log(`[HDRezka] Anubis challenge (difficulty=${challenge.difficulty})`);
    const t0 = Date.now();
    const solution = yield solveChallenge(challenge);
    yield submitChallenge(solution, url, t0);
    return yield fetchText(url);
  });
}
function extractTranslatorAndId(html, mediaType) {
  const postIdMatch = html.match(/<input[^>]*id="post_id"[^>]*value="(\d+)"/) || html.match(/data-id="(\d+)"/);
  const postId = postIdMatch ? postIdMatch[1] : null;
  if (html.includes('data-translator_id="238"')) {
    return { postId, translatorId: "238" };
  }
  const fn = mediaType === "tv" ? "initCDNSeriesEvents" : "initCDNMoviesEvents";
  const re = new RegExp(`sof\\.tv\\.${fn}\\(\\s*(\\d+)\\s*,\\s*(\\d+)`);
  const m = html.match(re);
  if (m) {
    return { postId: m[1], translatorId: m[2] };
  }
  const listMatch = html.match(/data-translator_id="(\d+)"/);
  if (listMatch) {
    return { postId, translatorId: listMatch[1] };
  }
  return { postId, translatorId: null };
}
function deobfuscateStreams(obfuscated) {
  if (!obfuscated) return [];
  let stripped = obfuscated.replace("#h", "").split("//_//").join("");
  const trashChars = ["@", "#", "!", "^", "$"];
  const trashSet = /* @__PURE__ */ new Set();
  for (let len = 2; len <= 3; len++) {
    const buckets = Array.from({ length: len }, () => trashChars);
    let combos = [""];
    for (const bucket of buckets) {
      const next = [];
      for (const prefix of combos) {
        for (const c of bucket) {
          next.push(prefix + c);
        }
      }
      combos = next;
    }
    for (const combo of combos) {
      trashSet.add(encodeBase64(combo));
    }
  }
  const sortedTrash = Array.from(trashSet).sort((a, b) => b.length - a.length);
  for (const t of sortedTrash) {
    stripped = stripped.split(t).join("");
  }
  let decoded;
  try {
    decoded = decodeBase64Utf8(stripped);
  } catch (e) {
    decoded = stripped;
  }
  const out = [];
  const re = /\[([^\]]+)\]([^,]+)/g;
  let m;
  while ((m = re.exec(decoded)) !== null) {
    const quality = m[1].trim();
    const urls = m[2].split(/\s+or\s+/);
    for (const url of urls) {
      const trimmed = url.trim();
      if (trimmed.startsWith("http")) {
        out.push({ quality, url: trimmed });
      }
    }
  }
  return out;
}
function parseSubtitles(obfuscated) {
  if (!obfuscated) return [];
  const stripped = obfuscated.replace("#h", "").split("//_//").join("");
  let decoded;
  try {
    decoded = decodeBase64Utf8(stripped);
  } catch (e) {
    decoded = stripped;
  }
  const out = [];
  const re = /\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/g;
  let m;
  while ((m = re.exec(decoded)) !== null) {
    out.push({ language: m[1].trim(), url: m[2] });
  }
  return out;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const tmdb = yield fetchTmdb(tmdbId, mediaType);
    const title = tmdb.title;
    const year = tmdb.year;
    if (!title) return [];
    const candidates = yield searchHdrezka(title, year, mediaType);
    if (candidates.length === 0) return [];
    const best = candidates[0];
    const pageUrl = best.url.startsWith("http") ? best.url : `${BASE_URL}${best.url.startsWith("/") ? "" : "/"}${best.url}`;
    const html = yield fetchPage(pageUrl);
    const { translatorId } = extractTranslatorAndId(html, mediaType);
    if (!translatorId) return [];
    const postId = best.id || extractTranslatorAndId(html, mediaType).postId;
    const favs = generateFavs();
    const form = {
      id: postId,
      translator_id: translatorId,
      favs,
      action: mediaType === "tv" ? "get_stream" : "get_movie"
    };
    if (mediaType === "tv") {
      form.season = season;
      form.episode = episode;
    }
    let cdn;
    try {
      cdn = yield postForm("/ajax/get_cdn_series/", form);
    } catch (e) {
      console.error("[HDRezka] CDN POST failed:", e.message);
      return [];
    }
    if (!cdn.success || !cdn.url) return [];
    const streams = deobfuscateStreams(cdn.url);
    const subs = parseSubtitles(cdn.subtitle);
    const cleanSubs = subs.map((s) => ({
      id: s.url,
      language: s.language,
      url: s.url,
      type: "vtt",
      hasCorsRestrictions: false
    }));
    return streams.filter((s) => s.url && s.url !== "null").map((s) => ({
      name: "HDRezka",
      title: formatStreamTitle(title, year, mediaType, season, episode, s.quality),
      url: s.url,
      quality: s.quality,
      headers: {
        Referer: pageUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      subtitles: cleanSubs.length > 0 ? cleanSubs : void 0,
      type: "direct"
    }));
  });
}
function formatStreamTitle(title, year, mediaType, season, episode, quality) {
  const base = `${title}${year ? ` (${year})` : ""} ${quality}`;
  if (mediaType === "tv") {
    return `${base} S${season}E${episode}`;
  }
  return base;
}
function fetchTmdb(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const apiKey = "439c478a771f35c05022f9feabcca01c";
    const path = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${path}/${tmdbId}?api_key=${apiKey}`;
    try {
      const data = yield fetch(url).then((r) => {
        if (!r.ok) throw new Error(`TMDB ${r.status}`);
        return r.json();
      });
      const title = mediaType === "tv" ? data.name : data.title;
      const date = mediaType === "tv" ? data.first_air_date : data.release_date;
      const year = date ? parseInt(date.substring(0, 4), 10) : null;
      return { title, year };
    } catch (e) {
      console.error("[HDRezka] TMDB lookup failed:", e.message);
      return { title: null, year: null };
    }
  });
}
function encodeBase64(str) {
  if (typeof btoa !== "undefined") {
    return btoa(str);
  }
  return Buffer.from(str, "utf-8").toString("base64");
}
function decodeBase64Utf8(str) {
  let bytes;
  if (typeof atob !== "undefined") {
    const raw = atob(str);
    bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  } else if (typeof Buffer !== "undefined") {
    bytes = Buffer.from(str, "base64");
  } else {
    const map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const out2 = [];
    let b = 0;
    let bits = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charAt(i);
      if (c === "=") break;
      const v = map.indexOf(c);
      if (v === -1) continue;
      b = b << 6 | v;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out2.push(b >> bits & 255);
      }
    }
    bytes = new Uint8Array(out2);
  }
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8").decode(bytes);
  }
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c < 128) out += String.fromCharCode(c);
    else if ((c & 224) === 192) {
      out += String.fromCharCode((c & 31) << 6 | bytes[i + 1] & 63);
      i += 1;
    } else if ((c & 240) === 224) {
      out += String.fromCharCode(
        (c & 15) << 12 | (bytes[i + 1] & 63) << 6 | bytes[i + 2] & 63
      );
      i += 2;
    } else if ((c & 248) === 240) {
      let code = (c & 7) << 18 | (bytes[i + 1] & 63) << 12 | (bytes[i + 2] & 63) << 6 | bytes[i + 3] & 63;
      code -= 65536;
      out += String.fromCharCode(55296 + (code >> 10), 56320 + (code & 1023));
      i += 3;
    }
  }
  return out;
}

// src/hdrezka/index.js
function getStreams2(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[HDRezka] ${mediaType} ${tmdbId} S${season != null ? season : "-"}E${episode != null ? episode : "-"}`);
      return yield getStreams(tmdbId, mediaType, season, episode);
    } catch (error) {
      console.error("[HDRezka] getStreams failed:", error.message);
      return [];
    }
  });
}
